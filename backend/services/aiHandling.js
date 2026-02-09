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
    const startTime = Date.now();
    logger.info('[Backend AI] OpenAI request starting');
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
    const duration = Date.now() - startTime;
    logger.info(`[Backend AI] OpenAI request completed in ${duration}ms`);

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
    const startTime = Date.now();
    logger.info(`[Backend AI] Gemini ${model} request starting`);
    
    // Prepare request body - NO grounding (it encourages fact-checking which we don't want)
    const requestBody = {
      contents: [{
        parts: [{
          text: content
        }]
      }],
      generationConfig: {
        temperature: 0.1, // Very low for consistent, non-creative output
        maxOutputTokens: 6000,
        responseMimeType: 'application/json' // Now we can use JSON mode without grounding
      }
      // Grounding DISABLED - it makes Gemini try to verify facts instead of analyzing journalism
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
    logger.info(`[Backend AI] Gemini ${model} request completed in ${duration}ms`);

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
    
    // Grounding is disabled - we want journalism analysis, not fact-checking
    
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
  // Primary: Gemini 2.5 Pro (best reasoning and accuracy - critical for credibility analysis)
  // Backup: Gemini 2.5 Flash (faster fallback)
  const models = ['gemini-2.5-pro', 'gemini-2.5-flash'];
  let lastError = null;
  const overallStartTime = Date.now();
  
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const modelStartTime = Date.now();
    logger.info(`[Backend AI] Attempting Gemini ${model} (attempt ${i + 1}/${models.length})`);
    
    try {
      const result = await fetchGeminiWithModel(content, apiKey, model);
      const modelDuration = Date.now() - modelStartTime;
      const overallDuration = Date.now() - overallStartTime;
      logger.info(`[Backend AI] Gemini ${model} succeeded in ${modelDuration}ms (total: ${overallDuration}ms)`);
      return result;
    } catch (error) {
      const modelDuration = Date.now() - modelStartTime;
      lastError = error;
      logger.warn(`[Backend AI] Gemini ${model} failed after ${modelDuration}ms:`, error.message);
      
      if (i < models.length - 1) {
        const nextModel = models[i + 1];
        logger.info(`[Backend AI] Switching to backup model: ${nextModel}`);
      }
      // Continue to next model
    }
  }
  
  const overallDuration = Date.now() - overallStartTime;
  logger.error(`[Backend AI] All Gemini models failed after ${overallDuration}ms`);
  // Re-throw the last error
  throw createAPIError(
    ErrorCode.GEMINI_ERROR,
    'Analysis failed due to AI model limitations. Please try again later.',
    { 
      originalError: lastError?.message,
      provider: 'Gemini',
      modelsAttempted: models,
      totalDurationMs: overallDuration
    },
    // Retryable if error is retryable
    isRetryableError(lastError)
  );
}

