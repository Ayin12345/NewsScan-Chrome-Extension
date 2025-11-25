// Message handlers for background script
import { callBackendAnalyze } from './backendClient';
import { 
  saveTabState, 
  getTabState, 
  deleteTabState, 
  getDefaultState,
  isTabBeingSetup,
  markTabAsBeingSetup,
  unmarkTabAsBeingSetup
} from './tabState';
import { AnalysisResult } from './analysisProcessor';

export async function handleGetPageInfo(message: any, sender: any, sendResponse: (response: any) => void) {
  try {
    const tabId = message.tabId || sender.tab?.id;
    if (!tabId) {
      sendResponse({ success: false, error: 'No tab ID found' });
      return;
    }

    const pageInfo = await chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_CONTENT' });
    if (pageInfo && pageInfo.error) {
      sendResponse({ success: false, error: pageInfo.error });
      return;
    }

    // Get or create state for this tab
    let state = await getTabState(tabId) || getDefaultState();
    
    // Update state with new page info, but preserve existing analysis if page is the same
    const isSamePage = state.pageInfo?.url === pageInfo.data.url;
    
    state = {
      ...state,
      pageInfo: pageInfo.data,
      showButton: true,
      analysis: isSamePage ? state.analysis : [],
      failedProviders: isSamePage ? state.failedProviders : [],
      hasAttemptedAnalysis: false
    };
    
    await saveTabState(tabId, state);
    sendResponse({ success: true, data: pageInfo.data });
  } catch (error) {
    console.error('Error getting page info:', error);
    sendResponse({ success: false, error: 'Failed to fetch page info' });
  }
}

export async function handleAnalyzeArticle(message: any, sender: any, sendResponse: (response: any) => void) {
  try {
    const tabId = message.tabId;
    if (!tabId) {
      sendResponse({ success: false, error: 'No tab ID provided' });
      return;
    }

    const providers = message.providers || [];
    
    // Set analyzing state for this tab
    let currentState = await getTabState(tabId) || getDefaultState();
    currentState.isAnalyzing = true;
    await saveTabState(tabId, currentState);
    
    // Send provider status updates (they'll be set to analyzing)
    providers.forEach((provider: string) => {
      chrome.runtime.sendMessage({
        type: 'PROVIDER_UPDATE',
        provider: provider,
        status: 'analyzing'
      });
    });
    
    // Extract supporting links from prompt if present
    const supportingLinksMatch = message.content.match(/"supporting_links":\s*\[(.*?)\]/);
    let supportingLinks = [];
    if (supportingLinksMatch) {
      try {
        const linksStr = supportingLinksMatch[1];
        if (linksStr.trim()) {
          supportingLinks = linksStr.split(',').map(link => 
            link.trim().replace(/^"|"$/g, '').trim()
          ).filter(Boolean);
        }
      } catch (e) {
        console.warn('Failed to extract supporting links from prompt:', e);
      }
    }
    
    // Call backend API instead of direct API calls
    const backendResponse = await callBackendAnalyze({
      prompt: message.content,
      providers: providers,
      requestId: Date.now(),
      supportingLinks: supportingLinks
    });

    if (!backendResponse.success) {
      // Mark all providers as failed
      providers.forEach((provider: string) => {
        chrome.runtime.sendMessage({
          type: 'PROVIDER_UPDATE',
          provider: provider,
          status: 'failed',
          error: backendResponse.error || 'Backend request failed'
        });
      });

      let state = await getTabState(tabId);
      if (state) {
        state.isAnalyzing = false;
        await saveTabState(tabId, state);
      }

      sendResponse({
        success: false,
        error: backendResponse.error || 'Failed to analyze article'
      });
      return;
    }

    // Mark successful providers as complete
    if (backendResponse.data) {
      backendResponse.data.successfulResults.forEach((result: AnalysisResult) => {
        chrome.runtime.sendMessage({
          type: 'PROVIDER_UPDATE',
          provider: result.provider,
          status: 'complete'
        });
      });

      // Mark failed providers as failed
      backendResponse.data.failedProviders.forEach((failedProvider: any) => {
        // Handle both old format (string) and new format (object)
        const provider = typeof failedProvider === 'string' ? failedProvider : failedProvider.provider;
        const error = typeof failedProvider === 'string' ? 'Provider failed' : (failedProvider.error || 'Provider failed');
        
        chrome.runtime.sendMessage({
          type: 'PROVIDER_UPDATE',
          provider: provider,
          status: 'failed',
          error: error
        });
      });
    }

    // Update tab state with analysis results
    let state = await getTabState(tabId);
    if (!state) {
      state = getDefaultState();
    }
    
    state.analysis = backendResponse.data?.successfulResults || [];
    state.failedProviders = backendResponse.data?.failedProviders || [];
    state.showButton = false;
    state.isAnalyzing = false;
    state.hasAttemptedAnalysis = true;
    
    await saveTabState(tabId, state);
    
    sendResponse({
      success: true,
      data: {
        successfulResults: backendResponse.data?.successfulResults || [],
        failedProviders: backendResponse.data?.failedProviders || []
      },
      providers: providers
    });
  } catch (error) {
    console.error('Error in analyze article:', error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to analyze article' 
    });
  }
}

