// Redis cache — optional. Invalid/missing REDIS_URL or connection failures never crash the API.

import Redis from 'ioredis';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

const redisState = { client: null };

function sanitizeRedisUrl(url) {
  if (!url || !String(url).trim()) return null;

  let sanitized = String(url).trim();
  sanitized = sanitized.replace(/^redis-cli\s+-u\s+/i, '');
  sanitized = sanitized.replace(/^redis-cli\s+/i, '');
  sanitized = sanitized.replace(/^%20-u%20/i, '');
  sanitized = sanitized.replace(/^%20-%20/i, '');
  sanitized = sanitized.replace(/^%20[-_]?%20?/i, '');
  sanitized = sanitized.replace(/^[-_\s]+/i, '');
  sanitized = sanitized.replace(/\s+$/i, '');

  try {
    sanitized = decodeURIComponent(sanitized);
    sanitized = sanitized.replace(/^redis-cli\s+-u\s+/i, '');
    sanitized = sanitized.replace(/^redis-cli\s+/i, '');
  } catch {
    /* keep sanitized as-is */
  }

  if (!sanitized.match(/^rediss?:\/\//i)) {
    return null;
  }

  try {
    const u = new URL(sanitized);
    if (!u.hostname) return null;
  } catch {
    return null;
  }

  return sanitized;
}

function resolveRedisUrl() {
  const raw = process.env.REDIS_URL;
  const sanitized = sanitizeRedisUrl(raw);
  if (!sanitized) {
    if (raw && String(raw).trim()) {
      logger.warn('[Redis] REDIS_URL is missing or invalid — API runs without cache.');
    } else {
      logger.info('[Redis] REDIS_URL not set — API runs without cache.');
    }
    return null;
  }
  const masked = sanitized.replace(/:[^:@]+@/, ':****@');
  logger.debug(`[Redis] Using URL: ${masked}`);
  return sanitized;
}

const redisUrl = resolveRedisUrl();
/** True if REDIS_URL was valid enough to attempt a connection */
export const redisExpected = Boolean(redisUrl);

if (redisUrl) {
  try {
    const client = new Redis(redisUrl, {
      lazyConnect: true,
      connectTimeout: 8000,
      maxRetriesPerRequest: 2,
      retryStrategy(times) {
        if (times > 5) return null;
        return Math.min(times * 200, 2000);
      },
    });
    redisState.client = client;
    client.on('error', (err) => {
      logger.error('[Redis] connection error:', err.message);
    });
    client.on('connect', () => {
      logger.info('[Redis] connected');
    });
    client.connect().catch((err) => {
      logger.warn('[Redis] initial connect failed — continuing without cache:', err.message);
      try {
        client.disconnect();
      } catch {
        /* ignore */
      }
      redisState.client = null;
    });
  } catch (err) {
    logger.warn('[Redis] could not create client — continuing without cache:', err.message);
    redisState.client = null;
  }
}

export function isRedisActive() {
  return redisState.client != null && redisState.client.status !== 'end';
}

export class RedisCache {
  _c() {
    return redisState.client;
  }

  async set(key, value, ttlMs = 3600000) {
    const client = this._c();
    if (!client || client.status === 'end') return;
    try {
      await client.setex(key, Math.floor(ttlMs / 1000), JSON.stringify(value));
    } catch (error) {
      logger.warn('[Redis] set failed (request still succeeds):', error.message);
    }
  }

  async get(key) {
    const client = this._c();
    if (!client || client.status === 'end') return null;
    try {
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.warn('[Redis] get failed:', error.message);
      return null;
    }
  }

  async delete(key) {
    const client = this._c();
    if (!client || client.status === 'end') return;
    try {
      await client.del(key);
    } catch (error) {
      logger.warn('[Redis] delete failed:', error.message);
    }
  }

  async clear() {
    const client = this._c();
    if (!client || client.status === 'end') return;
    try {
      await client.flushdb();
    } catch (error) {
      logger.warn('[Redis] clear failed:', error.message);
    }
  }

  async getStats() {
    const client = this._c();
    if (!client || client.status === 'end') {
      return { info: null, keyspace: null };
    }
    try {
      const info = await client.info('stats');
      const keyspace = await client.info('keyspace');
      return { info, keyspace };
    } catch (error) {
      logger.warn('[Redis] stats failed:', error.message);
      return { info: null, keyspace: null };
    }
  }

  async ping() {
    const client = this._c();
    if (!client || client.status === 'end') return false;
    try {
      const result = await client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}

const shared = new RedisCache();
export const analysisCache = shared;
export const webSearchCache = shared;

export function generateCacheKey(type, data) {
  const keyData = JSON.stringify({ type, ...data });
  return crypto.createHash('sha256').update(keyData).digest('hex');
}

export const redis = redisState;
