import React, { useEffect, useState, useCallback } from 'react';
import { AnalysisResults } from './components/AnalysisResults';
import { AnalysisLoadingState, ErrorState } from './components/LoadingStates';
import { useAnalysisState } from '../../hooks/useAnalysisState';
import { useMessageHandlers } from '../../hooks/useMessageHandlers';
import { shouldSkipAutoAnalysis, shouldExpandSidebar } from '../../utils/analysisHelpers';
import { getPageInfo, analyzeArticle, loadAnalysisForUrl } from '../../utils/analysisOperations';
import styles from './styles/App.module.css';

function App() {
  const [state, refs, setters] = useAnalysisState();
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [tabStateChecked, setTabStateChecked] = useState(false);
  const { resetState } = useMessageHandlers({ state, refs, setters });

  // Listen for provider updates
  useEffect(() => {
    const handleProviderUpdate = (message: { type: string; status: string; error?: string }) => {
      if (message.type === 'PROVIDER_UPDATE' && message.status === 'failed') {
        // First clear any loading states
        setters.setIsAnalyzing(false);
        setters.setIsPageLoading(false);
        setters.setIsDetectingPage(false);
        
        // Then set the error
        setters.setError(message.error || 'Analysis failed. Please try again.');
      }
    };

    chrome.runtime.onMessage.addListener(handleProviderUpdate);
    return () => chrome.runtime.onMessage.removeListener(handleProviderUpdate);
  }, [
    setters.setIsAnalyzing,
    setters.setIsPageLoading,
    setters.setIsDetectingPage,
    setters.setError,
  ]);

  // Handle page info loading with manual trigger support
  const handleGetPageInfo = useCallback(async (isManualTrigger = false) => {
    await getPageInfo(
      isManualTrigger,
      {
        setError: setters.setError,
        setPageInfo: setters.setPageInfo,
        setAnalysis: setters.setAnalysis,
        setFailedProviders: setters.setFailedProviders,
        setIsDetectingPage: setters.setIsDetectingPage,
        setIsPageLoading: setters.setIsPageLoading,
      },
      {
        isViewingFromRecent: state.isViewingFromRecent,
        hasExistingAnalysis: state.hasExistingAnalysis,
        hasPreloadedAnalysis: state.hasPreloadedAnalysis,
      },
      {
        analysisTriggeredRef: refs.analysisTriggeredRef,
      }
    );
  }, [
    state.isViewingFromRecent,
    state.hasExistingAnalysis,
    state.hasPreloadedAnalysis,
    refs.analysisTriggeredRef,
    setters.setError,
    setters.setPageInfo,
    setters.setAnalysis,
    setters.setFailedProviders,
    setters.setIsDetectingPage,
    setters.setIsPageLoading,
  ]);

  // Handle article analysis
  const handleAnalyzeArticle = useCallback(async () => {
    await analyzeArticle(
      state.pageInfo,
      refs.requestIdRef,
      {
        setError: setters.setError,
        setAnalysis: setters.setAnalysis,
        setFailedProviders: setters.setFailedProviders,
        setSelectedProvider: setters.setSelectedProvider,
        setIsAnalyzing: setters.setIsAnalyzing,
        setIsDetectingPage: setters.setIsDetectingPage,
        setHasExistingAnalysis: setters.setHasExistingAnalysis,
        setIsPageLoading: setters.setIsPageLoading,
      },
      {
        isManualTrigger: state.isManualTrigger,
        isViewingFromRecent: state.isViewingFromRecent,
        hasPreloadedAnalysis: state.hasPreloadedAnalysis,
      }
    );
  }, [
    state.pageInfo,
    state.isManualTrigger,
    state.isViewingFromRecent,
    state.hasPreloadedAnalysis,
    refs.requestIdRef,
    setters.setError,
    setters.setAnalysis,
    setters.setFailedProviders,
    setters.setSelectedProvider,
    setters.setIsAnalyzing,
    setters.setIsDetectingPage,
    setters.setHasExistingAnalysis,
    setters.setIsPageLoading,
  ]);

  // Track tab visibility for UI key changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      const wasHidden = document.hidden;
      setIsTabVisible(!wasHidden);
      
      // When tab becomes visible again, check if we need to expand sidebar
      if (!wasHidden) {
        const isLoading = state.isAnalyzing || state.isDetectingPage || state.isPageLoading;
        const shouldExpand = shouldExpandSidebar(state.analysis.length, state.isAnalyzing) && !isLoading;
        
        if (shouldExpand) {
          // Small delay to ensure tab is fully visible
          setTimeout(() => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              const currentTab = tabs[0];
              if (currentTab?.id) {
                chrome.tabs.sendMessage(currentTab.id, { 
                  type: 'EXPAND_FOR_ANALYSIS',
                  expanded: true 
                }).catch(() => {
                  // Ignore errors if content script isn't ready
                });
              }
            });
          }, 100);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state.analysis.length, state.isAnalyzing, state.isDetectingPage, state.isPageLoading]);

  // Initialize UI
  useEffect(() => {
    let mounted = true;
    
    const initializeUI = async () => {
      try {
        if (!mounted) return;
        setters.setUiReady(true);
        setIsReady(true);
      } catch (error) {
        console.error('UI initialization failed:', error);
        if (!mounted) return;

        setters.setIsAnalyzing(false);
        setters.setIsPageLoading(false);
        setters.setIsDetectingPage(false);
        setters.setError('Failed to initialize. Please try again.');
        setters.setUiReady(true);
        setIsReady(true);
      }
    };

    initializeUI();

    return () => {
      mounted = false;
    };
  }, [setters.setUiReady]);

  // Safeguard: If we're stuck in an invalid state (no loading, no results, no error) for too long, show an error
  useEffect(() => {
    const isLoading = state.isAnalyzing || state.isDetectingPage || state.isPageLoading;
    const hasResults = state.analysis.length > 0;
    const hasError = !!state.error;
    
    // Only run safeguard if we're in a bad state and UI is ready
    if (!state.uiReady || isLoading || hasResults || hasError) {
      return;
    }
    
    // Give time for normal flow to complete - if we're still in bad state after 3s, set error
    // The effect will be cancelled and re-run if state changes, so this only fires if truly stuck
    const safeguardTimer = setTimeout(() => {
      setters.setError('Analysis could not be started. Please try again.');
    }, 3000);
    
    return () => clearTimeout(safeguardTimer);
  }, [state.uiReady, state.isAnalyzing, state.isDetectingPage, state.isPageLoading, state.analysis.length, state.error, setters.setError]);

  // Early-load background tab state to detect history/preloaded flows before any auto-start
  useEffect(() => {
    let cancelled = false;
    // Fail-safe: if background never responds, unblock auto-start after a short delay
    const failSafe = setTimeout(() => {
      if (!cancelled) {
        setTabStateChecked(true);
      }
    }, 1200);
    const loadTabStateEarly = () => {
      try {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const currentTab = tabs[0];
          if (!currentTab?.id) return;
          chrome.runtime.sendMessage({ type: 'GET_TAB_STATE', tabId: currentTab.id }, (response) => {
            if (cancelled) return;
            if (response?.success && response.data) {
              const s = response.data;
              // If background marked this tab as history/preloaded, set flags and data immediately
              if (s.isViewingFromRecent || s.hasPreloadedAnalysis) {
                // Clear all loading states to avoid spinner flips
                setters.setIsAnalyzing(false);
                setters.setIsPageLoading(false);
                setters.setIsDetectingPage(false);
                // Apply data if present
                if (s.pageInfo) setters.setPageInfo(s.pageInfo);
                if (Array.isArray(s.analysis)) setters.setAnalysis(s.analysis);
                setters.setFailedProviders(s.failedProviders || []);
                setters.setHasExistingAnalysis((s.analysis || []).length > 0);
                setters.setIsViewingFromRecent(!!s.isViewingFromRecent);
                setters.setOriginalTabId(s.originalTabId);
                setters.setHasPreloadedAnalysis(!!s.hasPreloadedAnalysis);
                // Prevent any auto-triggers
                refs.analysisTriggeredRef.current = true;
              }
            }
            // Mark that the tab state check completed (success or not)
            setTabStateChecked(true);
            clearTimeout(failSafe);
          });
        });
      } catch {}
    };
    loadTabStateEarly();
    return () => { cancelled = true; clearTimeout(failSafe); };
  }, []);

  // Auto-start analysis when UI is ready (but only if no analysis and not viewing history/preloaded)
  useEffect(() => {
    let mounted = true;

    const startAnalysis = async () => {
      if (
        state.uiReady &&
        tabStateChecked &&
        !state.autoStarted &&
        state.analysis.length === 0 &&
        !state.isViewingFromRecent &&
        !state.hasPreloadedAnalysis
      ) {
        try {
          setters.setAutoStarted(true);
          await handleGetPageInfo();
        } catch (error) {
          console.error('Auto-analysis failed:', error);
          if (!mounted) return;

          setters.setError('Failed to start analysis. Please try again.');
          setters.setIsPageLoading(false);
          setters.setIsDetectingPage(false);
          setters.setAutoStarted(false);
        }
      }
    };

    startAnalysis();

    return () => {
      mounted = false;
    };
  }, [
    state.uiReady,
    tabStateChecked,
    state.autoStarted,
    handleGetPageInfo,
    setters.setError,
    setters.setIsPageLoading,
    setters.setIsDetectingPage,
    setters.setAutoStarted,
  ]);

  // Handle manual trigger for page info loading (skip while viewing history)
  useEffect(() => {
    let mounted = true;

    const handleManualTrigger = async () => {
      if (
        state.isManualTrigger &&
        !state.pageInfo &&
        !state.isPageLoading &&
        !state.isViewingFromRecent &&
        !state.hasPreloadedAnalysis
      ) {
        try {
          await handleGetPageInfo(true);
        } catch (error) {
          console.error('Manual trigger failed:', error);
          if (!mounted) return;

          setters.setError('Failed to analyze page. Please try again.');
          setters.setIsPageLoading(false);
          setters.setIsDetectingPage(false);
          setters.setIsManualTrigger(false);
        }
      }
    };

    handleManualTrigger();

    return () => {
      mounted = false;
    };
  }, [
    state.isManualTrigger,
    state.pageInfo,
    state.isPageLoading,
    state.isViewingFromRecent,
    state.hasPreloadedAnalysis,
    handleGetPageInfo,
    setters.setError,
    setters.setIsPageLoading,
    setters.setIsDetectingPage,
    setters.setIsManualTrigger,
  ]);

  // Handle auto-analysis logic (disabled while viewing history or preloaded)
  useEffect(() => {
    let mounted = true;

    const startAutoAnalysis = async () => {
      if (
        state.autoStarted &&
        state.pageInfo &&
        state.analysis.length === 0 &&
        !refs.analysisTriggeredRef.current &&
        !state.isViewingFromRecent &&
        !state.hasPreloadedAnalysis
      ) {
        try {
          const skipCheck = shouldSkipAutoAnalysis(
            state.isManualTrigger,
            state.isViewingFromRecent,
            state.hasExistingAnalysis,
            state.hasPreloadedAnalysis,
            state.pageInfo.url
          );

          if (skipCheck.shouldSkip) {
            setters.setIsAnalyzing(false);
            setters.setIsPageLoading(false);
            setters.setIsDetectingPage(false);
            
            // Set appropriate error based on skip reason
            if (skipCheck.reason === 'RESTRICTED_PAGE') {
              setters.setError('This page cannot be analyzed (restricted page type).');
            } else if (skipCheck.reason === 'NO_MANUAL_TRIGGER') {
              // This shouldn't happen in normal flow - set error to make it visible
              setters.setError('Analysis was not triggered. Please try clicking the extension icon again.');
            }
            // For other reasons (VIEWING_FROM_RECENT, HAS_EXISTING_ANALYSIS, HAS_PRELOADED_ANALYSIS)
            // these are expected states, not errors
            return;
          }
          
          refs.analysisTriggeredRef.current = true;
          await handleAnalyzeArticle();
        } catch (error) {
          console.error('Auto-analysis failed:', error);
          if (!mounted) return;

          const errorMessage = error instanceof Error ? error.message : 'Failed to analyze article. Please try again.';
          setters.setError(errorMessage);
          setters.setIsAnalyzing(false);
          setters.setIsPageLoading(false);
          setters.setIsDetectingPage(false);
          refs.analysisTriggeredRef.current = false;
        }
      }
    };

    startAutoAnalysis();

    return () => {
      mounted = false;
    };
  }, [
    state.autoStarted,
    state.pageInfo,
    state.analysis.length,
    state.isViewingFromRecent,
    state.isManualTrigger,
    state.hasExistingAnalysis,
    state.hasPreloadedAnalysis,
    handleAnalyzeArticle,
    setters.setError,
    setters.setIsAnalyzing,
    setters.setIsPageLoading,
    setters.setIsDetectingPage,
  ]);


  // Auto-expand sidebar when analysis results are available
  useEffect(() => {
    // Only expand if we have analysis AND we're not in any loading state
    // This prevents expansion before loading screen clears
    const isLoading = state.isAnalyzing || state.isDetectingPage || state.isPageLoading;
    const shouldExpand = shouldExpandSidebar(state.analysis.length, state.isAnalyzing) && !isLoading;
    
    // Only send expansion messages if the tab is visible (user is viewing the tab)
    if (!isTabVisible) {
      return;
    }
    
    if (shouldExpand) {
      // Trigger expansion by sending a message to content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (currentTab?.id) {
          chrome.tabs.sendMessage(currentTab.id, { 
            type: 'EXPAND_FOR_ANALYSIS',
            expanded: true 
          }).catch(() => {
            // Ignore errors if content script isn't ready
          });
        }
      });
    } else if (state.analysis.length === 0 && !isLoading) {
      // Collapse when analysis is cleared and not loading
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (currentTab?.id) {
          chrome.tabs.sendMessage(currentTab.id, { 
            type: 'EXPAND_FOR_ANALYSIS',
            expanded: false 
          }).catch(() => {
            // Ignore errors if content script isn't ready
          });
        }
      });
    }
  }, [state.analysis.length, state.isAnalyzing, state.isDetectingPage, state.isPageLoading, isTabVisible]);



  // Handle "Done" button click
  const handleNewAnalysis = () => {
    if (state.isViewingFromRecent) {
      // Close the current tab and switch back to original tab if viewing from recent analysis
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (currentTab?.id) {
          if (state.originalTabId) {
            chrome.tabs.update(state.originalTabId, { active: true }, () => {
              if (currentTab.id) {
                chrome.tabs.remove(currentTab.id);
              }
            });
          } else {
            chrome.tabs.remove(currentTab.id);
          }
        }
      });
    } else {
      // Reset internal/background state
      resetState();
      // Ask content script to remove the injected sidebar
      try {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const activeTab = tabs[0];
          if (activeTab?.id) {
            chrome.tabs.sendMessage(activeTab.id, { type: 'TOGGLE_INJECTED_SIDEBAR', keepOpen: false });
          }
        });
      } catch (e) {
        console.warn('Failed to send close message to content script', e);
      }
    }
  };

  // Handle loading analysis for URL
  const handleLoadAnalysisForUrl = async (url: string, timestamp?: number) => {
    await loadAnalysisForUrl(url, timestamp, {
      setError: setters.setError,
    });
  };

  // Handle retry on error - properly trigger a new analysis
  const handleRetry = () => {
    if (!state.isViewingFromRecent) {
      // Reset state for fresh analysis
      setters.setError('');
      setters.setAnalysis([]);
      setters.setFailedProviders([]);
      setters.setPageInfo(null);
      setters.setIsManualTrigger(true);
      setters.setHasPreloadedAnalysis(false);
      setters.setHasExistingAnalysis(false);
      refs.analysisTriggeredRef.current = false;
      
      // Start the analysis
      handleGetPageInfo(true);
    }
  };


  // Don't render anything until we're ready
  if (!isReady) {
    return null;
  }

  // Determine if we're in any loading state
  const isLoading = state.isAnalyzing || state.isDetectingPage || state.isPageLoading;

  return (
    <div className={`${styles.container}`} key={isTabVisible ? 'visible' : 'hidden'}>
      {isLoading && <AnalysisLoadingState key="loading" />}

      {!isLoading && (
        <div className={styles.content}>
          {state.analysis.length > 0 ? (
            <AnalysisResults 
              analysis={state.analysis}
              selectedProvider={state.selectedProvider}
              onProviderSelect={setters.setSelectedProvider}
              onNewAnalysis={handleNewAnalysis}
              isViewingFromRecent={state.isViewingFromRecent}
              onLoadAnalysisForUrl={handleLoadAnalysisForUrl}
            />
          ) : (
            <ErrorState
              error={state.error || 'Analysis could not be started. Please try again.'}
              onRetry={handleRetry}
              canRetry={!state.isViewingFromRecent}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default App;
