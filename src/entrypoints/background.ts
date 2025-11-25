import { defineBackground } from 'wxt/utils/define-background'
import { 
  handleGetPageInfo,
  handleAnalyzeArticle,
  handleGetTabState,
  handleResetTabState,
  handleSaveTabState,
  handleWebSearch,
  handleLoadAnalysisInTab,
  handleNavigateAndReopenSidebar,
  handlePreloadUrlAnalysis
} from '../utils/messageHandlers'
import { 
  deleteTabState, 
  cleanupTabStates,
  unmarkTabAsBeingSetup
} from '../utils/tabState'

export default defineBackground({
  main() {
    // Listen for extension installation
    chrome.runtime.onInstalled.addListener(() => {
      console.log('Extension installed')
    })
    
    // Cleanup tab states every 5 minutes
    setInterval(cleanupTabStates, 5 * 60 * 1000);

    // Handle extension icon clicks to toggle injected sidebar
    chrome.action.onClicked.addListener(async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) {
          return;
        }

        const ping = (tabId: number) =>
          new Promise<boolean>((resolve) => {
            let settled = false;
            try {
              chrome.tabs.sendMessage(tabId, { type: 'FNR_PING' }, (resp) => {
                if (chrome.runtime.lastError) {
                  if (!settled) {
                    settled = true;
                    resolve(false);
                  }
                  return;
                }
                if (!settled) {
                  settled = true;
                  resolve(!!resp?.ok);
                }
              });
            } catch (e) {
              if (!settled) {
                settled = true;
                resolve(false);
              }
            }
            setTimeout(() => {
              if (!settled) {
                settled = true;
                resolve(false);
              }
            }, 400);
          });

        const sendToggle = async () => {
          try {
            await chrome.tabs.sendMessage(tab.id!, { type: 'TOGGLE_INJECTED_SIDEBAR' });
          } catch (e) {
            console.log('Toggle send error:', e);
          }
        };

        // Check if content script is already injected
        const hasListener = await ping(tab.id);
        if (hasListener) {
          await sendToggle();
          return;
        }

        // Inject content script then retry
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content-scripts/content.js'],
          });
        } catch (err) {
          console.log('Failed to inject content script:', err);
        }

        const hasListenerAfter = await ping(tab.id);
        await sendToggle();
      } catch (e) {
        console.log('Failed to toggle injected sidebar:', e);
      }
    });

    // Listen for tab removal to clean up state
    chrome.tabs.onRemoved.addListener((tabId) => {
      deleteTabState(tabId);
      unmarkTabAsBeingSetup(tabId);
    });

    // Listen for tab activation to handle state management when switching tabs
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      try {
        // Send a message to the sidebar to update its state
        chrome.runtime.sendMessage({
          type: 'TAB_SWITCHED',
          tabId: activeInfo.tabId,
        }).catch(() => {
          // Ignore errors if sidebar is not open
        });
      } catch (error) {
        console.log('Error handling tab switch:', error);
      }
    });

    // Message handler
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const messageType = message.type;

      switch (messageType) {
        case 'GET_PAGE_INFO':
          handleGetPageInfo(message, sender, sendResponse);
          return true;

        case 'ANALYZE_ARTICLE':
          handleAnalyzeArticle(message, sender, sendResponse);
          return true;

        case 'GET_TAB_STATE':
          handleGetTabState(message, sender, sendResponse);
          return true;

        case 'RESET_TAB_STATE':
          handleResetTabState(message, sender, sendResponse);
          return true;

        case 'SAVE_TAB_STATE':
          handleSaveTabState(message, sender, sendResponse);
          return true;

        case 'WEB_SEARCH':
          handleWebSearch(message, sender, sendResponse);
          return true;

        case 'TAB_SWITCHED':
          // This message is sent from the background script to the sidebar
          return true;

        case 'LOAD_ANALYSIS_IN_TAB':
          handleLoadAnalysisInTab(message, sender, sendResponse);
          return true;

        case 'NAVIGATE_AND_REOPEN_SIDEBAR':
          handleNavigateAndReopenSidebar(message, sender, sendResponse);
          return true;

        case 'PRELOAD_URL_ANALYSIS':
          handlePreloadUrlAnalysis(message, sender, sendResponse);
          return true;

        default:
          return true;
      }
    });

    // Handle tab updates with simplified logic
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        // Basic tab completion handling - detailed logic moved to messageHandlers
        try {
          // Small delay to prevent interference
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error('Error in tab update handler:', error);
        }
      }
    });
  }
});
