import { useEffect } from 'react';
import { AppState, TimerRefs, PageInfo, AnalysisResult } from '../types/analysis';

interface MessageHandlerProps {
  state: AppState;
  refs: TimerRefs;
  setters: {
    setPageInfo: (value: PageInfo | null) => void;
    setAnalysis: (value: AnalysisResult[]) => void;
    setFailedProviders: (value: string[]) => void;
    setShowButton: (value: boolean) => void;
    setIsAnalyzing: (value: boolean) => void;
    setIsDetectingPage: (value: boolean) => void;
    setHasAttemptedAnalysis: (value: boolean) => void;
    setHasExistingAnalysis: (value: boolean) => void;
    setIsViewingFromRecent: (value: boolean) => void;
    setOriginalTabId: (value: number | undefined) => void;
    setHasPreloadedAnalysis: (value: boolean) => void;
    setRequiresManualTrigger: (value: boolean) => void;
    setIsPageLoading: (value: boolean) => void;
    setIsManualTrigger: (value: boolean) => void;
    setProviderStatuses: (value: Record<string, 'waiting' | 'analyzing' | 'complete' | 'failed'>) => void;
    setSelectedPage: (value: 'home' | 'settings') => void;
    setError: (value: string) => void;
  };
}

export function useMessageHandlers({ state, refs, setters }: MessageHandlerProps) {
  // Listen for preloaded analysis from content script
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('📨 Sidepanel received message:', event.data?.type, event.data);
      
      if (event.data?.type === 'PRELOADED_ANALYSIS') {
        console.log('🎯 PRELOADED_ANALYSIS message received in sidepanel!');
        const analysisData = event.data.data;
        console.log('📄 Analysis data:', {
          hasPageInfo: !!analysisData.pageInfo,
          hasAnalysis: !!analysisData.analysis,
          analysisLength: analysisData.analysis?.length || 0,
          isViewingFromRecent: analysisData.isViewingFromRecent
        });
        
        // Set the analysis data directly without going through loading state
        // Clear any loading flags first to avoid infinite spinner when opening from history
        setters.setIsPageLoading(false);
        setters.setIsAnalyzing(false);
        setters.setIsDetectingPage(false);

        setters.setPageInfo(analysisData.pageInfo);
        setters.setAnalysis(analysisData.analysis || []);
        setters.setFailedProviders(analysisData.failedProviders || []);
        setters.setShowButton(false);
        setters.setHasAttemptedAnalysis(true);
        setters.setHasExistingAnalysis((analysisData.analysis || []).length > 0);
        setters.setIsViewingFromRecent(analysisData.isViewingFromRecent || false);
        setters.setOriginalTabId(analysisData.originalTabId);
        setters.setHasPreloadedAnalysis(true);
        setters.setRequiresManualTrigger(false);
        
        // Reset the analysis trigger ref to prevent auto-analysis
        refs.analysisTriggeredRef.current = true;
        console.log('✅ Preloaded analysis state set successfully');
      } else if (event.data?.type === 'TRIGGER_NEW_ANALYSIS') {
        console.log('🚨 TRIGGER_NEW_ANALYSIS message received');
        
        // Check if we already have preloaded analysis - if so, ignore this trigger
        if (state.hasPreloadedAnalysis || state.isViewingFromRecent) {
          console.log('🛡️ IGNORING TRIGGER_NEW_ANALYSIS because we have preloaded analysis or are viewing from recent');
          return;
        }
        
        console.log('🚨 TRIGGER_NEW_ANALYSIS will override preloaded analysis!');
        setters.setIsManualTrigger(true);
        // Reset state for new analysis
        setters.setError('');
        setters.setAnalysis([]);
        setters.setFailedProviders([]);
        setters.setShowButton(true);
        // Reset pageInfo to trigger fresh loading
        setters.setPageInfo(null);
        // Reset analysis triggered ref to allow new analysis
        refs.analysisTriggeredRef.current = false;
      } else if (event.data?.type === 'TRIGGER_RESET') {
        // Reset state and ensure we go to welcome page
        resetState();
        setters.setSelectedPage('home');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setters, refs]);

  // Listen for messages from background script
  useEffect(() => {
    const handleMessages = (message: any) => {
      if (message.type === 'TAB_SWITCHED') {
        // Only reset manual trigger flag if we're not viewing from recent (history)
        if (!state.isViewingFromRecent) {
          setters.setIsManualTrigger(false);
        }
      }

      // Handle real-time provider updates
      if (message.type === 'PROVIDER_UPDATE') {
        const updated: Record<string, 'waiting' | 'analyzing' | 'complete' | 'failed'> = {
          ...state.providerStatuses,
          [message.provider]: message.status as 'waiting' | 'analyzing' | 'complete' | 'failed'
        };
        setters.setProviderStatuses(updated);
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

  // Helper function to reset state (would need to be passed in or defined elsewhere)
  const resetState = () => {
    setters.setError('');
    setters.setPageInfo(null);
    setters.setAnalysis([]);
    setters.setFailedProviders([]);
    setters.setShowButton(true);
    setters.setIsAnalyzing(false);
    setters.setIsPageLoading(false);
    setters.setIsViewingFromRecent(false);
    setters.setOriginalTabId(undefined);
    setters.setHasExistingAnalysis(false);
    setters.setIsManualTrigger(false);
    setters.setHasPreloadedAnalysis(false);
    setters.setRequiresManualTrigger(false);
    
    // Reset the analysis trigger ref
    refs.analysisTriggeredRef.current = false;
  };

  return { resetState };
}
