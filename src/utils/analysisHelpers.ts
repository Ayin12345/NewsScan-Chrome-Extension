// Analysis helper functions and utilities

export function shouldSkipAutoAnalysis(
  isManualTrigger: boolean,
  isViewingFromRecent: boolean,
  hasExistingAnalysis: boolean,
  hasPreloadedAnalysis: boolean,
  requiresManualTrigger: boolean,
  pageUrl: string
): { shouldSkip: boolean; reason: string } {
  // Never auto-analyze unless extension icon was clicked
  if (!isManualTrigger) {
    return { 
      shouldSkip: true, 
      reason: 'NO_MANUAL_TRIGGER' 
    };
  }

  // Don't auto-analyze certain pages
  const skipAnalysisPages = [
    'console.cloud.google.com',
    'developers.google.com',
    'apis.google.com',
    'www.googleapis.com',
    'chrome://',
    'chrome-extension://',
    'moz-extension://',
    'edge://',
    'about://',
    'chrome-devtools://',
    'devtools://'
  ];
  
  const shouldSkipPage = skipAnalysisPages.some(page => 
    pageUrl.includes(page)
  );
  
  if (shouldSkipPage) {
    return { 
      shouldSkip: true, 
      reason: 'RESTRICTED_PAGE' 
    };
  }

  // Additional safeguards
  if (isViewingFromRecent || hasExistingAnalysis || hasPreloadedAnalysis || (requiresManualTrigger && !isManualTrigger)) {
    return { 
      shouldSkip: true, 
      reason: isViewingFromRecent ? 'VIEWING_FROM_RECENT' : 
              hasExistingAnalysis ? 'HAS_EXISTING_ANALYSIS' :
              hasPreloadedAnalysis ? 'HAS_PRELOADED_ANALYSIS' :
              'REQUIRES_MANUAL_TRIGGER'
    };
  }

  return { shouldSkip: false, reason: '' };
}

export function shouldExpandSidebar(
  analysisLength: number,
  isAnalyzing: boolean
): boolean {
  return analysisLength > 0 && !isAnalyzing;
}

export function getProvidersFromEnvironment(): string[] {
  return ["OpenAI", "Gemini"];
}
