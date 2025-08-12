import { fetchOpenAI } from '../utils/aiHandling'
import { fetchGemini } from '../utils/aiHandling'
import { fetchCohere } from '../utils/aiHandling'
import { fetchMistral7B } from '../utils/aiHandling'
import { fetchMixtral8x7B } from '../utils/aiHandling'
import { fetchLlama } from '../utils/aiHandling'
import { defineBackground } from 'wxt/utils/define-background'

// Add this helper function at the top of the file
function cleanAndParseJSON(text: string) {
  try {
    // First try direct JSON parse
    return JSON.parse(text);
  } catch (e) {
    // If that fails, try to clean and extract JSON
    try {
      // Remove any leading/trailing non-JSON content
      let jsonStr = text.trim();
      
      // Find the first { and last }
      const startIdx = jsonStr.indexOf('{');
      const endIdx = jsonStr.lastIndexOf('}') + 1;
      if (startIdx >= 0 && endIdx > startIdx) {
        jsonStr = jsonStr.slice(startIdx, endIdx);
      }

      // Clean up common formatting issues
      jsonStr = jsonStr
        .replace(/\\n/g, ' ')           // Replace \n with space
        .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
        .replace(/"\s*,\s*}/g, '"}')    // Remove trailing commas
        .replace(/,(\s*})/g, '$1')      // Remove trailing commas in objects
        .replace(/\.,/g, '.')           // Fix ".," issues
        .replace(/\."/g, '"')           // Fix trailing periods in strings
        .replace(/"\s*\.\s*$/g, '"')    // Fix trailing periods after quotes
        .replace(/\[\s*,/g, '[')        // Fix leading commas in arrays
        .replace(/,\s*\]/g, ']');       // Fix trailing commas in arrays

      const parsed = JSON.parse(jsonStr);

      // Clean up the parsed object
      if (parsed.credibility_summary) {
        parsed.credibility_summary = parsed.credibility_summary
          .trim()
          .replace(/\s+/g, ' ')
          .replace(/\.,/g, '.')
          .replace(/\.+$/, '.');
      }

      if (parsed.reasoning) {
        parsed.reasoning = parsed.reasoning
          .trim()
          .replace(/\s+/g, ' ')
          .replace(/\.,/g, '.')
          .replace(/\.+$/, '.');
      }

      if (Array.isArray(parsed.evidence_sentences)) {
        parsed.evidence_sentences = parsed.evidence_sentences.map((evidence: any) => ({
          quote: evidence.quote?.trim().replace(/\s+/g, ' ').replace(/\.+$/, '') || '',
          impact: evidence.impact?.trim().replace(/\s+/g, ' ').replace(/\.+$/, '') || ''
        })).filter((e: any) => e.quote && e.impact);
      }

      if (Array.isArray(parsed.supporting_links)) {
        parsed.supporting_links = parsed.supporting_links
          .map((link: string) => link.trim())
          .filter(Boolean);
      }

      // Ensure credibility_score is a number between 1-100
      if (typeof parsed.credibility_score === 'string') {
        parsed.credibility_score = parseInt(parsed.credibility_score, 10);
      }
      parsed.credibility_score = Math.max(1, Math.min(100, parsed.credibility_score || 0));

      return parsed;
    } catch (e2) {
      console.error('Failed to parse cleaned JSON:', e2);
      throw new Error('Invalid JSON format');
    }
  }
}

// Add web search function
async function performWebSearch(query: string, maxResults: number = 5) {
  try {
    console.log('=== WEB SEARCH DEBUG START ===');
    console.log('Original query received:', query);
    console.log('Max results requested:', maxResults);
    
    // Check if API keys are present
    console.log('Google API Key present:', !!import.meta.env.VITE_GOOGLE_API_KEY);
    console.log('Google Search Engine ID present:', !!import.meta.env.VITE_GOOGLE_SEARCH_ENGINE_ID);
    
    // Extract domain from URL if present and create targeted search
    let domain = '';
    try {
      const urlMatch = query.match(/https?:\/\/([^\/]+)/);
      if (urlMatch) {
        domain = urlMatch[1].replace('www.', '');
      }
    } catch (e) {
      console.log('Could not extract domain from query');
    }
    
    // Create search query - use broader search to find similar articles
    const searchTerms = query.replace(/https?:\/\/[^\s]+/g, '').trim(); // Remove URLs from search terms
    
    // Extract domain from the current page URL to exclude it
    let currentDomain = '';
    try {
      const urlMatch = query.match(/https?:\/\/([^\/]+)/);
      if (urlMatch) {
        currentDomain = urlMatch[1].replace('www.', '');
      }
    } catch (e) {
      console.log('Could not extract current domain from query');
    }
    
    // Create a broader search query without quotes to find similar articles
    const enhancedQuery = currentDomain ? 
      `${searchTerms} -site:${currentDomain}` :
      searchTerms;
    
    console.log('Enhanced search query:', enhancedQuery);
    console.log('Encoded query:', encodeURIComponent(enhancedQuery));
    
    const searchUrl = `https://www.googleapis.com/customsearch/v1?` + 
      `key=${import.meta.env.VITE_GOOGLE_API_KEY}` +
      `&cx=${import.meta.env.VITE_GOOGLE_SEARCH_ENGINE_ID}` +
      `&q=${encodeURIComponent(enhancedQuery)}` +
      `&num=${maxResults}` +
      '&fields=items(title,snippet,link)';
    
    console.log('Full search URL (without API key):', searchUrl.replace(import.meta.env.VITE_GOOGLE_API_KEY, 'API_KEY_HIDDEN'));
    
    const response = await fetch(searchUrl);

    console.log('Search response status:', response.status, response.statusText);
    console.log('Search response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Search API error response:', errorText);
      throw new Error(`Search API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Raw search API response:', data);
    console.log('Number of results returned:', data.items?.length || 0);
    
    if (data.items && data.items.length > 0) {
      console.log('Detailed search results:');
      data.items.forEach((result: any, index: number) => {
        console.log(`Result ${index + 1}:`);
        console.log(`  Title: ${result.title}`);
        console.log(`  URL: ${result.link}`);
        console.log(`  Snippet: ${result.snippet?.substring(0, 100)}...`);
      });
    } else {
      console.log('No search results found');
    }
    
    const processedResults = data.items
      ?.filter((result: any) => {
        // Filter out results that are too similar to the original article
        const resultUrl = result.link.toLowerCase();
        const resultTitle = result.title.toLowerCase();
        
        // Check if this result is from the same domain as the original article
        if (currentDomain && resultUrl.includes(currentDomain)) {
          console.log(`Filtering out result from same domain: ${result.link}`);
          return false;
        }
        
        // Check if the title is too similar (likely the same article)
        const originalTitleWords = searchTerms.toLowerCase().split(' ').filter(word => word.length > 3);
        const titleSimilarity = originalTitleWords.filter(word => resultTitle.includes(word)).length;
        if (titleSimilarity > originalTitleWords.length * 0.7) {
          console.log(`Filtering out too similar title: ${result.title}`);
          return false;
        }
        
        return true;
      })
      .map((result: any) => ({
        url: result.link,
        title: result.title,
        snippet: result.snippet
      })) || [];
    
    console.log('Processed results being returned:', processedResults);
    console.log('=== WEB SEARCH DEBUG END ===');
    
    return processedResults;
  } catch (error) {
    console.error('Web search failed:', error);
    return [];
  }
}

// Add this type definition if not already present
type TabState = {
  pageInfo: any;
  analysis: any[];
  failedProviders: string[];
  showButton: boolean;
  isAnalyzing: boolean;
  hasAttemptedAnalysis: boolean;
};

// Update or add the state management
const tabStates = new Map<number, TabState>();

// Get default state for a new tab
const getDefaultState = (): TabState => ({
  pageInfo: null,
  analysis: [],
  failedProviders: [],
  showButton: true,
  isAnalyzing: false,
  hasAttemptedAnalysis: false
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

    // Listen for tab activation to handle state management when switching tabs
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      try {
        console.log('Tab switched to:', activeInfo.tabId);
        
        // Get the state for the newly activated tab
        const newTabState = tabStates.get(activeInfo.tabId);
        
        // Debug: Log the state being sent
        if (newTabState && newTabState.analysis) {
          console.log('Tab switch - Analysis state:', newTabState.analysis);
          console.log('Analysis length:', newTabState.analysis.length);
          newTabState.analysis.forEach((result: any, idx: number) => {
            console.log(`Tab switch - Analysis ${idx}:`, result.provider, result.result.credibility_summary);
          });
        }
        
        // Send a message to the sidebar to update its state
        // This will trigger the sidebar to reload with the correct state for this tab
        chrome.runtime.sendMessage({
          type: 'TAB_SWITCHED',
          tabId: activeInfo.tabId,
          state: newTabState || getDefaultState()
        }).catch(error => {
          // Ignore errors if sidebar is not open
          console.log('Sidebar not open or not ready:', error);
        });
        
      } catch (error) {
        console.log('Error handling tab switch:', error);
      }
    });

    // Message handler
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // Get tab ID from message or sender
      const tabId = message.tabId || sender.tab?.id;
      
      if (!tabId) {
        console.error('No tab ID found in message or sender');
        sendResponse({ success: false, error: 'No tab ID found' });
        return true;
      }

      if (message.type === 'GET_PAGE_INFO') {
        (async () => {
          try {
            const pageInfo = await chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_CONTENT' });
            if (pageInfo && pageInfo.error) {
              sendResponse({ success: false, error: pageInfo.error });
              return;
            }

            // Get or create state for this tab
            let state = tabStates.get(tabId) || getDefaultState();
            
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
            
            // Save state
            tabStates.set(tabId, state);

            sendResponse({ success: true, data: pageInfo.data });
          } catch (error) {
            console.error('Error getting page info:', error);
            sendResponse({ success: false, error: 'Failed to fetch page info' });
          }
        })();
        return true;
      } 
      
      if (message.type === 'ANALYZE_ARTICLE') {
        (async () => {
          try {
            const tabId = message.tabId;
            if (!tabId) {
              sendResponse({ success: false, error: 'No tab ID provided' });
              return;
            }

            const providers = message.providers || [];
            
            // Set analyzing state for this tab
            let currentState = tabStates.get(tabId) || getDefaultState();
            currentState.isAnalyzing = true;
            tabStates.set(tabId, currentState);
            
            // Debug: Log the providers array
            console.log('Providers array received:', providers);
            console.log('Providers array length:', providers.length);
            
            // Debug: Log API keys (without exposing full keys)
            console.log('API Keys Debug:');
            console.log('Cohere key length:', import.meta.env.VITE_COHERE_API_KEY?.length || 0);
            console.log('Cohere key starts with:', import.meta.env.VITE_COHERE_API_KEY?.substring(0, 5) || 'none');
            console.log('Gemini key length:', import.meta.env.VITE_GEMINI_API_KEY?.length || 0);
            console.log('HuggingFace key length:', import.meta.env.VITE_HUGGINGFACE_API_KEY?.length || 0);
            console.log('HuggingFace key starts with:', import.meta.env.VITE_HUGGINGFACE_API_KEY?.substring(0, 5) || 'none');
            
            // Create individual promises that send updates as they complete
            const providerPromises = providers.map(async (provider: string) => {
              console.log(`Trying provider: ${provider}`);
              try {
                let result;
                switch (provider) {
                case 'OpenAI':
                  result = await fetchOpenAI(message.content, import.meta.env.VITE_OPENAI_API_KEY || '')
                  break;
                case 'Gemini':
                  result = await fetchGemini(message.content, import.meta.env.VITE_GEMINI_API_KEY || '')
                  break;
                case 'Cohere':
                  result = await fetchCohere(message.content, import.meta.env.VITE_COHERE_API_KEY || '')
                  break;
                case 'Mistral7B':
                  result = await fetchMistral7B(message.content, import.meta.env.VITE_HUGGINGFACE_API_KEY || '')
                  break;
                case 'Mixtral8x7B':
                  result = await fetchMixtral8x7B(message.content, import.meta.env.VITE_HUGGINGFACE_API_KEY || '')
                  break;
                case 'Llama':
                  result = await fetchLlama(message.content, import.meta.env.VITE_HUGGINGFACE_API_KEY || '')
                  break;
                default:
                  throw new Error(`Unknown provider: ${provider}`)
                }
                
                // Send success update immediately
                chrome.runtime.sendMessage({
                  type: 'PROVIDER_UPDATE',
                  provider: provider,
                  status: 'complete'
                });
                console.log(`Provider ${provider} completed successfully`);
                
                return result;
              } catch (error) {
                console.error(`Error in provider ${provider}:`, error);
                
                // Send failure update immediately
                chrome.runtime.sendMessage({
                  type: 'PROVIDER_UPDATE',
                  provider: provider,
                  status: 'failed'
                });
                console.log(`Provider ${provider} failed`);
                
                throw error;
              }
            });

            const results = await Promise.allSettled(providerPromises)

            // Process results
            const successfulResults = results
              .map((r, i) => {
                if (r.status === 'fulfilled') {
                  try {
                    let parsedResult;
                    if (typeof r.value === 'string') {
                      try {
                        parsedResult = cleanAndParseJSON(r.value);
                      } catch (e) {
                        console.error('Failed to parse result:', e);
                        return null;
                      }
                    } else {
                      parsedResult = r.value;
                    }

                    if (!parsedResult) {
                      console.error('No parsed result available');
                      return null;
                    }

                    // Validate the structure
                    if (typeof parsedResult.credibility_score !== 'number' ||
                        typeof parsedResult.credibility_summary !== 'string' ||
                        typeof parsedResult.reasoning !== 'string' ||
                        !Array.isArray(parsedResult.evidence_sentences) ||
                        !Array.isArray(parsedResult.supporting_links)) {
                      console.error('Invalid result structure:', parsedResult);
                      return null;
                    }

                    return {
                      provider: providers[i],
                      result: parsedResult
                    };
                  } catch (e) {
                    console.error(`Error processing result from provider ${providers[i]}:`, e);
                    return null;
                  }
                }
                return null;
              })
              .filter((x): x is NonNullable<typeof x> => x !== null);

            const failedProviders = results
              .map((r, i) => {
                console.log(`Provider ${providers[i]} status:`, r.status);
                if (r.status === 'rejected') {
                  console.error(`Provider ${providers[i]} failed:`, r.reason);
                  return providers[i];
                } else if (r.status === 'fulfilled') {
                  console.log(`Provider ${providers[i]} succeeded`);
                }
                return null;
              })
              .filter((x): x is string => x !== null);

            // Update tab state with analysis results
            let state = tabStates.get(tabId);
            if (!state) {
              // If no state exists, create default but we need to preserve pageInfo
              // This shouldn't happen in normal flow, but let's handle it
              console.warn('No existing tab state found during analysis');
              state = getDefaultState();
            }
            
            state.analysis = successfulResults;
            state.failedProviders = failedProviders;
            state.showButton = false;
            state.isAnalyzing = false; // Analysis is complete
            state.hasAttemptedAnalysis = true; // Mark analysis as attempted
            
            // Debug: Log the analysis being saved
            console.log('Saving analysis state:', successfulResults);
            console.log('Analysis length:', successfulResults.length);
            successfulResults.forEach((result: any, idx: number) => {
              console.log(`Saving - Analysis ${idx}:`, result.provider, result.result.credibility_summary);
            });
            
            tabStates.set(tabId, state);
            
            sendResponse({
              success: true,
              data: results,
              providers: providers
            })
          } catch (error) {
            console.error('Error in analyze article:', error);
            sendResponse({ success: false, error: 'Failed to analyze article' });
          }
        })();
        return true;
      }

      if (message.type === 'GET_TAB_STATE') {
        const state = tabStates.get(tabId) || getDefaultState();
        sendResponse({ success: true, data: state });
        return true;
      }

      if (message.type === 'RESET_TAB_STATE') {
        // Clear the state completely
        tabStates.delete(tabId);
        // Initialize with default state
        tabStates.set(tabId, {
          pageInfo: null,
          analysis: [],
          failedProviders: [],
          showButton: true,
          isAnalyzing: false,
          hasAttemptedAnalysis: false
        });
        // Notify other instances of the sidepanel about the reset
        chrome.tabs.sendMessage(tabId, {
          type: 'TAB_SWITCHED',
          state: tabStates.get(tabId)
        }).catch(() => {
          // Ignore errors if content script isn't ready
        });
        sendResponse({ success: true });
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
              showButton: message.data.showButton,
              isAnalyzing: message.data.isAnalyzing || false,
              hasAttemptedAnalysis: message.data.hasAttemptedAnalysis || false
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

      if (message.type === 'TAB_SWITCHED') {
        // This message is sent from the background script to the sidebar
        // No response needed as it's a one-way notification
        return true;
      }

      return true;
    })

    // Handle tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete') {
        // Reset state when navigating to a new page
        tabStates.set(tabId, {
          pageInfo: null,
          analysis: [],
          failedProviders: [],
          showButton: true,
          isAnalyzing: false,
          hasAttemptedAnalysis: false
        });
      }
    });
  }
});