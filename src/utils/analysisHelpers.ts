// Analysis helper functions and utilities

export function createTimerFunctions(timersRef: React.MutableRefObject<Record<string, number>>) {
  const startTimer = (label: string) => {
    timersRef.current[label] = Date.now();
    console.log(`[FNR][TIMER][START] ${label}`);
  };

  const endTimer = (label: string) => {
    const t = timersRef.current[label];
    if (t) {
      const ms = Date.now() - t;
      console.log(`[FNR][TIMER][END] ${label} = ${ms}ms`);
      delete timersRef.current[label];
    } else {
      console.log(`[FNR][TIMER][END] ${label} (no start)`);
    }
  };

  return { startTimer, endTimer };
}


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
  isAnalyzing: boolean,
  isViewingFromSimilar: boolean
): boolean {
  return analysisLength > 0 && !isAnalyzing && !isViewingFromSimilar;
}

export function getProvidersFromEnvironment(): string[] {
  try {
    return JSON.parse(import.meta.env.VITE_AI_ROUTERS || '["OpenAI","Gemini"]');
  } catch (error) {
    console.warn('Failed to parse VITE_AI_ROUTERS, using fallback:', error);
    return ["OpenAI", "Gemini"];
  }
}
