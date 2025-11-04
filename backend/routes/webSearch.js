import { performWebSearch } from '../services/webSearch.js';

export async function webSearchRoute(req, res) {
  try {
    console.log('[Backend WebSearch] Received request:', {
      body: req.body,
      title: req.body?.title,
      url: req.body?.url,
      limit: req.body?.limit
    });

    const { title, url, limit = 5 } = req.body;

    // Validate input
    if (!title || typeof title !== 'string') {
      console.error('[Backend WebSearch] Validation failed: Missing or invalid title', { title });
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid title'
      });
    }

    // Get API keys from environment
    const googleApiKey = process.env.GOOGLE_API_KEY;
    const googleSearchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!googleApiKey || !googleSearchEngineId) {
      return res.status(500).json({
        success: false,
        error: 'Google Search API not configured'
      });
    }

    // Combine title and URL for search query (same format as frontend)
    const searchQuery = url ? `${title} ${url}` : title;

    console.log('[Backend WebSearch] Starting search with query:', searchQuery);

    // Perform web search
    const searchResponse = await performWebSearch(
      searchQuery,
      limit,
      googleApiKey,
      googleSearchEngineId,
      geminiApiKey
    );

    console.log('[Backend WebSearch] Search completed:', {
      resultsCount: searchResponse.results?.length || 0,
      searchMethod: searchResponse.searchMethod
    });

    // Return response in the same format as the extension expects
    res.json({
      success: true,
      data: searchResponse
    });
  } catch (error) {
    console.error('Error in web search route:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to perform web search'
    });
  }
}

