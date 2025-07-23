import { fetchOpenAI } from '../utils/aiHandling'
import { fetchGemini } from '../utils/aiHandling'
import { fetchCohere } from '../utils/aiHandling'
import { fetchMistral7B } from '../utils/aiHandling'
import { fetchMixtral8x7B } from '../utils/aiHandling'
import { fetchLlama } from '../utils/aiHandling'
import { defineBackground } from 'wxt/utils/define-background'

// Add web search function
async function performWebSearch(query: string, maxResults: number = 5) {
  try {
    // Add fact-checking focused terms but keep it topic-agnostic
    const enhancedQuery = `${query} fact check verification -fake -hoax site:(reuters.com OR apnews.com OR snopes.com OR factcheck.org OR politifact.com)`;
    
    const response = await fetch(`https://www.googleapis.com/customsearch/v1?` + 
      `key=${import.meta.env.VITE_GOOGLE_API_KEY}` +
      `&cx=${import.meta.env.VITE_GOOGLE_SEARCH_ENGINE_ID}` +
      `&q=${encodeURIComponent(enhancedQuery)}` +
      `&num=${maxResults}` +
      '&fields=items(title,snippet,link)' +
      '&dateRestrict=m3' // Last 3 months to get good coverage
    );

    if (!response.ok) {
      throw new Error(`Search API error: ${response.status}`);
    }

    const data = await response.json();
    return data.items?.map((result: any) => ({
      url: result.link,
      title: result.title,
      snippet: result.snippet
    })) || [];
  } catch (error) {
    console.error('Web search failed:', error);
    return [];
  }
}
//FIX: web search is not working/ spitting out random links
// Define the structure of tab-specific state
interface TabState {
  pageInfo: {
    title: string;
    content: string;
    url: string;
    wordCount: number;
  } | null;
  analysis: Array<{
    provider: string;
    result: {
      credibility_score: number;
      reasoning: string;
      supporting_links: string[];
    };
  }>;
  failedProviders: string[];
  showButton: boolean;
}

// Store states for all tabs
const tabStates = new Map<number, TabState>();

// Get default state for a new tab
const getDefaultState = (): TabState => ({
  pageInfo: null,
  analysis: [],
  failedProviders: [],
  showButton: true
});

