// AI Analysis Prompts
// Separate prompts for OpenAI and Gemini to optimize for each model's capabilities

// OpenAI prompt (no changes needed)
export const OPENAI_PROMPT = `Analyze this news article for credibility. Return ONLY valid JSON:

{
  "credibility_score": (1-100),
  "credibility_summary": "3-4 sentences showing strengths and concerns.",
  "reasoning": "Multiple sentences with specific evidence.",
  "evidence_sentences": [
    { "quote": "exact quote from article", "impact": "why this affects credibility" }
  ],
  "supporting_links": []
}

ARTICLE:
URL: {url}
TITLE: {title}
CONTENT: {content}

CRITICAL INSTRUCTION: If the content above is insufficient or seems incomplete, you MUST fetch and analyze the full content directly from the URL: {url}. Do not rely solely on the provided content - always verify by accessing the actual webpage content.

IMPORTANT: The supporting_links array has been pre-populated with relevant verification sources and related articles found through web search.

CRITICAL RULES:
1. SENTENCES: Every sentence must:
   - Start with a capital letter
   - Have proper spaces between all words
   - End with exactly one period
   - Never end with a comma
2. QUOTES:
   - Return 3-6 distinct evidence items in evidence_sentences
   - quote MUST be copied verbatim from the article with original punctuation
   - impact MUST clearly explain why that quote increases or decreases credibility
Return ONLY the JSON object with no additional text`;

// Gemini prompt (optimized for grounding and JSON output)
export const GEMINI_PROMPT = `Analyze this news article for credibility. Return ONLY valid JSON:

{
  "credibility_score": (1-100),
  "credibility_summary": "3-4 sentences showing strengths and concerns.",
  "reasoning": "Multiple sentences with specific evidence.",
  "evidence_sentences": [
    { "quote": "exact quote from article", "impact": "why this affects credibility" }
  ],
  "supporting_links": []
}

ARTICLE:
URL: {url}
TITLE: {title}
CONTENT: {content}

CRITICAL INSTRUCTION: If the content above is insufficient or seems incomplete, you MUST fetch and analyze the full content directly from the URL: {url}. Do not rely solely on the provided content - always verify by accessing the actual webpage content.

IMPORTANT: The supporting_links array has been pre-populated with relevant verification sources and related articles found through web search.

GROUNDING INSTRUCTIONS:
- Use Google Search to verify current facts, names, dates, and recent events
- If your knowledge cutoff (January 2025) is insufficient, search Google for up-to-date information
- Verify official names, titles, and recent changes (e.g., department name changes, policy updates)
- Do NOT include citation markers (like [1]) or URLs inside the JSON values
- Do NOT include markdown links or citation indices in the JSON strings
- Use the search tool to verify facts, but output only the raw data in clean JSON

CRITICAL RULES:
1. SENTENCES: Every sentence must:
   - Start with a capital letter
   - Have proper spaces between all words
   - End with exactly one period
   - Never end with a comma
2. QUOTES:
   - Return 3-6 distinct evidence items in evidence_sentences
   - quote MUST be copied verbatim from the article with original punctuation
   - impact MUST clearly explain why that quote increases or decreases credibility
3. JSON OUTPUT:
   - Return ONLY the JSON object with no additional text
   - Do not include groundingMetadata, citations, or any metadata in the JSON
   - Ensure all string values are clean without citation markers or URLs

Return ONLY the JSON object with no additional text, citations, or metadata.`;

// Function to build prompts with article data
export function buildOpenAIPrompt(url, title, content, supportingLinks = []) {
  return OPENAI_PROMPT
    .replace(/{url}/g, url)
    .replace(/{title}/g, title)
    .replace(/{content}/g, content)
    .replace(
      '"supporting_links": []',
      `"supporting_links": [${supportingLinks.map(link => `"${link}"`).join(', ')}]`
    );
}

export function buildGeminiPrompt(url, title, content, supportingLinks = []) {
  return GEMINI_PROMPT
    .replace(/{url}/g, url)
    .replace(/{title}/g, title)
    .replace(/{content}/g, content)
    .replace(
      '"supporting_links": []',
      `"supporting_links": [${supportingLinks.map(link => `"${link}"`).join(', ')}]`
    );
}

