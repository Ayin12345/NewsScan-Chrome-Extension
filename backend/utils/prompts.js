// AI Analysis Prompts
// Separate prompts for OpenAI and Gemini to optimize for each model's capabilities

// OpenAI prompt (no changes needed)
export const OPENAI_PROMPT = `Analyze this news article for credibility. Return ONLY valid JSON:

{
  "credibility_score": (1-100),
  "credibility_summary": "3-4 sentences showing strengths, weaknesses, and concerns. Include positives and negatives/speculations",
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
   - End with EXACTLY ONE PERIOD
   - Never end with a comma
2. QUOTES:
   - Return 3-6 distinct evidence items in evidence_sentences
   - quote MUST be copied verbatim from the article with original punctuation
   - impact MUST clearly explain why that quote increases or decreases credibility
Return ONLY the JSON object with no additional text`;

// Gemini prompt (focused on critical journalism analysis)
export const GEMINI_PROMPT = `You are a skeptical media critic. Analyze this article's journalism quality. Return ONLY valid JSON.

BE CRITICAL. Every article has weaknesses. You MUST identify:
- Potential biases in quoted experts (based on their affiliations or interests)
- One-sided perspectives or missing counterarguments
- Opinion presented as fact, or speculation not clearly labeled
- Missing context that readers would need
- Unanswered questions the article should have addressed

Also note strengths: named sources, multiple perspectives, factual backing.

DO NOT fact-check. Accept all names, dates, claims as written. Critique the JOURNALISM, not the facts.

ARTICLE:
URL: {url}
TITLE: {title}
CONTENT: {content}

{
  "credibility_score": (1-100),
  "credibility_summary": "3-4 sentences. Start with strengths, then concerns. What biases exist? What's missing?",
  "reasoning": "Specific critique of sources, balance, and journalistic weaknesses.",
  "evidence_sentences": [
    { "quote": "exact quote from article", "impact": "why this raises or lowers credibility" }
  ],
  "supporting_links": []
}

Return 3-6 quotes. Return ONLY JSON.`;

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

