// Analysis processing utilities (mirrors src/utils/analysisProcessor.ts)

export function cleanAndParseJSON(text) {
  try {
    // First try direct JSON parse
    return JSON.parse(text);
  } catch (e) {
    // If that fails, try to clean and extract JSON
    try {
      let jsonStr = text.trim();
      
      // Find the first { and last }
      const startIdx = jsonStr.indexOf('{');
      const endIdx = jsonStr.lastIndexOf('}') + 1;
      if (startIdx >= 0 && endIdx > startIdx) {
        jsonStr = jsonStr.slice(startIdx, endIdx);
      }

      // Clean up common formatting issues
      jsonStr = jsonStr
        .replace(/\\n/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/"\s*,\s*}/g, '"}')
        .replace(/,(\s*})/g, '$1')
        .replace(/\.,/g, '.')
        .replace(/\."/g, '"')
        .replace(/"\s*\.\s*$/g, '"')
        .replace(/\[\s*,/g, '[')
        .replace(/,\s*\]/g, ']');

      const parsed = JSON.parse(jsonStr);

      // Clean up the parsed object
      if (parsed.credibility_summary) {
        parsed.credibility_summary = parsed.credibility_summary
          .trim()
          .replace(/\s+/g, ' ')
          .replace(/\.,/g, '.')
          .replace(/\.+$/, '.');
      }

      if (parsed.reasoning) {
        parsed.reasoning = parsed.reasoning
          .trim()
          .replace(/\s+/g, ' ')
          .replace(/\.,/g, '.')
          .replace(/\.+$/, '.');
      }

      if (Array.isArray(parsed.evidence_sentences)) {
        parsed.evidence_sentences = parsed.evidence_sentences.map((evidence) => ({
          quote: evidence.quote?.trim().replace(/\s+/g, ' ').replace(/\.+$/, '') || '',
          impact: evidence.impact?.trim().replace(/\s+/g, ' ').replace(/\.+$/, '') || ''
        })).filter((e) => e.quote && e.impact);
      }

      if (Array.isArray(parsed.supporting_links)) {
        parsed.supporting_links = parsed.supporting_links
          .map((link) => link.trim())
          .filter(Boolean);
      }

      // Ensure credibility_score is a number between 1-100
      if (typeof parsed.credibility_score === 'string') {
        parsed.credibility_score = parseInt(parsed.credibility_score, 10);
      }
      parsed.credibility_score = Math.max(1, Math.min(100, parsed.credibility_score || 0));

      return parsed;
    } catch (e2) {
      console.error('Failed to parse cleaned JSON:', e2);
      throw new Error('Invalid JSON format');
    }
  }
}

export function processAnalysisResults(results, providers) {
  const successfulResults = results
    .map((r, i) => {
      if (r.status === 'fulfilled') {
        try {
          let parsedResult;
          if (typeof r.value === 'string') {
            try {
              parsedResult = cleanAndParseJSON(r.value);
            } catch (e) {
              console.error('Failed to parse result:', e);
              return null;
            }
          } else {
            parsedResult = r.value;
          }

          if (!parsedResult) {
            console.error('No parsed result available');
            return null;
          }

          // Validate the structure
          if (typeof parsedResult.credibility_score !== 'number' ||
              typeof parsedResult.credibility_summary !== 'string' ||
              typeof parsedResult.reasoning !== 'string' ||
              !Array.isArray(parsedResult.evidence_sentences) ||
              !Array.isArray(parsedResult.supporting_links)) {
            console.error('Invalid result structure:', parsedResult);
            return null;
          }

          return {
            provider: providers[i],
            result: parsedResult
          };
        } catch (e) {
          console.error(`Error processing result from provider ${providers[i]}:`, e);
          return null;
        }
      }
      return null;
    })
    .filter((x) => x !== null);

  const failedProviders = results
    .map((r, i) => {
      if (r.status === 'rejected') {
        console.error(`Provider ${providers[i]} failed:`, r.reason);
        return providers[i];
      }
      return null;
    })
    .filter((x) => x !== null);

  return { successfulResults, failedProviders };
}

