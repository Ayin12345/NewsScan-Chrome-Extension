// Error handling utilities and error classification system
import { logger } from './logger.js';

// Error types
export const ErrorType = {
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTHENTICATION_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  API_ERROR: 'API_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  RATE_LIMIT: 'RATE_LIMIT_ERROR',
  CONFIGURATION: 'CONFIGURATION_ERROR',
  PROCESSING: 'PROCESSING_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  INTERNAL: 'INTERNAL_ERROR'
};

// Error codes for specific scenarios
export const ErrorCode = {
  // Validation errors (400)
  MISSING_PROMPT: 'MISSING_PROMPT',
  INVALID_PROMPT: 'INVALID_PROMPT',
  PROMPT_TOO_LONG: 'PROMPT_TOO_LONG',
  MISSING_PROVIDERS: 'MISSING_PROVIDERS',
  INVALID_PROVIDERS: 'INVALID_PROVIDERS',
  TOO_MANY_PROVIDERS: 'TOO_MANY_PROVIDERS',
  INVALID_URL: 'INVALID_URL',
  MISSING_TITLE: 'MISSING_TITLE',
  TITLE_TOO_LONG: 'TITLE_TOO_LONG',
  INVALID_LIMIT: 'INVALID_LIMIT',
  
  // Authentication errors (401)
  MISSING_TOKEN: 'MISSING_TOKEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  
  // Authorization errors (403)
  TOKEN_MISMATCH: 'TOKEN_MISMATCH',
  
  // API errors (502, 503)
  OPENAI_ERROR: 'OPENAI_ERROR',
  GEMINI_ERROR: 'GEMINI_ERROR',
  GOOGLE_SEARCH_ERROR: 'GOOGLE_SEARCH_ERROR',
  API_QUOTA_EXCEEDED: 'API_QUOTA_EXCEEDED',
  API_KEY_INVALID: 'API_KEY_INVALID',
  API_RATE_LIMITED: 'API_RATE_LIMITED',
  
  // Network errors (503)
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  DNS_ERROR: 'DNS_ERROR',
  
  // Processing errors (500)
  JSON_PARSE_ERROR: 'JSON_PARSE_ERROR',
  INVALID_RESPONSE_FORMAT: 'INVALID_RESPONSE_FORMAT',
  PROCESSING_TIMEOUT: 'PROCESSING_TIMEOUT',
  
  // Configuration errors (500)
  MISSING_API_KEY: 'MISSING_API_KEY',
  INVALID_CONFIGURATION: 'INVALID_CONFIGURATION',
  
  // Not found errors (404)
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  
  // Internal errors (500)
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  CACHE_ERROR: 'CACHE_ERROR'
};

// HTTP status codes mapping
export const ErrorStatus = {
  [ErrorType.VALIDATION]: 400,
  [ErrorType.AUTHENTICATION]: 401,
  [ErrorType.AUTHORIZATION]: 403,
  [ErrorType.API_ERROR]: 502,
  [ErrorType.NETWORK_ERROR]: 503,
  [ErrorType.TIMEOUT]: 504,
  [ErrorType.RATE_LIMIT]: 429,
  [ErrorType.CONFIGURATION]: 500,
  [ErrorType.PROCESSING]: 500,
  [ErrorType.NOT_FOUND]: 404,
  [ErrorType.INTERNAL]: 500
};

// User-friendly error messages - written for end users, not developers
const UserMessages = {
  [ErrorCode.MISSING_PROMPT]: 'Unable to analyze this article. Please try again.',
  [ErrorCode.INVALID_PROMPT]: 'Unable to process this article. Please try a different page.',
  [ErrorCode.PROMPT_TOO_LONG]: 'This article is too long to analyze. Please try a shorter article.',
  [ErrorCode.MISSING_PROVIDERS]: 'Unable to start analysis. Please try again.',
  [ErrorCode.INVALID_PROVIDERS]: 'Unable to start analysis. Please try again.',
  [ErrorCode.TOO_MANY_PROVIDERS]: 'Unable to start analysis. Please try again.',
  [ErrorCode.INVALID_URL]: 'Unable to analyze this page. Please check the URL and try again.',
  [ErrorCode.MISSING_TITLE]: 'Unable to analyze this article. Please try again.',
  [ErrorCode.TITLE_TOO_LONG]: 'Unable to analyze this article. Please try again.',
  [ErrorCode.INVALID_LIMIT]: 'Unable to search for related articles. Please try again.',
  [ErrorCode.MISSING_TOKEN]: 'Unable to connect to the analysis service. Please try again.',
  [ErrorCode.INVALID_TOKEN]: 'Unable to connect to the analysis service. Please try again.',
  [ErrorCode.OPENAI_ERROR]: 'The analysis service is temporarily unavailable. Please try again in a moment.',
  [ErrorCode.GEMINI_ERROR]: 'The analysis service is temporarily unavailable. Please try again in a moment.',
  [ErrorCode.GOOGLE_SEARCH_ERROR]: 'Unable to find related articles. The analysis will continue without them.',
  [ErrorCode.API_QUOTA_EXCEEDED]: 'The service is currently busy. Please try again in a few minutes.',
  [ErrorCode.API_KEY_INVALID]: 'The analysis service is experiencing issues. Please try again later.',
  [ErrorCode.API_RATE_LIMITED]: 'Too many requests. Please wait a moment and try again.',
  [ErrorCode.NETWORK_TIMEOUT]: 'The request took too long. Please check your internet connection and try again.',
  [ErrorCode.CONNECTION_FAILED]: 'Unable to connect to the analysis service. Please check your internet connection.',
  [ErrorCode.DNS_ERROR]: 'Unable to connect to the analysis service. Please check your internet connection.',
  [ErrorCode.JSON_PARSE_ERROR]: 'Unable to process the analysis results. Please try again.',
  [ErrorCode.INVALID_RESPONSE_FORMAT]: 'Received an unexpected response. Please try again.',
  [ErrorCode.PROCESSING_TIMEOUT]: 'The analysis is taking longer than expected. Please try again.',
  [ErrorCode.MISSING_API_KEY]: 'The analysis service is experiencing issues. Please try again later.',
  [ErrorCode.INVALID_CONFIGURATION]: 'The analysis service is experiencing issues. Please try again later.',
  [ErrorCode.ROUTE_NOT_FOUND]: 'Unable to reach the analysis service. Please try again.',
  [ErrorCode.RESOURCE_NOT_FOUND]: 'Unable to find the requested information. Please try again.',
  [ErrorCode.UNKNOWN_ERROR]: 'Something went wrong. Please try again.',
  [ErrorCode.CACHE_ERROR]: 'Unable to retrieve cached results. Please try again.'
};

