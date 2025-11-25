// Input validation middleware and utilities

import { createValidationError, ErrorCode } from '../utils/errors.js';

export function validateAnalyzeRequest(req, res, next) {
  const { prompt, providers, requestId, supportingLinks } = req.body;

  // Validate prompt
  if (!prompt || typeof prompt !== 'string') {
    const error = createValidationError(
      ErrorCode.MISSING_PROMPT,
      'Missing or invalid prompt',
      { provided: typeof prompt, hasPrompt: !!prompt }
    );
    return res.status(error.status).json(error.toJSON());
  }

  // Check prompt length (prevent abuse)
  if (prompt.length > 50000) {
    const error = createValidationError(
      ErrorCode.PROMPT_TOO_LONG,
      'Prompt too long. Maximum 50,000 characters allowed.',
      { length: prompt.length, maxLength: 50000 }
    );
    return res.status(error.status).json(error.toJSON());
  }

  // Validate providers
  if (!providers || !Array.isArray(providers) || providers.length === 0) {
    const error = createValidationError(
      ErrorCode.MISSING_PROVIDERS,
      'Missing or invalid providers array',
      { provided: typeof providers, isArray: Array.isArray(providers), length: providers?.length }
    );
    return res.status(error.status).json(error.toJSON());
  }

  // Validate provider names
  const validProviders = ['OpenAI', 'Gemini'];
  const invalidProviders = providers.filter(p => !validProviders.includes(p));
  if (invalidProviders.length > 0) {
    const error = createValidationError(
      ErrorCode.INVALID_PROVIDERS,
      `Invalid providers: ${invalidProviders.join(', ')}. Valid providers are: ${validProviders.join(', ')}`,
      { invalidProviders, validProviders }
    );
    return res.status(error.status).json(error.toJSON());
  }

  // Limit number of providers
  if (providers.length > 5) {
    const error = createValidationError(
      ErrorCode.TOO_MANY_PROVIDERS,
      'Maximum 5 providers allowed per request',
      { provided: providers.length, maxAllowed: 5 }
    );
    return res.status(error.status).json(error.toJSON());
  }

  // Validate supportingLinks if provided
  if (supportingLinks !== undefined && !Array.isArray(supportingLinks)) {
    const error = createValidationError(
      ErrorCode.INVALID_URL,
      'supportingLinks must be an array',
      { provided: typeof supportingLinks }
    );
    return res.status(error.status).json(error.toJSON());
  }

  // Validate URLs in supportingLinks
  if (Array.isArray(supportingLinks)) {
    const urlPattern = /^https?:\/\/.+/;
    const invalidLinks = supportingLinks.filter(link => !urlPattern.test(link));
    if (invalidLinks.length > 0) {
      const error = createValidationError(
        ErrorCode.INVALID_URL,
        `Invalid URLs in supportingLinks: ${invalidLinks.join(', ')}`,
        { invalidLinks, totalLinks: supportingLinks.length }
      );
      return res.status(error.status).json(error.toJSON());
    }
  }

  next();
}

export function validateWebSearchRequest(req, res, next) {
  const { title, url, limit } = req.body;

  // Validate title
  if (!title || typeof title !== 'string') {
    const error = createValidationError(
      ErrorCode.MISSING_TITLE,
      'Missing or invalid title',
      { provided: typeof title, hasTitle: !!title }
    );
    return res.status(error.status).json(error.toJSON());
  }

  // Check title length
  if (title.length > 500) {
    const error = createValidationError(
      ErrorCode.TITLE_TOO_LONG,
      'Title too long. Maximum 500 characters allowed.',
      { length: title.length, maxLength: 500 }
    );
    return res.status(error.status).json(error.toJSON());
  }

  // Validate URL if provided
  if (url !== undefined) {
    if (typeof url !== 'string') {
      const error = createValidationError(
        ErrorCode.INVALID_URL,
        'URL must be a string',
        { provided: typeof url }
      );
      return res.status(error.status).json(error.toJSON());
    }
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(url)) {
      const error = createValidationError(
        ErrorCode.INVALID_URL,
        'Invalid URL format',
        { url }
      );
      return res.status(error.status).json(error.toJSON());
    }
  }

  // Validate limit
  if (limit !== undefined) {
    if (typeof limit !== 'number' || limit < 1 || limit > 20) {
      const error = createValidationError(
        ErrorCode.INVALID_LIMIT,
        'Limit must be a number between 1 and 20',
        { provided: limit, type: typeof limit }
      );
      return res.status(error.status).json(error.toJSON());
    }
  }

  next();
}


