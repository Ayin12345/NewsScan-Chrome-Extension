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

// Gemini prompt — journalism quality; avoid false "fabrication" when recency / grounding lags
export const GEMINI_PROMPT = `You are a fair journalism analyst. Evaluate this article's JOURNALISTIC QUALITY only. Return ONLY valid JSON.

CURRENT MOMENT (stories from today or yesterday often describe events that already occurred in the real world): {currentDateTime}
Calendar date: {currentDate}.

=== GOOGLE SEARCH — RECENT & BREAKING NEWS ===
You have Google Search. Whenever the article depends on what is happening NOW or VERY RECENTLY (breaking news, sports results, disasters, policy moves, markets, conflicts, trials, product launches, scientific findings, weather, any dated outcome or status):
1. Run a targeted search on the main subject (e.g. headline keywords + date or "latest") BEFORE you claim something "has not happened yet," is "premature," "unverified," "still unfolding," or similar.
2. If search confirms the situation the article describes, treat that reporting as normal journalism — not fabrication.
3. If search is empty, slow, or ambiguous, do NOT invent that the event is still pending or the article is ahead of reality. Default: judge writing, sourcing, and structure; do not punish because you lack confirmation.
4. Hedged or analytical language ("on track," "expected to," "sources say," "breaking," "reports indicate") is standard news — never call it fabrication or misleading unless search proves a concrete factual error (wrong party, wrong date, wrong figure).

=== NEVER DO THIS ===
- Do NOT accuse the article of fabrication, hoax, or intentional deception for ordinary reporting on fast-moving or controversial topics.
- Do NOT lower the score because your knowledge is stale or search returned little — score journalistic quality, not your certainty about the world.
- Use search for time-sensitive claims; do not rely on training cutoff alone to dispute the article.

EVALUATE JOURNALISM QUALITY:
Source quality, balance, clarity (fact vs opinion), structure, completeness.

SCORING:
- Solid reporting from credible outlets: typically 70–92.
- Below 55 only for clear journalistic failure — not because you disagree with or cannot verify breaking details.
- Controversial or political content is not a reason to score low.

ARTICLE:
URL: {url}
TITLE: {title}
CONTENT: {content}

{
  "credibility_score": (1-100),
  "credibility_summary": "3-4 sentences on strengths and improvements. Do not claim events are unfinished unless search supports it.",
  "reasoning": "Balanced strengths and weaknesses. Mention search only if you used it for recency; do not guess real-world status from silence.",
  "evidence_sentences": [
    { "quote": "exact quote from article", "impact": "why this affects credibility" }
  ],
  "supporting_links": []
}

CRITICAL: No [1] citation markers or markdown links inside JSON string values.
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
  const now = new Date();
  const currentDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const currentDateTime = now.toISOString();

  return GEMINI_PROMPT
    .replace(/{currentDateTime}/g, currentDateTime)
    .replace(/{currentDate}/g, currentDate)
    .replace(/{url}/g, url)
    .replace(/{title}/g, title)
    .replace(/{content}/g, content)
    .replace(
      '"supporting_links": []',
      `"supporting_links": [${supportingLinks.map(link => `"${link}"`).join(', ')}]`
    );
}

