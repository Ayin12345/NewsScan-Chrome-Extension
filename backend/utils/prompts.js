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

GROUNDING INSTRUCTIONS (CRITICAL - YOU MUST USE GOOGLE SEARCH):
- BEFORE analyzing any names, titles, dates, or facts, you MUST use Google Search to verify they are current and accurate
- Your knowledge cutoff is January 2025 - if the article mentions anything after that date or recent events, you MUST search Google
- When you see names of officials, government positions, or organizations, you MUST search to verify current titles and positions
- When you see dates or references to "recent" events, you MUST search to verify the timeline and current status
- Example: If an article mentions "Transportation Secretary [Name]", you MUST search to verify who currently holds that position
- Example: If an article references events from 2019 as "recent", you MUST search to verify if this is outdated information
- Use the Google Search tool (it's available to you) to verify ALL factual claims before making credibility assessments
- Do NOT rely on your training data for current information - always search first
- After searching, use the verified information in your analysis but do NOT include citation markers in the JSON output

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