export async function handleGetTabState(message: any, sender: any, sendResponse: (response: any) => void) {
  try {
    const tabId = message.tabId || sender.tab?.id;
    if (!tabId) {
      sendResponse({ success: false, error: 'No tab ID found' });
      return;
    }

    // If URL is provided, search for existing analysis for that URL
    if (message.url) {
      // Search through all tab states to find analysis for this URL
      const tabStatesData = await chrome.storage.local.get('tabStates');
      const tabStatesObj = tabStatesData.tabStates || {};
      
      for (const [tId, state] of Object.entries(tabStatesObj)) {
        const tabState = state as any;
        if (tabState.pageInfo?.url === message.url && tabState.analysis && tabState.analysis.length > 0) {
          sendResponse({ success: true, data: tabState });
          return;
        }
      }
      
      // No existing analysis found for this URL
      sendResponse({ success: true, data: getDefaultState() });
      return;
    }
    
    // Otherwise, get state for the current tab
    const state = await getTabState(tabId) || getDefaultState();
    sendResponse({ success: true, data: state });
  } catch (error) {
    console.error('Error in GET_TAB_STATE:', error);
    sendResponse({ success: false, error: 'Failed to get tab state' });
  }
}

export async function handleResetTabState(message: any, sender: any, sendResponse: (response: any) => void) {
  try {
    const tabId = message.tabId || sender.tab?.id;
    if (!tabId) {
      sendResponse({ success: false, error: 'No tab ID found' });
      return;
    }

    // Clear the state completely
    await deleteTabState(tabId);
    
    // Initialize with default state
    const defaultState = getDefaultState();
    await saveTabState(tabId, defaultState);
    
    // Notify other instances of the sidepanel about the reset
    chrome.tabs.sendMessage(tabId, {
      type: 'TAB_SWITCHED',
      state: defaultState
    }).catch(() => {
      // Ignore errors if content script isn't ready
    });
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error resetting tab state:', error);
    sendResponse({ success: false, error: 'Failed to reset tab state' });
  }
}

export async function handleSaveTabState(message: any, sender: any, sendResponse: (response: any) => void) {
  try {
    const tabId = message.tabId || sender.tab?.id;
    if (!tabId) {
      sendResponse({ success: false, error: 'No tab ID available to save state' });
      return;
    }

    // Save the provided state for this tab
    await saveTabState(tabId, {
      pageInfo: message.data.pageInfo,
      analysis: message.data.analysis,
      failedProviders: message.data.failedProviders,
      showButton: message.data.showButton,
      isAnalyzing: message.data.isAnalyzing || false,
      hasAttemptedAnalysis: message.data.hasAttemptedAnalysis || false,
      isViewingFromRecent: message.data.isViewingFromRecent || false,
      originalTabId: message.data.originalTabId
    });
    
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: 'Failed to save tab state' });
  }
}

export async function handleWebSearch(message: any, sender: any, sendResponse: (response: any) => void) {
  try {
    // Use backend for web search instead of direct API calls
    const { callBackendWebSearch } = await import('./backendClient');
    
    const backendResponse = await callBackendWebSearch({
      title: message.query,
      url: message.originalUrl,
      limit: message.max_results || 5
    });

    if (!backendResponse.success || !backendResponse.data) {
      sendResponse({
        success: false,
        error: backendResponse.error || 'Failed to perform web search'
      });
      return;
    }

    sendResponse({
      success: true,
      data: { results: backendResponse.data }
    });
  } catch (error) {
    console.error('Web search error:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to perform web search'
    });
  }
}

