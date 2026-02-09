import { useEffect } from 'react';
import { AppState, TimerRefs, PageInfo, AnalysisResult } from '../types/analysis';

interface MessageHandlerProps {
  state: AppState;
  refs: TimerRefs;
  setters: {
    setPageInfo: (value: PageInfo | null) => void;
    setAnalysis: (value: AnalysisResult[]) => void;
    setFailedProviders: (value: string[]) => void;
    setIsAnalyzing: (value: boolean) => void;
    setIsDetectingPage: (value: boolean) => void;
    setHasExistingAnalysis: (value: boolean) => void;
    setIsViewingFromRecent: (value: boolean) => void;
    setOriginalTabId: (value: number | undefined) => void;
    setHasPreloadedAnalysis: (value: boolean) => void;
    setIsPageLoading: (value: boolean) => void;
    setIsManualTrigger: (value: boolean) => void;
    setError: (value: string) => void;
  };
}

export function useMessageHandlers({ state, refs, setters }: MessageHandlerProps) {
  // Listen for preloaded analysis from content script
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PRELOADED_ANALYSIS') {
        const analysisData = event.data.data;
        
        // Set the analysis data directly without going through loading state
        // Clear any loading flags first to avoid infinite spinner when opening from history
        setters.setIsPageLoading(false);
        setters.setIsAnalyzing(false);
        setters.setIsDetectingPage(false);

        setters.setPageInfo(analysisData.pageInfo);
        setters.setAnalysis(analysisData.analysis || []);
        setters.setFailedProviders(analysisData.failedProviders || []);
        setters.setHasExistingAnalysis((analysisData.analysis || []).length > 0);
        setters.setIsViewingFromRecent(analysisData.isViewingFromRecent || false);
        setters.setOriginalTabId(analysisData.originalTabId);
        setters.setHasPreloadedAnalysis(true);
        
        // Reset the analysis trigger ref to prevent auto-analysis
        refs.analysisTriggeredRef.current = true;
      } else if (event.data?.type === 'TRIGGER_NEW_ANALYSIS') {
        
        // Check if we already have preloaded analysis - if so, ignore this trigger
        if (state.hasPreloadedAnalysis || state.isViewingFromRecent) {
          return;
        }
        
        // If already triggered, ignore duplicate messages (content script may retry)
        if (state.isManualTrigger && (state.isAnalyzing || state.isPageLoading || state.isDetectingPage)) {
          return;
        }
        
        setters.setIsManualTrigger(true);
        // Reset state for new analysis
        setters.setError('');
        setters.setAnalysis([]);
        setters.setFailedProviders([]);
        // Reset pageInfo to trigger fresh loading
        setters.setPageInfo(null);
        // Set loading state immediately to show spinner while we prepare
        setters.setIsPageLoading(true);
        setters.setIsAnalyzing(false);
        setters.setIsDetectingPage(false);
        // Reset analysis triggered ref to allow new analysis
        refs.analysisTriggeredRef.current = false;
      } else if (event.data?.type === 'TRIGGER_RESET') {
        // Reset state and ensure we go to welcome page
        resetState();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setters, refs, state.hasPreloadedAnalysis, state.isViewingFromRecent, state.isManualTrigger, state.isAnalyzing, state.isPageLoading, state.isDetectingPage]);

  // Listen for messages from background script
  useEffect(() => {
    const handleMessages = (message: any) => {
      if (message.type === 'TAB_SWITCHED') {
        // Only reset manual trigger flag if we're not viewing from recent (history)
        if (!state.isViewingFromRecent) {
          setters.setIsManualTrigger(false);
        }
      }

      // Handle tab loading state updates
      if (message.type === 'TAB_LOADING_STATE') {
        // Only update loading state if we're not viewing from recent
        if (!state.isViewingFromRecent) {
          setters.setIsPageLoading(message.isLoading);
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleMessages);
    return () => chrome.runtime.onMessage.removeListener(handleMessages);
  }, [state.isViewingFromRecent, setters]);

  // Helper function to reset state
  const resetState = () => {
    setters.setError('');
    setters.setPageInfo(null);
    setters.setAnalysis([]);
    setters.setFailedProviders([]);
    setters.setIsAnalyzing(false);
    setters.setIsPageLoading(false);
    setters.setIsViewingFromRecent(false);
    setters.setOriginalTabId(undefined);
    setters.setHasExistingAnalysis(false);
    setters.setIsManualTrigger(false);
    setters.setHasPreloadedAnalysis(false);
    
    // Reset the analysis trigger ref
    refs.analysisTriggeredRef.current = false;
  };

  return { resetState };
}
