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

// Gemini prompt (balanced journalism analysis)
export const GEMINI_PROMPT = `You are a fair journalism analyst. Evaluate this article's quality. Return ONLY valid JSON.

TODAY'S DATE: {currentDate}. 

EVALUATE:
- Source quality: Are sources named and credible? Direct quotes add authenticity.
- Balance: Multiple perspectives, or one-sided reporting?
- Clarity: Facts vs opinion clearly separated?
- Completeness: Any important missing context?

Be fair and balanced. Most news articles score 60-95. Only score below 50 for serious journalistic failures. Always provide reasons as to why you docked off points as well as a overall reason as to why the article was good and what it did well at.
Evaluate journalistic side of article instead of fact-checking the article.
Sentences must have proper grammar and punctuation.

ARTICLE:
URL: {url}
TITLE: {title}
CONTENT: {content}

{
  "credibility_score": (1-100),
  "credibility_summary": "3-4 sentences. What did the article do well? What could be improved?",
  "reasoning": "Balanced analysis of strengths and areas for improvement. Critique and areas the article excell in as well.",
  "evidence_sentences": [
    { "quote": "exact quote from article", "impact": "why this affects credibility" }
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