export async function handleLoadAnalysisInTab(message: any, sender: any, sendResponse: (response: any) => void) {
  try {
    const tabId = message.tabId;
    const analysisData = message.analysisData;

    // Prevent double execution
    if (isTabBeingSetup(tabId)) {
      sendResponse({ success: false, error: 'Tab already being set up' });
      return;
    }
    
    // Mark this tab as being set up
    markTabAsBeingSetup(tabId);

    // Store the analysis data for this tab
    const newState = {
      pageInfo: analysisData.pageInfo,
      analysis: analysisData.analysis,
      failedProviders: analysisData.failedProviders,
      showButton: false,
      isAnalyzing: false,
      hasAttemptedAnalysis: true,
      isViewingFromRecent: analysisData.isViewingFromRecent || false,
      originalTabId: analysisData.originalTabId
    };
    
    await saveTabState(tabId, newState);

    // Mark this tab as having pre-loaded analysis to prevent interference
    await saveTabState(tabId, {
      ...newState,
      hasPreloadedAnalysis: true
    });

    // Wait for page to load, then inject content script and open sidebar in one step
    setTimeout(async () => {
      try {
        // Check if content script is already injected
        try {
          await chrome.tabs.sendMessage(tabId, { type: 'FNR_PING' });
        } catch (error) {
          // Inject content script first
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content-scripts/content.js'],
          });
        }
        
        // Small delay to ensure content script is ready, then open sidebar
        setTimeout(async () => {
          try {
            // Check if tab still exists before sending message
            const tab = await chrome.tabs.get(tabId);
            if (!tab) {
              unmarkTabAsBeingSetup(tabId);
              sendResponse({ success: false, error: 'Tab no longer exists' });
              return;
            }
            
            // Check if this is a history view - if so, we SHOULD open the sidebar
            if (newState.isViewingFromRecent) {
              chrome.tabs.sendMessage(tabId, { 
                type: 'TOGGLE_INJECTED_SIDEBAR',
                keepOpen: true,
                preloadedAnalysis: newState,
                hasPreloadedAnalysis: true
              }, (response) => {
                if (chrome.runtime.lastError) {
                  unmarkTabAsBeingSetup(tabId);
                  sendResponse({ success: false, error: chrome.runtime.lastError.message });
                  return;
                }
                unmarkTabAsBeingSetup(tabId);
                sendResponse({ success: true });
              });
            } else {
              // Just save the analysis data without opening sidebar
              sendResponse({ success: true });
              unmarkTabAsBeingSetup(tabId);
            }
          } catch (error) {
            unmarkTabAsBeingSetup(tabId);
            sendResponse({ success: false, error: 'Failed to open sidebar' });
          }
        }, 200);
      } catch (err) {
        console.error('Error setting up analysis tab:', err);
        unmarkTabAsBeingSetup(tabId);
        sendResponse({ success: false, error: 'Failed to setup analysis tab' });
      }
    }, 1000);
  } catch (error) {
    console.error('Error in LOAD_ANALYSIS_IN_TAB:', error);
    if (message.tabId) {
      unmarkTabAsBeingSetup(message.tabId);
    }
    sendResponse({ success: false, error: 'Failed to load analysis in tab' });
  }
}

export async function handleNavigateAndReopenSidebar(message: any, sender: any, sendResponse: (response: any) => void) {
  try {
    // Create a new tab with the URL
    const newTab = await chrome.tabs.create({ url: message.url });
    if (!newTab.id) {
      sendResponse({ success: false, error: 'Failed to create new tab' });
      return;
    }

    const tabId = newTab.id;

    // Wait for page to load, then inject content script and open sidebar
    setTimeout(async () => {
      try {
        // Inject content script
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content-scripts/content.js'],
        });
        
        // Wait for content script to be ready
        const waitForContentScript = () => {
          return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Content script not ready after 5 seconds'));
            }, 5000);
            
            chrome.tabs.sendMessage(tabId, { type: 'FNR_PING' }, (response) => {
              clearTimeout(timeout);
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else if (response?.ok) {
                resolve(true);
              } else {
                reject(new Error('Content script not responding'));
              }
            });
          });
        };
        
        await waitForContentScript();
        sendResponse({ success: true });
      } catch (err) {
        console.error('Error in sidebar setup:', err);
        sendResponse({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }, 1000);
  } catch (error) {
    console.error('Error in NAVIGATE_AND_REOPEN_SIDEBAR:', error);
    sendResponse({ success: false, error: 'Navigation failed' });
  }
}

export async function handlePreloadUrlAnalysis(message: any, sender: any, sendResponse: (response: any) => void) {
  try {
    const { url, pageInfo, analysis, failedProviders } = message;
    if (!url || !analysis || analysis.length === 0) {
      sendResponse({ success: false, error: 'Missing url or analysis' });
      return;
    }
    
    // Store in recent analyses for history
    const recentData = await chrome.storage.local.get('recentAnalyses');
    const recentList = recentData.recentAnalyses || [];
    
    // Update existing entry or add new one
    const existingIndex = recentList.findIndex((item: any) => item.url === url);
    const historyEntry = {
      title: pageInfo.title || 'Unknown Title',
      url: url,
      timestamp: Date.now(),
      score: analysis[0]?.result?.credibility_score || null,
      fullAnalysis: analysis,
      pageInfo: pageInfo,
      failedProviders: failedProviders || []
    };
    
    if (existingIndex >= 0) {
      recentList[existingIndex] = historyEntry;
    } else {
      recentList.unshift(historyEntry);
    }
    
    // Keep only last 50 entries
    const trimmedList = recentList.slice(0, 50);
    await chrome.storage.local.set({ recentAnalyses: trimmedList });
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error in PRELOAD_URL_ANALYSIS:', error);
    sendResponse({ success: false, error: 'Failed to preload analysis' });
  }
}
