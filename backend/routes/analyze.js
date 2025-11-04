import { fetchOpenAI, fetchGemini } from '../services/aiHandling.js';
import { processAnalysisResults } from '../services/analysisProcessor.js';

export async function analyzeRoute(req, res) {
  try {
    const { prompt, providers, requestId, supportingLinks } = req.body;

    // Validate input
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid prompt'
      });
    }

    if (!providers || !Array.isArray(providers) || providers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid providers array'
      });
    }

    // Get API keys from environment
    const openAIKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    // Create promises for each provider
    const providerPromises = providers.map(async (provider) => {
      try {
        let result;
        switch (provider) {
          case 'OpenAI':
            if (!openAIKey) {
              throw new Error('OpenAI API key not configured');
            }
            result = await fetchOpenAI(prompt, openAIKey);
            break;
          case 'Gemini':
            if (!geminiKey) {
              throw new Error('Gemini API key not configured');
            }
            result = await fetchGemini(prompt, geminiKey);
            break;
          default:
            throw new Error(`Unknown provider: ${provider}`);
        }
        return result;
      } catch (error) {
        console.error(`Error in provider ${provider}:`, error);
        throw error;
      }
    });

    // Execute all providers in parallel with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Analysis timeout after 60 seconds')), 60000);
    });

    let results;
    try {
      results = await Promise.race([
        Promise.allSettled(providerPromises),
        timeoutPromise
      ]);
    } catch (timeoutError) {
      // Timeout occurred - return failed results for all providers
      results = providerPromises.map(() => ({
        status: 'rejected',
        reason: new Error('Request timeout after 60 seconds')
      }));
    }

    // Process results
    const { successfulResults, failedProviders } = processAnalysisResults(results, providers);

    // Merge web search links into results if they weren't included by AI
    // Extract supporting links from prompt if they exist
    const promptLinksMatch = prompt.match(/"supporting_links":\s*\[(.*?)\]/);
    let webSearchLinks = [];
    if (supportingLinks && Array.isArray(supportingLinks)) {
      webSearchLinks = supportingLinks;
    } else if (promptLinksMatch) {
      try {
        const linksStr = promptLinksMatch[1];
        if (linksStr.trim()) {
          webSearchLinks = linksStr.split(',').map(link => 
            link.trim().replace(/^"|"$/g, '').trim()
          ).filter(Boolean);
        }
      } catch (e) {
        console.warn('Failed to extract links from prompt:', e);
      }
    }

    // If we have web search links and AI didn't include them, merge them in
    if (webSearchLinks.length > 0) {
      successfulResults.forEach(result => {
        if (!result.result.supporting_links || result.result.supporting_links.length === 0) {
          result.result.supporting_links = [...webSearchLinks];
        } else {
          // Merge unique links
          const existing = new Set(result.result.supporting_links);
          webSearchLinks.forEach(link => existing.add(link));
          result.result.supporting_links = Array.from(existing);
        }
      });
    }

    // Return response in the same format as the extension expects
    res.json({
      success: true,
      data: {
        successfulResults,
        failedProviders
      },
      requestId
    });
  } catch (error) {
    console.error('Error in analyze route:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze article'
    });
  }
}

