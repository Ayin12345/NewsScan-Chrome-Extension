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

// Gemini prompt (balanced journalism analysis with grounding for current context)
export const GEMINI_PROMPT = `You are a fair journalism analyst. Evaluate this article's JOURNALISTIC QUALITY. Return ONLY valid JSON.

TODAY'S DATE: {currentDate}.

IMPORTANT — USE GOOGLE SEARCH FOR CURRENT CONTEXT:
You have access to Google Search. Use it to confirm who currently holds political offices, what recent events have occurred, and any other real-world context needed to understand the article. Do NOT treat current political figures or recent events as outdated or from "a previous era" — verify via search first. Your role is to evaluate journalism quality, NOT to fact-check claims against your training data.

EVALUATE JOURNALISM QUALITY:
- Source quality: Are sources named and credible? Direct quotes add authenticity.
- Balance: Multiple perspectives, or one-sided reporting?
- Clarity: Facts vs opinion clearly separated?
- Completeness: Any important missing context?
- Structure: Is the article well-organized and clearly written?

SCORING GUIDELINES:
- Most legitimate news articles from reputable outlets score 60-95.
- Only score below 50 for serious journalistic failures (fabrication, extreme bias, no sources).
- Always explain what points were docked and why, and what the article did well.
- Do NOT dock points because the article covers controversial or political topics.
- Do NOT dock points based on whether you agree with the article's subject matter.

Evaluate the journalistic craft of the article — do NOT fact-check its claims.
Sentences must have proper grammar and punctuation.

ARTICLE:
URL: {url}
TITLE: {title}
CONTENT: {content}

{
  "credibility_score": (1-100),
  "credibility_summary": "3-4 sentences. What did the article do well? What could be improved?",
  "reasoning": "Balanced analysis of strengths and areas for improvement. Critique and areas the article excels in as well.",
  "evidence_sentences": [
    { "quote": "exact quote from article", "impact": "why this affects credibility" }
  ],
  "supporting_links": []
}

CRITICAL: Do NOT include citation markers like [1], [2] or markdown links in the JSON values.
Return 3-6 quotes. Return ONLY the JSON object.`;

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
  // Get current date dynamically
  const now = new Date();
  const currentDate = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  return GEMINI_PROMPT
    .replace(/{currentDate}/g, currentDate)
    .replace(/{url}/g, url)
    .replace(/{title}/g, title)
    .replace(/{content}/g, content)
    .replace(
      '"supporting_links": []',
      `"supporting_links": [${supportingLinks.map(link => `"${link}"`).join(', ')}]`
    );
}

