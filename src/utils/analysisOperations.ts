import { PageInfo, AnalysisResult, FailedProvider } from '../types/analysis';
import { getProvidersFromEnvironment } from './analysisHelpers';
import { setStorage, getStorage } from './storage';
import { callBackendWebSearch } from './backendClient';
import { buildAnalysisPrompt } from './prompts';

export async function getPageInfo(
  isManualTrigger = false,
  setters: {
    setError: (value: string) => void;
    setPageInfo: (value: PageInfo | null) => void;
    setAnalysis: (value: AnalysisResult[]) => void;
    setFailedProviders: (value: FailedProvider[] | string[]) => void;
    setShowButton: (value: boolean) => void;
    setHasAttemptedAnalysis: (value: boolean) => void;
    setIsDetectingPage: (value: boolean) => void;
    setIsPageLoading: (value: boolean) => void;
  },
  guardConditions: {
    isViewingFromRecent: boolean;
    hasExistingAnalysis: boolean;
    hasPreloadedAnalysis: boolean;
    requiresManualTrigger: boolean;
  },
  refs: {
    analysisTriggeredRef: React.MutableRefObject<boolean>;
  }
): Promise<void> {
  // Don't get page info if we're viewing from recent analysis
  if (guardConditions.isViewingFromRecent) {
    return;
  }

  // Don't get page info if we already have existing analysis (unless manually triggered)
  if (guardConditions.hasExistingAnalysis && !isManualTrigger) {
    return;
  }

  // Don't get page info if we have preloaded analysis
  if (guardConditions.hasPreloadedAnalysis && !isManualTrigger) {
    return;
  }

  // Don't get page info if this tab requires manual trigger (unless manually triggered)
  if (guardConditions.requiresManualTrigger && !isManualTrigger) {
    return;
  }

  // Reset state
  setters.setError('');
  setters.setPageInfo(null);
  setters.setAnalysis([]);
  setters.setFailedProviders([]);
  setters.setShowButton(true);
  setters.setHasAttemptedAnalysis(true);
  await setStorage('hasAttemptedAnalysis', true);
  
  // Only set isPageLoading initially - isDetectingPage will be set after page load
  setters.setIsPageLoading(true);
  setters.setIsDetectingPage(false);
  refs.analysisTriggeredRef.current = false;

  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      if (!currentTab?.id) {
        setTimeout(() => {
          setters.setIsDetectingPage(false);
          setters.setIsPageLoading(false);
          setters.setError('No active tab found');
          resolve();
        }, 1000);
        return;
      }

      const startTime = Date.now();

      chrome.runtime.sendMessage({ 
        type: 'GET_PAGE_INFO',
        tabId: currentTab.id 
      }, (response) => {
        const elapsedTime = Date.now() - startTime;
        const remainingDelay = Math.max(0, 0 - elapsedTime);
        
        setTimeout(() => {
          if (!response?.success) {
            setters.setIsPageLoading(false);
            setters.setIsDetectingPage(false);
            setters.setError(response?.error || 'Failed to get page info');
            resolve();
            return;
          }
          if (!response.data) {
            setters.setIsPageLoading(false);
            setters.setIsDetectingPage(false);
            setters.setError('No page data received');
            resolve();
            return;
          }
          
          // Transition from page loading to detecting - set detecting BEFORE turning off page loading
          // This prevents the loading component from unmounting and remounting
          setters.setIsDetectingPage(true);
          setters.setIsPageLoading(false);
          
          // Process the page info
          setters.setPageInfo({
            title: response.data.title || 'No title found',
            content: response.data.content || 'No content found',
            url: response.data.url || 'No URL found',
            wordCount: response.data.wordCount || 0
          });
          
          // Keep isDetectingPage true - analyzeArticle will turn it off and set isAnalyzing
          // This maintains loading state continuity
          resolve();
        }, remainingDelay);
      });
    });
  });
}

