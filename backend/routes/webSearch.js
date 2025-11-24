import { performWebSearch } from '../services/webSearch.js';
import { webSearchCache, generateCacheKey } from '../services/redisCache.js';
import { createConfigurationError, ErrorCode } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export async function webSearchRoute(req, res) {
  try {
    const { title, url, limit = 5 } = req.body;

    // Generate cache key
    const cacheKey = generateCacheKey('webSearch', {
      title: title.substring(0, 200),
      url: url || '',
      limit
    });

    // Check cache first
    const cachedResult = await webSearchCache.get(cacheKey);
    if (cachedResult) {
      return res.json({
        success: true,
        data: cachedResult,
        cached: true
      });
    }

    // Get API keys from environment
    const googleApiKey = process.env.GOOGLE_API_KEY;
    const googleSearchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!googleApiKey || !googleSearchEngineId) {
      throw createConfigurationError(
        ErrorCode.MISSING_API_KEY,
        'Google Search API not configured',
        { 
          hasGoogleApiKey: !!googleApiKey,
          hasSearchEngineId: !!googleSearchEngineId
        }
      );
    }

    // Combine title and URL for search query (same format as frontend)
    const searchQuery = url ? `${title} ${url}` : title;

    // Perform web search
    const searchResponse = await performWebSearch(
      searchQuery,
      limit,
      googleApiKey,
      googleSearchEngineId,
      geminiApiKey
    );

    // Cache successful results (24 hours TTL)
    if (searchResponse.results && searchResponse.results.length > 0) {
      await webSearchCache.set(cacheKey, searchResponse, 24 * 60 * 60 * 1000);
    }

    // Return response in the same format as the extension expects
    res.json({
      success: true,
      data: searchResponse
    });
  } catch (error) {
    // Error will be handled by error middleware
    // Re-throw to let middleware handle it
    throw error;
  }
}

