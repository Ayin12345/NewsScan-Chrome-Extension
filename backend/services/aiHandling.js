// AI handling services for backend
// This mirrors the functionality from src/utils/aiHandling.ts but runs server-side

import { createAPIError, createNetworkError, createTimeoutError, createConfigurationError, retryOperation, ErrorCode, isRetryableError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export async function fetchOpenAI(content, apiKey) {
  if (!apiKey) {
    throw createConfigurationError(
      ErrorCode.MISSING_API_KEY,
      'OpenAI API key not configured',
      { provider: 'OpenAI' }
    );
  }

  return retryOperation(async () => {
    console.time('[Backend AI] OpenAI request');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content }]
      })
    });
    console.timeEnd('[Backend AI] OpenAI request');

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      const status = response.status;
      
      // Determine error type and retryability
      let error;
      if (status === 401 || status === 403) {
        // Authentication/authorization errors are not retryable
        error = createAPIError(
          ErrorCode.API_KEY_INVALID,
          errorData.error?.message || `OpenAI API error: ${status}`,
          { status, provider: 'OpenAI', errorData },
          false
        );
      } else if (status === 429) {
        // Rate limit errors are retryable
        error = createAPIError(
          ErrorCode.API_RATE_LIMITED,
          errorData.error?.message || `OpenAI API rate limit exceeded`,
          { status, provider: 'OpenAI', errorData },
          true
        );
      } else if (status >= 500) {
        // Server errors are retryable
        error = createAPIError(
          ErrorCode.OPENAI_ERROR,
          errorData.error?.message || `OpenAI API error: ${status}`,
          { status, provider: 'OpenAI', errorData },
          true
        );
      } else {
        // Other errors are generally not retryable
        error = createAPIError(
          ErrorCode.OPENAI_ERROR,
          errorData.error?.message || `OpenAI API error: ${status}`,
          { status, provider: 'OpenAI', errorData },
          false
        );
      }
      
      throw error;
    }

    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message.content) {
      return data.choices[0].message.content;
    } else {
      throw createAPIError(
        ErrorCode.INVALID_RESPONSE_FORMAT,
        data.error?.message || 'No response from OpenAI',
        { provider: 'OpenAI', responseData: data },
        false
      );
    }
  }, 3, 1000, 'OpenAI');
}

