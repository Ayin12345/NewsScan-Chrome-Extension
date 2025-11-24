// Redis cache implementation for production scalability
// Migrated from in-memory cache to support multiple concurrent users

import Redis from 'ioredis';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

// Sanitize Redis URL - remove spaces, extra characters, and decode URL encoding
function sanitizeRedisUrl(url) {
  if (!url) return 'redis://localhost:6379';
  
  // Trim whitespace
  let sanitized = url.trim();
  
  // Remove redis-cli -u prefix (including URL-encoded versions)
  sanitized = sanitized.replace(/^redis-cli\s+-u\s+/i, ''); // Remove "redis-cli -u "
  sanitized = sanitized.replace(/^redis-cli\s+/i, ''); // Remove "redis-cli "
  sanitized = sanitized.replace(/^%20-u%20/i, ''); // Remove URL-encoded " -u "
  sanitized = sanitized.replace(/^%20-%20/i, ''); // Remove URL-encoded " - "
  
  // Remove URL-encoded spaces (%20) and other common issues
  sanitized = sanitized.replace(/^%20[-_]?%20?/i, ''); // Remove leading %20-%20 or %20_%20
  sanitized = sanitized.replace(/^[-_\s]+/i, ''); // Remove leading dashes, underscores, spaces
  sanitized = sanitized.replace(/\s+$/i, ''); // Remove trailing spaces
  
  // Decode URL encoding if present
  try {
    sanitized = decodeURIComponent(sanitized);
    // After decoding, check again for redis-cli prefix
    sanitized = sanitized.replace(/^redis-cli\s+-u\s+/i, '');
    sanitized = sanitized.replace(/^redis-cli\s+/i, '');
  } catch (e) {
    // If decoding fails, use as-is
  }
  
  // Ensure it starts with redis:// or rediss://
  if (!sanitized.match(/^rediss?:\/\//i)) {
    logger.warn('Redis URL does not start with redis:// or rediss://, using default');
    return 'redis://localhost:6379';
  }
  
  return sanitized;
}

// Get and sanitize Redis URL
const redisUrl = sanitizeRedisUrl(process.env.REDIS_URL);

// Log sanitized URL for debugging (hide password)
if (process.env.REDIS_URL) {
  const maskedUrl = redisUrl.replace(/:[^:@]+@/, ':****@');
  logger.debug(`[Redis] Original URL length: ${process.env.REDIS_URL.length}, Sanitized: ${maskedUrl}`);
  
  // Check if password might contain @ symbol (needs URL encoding)
  const urlMatch = redisUrl.match(/^rediss?:\/\/(?:([^:]+):([^@]+)@)?(.+)$/);
  if (urlMatch && urlMatch[2] && urlMatch[2].includes('@')) {
    logger.warn('[Redis] WARNING: Password contains @ symbol. It should be URL-encoded as %40 in the connection URL.');
  }
}

// Create Redis client
const redis = new Redis(redisUrl, {
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

// Handle Redis connection errors
redis.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

export class RedisCache {
  async set(key, value, ttlMs = 3600000) {
    try {
      await redis.setex(key, Math.floor(ttlMs / 1000), JSON.stringify(value));
    } catch (error) {
      logger.error('Redis set error:', error);
      throw error;
    }
  }
  
  async get(key) {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Redis get error:', error);
      return null; // Return null on error to allow fallback behavior
    }
  }

  async delete(key) {
    try {
      await redis.del(key);
    } catch (error) {
      logger.error('Redis delete error:', error);
    }
  }

  async clear() {
    try {
      await redis.flushdb();
    } catch (error) {
      logger.error('Redis clear error:', error);
    }
  }
  
  async getStats() {
    try {
      const info = await redis.info('stats');
      const keyspace = await redis.info('keyspace');
      return { info, keyspace };
    } catch (error) {
      logger.error('Redis stats error:', error);
      return { info: null, keyspace: null };
    }
  }

  // Health check method
  async ping() {
    try {
      const result = await redis.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }
}

// Create cache instances
export const analysisCache = new RedisCache();
export const webSearchCache = new RedisCache();

// Generate cache key from request data (moved from cache.js)
export function generateCacheKey(type, data) {
  // Create a deterministic string from the data
  const keyData = JSON.stringify({
    type,
    ...data
  });
  
  // Generate hash
  return crypto.createHash('sha256').update(keyData).digest('hex');
}

// Export Redis client for graceful shutdown
export { redis };