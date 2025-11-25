import { useState, useRef } from 'react';
import { AppState, TimerRefs, PageInfo, AnalysisResult, ProviderStatus, FailedProvider } from '../types/analysis';

export function useAnalysisState(): [AppState, TimerRefs, AppState & { 
  setIsAnalyzing: (value: boolean) => void;
  setIsDetectingPage: (value: boolean) => void;
  setIsPageLoading: (value: boolean) => void;
  setIsLoadingAnalysis: (value: boolean) => void;
  setError: (value: string) => void;
  setPageInfo: (value: PageInfo | null) => void;
  setAnalysis: (value: AnalysisResult[]) => void;
  setFailedProviders: (value: FailedProvider[] | string[]) => void;
  setShowButton: (value: boolean) => void;
  setSelectedProvider: (value: string) => void;
  setCurrentStep: (value: number | ((prev: number) => number)) => void;
  setProviderStatuses: (value: Record<string, ProviderStatus>) => void;
  setSelectedPage: (value: 'home' | 'settings') => void;
  setUiReady: (value: boolean) => void;
  setHasAttemptedAnalysis: (value: boolean) => void;
  setAutoStarted: (value: boolean) => void;
  setHasExistingAnalysis: (value: boolean) => void;
  setIsManualTrigger: (value: boolean) => void;
  setHasPreloadedAnalysis: (value: boolean) => void;
  setRequiresManualTrigger: (value: boolean) => void;
  setIsViewingFromRecent: (value: boolean) => void;
  setOriginalTabId: (value: number | undefined) => void;
}] {
  // Loading states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDetectingPage, setIsDetectingPage] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  
  // Data states
  const [error, setError] = useState('');
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult[]>([]);
  const [failedProviders, setFailedProviders] = useState<FailedProvider[]>([]);
  
  // UI states
  const [showButton, setShowButton] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [currentStep, setCurrentStep] = useState(0);
  const [providerStatuses, setProviderStatuses] = useState<Record<string, ProviderStatus>>({});
  const [selectedPage, setSelectedPage] = useState<'home' | 'settings'>('home');
  const [uiReady, setUiReady] = useState(false);
  
  // Analysis flow states
  const [hasAttemptedAnalysis, setHasAttemptedAnalysis] = useState(false);
  const [autoStarted, setAutoStarted] = useState(false);
  const [hasExistingAnalysis, setHasExistingAnalysis] = useState(false);
  const [isManualTrigger, setIsManualTrigger] = useState(false);
  const [hasPreloadedAnalysis, setHasPreloadedAnalysis] = useState(false);
  const [requiresManualTrigger, setRequiresManualTrigger] = useState(false);
  
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
    isLoadingAnalysis,
    error,
    pageInfo,
    analysis,
    failedProviders,
    showButton,
    selectedProvider,
    currentStep,
    providerStatuses,
    selectedPage,
    uiReady,
    hasAttemptedAnalysis,
    autoStarted,
    hasExistingAnalysis,
    isManualTrigger,
    hasPreloadedAnalysis,
    requiresManualTrigger,
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
    setIsLoadingAnalysis,
    setError,
    setPageInfo,
    setAnalysis,
    setFailedProviders,
    setShowButton,
    setSelectedProvider,
    setCurrentStep,
    setProviderStatuses,
    setSelectedPage,
    setUiReady,
    setHasAttemptedAnalysis,
    setAutoStarted,
    setHasExistingAnalysis,
    setIsManualTrigger,
    setHasPreloadedAnalysis,
    setRequiresManualTrigger,
    setIsViewingFromRecent,
    setOriginalTabId
  } as const;

  return [state, refs, setters];
}