export async function analyzeArticle(
  pageInfo: PageInfo | null,
  requestIdRef: React.MutableRefObject<number>,
  setters: {
    setError: (value: string) => void;
    setAnalysis: (value: AnalysisResult[]) => void;
    setFailedProviders: (value: FailedProvider[] | string[]) => void;
    setSelectedProvider: (value: string) => void;
    setProviderStatuses: (value: Record<string, 'waiting' | 'analyzing' | 'complete' | 'failed'>) => void;
    setIsAnalyzing: (value: boolean) => void;
    setIsDetectingPage: (value: boolean) => void;
    setHasAttemptedAnalysis: (value: boolean) => void;
    setHasExistingAnalysis: (value: boolean) => void;
    setShowButton: (value: boolean) => void;
  },
  guardConditions: {
    isManualTrigger: boolean;
    isViewingFromRecent: boolean;
    hasPreloadedAnalysis: boolean;
    requiresManualTrigger: boolean;
  }
): Promise<void> {
  // Set isAnalyzing immediately to maintain loading state continuity
  // This prevents the component from unmounting between isDetectingPage and isAnalyzing
  setters.setIsAnalyzing(true);
  
  // Guard conditions - never analyze unless extension icon was clicked
  if (!guardConditions.isManualTrigger) {
    setters.setIsAnalyzing(false);
    setters.setIsDetectingPage(false);
    setters.setIsPageLoading(false);
    return;
  }
  
  if (guardConditions.isViewingFromRecent) {
    setters.setIsAnalyzing(false);
    setters.setIsDetectingPage(false);
    setters.setIsPageLoading(false);
    return;
  }
  
  if (guardConditions.hasPreloadedAnalysis) {
    setters.setIsAnalyzing(false);
    setters.setIsDetectingPage(false);
    setters.setIsPageLoading(false);
    return;
  }
  
  if (guardConditions.requiresManualTrigger && !guardConditions.isManualTrigger) {
    setters.setIsAnalyzing(false);
    setters.setIsDetectingPage(false);
    setters.setIsPageLoading(false);
    return;
  }
  
  const rid = ++requestIdRef.current;
  
  if (!pageInfo) {
    setters.setError('No page info found');
    setters.setIsAnalyzing(false);
    setters.setIsDetectingPage(false);
    setters.setIsPageLoading(false);
    return;
  }
  
  return new Promise(async (resolve) => {
    // Get current tab ID first
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const currentTab = tabs[0];
      if (!currentTab?.id) {
        setters.setError('No active tab found');
        setters.setIsAnalyzing(false);
        setters.setIsDetectingPage(false);
        setters.setIsPageLoading(false);
        resolve();
        return;
      }

      setters.setError('');
      setters.setAnalysis([]);
      setters.setFailedProviders([]);
      setters.setSelectedProvider('');
      
      // Initialize provider statuses
      const providers = getProvidersFromEnvironment();
      const initialStatuses: Record<string, 'waiting' | 'analyzing' | 'complete' | 'failed'> = {};
      providers.forEach((provider: string) => {
        initialStatuses[provider] = 'analyzing';
      });
      setters.setProviderStatuses(initialStatuses);
      
      // isAnalyzing is already set at the start of the function
      // Just ensure isDetectingPage is off
      setters.setIsDetectingPage(false);

      // Perform web search for supporting links using backend
      let webSearchResults: string[] = [];
      
      try {
        const searchResponse = await callBackendWebSearch({
          title: pageInfo.title,
          url: pageInfo.url,
          limit: 5
        });
        
        if (searchResponse.success && searchResponse.data) {
          if (searchResponse.data.results && Array.isArray(searchResponse.data.results)) {
            webSearchResults = searchResponse.data.results.map(result => result.url);
          } else {
            console.warn('[NewsScan] Web search returned no results array');
            webSearchResults = [];
          }
          
          if (searchResponse.data.searchMethod === 'fallback') {
            console.warn('[NewsScan] Using fallback search method - results may be less relevant');
          }
        } else {
          console.error('[NewsScan] Web search failed:', searchResponse.error || 'Unknown error');
          webSearchResults = [];
        }
      } catch (searchError) {
        console.error('[NewsScan] Web search exception:', searchError);
        webSearchResults = [];
      }
      
      // Build prompt with web search results
      const prompt = buildAnalysisPrompt(pageInfo.url, pageInfo.title, pageInfo.content, webSearchResults);
      
      // Add a timeout to prevent infinite loading
      const timeout = setTimeout(() => {
        console.error('[NewsScan] Analysis timeout - no response received');
        setters.setError('Analysis timed out. Please try again.');
        setters.setIsAnalyzing(false);
        setters.setIsDetectingPage(false);
        setters.setIsPageLoading(false);
        resolve();
      }, 60000); // 60 second timeout

      chrome.runtime.sendMessage({
        type: 'ANALYZE_ARTICLE',
        tabId: currentTab.id,
        content: prompt,
        providers: providers
      }, async (response) => {
        clearTimeout(timeout); // Clear timeout when we get a response
        
        // Check for Chrome runtime errors
        if (chrome.runtime.lastError) {
          console.error('[NewsScan] Chrome runtime error:', chrome.runtime.lastError);
          setters.setError('Failed to communicate with background script. Please try reloading the extension.');
          setters.setIsAnalyzing(false);
          setters.setIsDetectingPage(false);
          setters.setIsPageLoading(false);
          resolve();
          return;
        }
        
        if (!response?.success) {
          console.error('[NewsScan] Analysis failed:', response?.error);
          setters.setError(response?.error || 'Failed to get analysis response');
          setters.setIsAnalyzing(false);
          setters.setIsDetectingPage(false);
          setters.setIsPageLoading(false);
          resolve();
          return;
        }

        // Process the analysis results
        const { successfulResults, failedProviders } = response.data;
        
        // Clear all loading states FIRST before setting analysis data
        // This prevents race conditions where expansion happens before loading screen clears
        setters.setIsAnalyzing(false);
        setters.setIsDetectingPage(false);
        setters.setIsPageLoading(false);
        
        // Then set the analysis data
        setters.setAnalysis(successfulResults);
        setters.setFailedProviders(failedProviders);
        setters.setHasAttemptedAnalysis(true);
        setters.setHasExistingAnalysis(true);
        setters.setShowButton(false);

        // Save to recent analyses if we have valid results
        if (successfulResults && successfulResults.length > 0 && pageInfo) {
          try {
            const existing = await getStorage('recentAnalyses');
            
            const averageScore = Math.round(successfulResults.reduce((sum: number, result: any) => sum + result.result.credibility_score, 0) / successfulResults.length);
            const top = successfulResults[0];
            
            const newEntry = {
              url: pageInfo.url,
              title: pageInfo.title,
              timestamp: Date.now(),
              score: averageScore,
              summary: top.result?.credibility_summary || undefined,
              fullAnalysis: successfulResults,
              pageInfo: pageInfo,
              failedProviders: failedProviders || []
            };
            
            // Remove any existing entries with the same URL to avoid duplicates
            const filtered = existing.filter((item: any) => item.url !== pageInfo.url);
            // Add the new entry at the beginning and keep only the most recent 10
            const updated = [newEntry, ...filtered].slice(0, 10);
            await setStorage('recentAnalyses', updated);
          } catch (storageError) {
            console.error('Error saving to recent analyses:', storageError);
          }
        }
        
        resolve();
      });
    });
  });
}

