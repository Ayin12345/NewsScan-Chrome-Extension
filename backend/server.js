import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { analyzeRoute } from './routes/analyze.js';
import { webSearchRoute } from './routes/webSearch.js';
import { healthRoute } from './routes/health.js';
import { validateAnalyzeRequest, validateWebSearchRequest } from './middleware/validation.js';
import { analyzeRateLimiter, webSearchRateLimiter, generalRateLimiter } from './middleware/rateLimiting.js';
import { extractErrorDetails, createNotFoundError, ErrorCode } from './utils/errors.js';
import { validateEnvironment } from './utils/envValidator.js';
import { logger } from './utils/logger.js';
import timeout from 'express-timeout-handler';

dotenv.config();

try {
  validateEnvironment();
} catch (error) {
  logger.error('Environment validation failed:', error.message);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for accurate IP addresses (important for Render/deployment)
// Set to 1 to trust only the first proxy (Render's load balancer)
// This prevents rate limiting bypass while still getting correct client IPs
app.set('trust proxy', 1);

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['chrome-extension://*']; // Allow all extensions in dev if not specified

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, or curl)
    if (!origin) return callback(null, true);
    
    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed === '*') return true;
      if (allowed.includes('*')) {
        // Support wildcard matching like chrome-extension://*
        const pattern = allowed.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(origin);
      }
      return origin === allowed;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Request Size Limits
//prevente memory exhaustion from malicious or accidental large requests
app.use(cors(corsOptions));
app.use(express.json({
  limit: '1mb',
  strict: true
}));

//helmet security parameters
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(express.urlencoded({
  extended: true,
  limit: '1mb',
  parameterLimit: 50
}));

// Apply general rate limiting to all routes
app.use(generalRateLimiter);

// Request logging middleware - logs method, path, status, and duration
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(`${req.method} ${req.path} | ${res.statusCode} | ${duration}ms`);
  });
  
  next();
});

// Request Timeout Protection
//prevents slow requests from exhausting server resources
app.use(timeout.handler({
  timeout: 60000, // 60 seconds
  onTimeout: (req, res) => {
    if(!res.headersSent) {
      res.status(504).json({
        success: false,
        error: 'Request timeout. The analysis took too long.',
        timestamp: new Date().toISOString()
      });
    }
  },
  disable: ['write', 'setHeaders', 'send', 'json', 'end']
}));
// Routes
// Health check endpoint (no rate limiting for monitoring)
app.get('/api/health', healthRoute);
app.post('/api/analyze', analyzeRateLimiter, validateAnalyzeRequest, analyzeRoute);
app.post('/api/web-search', webSearchRateLimiter, validateWebSearchRequest, webSearchRoute);

// Error handling middleware
app.use((err, req, res, next) => {
  const errorDetails = extractErrorDetails(err);
  
  // Enhanced error logging with context
  logger.error(`${errorDetails.type} (${errorDetails.code}):`, {
    message: errorDetails.message,
    path: req.path,
    method: req.method,
    status: errorDetails.status,
    isRetryable: errorDetails.isRetryable,
    requestId: req.body?.requestId,
    details: errorDetails.details,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
  
  // Don't send error response if headers already sent
  if (res.headersSent) {
    return next(err);
  }
  
  // Send user-friendly error response
  // Only include technical details in development mode
  const response = {
    success: false,
    error: errorDetails.userMessage, // User-friendly message only
    ...(process.env.NODE_ENV === 'development' && {
      // Technical details only for developers
      errorCode: errorDetails.code,
      errorType: errorDetails.type,
      details: errorDetails.details,
      originalMessage: errorDetails.message
    }),
    timestamp: new Date().toISOString(),
    ...(req.body?.requestId && { requestId: req.body.requestId })
  };
  
  res.status(errorDetails.status).json(response);
});

// 404 handler
app.use((req, res) => {
  const error = createNotFoundError(
    ErrorCode.ROUTE_NOT_FOUND,
    'Route not found',
    { path: req.path, method: req.method }
  );
  res.status(error.status).json(error.toJSON());
});

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Allowed origins: ${allowedOrigins.join(', ')}`);
  logger.info(`Rate limiting: Enabled`);
  logger.info(`Caching: Enabled`);
});
