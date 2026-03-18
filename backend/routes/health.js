// Health check endpoint for monitoring service status
import { analysisCache, isRedisActive, redisExpected } from '../services/redisCache.js';
import { logger } from '../utils/logger.js';

export async function healthRoute(req, res) {
  try {
    let cacheStatus = redisExpected ? 'unavailable' : 'disabled';
    let cachePing = false;

    if (isRedisActive()) {
      try {
        cachePing = await analysisCache.ping();
        cacheStatus = cachePing ? 'connected' : 'unavailable';
      } catch (error) {
        cacheStatus = 'unavailable';
        logger.warn('[Health Check] Redis ping failed:', error.message);
      }
    }
    
    // Check API keys
    const apiKeysStatus = {
      openai: !!process.env.OPENAI_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      google: !!process.env.GOOGLE_API_KEY,
      googleSearchEngineId: !!process.env.GOOGLE_SEARCH_ENGINE_ID
    };
    
    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const memoryInfo = {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      unit: 'MB'
    };
    
    // Build health response
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        apiKeys: apiKeysStatus,
        cache: {
          status: cacheStatus,
          redis: cachePing,
          required: false
        },
        memory: memoryInfo,
        server: {
          nodeVersion: process.version,
          platform: process.platform
        }
      }
    };
    
    // Determine overall health
    const allApiKeysPresent = 
      apiKeysStatus.openai &&
      apiKeysStatus.gemini &&
      apiKeysStatus.google &&
      apiKeysStatus.googleSearchEngineId;
    
    // Redis optional — only API keys gate "healthy" for monitors
    const isHealthy = allApiKeysPresent;

    health.status = isHealthy ? 'healthy' : 'degraded';

    if (!isHealthy) {
      logger.warn(`[Health Check] Status: ${health.status} | API Keys: ${allApiKeysPresent ? 'OK' : 'MISSING'} | Cache: ${cacheStatus}`);
    }

    res.status(isHealthy ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