export default defineBackground({
  main() {
    // Listen for extension installation
    chrome.runtime.onInstalled.addListener(() => {
      console.log('Extension installed')
    })

    // Handle extension icon clicks to open side panel
    chrome.action.onClicked.addListener(() => {
      chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
    });

    // Listen for tab removal to clean up state
    chrome.tabs.onRemoved.addListener((tabId) => {
      tabStates.delete(tabId);
    });

    // Message handler
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'GET_PAGE_INFO') {
        (async () => {
          try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
            if (!tab?.id) {
              sendResponse({ success: false, error: 'No active tab found' });
              return;
            }

            const pageInfo = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_CONTENT'})
            if (pageInfo && pageInfo.error) {
              sendResponse({ success: false, error: pageInfo.error })
              return
            }

            // Get or create state for this tab
            let state = tabStates.get(tab.id) || getDefaultState();
            
            // Update state with new page info
            state = {
              ...state,
              pageInfo: pageInfo.data,
              showButton: true,
              analysis: [],
              failedProviders: []
            };
            
            // Save state
            tabStates.set(tab.id, state);

            sendResponse({ success: true, data: pageInfo.data })
          } catch (error) {
            sendResponse({ success: false, error: 'Failed to fetch page info' })
          }
        })()
        return true;
      } 
      
      if (message.type === 'ANALYZE_ARTICLE') {
        (async () => {
          try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) {
              sendResponse({ success: false, error: 'No active tab found' });
              return;
            }

            const providers = message.providers || []
            const results = await Promise.allSettled(
              providers.map(async (provider: string) => {
                switch (provider) {
                  case 'OpenAI':
                    return await fetchOpenAI(message.content, import.meta.env.VITE_OPENAI_API_KEY || '')
                  case 'Gemini':
                    return await fetchGemini(message.content, import.meta.env.VITE_GEMINI_API_KEY || '')
                  case 'Cohere':
                    return await fetchCohere(message.content, import.meta.env.VITE_COHERE_API_KEY || '')
                  case 'Mistral7B':
                    return await fetchMistral7B(message.content, import.meta.env.VITE_HUGGINGFACE_API_KEY || '')
                  case 'Mixtral8x7B':
                    return await fetchMixtral8x7B(message.content, import.meta.env.VITE_HUGGINGFACE_API_KEY || '')
                  case 'Llama':
                    return await fetchLlama(message.content, import.meta.env.VITE_HUGGINGFACE_API_KEY || '')
                  default:
                    throw new Error(`Unknown provider: ${provider}`)
                }
              })
            )

            // Process results
            const successfulResults = results
              .map((r, i) => {
                if (r.status === 'fulfilled') {
                  try {
                    let parsedResult;
                    if (typeof r.value === 'string') {
                      try {
                        parsedResult = JSON.parse(r.value);
                      } catch (e) {
                        const scoreMatch = r.value.match(/credibility_score["\s:]+(\d+)/);
                        const reasoningMatch = r.value.match(/reasoning["\s:]+(.+?)(?=supporting_links|$)/s);
                        const linksMatch = r.value.match(/supporting_links["\s:]+\[(.*?)\]/s);
                        
                        parsedResult = {
                          credibility_score: scoreMatch ? parseInt(scoreMatch[1]) : 0,
                          reasoning: reasoningMatch ? reasoningMatch[1].trim().replace(/['"]+/g, '') : r.value,
                          supporting_links: linksMatch ? 
                            linksMatch[1].split(',')
                              .map((link: string) => link.trim().replace(/['"]+/g, ''))
                              .filter((link: string) => link.length > 0) : []
                        };
                      }
                    } else {
                      parsedResult = r.value;
                    }

                    if (!parsedResult) return null;

                    return {
                      provider: providers[i],
                      result: parsedResult
                    };
                  } catch (e) {
                    return null;
                  }
                }
                return null;
              })
              .filter((x): x is NonNullable<typeof x> => x !== null);

            const failedProviders = results
              .map((r, i) => r.status === 'rejected' ? providers[i] : null)
              .filter((x): x is string => x !== null);

            // Update tab state with analysis results
            const state = tabStates.get(tab.id) || getDefaultState();
            state.analysis = successfulResults;
            state.failedProviders = failedProviders;
            state.showButton = false;
            tabStates.set(tab.id, state);
            
            sendResponse({
              success: true,
              data: results,
              providers: providers
            })
          } catch (error) {
            sendResponse({ success: false, error: 'Failed to analyze article' })
          }
        })()
        return true;
      }

      if (message.type === 'GET_TAB_STATE') {
        (async () => {
          try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) {
              sendResponse({ success: false, error: 'No active tab found' });
              return;
            }

            // Get or create state for this tab
            const state = tabStates.get(tab.id) || getDefaultState();
            sendResponse({ success: true, data: state });
          } catch (error) {
            sendResponse({ success: false, error: 'Failed to get tab state' });
          }
        })()
        return true;
      }

      if (message.type === 'RESET_TAB_STATE') {
        (async () => {
          try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) {
              sendResponse({ success: false, error: 'No active tab found' });
              return;
            }

            // Reset state for this tab only
            tabStates.set(tab.id, getDefaultState());
            sendResponse({ success: true });
          } catch (error) {
            sendResponse({ success: false, error: 'Failed to reset tab state' });
          }
        })()
        return true;
      }

      if (message.type === 'SAVE_TAB_STATE') {
        (async () => {
          try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) {
              sendResponse({ success: false, error: 'No active tab found' });
              return;
            }

            // Save the provided state for this tab
            tabStates.set(tab.id, {
              pageInfo: message.data.pageInfo,
              analysis: message.data.analysis,
              failedProviders: message.data.failedProviders,
              showButton: message.data.showButton
            });
            
            sendResponse({ success: true });
          } catch (error) {
            sendResponse({ success: false, error: 'Failed to save tab state' });
          }
        })()
        return true;
      }

      if (message.type === 'WEB_SEARCH') {
        (async () => {
          try {
            const results = await performWebSearch(message.query, message.max_results);
            sendResponse({ 
              success: true, 
              data: { results } 
            });
          } catch (error) {
            console.error('Web search error:', error);
            sendResponse({ 
              success: false, 
              error: 'Failed to perform web search' 
            });
          }
        })();
        return true;
      }

      return true;
    })
  }
});