async function fetchGeminiWithModel(content, apiKey, model) {
  if (!apiKey) {
    throw createConfigurationError(
      ErrorCode.MISSING_API_KEY,
      'Gemini API key not configured',
      { provider: 'Gemini', model }
    );
  }

  return retryOperation(async () => {
    logger.debug(`[Backend AI] Gemini ${model} request starting`);
    const startTime = Date.now();
    
    // Prepare request body with grounding and JSON output configuration
    const requestBody = {
      contents: [{
        parts: [{
          text: content
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 6000,
        // Enforce JSON output mode to prevent citation markers in JSON
        responseMimeType: 'application/json'
      },
      // Enable Google Grounding Search for up-to-date information
      // This allows the model to search Google when its knowledge cutoff (Jan 2025) is insufficient
      tools: [{
        googleSearchRetrieval: {
          dynamicRetrievalConfig: {
            mode: 'MODE_DYNAMIC', // Let the model decide when to search
            dynamicThreshold: 0.7 // Confidence threshold for searching (optional)
          }
        }
      }]
    };
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      }
    );
    
    const duration = Date.now() - startTime;
    logger.debug(`[Backend AI] Gemini ${model} request completed in ${duration}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      const status = response.status;
      
      let error;
      if (status === 401 || status === 403) {
        error = createAPIError(
          ErrorCode.API_KEY_INVALID,
          `Gemini ${model} API authentication error: ${status}`,
          { status, provider: 'Gemini', model, errorText },
          false
        );
      } else if (status === 429) {
        error = createAPIError(
          ErrorCode.API_RATE_LIMITED,
          `Gemini ${model} API rate limit exceeded`,
          { status, provider: 'Gemini', model, errorText },
          true
        );
      } else if (status >= 500) {
        error = createAPIError(
          ErrorCode.GEMINI_ERROR,
          `Gemini ${model} API error: ${status} ${response.statusText}`,
          { status, provider: 'Gemini', model, errorText },
          true
        );
      } else {
        error = createAPIError(
          ErrorCode.GEMINI_ERROR,
          `Gemini ${model} API error: ${status} ${response.statusText} - ${errorText}`,
          { status, provider: 'Gemini', model, errorText },
          false
        );
      }
      
      throw error;
    }

    const data = await response.json();
    
    // Log grounding metadata if present (for debugging, but we'll filter it out)
    // Grounding metadata is in candidate.groundingMetadata, not at the top level
    if (data.candidates && data.candidates[0] && data.candidates[0].groundingMetadata) {
      logger.debug(`[Backend AI] Gemini ${model} grounding metadata present (will be filtered)`);
    }
    
    if (data.candidates && data.candidates[0]) {
      const candidate = data.candidates[0];
      
      if (candidate.finishReason === 'MAX_TOKENS') {
        throw createAPIError(
          ErrorCode.INVALID_RESPONSE_FORMAT,
          `Gemini ${model} response was truncated due to token limit.`,
          { provider: 'Gemini', model, finishReason: candidate.finishReason },
          false
        );
      }
      
      if (candidate.finishReason === 'SAFETY') {
        throw createAPIError(
          ErrorCode.INVALID_RESPONSE_FORMAT,
          `Gemini ${model} response was blocked due to safety filters.`,
          { provider: 'Gemini', model, finishReason: candidate.finishReason },
          false
        );
      }
      
      let responseText = null;
      
      // Extract text from response
      if (candidate.content && candidate.content.parts && candidate.content.parts[0] && candidate.content.parts[0].text) {
        responseText = candidate.content.parts[0].text;
      } else if (candidate.content && candidate.content.text) {
        responseText = candidate.content.text;
      }
      
      if (!responseText) {
        throw createAPIError(
          ErrorCode.INVALID_RESPONSE_FORMAT,
          `Gemini ${model} response incomplete. Finish reason: ${candidate.finishReason || 'unknown'}`,
          { provider: 'Gemini', model, finishReason: candidate.finishReason },
          false
        );
      }
      
      // Clean response text: remove any grounding metadata or citation markers that might have leaked in
      // Even with responseMimeType: 'application/json', sometimes citations can appear in string values
      let cleanedText = responseText.trim();
      
      // Remove grounding metadata if it somehow appears in the text (shouldn't happen with proper config, but just in case)
      cleanedText = cleanedText.replace(/groundingMetadata[^}]*}/g, '');
      cleanedText = cleanedText.replace(/groundingMetadata[^\]]*\]/g, '');
      
      // Remove citation markers like [1], [2] etc. from within JSON string values
      // This carefully removes citations while preserving JSON structure
      // Pattern: citation markers inside quoted strings
      cleanedText = cleanedText.replace(/(?<="[^"]*)\s*\[\d+\]\s*(?=[^"]*")/g, ' ');
      cleanedText = cleanedText.replace(/(?<="[^"]*)\[\d+\](?=[^"]*")/g, '');
      
      // Remove any markdown links that might appear: [text](url) - but preserve the text
      cleanedText = cleanedText.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
      
      // Clean up any double spaces created by removals
      cleanedText = cleanedText.replace(/\s{2,}/g, ' ');
      
      return cleanedText;
    } else {
      throw createAPIError(
        ErrorCode.INVALID_RESPONSE_FORMAT,
        data.error?.message || `No candidates in Gemini ${model} response`,
        { provider: 'Gemini', model, responseData: data },
        false
      );
    }
  }, 3, 1000, `Gemini ${model}`);
}

export async function fetchGemini(content, apiKey) {
  // Try Gemini 2.5 Pro first (best for complex analysis with grounding)
  // If Pro is not available, fall back to 2.5 Flash
  const primaryModels = ['gemini-2.5-pro', 'gemini-2.5-flash'];
  let lastError = null;
  
  for (const model of primaryModels) {
    try {
      return await fetchGeminiWithModel(content, apiKey, model);
    } catch (error) {
      lastError = error;
      logger.warn(`[Backend AI] Gemini ${model} failed, trying next model`);
      // Continue to next model
    }
  }
  
  // Fallback to Gemini 2.5 Lite if primary models fail
  logger.warn('[Backend AI] Primary Gemini models failed, trying backup model (2.5 Lite)');
  try {
    return await fetchGeminiWithModel(content, apiKey, 'gemini-2.5-lite');
  } catch (backupError) {
    logger.error('[Backend AI] All Gemini models failed');
    // Re-throw the last primary error if backup also fails
    throw createAPIError(
      ErrorCode.GEMINI_ERROR,
      'Analysis failed due to AI model limitations. Please try again later.',
      { 
        originalError: lastError?.message,
        backupError: backupError.message,
        provider: 'Gemini'
      },
      // Only retryable if both errors are retryable
      isRetryableError(lastError) && isRetryableError(backupError)
    );
  }
}