// Custom error class
export class AppError extends Error {
  constructor(type, code, message, details = {}, isRetryable = false) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.code = code;
    this.details = details;
    this.isRetryable = isRetryable;
    this.timestamp = new Date().toISOString();
    this.status = ErrorStatus[type] || 500;
    this.userMessage = UserMessages[code] || message;
    
    // Maintain stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
  
  toJSON() {
    // Only include user-friendly message in production
    // Technical details should only be in development mode (handled by middleware)
    return {
      success: false,
      error: this.userMessage,
      timestamp: this.timestamp
    };
  }
}

// Helper functions to create specific error types
export function createValidationError(code, message, details = {}) {
  return new AppError(ErrorType.VALIDATION, code, message, details, false);
}

export function createAuthenticationError(code, message, details = {}) {
  return new AppError(ErrorType.AUTHENTICATION, code, message, details, false);
}

export function createAuthorizationError(code, message, details = {}) {
  return new AppError(ErrorType.AUTHORIZATION, code, message, details, false);
}

export function createAPIError(code, message, details = {}, isRetryable = true) {
  return new AppError(ErrorType.API_ERROR, code, message, details, isRetryable);
}

export function createNetworkError(code, message, details = {}, isRetryable = true) {
  return new AppError(ErrorType.NETWORK_ERROR, code, message, details, isRetryable);
}

export function createTimeoutError(code, message, details = {}) {
  return new AppError(ErrorType.TIMEOUT, code, message, details, true);
}

export function createProcessingError(code, message, details = {}) {
  return new AppError(ErrorType.PROCESSING, code, message, details, false);
}

export function createConfigurationError(code, message, details = {}) {
  return new AppError(ErrorType.CONFIGURATION, code, message, details, false);
}

export function createNotFoundError(code, message, details = {}) {
  return new AppError(ErrorType.NOT_FOUND, code, message, details, false);
}

export function createInternalError(code, message, details = {}) {
  return new AppError(ErrorType.INTERNAL, code, message, details, false);
}

// Check if error is retryable
export function isRetryableError(error) {
  if (error instanceof AppError) {
    return error.isRetryable;
  }
  
  // Check for common retryable error patterns
  if (error.message) {
    const retryablePatterns = [
      /timeout/i,
      /network/i,
      /connection/i,
      /ECONNRESET/i,
      /ETIMEDOUT/i,
      /ENOTFOUND/i,
      /503/i,
      /502/i,
      /504/i
    ];
    
    return retryablePatterns.some(pattern => pattern.test(error.message));
  }
  
  return false;
}

// Extract error details from various error types
export function extractErrorDetails(error) {
  if (error instanceof AppError) {
    return {
      type: error.type,
      code: error.code,
      message: error.message,
      userMessage: error.userMessage,
      details: error.details,
      isRetryable: error.isRetryable,
      status: error.status
    };
  }
  
  // Handle standard Error objects
  if (error instanceof Error) {
    return {
      type: ErrorType.INTERNAL,
      code: ErrorCode.UNKNOWN_ERROR,
      message: error.message,
      userMessage: UserMessages[ErrorCode.UNKNOWN_ERROR],
      details: {
        name: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      isRetryable: false,
      status: 500
    };
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return {
      type: ErrorType.INTERNAL,
      code: ErrorCode.UNKNOWN_ERROR,
      message: error,
      userMessage: UserMessages[ErrorCode.UNKNOWN_ERROR],
      details: {},
      isRetryable: false,
      status: 500
    };
  }
  
  // Handle unknown error types
  return {
    type: ErrorType.INTERNAL,
    code: ErrorCode.UNKNOWN_ERROR,
    message: 'An unknown error occurred',
    userMessage: UserMessages[ErrorCode.UNKNOWN_ERROR],
    details: { originalError: String(error) },
    isRetryable: false,
    status: 500
  };
}

// Retry utility function
export async function retryOperation(operation, maxRetries = 3, delay = 1000, context = '') {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry if error is not retryable
      if (!isRetryableError(error)) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Calculate exponential backoff delay
      const backoffDelay = delay * Math.pow(2, attempt - 1);
      logger.warn(`[Retry] ${context} Attempt ${attempt}/${maxRetries} failed, retrying in ${backoffDelay}ms...`, error.message);
      
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
  
  logger.error(`[Retry] ${context} All ${maxRetries} attempts failed`);
  throw lastError;
}


