import { useState, useRef } from 'react';
import { AppState, TimerRefs, PageInfo, AnalysisResult, FailedProvider } from '../types/analysis';

export function useAnalysisState(): [AppState, TimerRefs, AppState & { 
  setIsAnalyzing: (value: boolean) => void;
  setIsDetectingPage: (value: boolean) => void;
  setIsPageLoading: (value: boolean) => void;
  setError: (value: string) => void;
  setPageInfo: (value: PageInfo | null) => void;
  setAnalysis: (value: AnalysisResult[]) => void;
  setFailedProviders: (value: FailedProvider[] | string[]) => void;
  setSelectedProvider: (value: string) => void;
  setUiReady: (value: boolean) => void;
  setAutoStarted: (value: boolean) => void;
  setHasExistingAnalysis: (value: boolean) => void;
  setIsManualTrigger: (value: boolean) => void;
  setHasPreloadedAnalysis: (value: boolean) => void;
  setIsViewingFromRecent: (value: boolean) => void;
  setOriginalTabId: (value: number | undefined) => void;
}] {
  // Loading states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDetectingPage, setIsDetectingPage] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);
  
  // Data states
  const [error, setError] = useState('');
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult[]>([]);
  const [failedProviders, setFailedProviders] = useState<FailedProvider[]>([]);
  
  // UI states
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [uiReady, setUiReady] = useState(false);
  
  // Analysis flow states
  const [autoStarted, setAutoStarted] = useState(false);
  const [hasExistingAnalysis, setHasExistingAnalysis] = useState(false);
  const [isManualTrigger, setIsManualTrigger] = useState(false);
  const [hasPreloadedAnalysis, setHasPreloadedAnalysis] = useState(false);
  
  // Navigation states
  const [isViewingFromRecent, setIsViewingFromRecent] = useState(false);
  const [originalTabId, setOriginalTabId] = useState<number | undefined>();

  // Refs
  const requestIdRef = useRef(0);
  const analysisTriggeredRef = useRef(false);

  const state: AppState = {
    isAnalyzing,
    isDetectingPage,
    isPageLoading,
    error,
    pageInfo,
    analysis,
    failedProviders,
    selectedProvider,
    uiReady,
    autoStarted,
    hasExistingAnalysis,
    isManualTrigger,
    hasPreloadedAnalysis,
    isViewingFromRecent,
    originalTabId
  };

  const refs: TimerRefs = {
    requestIdRef,
    analysisTriggeredRef
  };

  const setters = {
    ...state,
    setIsAnalyzing,
    setIsDetectingPage,
    setIsPageLoading,
    setError,
    setPageInfo,
    setAnalysis,
    setFailedProviders,
    setSelectedProvider,
    setUiReady,
    setAutoStarted,
    setHasExistingAnalysis,
    setIsManualTrigger,
    setHasPreloadedAnalysis,
    setIsViewingFromRecent,
    setOriginalTabId
  } as const;

  return [state, refs, setters];
}
