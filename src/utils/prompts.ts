// Frontend prompt template - used for cache key and fallback only
// The actual analysis prompts are in backend/utils/prompts.js

export const ANALYSIS_PROMPT = `ARTICLE:
URL: {url}
TITLE: {title}
CONTENT: {content}
SUPPORTING_LINKS: {supportingLinks}`;

// Function to build the prompt with article data
export function buildAnalysisPrompt(
  url: string,
  title: string,
  content: string,
  supportingLinks: string[] = []
): string {
  return ANALYSIS_PROMPT
    .replace('{url}', url)
    .replace('{title}', title)
    .replace('{content}', content)
    .replace('{supportingLinks}', supportingLinks.join(', '));
}
