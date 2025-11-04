import { PageInfo, AnalysisResult } from '../types/analysis';
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
    setFailedProviders: (value: string[]) => void;
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
    setFailedProviders: (value: string[]) => void;
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
    return;
  }
  
  if (guardConditions.isViewingFromRecent) {
    setters.setIsAnalyzing(false);
    setters.setIsDetectingPage(false);
    return;
  }
  
  if (guardConditions.hasPreloadedAnalysis) {
    setters.setIsAnalyzing(false);
    setters.setIsDetectingPage(false);
    return;
  }
  
  if (guardConditions.requiresManualTrigger && !guardConditions.isManualTrigger) {
    setters.setIsAnalyzing(false);
    setters.setIsDetectingPage(false);
    return;
  }
  
  const rid = ++requestIdRef.current;
  
  if (!pageInfo) {
    setters.setError('No page info found');
    setters.setIsAnalyzing(false);
    setters.setIsDetectingPage(false);
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

      console.log('[NewsScan] Starting analysis with providers:', providers);
      console.log('[NewsScan] Page info:', pageInfo);
      
      // Perform web search for supporting links using backend
      let webSearchResults: string[] = [];
      try {
        console.log('[NewsScan] Performing web search for supporting links...');
        console.log('[NewsScan] Search request:', {
          title: pageInfo.title,
          url: pageInfo.url,
          limit: 5
        });
        
        const searchResponse = await callBackendWebSearch({
          title: pageInfo.title,
          url: pageInfo.url,
          limit: 5
        });
        
        console.log('[NewsScan] Web search response:', {
          success: searchResponse.success,
          hasData: !!searchResponse.data,
          error: searchResponse.error,
          resultsCount: searchResponse.data?.results?.length || 0
        });
        
        if (searchResponse.success && searchResponse.data) {
          // Log which search method was used
          console.log('[NewsScan] Search method used:', searchResponse.data.searchMethod);
          console.log('[NewsScan] Query used:', searchResponse.data.queryUsed);
          if (searchResponse.data.aiQueryGenerated) {
            console.log('[NewsScan] AI generated query:', searchResponse.data.aiQueryGenerated);
          }
          if (searchResponse.data.fallbackQueryUsed) {
            console.log('[NewsScan] Fallback query used:', searchResponse.data.fallbackQueryUsed);
          }
          
          if (searchResponse.data.results && Array.isArray(searchResponse.data.results)) {
            webSearchResults = searchResponse.data.results.map(result => result.url);
            console.log('[NewsScan] Web search found', webSearchResults.length, 'supporting links');
            console.log('[NewsScan] Search results:', searchResponse.data.results.map(r => ({ title: r.title, url: r.url })));
          } else {
            console.warn('[NewsScan] Web search returned no results array:', searchResponse.data);
            webSearchResults = [];
          }
          
          // Warn if using fallback method with bogus results
          if (searchResponse.data.searchMethod === 'fallback') {
            console.warn('[NewsScan] ⚠️  Using fallback search method - results may be less relevant!');
            console.warn('[NewsScan] AI query that failed:', searchResponse.data.aiQueryGenerated);
            console.warn('[NewsScan] Consider checking if the AI-generated query was appropriate for the article');
          }
        } else {
          console.error('[NewsScan] Web search failed:', searchResponse.error || 'Unknown error');
          console.error('[NewsScan] Full search response:', searchResponse);
        }
      } catch (searchError) {
        console.error('[NewsScan] Web search exception:', searchError);
        webSearchResults = [];
      }
      
      // Add a timeout to prevent infinite loading
      const timeout = setTimeout(() => {
        console.error('[NewsScan] Analysis timeout - no response received');
        setters.setError('Analysis timed out. Please try again.');
        setters.setIsAnalyzing(false);
        resolve();
      }, 60000); // 60 second timeout

      chrome.runtime.sendMessage({
        type: 'ANALYZE_ARTICLE',
        tabId: currentTab.id,
        content: buildAnalysisPrompt(pageInfo.url, pageInfo.title, pageInfo.content, webSearchResults),
        providers: providers
      }, async (response) => {
        clearTimeout(timeout); // Clear timeout when we get a response
        
        // Check for Chrome runtime errors
        if (chrome.runtime.lastError) {
          console.error('[NewsScan] Chrome runtime error:', chrome.runtime.lastError);
          setters.setError('Failed to communicate with background script. Please try reloading the extension.');
          setters.setIsAnalyzing(false);
          resolve();
          return;
        }
        
        console.log('[NewsScan] Received response:', response);
        
        if (!response?.success) {
          console.error('[NewsScan] Analysis failed:', response?.error);
          setters.setError(response?.error || 'Failed to get analysis response');
          setters.setIsAnalyzing(false);
          resolve();
          return;
        }

        // Process the analysis results
        const { successfulResults, failedProviders } = response.data;
        console.log('[NewsScan] Successful results:', successfulResults);
        console.log('[NewsScan] Failed providers:', failedProviders);
        
        setters.setAnalysis(successfulResults);
        setters.setFailedProviders(failedProviders);
        setters.setIsAnalyzing(false);
        setters.setHasAttemptedAnalysis(true);
        setters.setHasExistingAnalysis(true);
        setters.setShowButton(false);

        // Save to recent analyses if we have valid results
        if (successfulResults && successfulResults.length > 0 && pageInfo) {
          try {
            console.log('=== SAVING ANALYSIS TO STORAGE ===');
            const existing = await getStorage('recentAnalyses');
            console.log('Existing analyses:', existing);
            
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
            
            console.log('New entry to save:', {
              url: newEntry.url,
              title: newEntry.title,
              hasFullAnalysis: !!newEntry.fullAnalysis,
              fullAnalysisLength: newEntry.fullAnalysis?.length || 0,
              hasPageInfo: !!newEntry.pageInfo,
              hasFailedProviders: !!newEntry.failedProviders
            });
            
            const updated = [newEntry, ...existing].slice(0, 10);
            console.log('Updated analyses array length:', updated.length);
            
            await setStorage('recentAnalyses', updated);
            console.log('Analysis saved to storage successfully');
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
    console.log('🔍 Loading analysis for URL:', url, 'timestamp:', timestamp);
    const recentAnalyses = await getStorage('recentAnalyses');
    console.log('📚 Recent analyses found:', recentAnalyses?.length || 0);
    
    // Find the specific analysis entry
    let analysisEntry = null;
    if (Array.isArray(recentAnalyses)) {
      if (timestamp) {
        analysisEntry = recentAnalyses.find(entry => entry.url === url && entry.timestamp === timestamp);
        console.log('🔍 Looking for exact match with timestamp:', timestamp);
      } else {
        analysisEntry = recentAnalyses.find(entry => entry.url === url);
        console.log('🔍 Looking for URL match only');
      }
    }
    
    console.log('📄 Analysis entry found:', !!analysisEntry);
    if (analysisEntry) {
      console.log('📄 Has fullAnalysis:', !!analysisEntry.fullAnalysis);
      console.log('📄 Has pageInfo:', !!analysisEntry.pageInfo);
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