export async function loadAnalysisForUrl(
  url: string, 
  timestamp?: number,
  setters?: {
    setError: (value: string) => void;
  }
): Promise<void> {
  try {
    const recentAnalyses = await getStorage('recentAnalyses');
    
    // Find the specific analysis entry
    let analysisEntry = null;
    if (Array.isArray(recentAnalyses)) {
      if (timestamp) {
        analysisEntry = recentAnalyses.find(entry => entry.url === url && entry.timestamp === timestamp);
      } else {
        analysisEntry = recentAnalyses.find(entry => entry.url === url);
      }
    }
    
    if (analysisEntry && analysisEntry.fullAnalysis) {
      // Get current tab ID before creating new tab
      chrome.tabs.query({ active: true, currentWindow: true }, (currentTabs) => {
        const originalTabId = currentTabs[0]?.id;
        
        // Create new tab with the URL
        chrome.tabs.create({ url: url, active: true }, (newTab) => {
          // Wait for the new tab to load, then inject analysis
          setTimeout(() => {
            // Send message to background to handle analysis loading
            chrome.runtime.sendMessage({
              type: 'LOAD_ANALYSIS_IN_TAB',
              tabId: newTab.id,
              analysisData: {
                pageInfo: analysisEntry.pageInfo,
                analysis: analysisEntry.fullAnalysis,
                failedProviders: analysisEntry.failedProviders || [],
                isViewingFromRecent: true,
                originalTabId: originalTabId
              }
            });
          }, 500);
        });
      });
    } else {
      // No full analysis, just open in new tab
      chrome.tabs.create({ url: url, active: true });
    }
  } catch (error) {
    console.error('Error loading analysis for URL:', error);
    setters?.setError('Failed to load analysis');
  }
}
