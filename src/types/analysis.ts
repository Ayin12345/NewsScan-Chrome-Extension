// Analysis-related type definitions

export interface PageInfo {
  title: string;
  content: string;
  url: string;
  wordCount: number;
}

export interface AnalysisResult {
  provider: string;
  result: {
    credibility_score: number;
    credibility_summary: string;
    reasoning: string;
    evidence_sentences: Array<{
      quote: string;
      impact: string;
    }>;
    supporting_links: string[];
  };
}

export interface FailedProvider {
  provider: string;
  error: string;
  errorCode?: string;
  details?: Record<string, any>;
}

export interface AppState {
  // Loading states
  isAnalyzing: boolean;
  isDetectingPage: boolean;
  isPageLoading: boolean;
  
  // Data states
  error: string;
  pageInfo: PageInfo | null;
  analysis: AnalysisResult[];
  failedProviders: FailedProvider[];
  
  // UI states
  selectedProvider: string;
  uiReady: boolean;
  
  // Analysis flow states
  autoStarted: boolean;
  hasExistingAnalysis: boolean;
  isManualTrigger: boolean;
  hasPreloadedAnalysis: boolean;
  
  // Navigation states
  isViewingFromRecent: boolean;
  originalTabId?: number;
}

export interface TimerRefs {
  requestIdRef: React.MutableRefObject<number>;
  analysisTriggeredRef: React.MutableRefObject<boolean>;
}
