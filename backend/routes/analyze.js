import { fetchOpenAI, fetchGemini } from '../services/aiHandling.js';
import { processAnalysisResults } from '../services/analysisProcessor.js';
import { analysisCache, generateCacheKey } from '../services/redisCache.js';
import { createConfigurationError, createTimeoutError, createProcessingError, ErrorCode } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { buildOpenAIPrompt, buildGeminiPrompt } from '../utils/prompts.js';

export async function analyzeRoute(req, res) {
  try {
    // Accept either a pre-built prompt OR individual components to build provider-specific prompts
    const { prompt, providers, requestId, supportingLinks, url, title, content } = req.body;

    // Extract URL, title, content from prompt if not provided separately
    let extractedUrl = url;
    let extractedTitle = title;
    let extractedContent = content;
    let extractedSupportingLinks = supportingLinks || [];
    
    if (!extractedUrl || !extractedTitle || extractedContent === undefined) {
      // Try to extract from prompt
      const urlMatch = prompt.match(/URL:\s*([^\n]+)/);
      const titleMatch = prompt.match(/TITLE:\s*([^\n]+)/);
      const contentMatch = prompt.match(/CONTENT:\s*([\s\S]*?)(?:\n\nCRITICAL|$)/);
      const linksMatch = prompt.match(/"supporting_links":\s*\[(.*?)\]/);
      
      extractedUrl = extractedUrl || (urlMatch ? urlMatch[1].trim() : '');
      extractedTitle = extractedTitle || (titleMatch ? titleMatch[1].trim() : '');
      extractedContent = extractedContent !== undefined ? extractedContent : (contentMatch ? contentMatch[1].trim() : '');
      
      if (linksMatch && !extractedSupportingLinks.length) {
        try {
          const linksStr = linksMatch[1];
          if (linksStr.trim()) {
            extractedSupportingLinks = linksStr.split(',').map(link => 
              link.trim().replace(/^"|"$/g, '').trim()
            ).filter(Boolean);
          }
        } catch (e) {
          logger.warn('Failed to extract links from prompt:', e);
        }
      }
    }

    // Generate cache key from request data
    const cacheKey = generateCacheKey('analyze', {
      prompt: prompt.substring(0, 1000), // Use first 1000 chars for cache key
      providers: providers.sort().join(','),
      supportingLinks: extractedSupportingLinks.sort().join(',')
    });

    // Check cache first
    const cachedResult = await analysisCache.get(cacheKey);
    if (cachedResult) {
      return res.json({
        success: true,
        data: cachedResult.data,
        requestId,
        cached: true
      });
    }

    // Get API keys from environment
    const openAIKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    // Validate API keys before processing
    const missingKeys = [];
    if (providers.includes('OpenAI') && !openAIKey) {
      missingKeys.push('OpenAI');
    }
    if (providers.includes('Gemini') && !geminiKey) {
      missingKeys.push('Gemini');
    }
    
    if (missingKeys.length > 0) {
      throw createConfigurationError(
        ErrorCode.MISSING_API_KEY,
        `API keys not configured for providers: ${missingKeys.join(', ')}`,
        { missingKeys, requestedProviders: providers }
      );
    }

    // Build provider-specific prompts
    let openAIPrompt = prompt;
    let geminiPrompt = prompt;
    
    if (extractedUrl && extractedTitle && extractedContent !== undefined) {
      // Build provider-specific prompts with grounding instructions for Gemini
      openAIPrompt = buildOpenAIPrompt(extractedUrl, extractedTitle, extractedContent, extractedSupportingLinks);
      geminiPrompt = buildGeminiPrompt(extractedUrl, extractedTitle, extractedContent, extractedSupportingLinks);
    } else {
      // If we can't extract components, append grounding instructions to Gemini prompt
      geminiPrompt = prompt + '\n\nGROUNDING INSTRUCTIONS:\n- Use Google Search to verify current facts, names, dates, and recent events\n- If your knowledge cutoff (January 2025) is insufficient, search Google for up-to-date information\n- Verify official names, titles, and recent changes\n- Do NOT include citation markers (like [1]) or URLs inside the JSON values\n- Do NOT include markdown links or citation indices in the JSON strings\n- Return ONLY clean JSON without groundingMetadata, citations, or any metadata';
    }

    // Create promises for each provider
    const providerPromises = providers.map(async (provider) => {
      try {
        let result;
        switch (provider) {
          case 'OpenAI':
            result = await fetchOpenAI(openAIPrompt, openAIKey);
            break;
          case 'Gemini':
            result = await fetchGemini(geminiPrompt, geminiKey);
            break;
          default:
            throw createProcessingError(
              ErrorCode.UNKNOWN_ERROR,
              `Unknown provider: ${provider}`,
              { provider, validProviders: ['OpenAI', 'Gemini'] }
            );
        }
        return result;
      } catch (error) {
        logger.error(`[Analyze] Provider ${provider} failed:`, error.message);
        throw error;
      }
    });

    // Execute all providers in parallel with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(createTimeoutError(
          ErrorCode.PROCESSING_TIMEOUT,
          'Analysis timeout after 60 seconds',
          { timeoutMs: 60000, providers }
        ));
      }, 60000);
    });

    let results;
    try {
      results = await Promise.race([
        Promise.allSettled(providerPromises),
        timeoutPromise
      ]);
    } catch (timeoutError) {
      // Timeout occurred - return failed results for all providers
      const timeoutErrorObj = timeoutError instanceof Error 
        ? timeoutError 
        : createTimeoutError(ErrorCode.PROCESSING_TIMEOUT, 'Request timeout after 60 seconds', { providers });
      
      results = providerPromises.map(() => ({
        status: 'rejected',
        reason: timeoutErrorObj
      }));
    }

    // Process results
    const { successfulResults, failedProviders } = processAnalysisResults(results, providers);
    
    // Log only if there are failures
    if (failedProviders.length > 0) {
      logger.warn(`[Analyze] Some providers failed: ${failedProviders.map(f => f.provider).join(', ')}`);
    }

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
      successfulResults.forEach((result) => {
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

    // Prepare response
    const response = {
      success: true,
      data: {
        successfulResults,
        failedProviders
      },
      requestId
    };

    // Cache successful results (7 days TTL)
    if (successfulResults.length > 0) {
      await analysisCache.set(cacheKey, response, 7 * 24 * 60 * 60 * 1000);
    }

    // Return response
    res.json(response);
  } catch (error) {
    // Error will be handled by error middleware
    // Re-throw to let middleware handle it
    throw error;
  }
}

