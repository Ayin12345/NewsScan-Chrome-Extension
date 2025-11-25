// Rate limiting middleware
import rateLimit from 'express-rate-limit';

// Rate limit for analyze endpoint (more strict)
export const analyzeRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 requests per hour per IP
  message: {
    success: false,
    error: 'Too many analysis requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  }
});

// Rate limit for web search endpoint
export const webSearchRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 requests per hour per IP
  message: {
    success: false,
    error: 'Too many search requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// General API rate limiter (catch-all)
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per 15 minutes per IP
  message: {
    success: false,
    error: 'Too many requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks (needed for monitoring)
    return req.path === '/api/health';
  }
});


