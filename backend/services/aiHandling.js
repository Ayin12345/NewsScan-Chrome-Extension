// AI handling services for backend
// This mirrors the functionality from src/utils/aiHandling.ts but runs server-side

export async function fetchOpenAI(content, apiKey) {
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

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
    throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  if (data.choices && data.choices[0] && data.choices[0].message.content) {
    return data.choices[0].message.content;
  } else {
    throw new Error(data.error?.message || 'No response from OpenAI');
  }
}

async function fetchGeminiWithModel(content, apiKey, model) {
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  console.time(`[Backend AI] Gemini ${model} request`);
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: content
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 6000
        }
      })
    }
  );
  console.timeEnd(`[Backend AI] Gemini ${model} request`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini ${model} API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  
  if (data.candidates && data.candidates[0]) {
    const candidate = data.candidates[0];
    
    if (candidate.finishReason === 'MAX_TOKENS') {
      throw new Error(`Gemini ${model} response was truncated due to token limit.`);
    }
    
    if (candidate.finishReason === 'SAFETY') {
      throw new Error(`Gemini ${model} response was blocked due to safety filters.`);
    }
    
    if (candidate.content && candidate.content.parts && candidate.content.parts[0] && candidate.content.parts[0].text) {
      return candidate.content.parts[0].text;
    }
    
    if (candidate.content && candidate.content.text) {
      return candidate.content.text;
    }
    
    throw new Error(`Gemini ${model} response incomplete. Finish reason: ${candidate.finishReason || 'unknown'}`);
  } else {
    throw new Error(data.error?.message || `No candidates in Gemini ${model} response`);
  }
}

export async function fetchGemini(content, apiKey) {
  // Try Gemini 2.5 Flash first (faster, newer)
  try {
    console.log('[Backend AI] Trying Gemini 2.5 Flash...');
    return await fetchGeminiWithModel(content, apiKey, 'gemini-2.5-flash');
  } catch (error) {
    console.warn('[Backend AI] Gemini 2.5 Flash failed, trying backup model:', error);
    
    // Fallback to Gemini 2.5 Flash Lite
    try {
      console.log('[Backend AI] Trying Gemini 2.5 Flash Lite as backup...');
      return await fetchGeminiWithModel(content, apiKey, 'gemini-2.5-flash-lite');
    } catch (backupError) {
      console.error('[Backend AI] Both Gemini models failed:', backupError);
      throw new Error('Analysis failed due to AI model limitations. Please try again later.');
    }
  }
}

