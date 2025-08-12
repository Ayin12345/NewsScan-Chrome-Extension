import React, { useState, useEffect } from 'react';
import { PageDetails } from './components/PageDetails';
import { AnalysisResults } from './components/AnalysisResults';
import { Welcome } from './components/Welcome';
import styles from './styles/App.module.css';

function App() {
  type PageInfo = {
    title: string,
    content: string,
    url: string,
    wordCount: number
  }

  interface AnalysisResult {
    provider: string,
    result: {
      credibility_score: number;
      credibility_summary: string;
      reasoning: string;
      evidence_sentences: Array<{
        quote: string;
        impact: string;
      }>;
      supporting_links: string[];
    }
  }

  // Add loading state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDetectingPage, setIsDetectingPage] = useState(false);
  const [error, setError] = useState('');
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult[]>([]);
  const [failedProviders, setFailedProviders] = useState<string[]>([]);
  const [showButton, setShowButton] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [hasAttemptedAnalysis, setHasAttemptedAnalysis] = useState(false); // Track if user has tried to analyze
  const [currentStep, setCurrentStep] = useState(0);
  const [providerStatuses, setProviderStatuses] = useState<{[key: string]: 'waiting' | 'analyzing' | 'complete' | 'failed'}>({});

  const resetState = () => {
    // First reset local state
    setError('');
    setPageInfo(null);
    setAnalysis([]);
    setFailedProviders([]);
    setShowButton(true);
    setHasAttemptedAnalysis(false);
    setCurrentStep(0);
    setProviderStatuses({});
    setIsDetectingPage(false);
    setIsAnalyzing(false);

    // Then reset background state
    chrome.runtime.sendMessage({ type: 'RESET_TAB_STATE' }, (response) => {
      if (!response?.success) {
        console.error('Failed to reset background state');
      }
    });
  };

  // Typewriter effect steps
  const analysisSteps = [
    "Extracting article content...",
    "Analyzing credibility patterns...",
    "Cross-referencing sources...",
    "Extracting supporting quotes...",
    "Verifying information...",
    "Querying AI providers...",
    "Processing responses...",
    "Generating insights...",
    "Finalizing results..."
  ];

  // Cycle through analysis steps during loading
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAnalyzing) {
      interval = setInterval(() => {
        setCurrentStep((prev) => (prev + 1) % analysisSteps.length);
      }, 2000); // Change step every 2 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAnalyzing]);

  // Update the useEffect to handle tab ID
  useEffect(() => {
    const loadTabState = () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (!currentTab?.id) {
          setError('No active tab found');
          return;
        }

        chrome.runtime.sendMessage({ 
          type: 'GET_TAB_STATE',
          tabId: currentTab.id 
        }, (response) => {
          if (response?.success && response.data) {
            const state = response.data;
            setPageInfo(state.pageInfo);
            setAnalysis(state.analysis || []);
            setFailedProviders(state.failedProviders || []);
            setShowButton(typeof state.showButton === 'boolean' ? state.showButton : true);
            setIsAnalyzing(state.isAnalyzing || false);
            setHasAttemptedAnalysis(state.hasAttemptedAnalysis || false);
          }
        });
      });
    };

    // Load initial state
    loadTabState();

    // Listen for messages from background script
    const handleMessages = (message: any) => {
      if (message.type === 'TAB_SWITCHED') {
        const state = message.state;
        if (state) {
          setPageInfo(state.pageInfo);
          setAnalysis(state.analysis || []);
          setFailedProviders(state.failedProviders || []);
          setShowButton(typeof state.showButton === 'boolean' ? state.showButton : true);
          setIsAnalyzing(state.isAnalyzing || false);
          setHasAttemptedAnalysis(state.hasAttemptedAnalysis || false);
          setError('');
          setIsDetectingPage(false);
        } else {
          // If no state, reset to initial
          resetState();
        }
      }
      
      // Handle real-time provider updates
      if (message.type === 'PROVIDER_UPDATE') {
        console.log(`Provider update: ${message.provider} -> ${message.status}`);
        setProviderStatuses(prev => ({
          ...prev,
          [message.provider]: message.status
        }));
      }
    };

    chrome.runtime.onMessage.addListener(handleMessages);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessages);
    };
  }, []);

  const getPageInfo = () => {
    // Reset state
    setError('');
    setPageInfo(null);
    setAnalysis([]);
    setFailedProviders([]);
    setShowButton(true);
    setHasAttemptedAnalysis(true);
    setIsDetectingPage(true);

    // Get current tab and page info
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      if (!currentTab?.id) {
        setTimeout(() => {
          setIsDetectingPage(false);
          setError('No active tab found');
        }, 1000);
        return;
      }

      // Record start time
      const startTime = Date.now();

      // Get page info
      chrome.runtime.sendMessage({ 
        type: 'GET_PAGE_INFO',
        tabId: currentTab.id 
      }, (response) => {
        // Calculate how long the operation took
        const elapsedTime = Date.now() - startTime;
        // If operation took less than 1 second, wait for the remainder
        const remainingDelay = Math.max(0, 1000 - elapsedTime);
        
        setTimeout(() => {
          setIsDetectingPage(false);
          
          if (!response?.success) {
            setError(response?.error || 'Failed to get page info');
            return;
          }
          
          if (!response.data) {
            setError('No page data received');
            return;
          }

          setPageInfo({
            title: response.data.title || 'No title found',
            content: response.data.content || 'No content found',
            url: response.data.url || 'No URL found',
            wordCount: response.data.wordCount || 0
          });
        }, remainingDelay);
      });
    });
  }

  const analyzeArticle = () => {
    if (!pageInfo) {
      setError('No page info found')
      return
    }
    
    // Get current tab ID first
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      if (!currentTab?.id) {
        setError('No active tab found');
        return;
      }

      setError('')
      setAnalysis([])
      setFailedProviders([])
      setSelectedProvider('')
      
      // Initialize provider statuses
      let providers;
      try {
        providers = JSON.parse(import.meta.env.VITE_AI_ROUTERS || '["Cohere", "Gemini", "Llama", "Mistral7B", "Mixtral8x7B"]');
      } catch (error) {
        console.warn('Failed to parse VITE_AI_ROUTERS, using fallback:', error);
        providers = ["Cohere", "Gemini", "Llama", "Mistral7B", "Mixtral8x7B"];
      }
      const initialStatuses: {[key: string]: 'waiting' | 'analyzing' | 'complete' | 'failed'} = {};
      providers.forEach((provider: string) => {
        initialStatuses[provider] = 'analyzing';
      });
      setProviderStatuses(initialStatuses);
      
      setIsAnalyzing(true);

      chrome.runtime.sendMessage({
        type: 'ANALYZE_ARTICLE',
        tabId: currentTab.id,
        content: 
        `Analyze this news article for credibility. You MUST follow these exact formatting rules:

        {
          "credibility_score": (1-100),
          "credibility_summary": "Write 2-3 complete sentences with proper spacing between words. Show both strengths and concerns. Each sentence must end with a period. REMOVE ANY TRAILING COMMAS",
          "reasoning": "Write multiple complete sentences with proper spacing between words. Include specific evidence. Each sentence must end with a period. REMOVE ANY TRAILING COMMAS",
          "evidence_sentences": [
            {
              "quote": "Copy exact words from the article, preserving all spaces between words. Do not add any punctuation",
              "impact": "Write a complete sentence explaining the impact. Use proper spacing between all words. Must end with a period. REMOVE ANY TRAILING COMMAS"
            }
          ],
          "supporting_links": []
        }

        ARTICLE TO ANALYZE:
        URL: ${pageInfo.url}
        TITLE: ${pageInfo.title}
        CONTENT: ${pageInfo.content}

        CRITICAL RULES:
        1. REMOVE ALL TRAILING COMMAS:
           - Check each sentence
           - Remove any comma that appears at the end
           - Replace trailing commas with periods
        2. SPACING: Put exactly one space between each word
        3. SENTENCES: Every sentence must:
           - Start with a capital letter
           - Have proper spaces between all words
           - End with exactly one period
           - Never end with a comma
        4. QUOTES: 
           - Copy exact text from article
           - Keep original spacing
           - Do not add or remove punctuation
        5. NO FORMATTING SHORTCUTS:
           - No combining words
           - No skipping spaces
           - No missing periods
           - No extra punctuation
           - No trailing commas

        Return ONLY the JSON object with no additional text`,
        providers: providers
      }, async (response) => {
        console.log('Raw API Response:', response);
        console.log('Response providers:', response?.providers);
        console.log('Response data:', response?.data);

        if (!response?.data) {
          console.error('Analysis failed - no response data received');
          setError('Failed to get analysis response');
          setIsAnalyzing(false);
          return;
        }

        // Track failed providers
        const failedOnes = response.data
          .map((r: any, i: number) => ({ result: r, provider: response.providers[i] }))
          .filter(({ result }: { result: { status: string } }) => result.status === 'rejected')
          .map(({ provider }: { provider: string }) => provider);
        
        setFailedProviders(failedOnes);

        // Check if all providers failed
        if (failedOnes.length === response.providers.length) {
          console.error('All providers failed');
          setError('All analysis providers failed. Please try again later.');
          setIsAnalyzing(false);
          return;
        }

        try {
          // Parse and validate results
          const successfulResults = await Promise.all(
            response.data
              .filter((r: any) => r.status === 'fulfilled')
              .map(async (r: any, i: number) => {
                try {
                  let parsedResult;
                  if (typeof r.value === 'string') {
                    try {
                      parsedResult = JSON.parse(r.value);
                    } catch (e) {
                      const scoreMatch = r.value.match(/credibility_score["\s:]+(\d+)/);
                      const summaryMatch = r.value.match(/credibility_summary["\s:]+(.+?)(?=reasoning|supporting_links|evidence_sentences|$)/s);
                      const reasoningMatch = r.value.match(/reasoning["\s:]+(.+?)(?=supporting_links|evidence_sentences|$)/s);
                      const evidenceMatch = r.value.match(/evidence_sentences["\s:]+\[(.*?)\]/s);
                      
                      // Parse evidence sentences with their impact
                      let evidenceSentences = [];
                      if (evidenceMatch) {
                        const evidenceContent = evidenceMatch[1];
                        // Match each evidence object in the array
                        const evidenceObjects = evidenceContent.match(/\{[^{}]*\}/g) || [];
                        evidenceSentences = evidenceObjects.map((obj: string) => {
                          try {
                            const parsed = JSON.parse(obj);
                            return {
                              quote: parsed.quote?.trim().replace(/['"]+/g, '') || '',
                              impact: parsed.impact?.trim().replace(/['"]+/g, '').replace(/,\s*$/, '.') || ''
                            };
                          } catch (e: unknown) {
                            // Fallback for simpler format
                            const quoteMatch = obj.match(/quote["\s:]+([^,}]+)/);
                            const impactMatch = obj.match(/impact["\s:]+([^,}]+)/);
                            return {
                              quote: quoteMatch ? quoteMatch[1].trim().replace(/['"]+/g, '') : '',
                              impact: impactMatch ? impactMatch[1].trim().replace(/['"]+/g, '').replace(/,\s*$/, '.') : ''
                            };
                          }
                        }).filter((e: { quote: string; impact: string }) => e.quote && e.impact);
                      }
                      
                      parsedResult = {
                        credibility_score: scoreMatch ? parseInt(scoreMatch[1]) : 0,
                        credibility_summary: summaryMatch ? summaryMatch[1].trim().replace(/['"]+/g, '').replace(/,\s*$/, '.') : 'No summary provided',
                        reasoning: reasoningMatch ? reasoningMatch[1].trim().replace(/['"]+/g, '').replace(/,\s*$/, '.') : r.value,
                        evidence_sentences: evidenceSentences,
                        supporting_links: [] // Always start with empty array, will be filled by web search
                      };
                    }
                  } else {
                    parsedResult = r.value;
                  }

                  // Function to clean up text fields - ensure single period at end
                  const cleanupText = (text: string) => {
                    if (!text) return '';
                    // First remove any trailing whitespace, commas, or periods
                    let cleaned = text.trim().replace(/[,.\s]+$/, '');
                    // Then add exactly one period if it doesn't end with ! or ?
                    if (!cleaned.match(/[!?]$/)) {
                      cleaned += '.';
                    }
                    return cleaned;
                  };

                  // Clean up any trailing commas and fix periods in all text fields
                  if (parsedResult) {
                    parsedResult.credibility_summary = cleanupText(parsedResult.credibility_summary);
                    parsedResult.reasoning = cleanupText(parsedResult.reasoning);
                    if (parsedResult.evidence_sentences) {
                      parsedResult.evidence_sentences = parsedResult.evidence_sentences.map((evidence: any) => ({
                        quote: evidence.quote?.trim() || '',
                        impact: cleanupText(evidence.impact)
                      }));
                    }
                  }

                  if (!parsedResult) {
                    console.error('No parsed result available');
                    return null;
                  }

                  // Ensure all required fields exist with fallbacks
                  if (typeof parsedResult.credibility_score !== 'number') {
                    console.error('Missing credibility_score:', parsedResult);
                    return null;
                  }
                  
                  // Add missing fields with defaults
                  parsedResult.credibility_summary = parsedResult.credibility_summary || 'No summary provided';
                  parsedResult.reasoning = parsedResult.reasoning || 'No reasoning provided';
                  parsedResult.evidence_sentences = parsedResult.evidence_sentences || [];
                  parsedResult.supporting_links = parsedResult.supporting_links || [];
                  
                  // Validate remaining structure
                  if (typeof parsedResult.credibility_summary !== 'string' ||
                      typeof parsedResult.reasoning !== 'string' ||
                      !Array.isArray(parsedResult.evidence_sentences) ||
                      !Array.isArray(parsedResult.supporting_links)) {
                    console.error('Invalid result structure after fallbacks:', parsedResult);
                    setError('Failed to parse analysis results. Please try again.');
                    return null;
                  }

                  return {
                    provider: response.providers?.[i] || 'Unknown Provider',
                    result: parsedResult
                  };
                } catch (e) {
                  console.error('Error parsing result for provider:', response.providers?.[i], e);
                  return null;
                }
              })
          );

          const validResults = successfulResults.filter((x): x is NonNullable<typeof x> => x !== null);
          
          // Update provider statuses based on final results
          console.log('Final results - Valid:', validResults.length, 'Failed:', failedProviders.length);
          
          // Update statuses based on final results
          const finalStatuses: {[key: string]: 'waiting' | 'analyzing' | 'complete' | 'failed'} = {};
          
          // Mark all providers as failed initially
          providers.forEach((provider: string) => {
            finalStatuses[provider] = 'failed';
          });
          
          // Mark successful providers as complete
          validResults.forEach(result => {
            if (result.provider) {
              finalStatuses[result.provider] = 'complete';
            }
          });
          
          // Force immediate status update
          console.log('Setting final statuses:', finalStatuses);
          setProviderStatuses({...finalStatuses}); // Force new object reference

          if (validResults.length > 0) {
            // Improve web search implementation with better error handling
            const searchTimeout = setTimeout(() => {
              console.log('Web search timed out');
              validResults.forEach(result => {
                result.result.supporting_links = ['Search timed out - please verify independently.'];
              });
              setAnalysis(validResults);
              setShowButton(false);
              setIsAnalyzing(false);
              setHasAttemptedAnalysis(true); // Ensure this stays true
            }, 20000);

            try {
              // Get current tab ID first before starting search
              chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
                const currentTab = tabs[0];
                if (!currentTab?.id) {
                  console.error('No active tab found');
                  validResults.forEach(result => {
                    result.result.supporting_links = ['Unable to verify - no active tab found.'];
                  });
                  setAnalysis(validResults);
                  setShowButton(false);
                  setIsAnalyzing(false);
                  setHasAttemptedAnalysis(true); // Ensure this stays true
                  return;
                }

                // Create two search queries with proper escaping
                const cleanQuery = (text: string) => {
                  return text
                    .replace(/['"]/g, '') // Remove quotes
                    .replace(/[^\w\s-]/g, ' ') // Replace special chars with space
                    .trim()
                    .split(/\s+/)
                    .filter(word => word.length > 2) // Remove very short words
                    .join(' ');
                };

                // Extract main keywords from title
                const keywords = cleanQuery(pageInfo.title);
                
                // Split search into multiple smaller queries for better results
                const queries = [
                  // Fact check sites - split into multiple queries to avoid operator limits
                  `${keywords} site:factcheck.org`,
                  `${keywords} site:snopes.com`,
                  `${keywords} site:politifact.com`,
                  `${keywords} site:reuters.com/fact-check`,
                  
                  // News sites - also split to avoid operator limits
                  `${keywords} site:wsj.com`,
                  `${keywords} site:bloomberg.com`,
                  `${keywords} site:reuters.com`,
                  `${keywords} site:apnews.com`,
                  `${keywords} site:bbc.com`
                ];

                // Execute searches sequentially to avoid rate limiting
                const executeSearch = async (query: string) => {
                  return new Promise<Array<{url: string; title?: string}>>((resolve) => {
                    console.log('Executing search with query:', query);
                    chrome.runtime.sendMessage({ 
                      type: 'WEB_SEARCH', 
                      query: query,
                      max_results: 3, // Reduced per query since we're doing more queries
                      tabId: currentTab.id
                    }, (response) => {
                      console.log('Search response for query:', query, response);
                      if (!response?.success || !response?.data?.results) {
                        console.error('Search failed for query:', query, response);
                        resolve([]);
                        return;
                      }
                      resolve(response.data.results);
                    });
                  });
                };

                try {
                  // Run all searches with small delays between them
                  let allResults: Array<{url: string; title?: string}> = [];
                  
                  for (const query of queries) {
                    const results = await executeSearch(query);
                    allResults = [...allResults, ...results];
                    await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay between queries
                  }

                  clearTimeout(searchTimeout);

                  // Filter and deduplicate results
                  const uniqueResults = Array.from(new Set(
                    allResults
                      .filter((r: any) => {
                        if (!r?.url) return false;
                        const url = r.url.toLowerCase();
                        return (
                          url.startsWith('http') &&
                          !url.includes('facebook.com') &&
                          !url.includes('twitter.com') &&
                          !url.includes('instagram.com') &&
                          !url.includes('tiktok.com') &&
                          !url.includes('reddit.com') &&
                          !url.includes('.pdf') &&
                          !url.includes('/video/')
                        );
                      })
                      .map((r: any) => r.url)
                  )).slice(0, 5);

                  if (uniqueResults.length > 0) {
                    validResults.forEach(result => {
                      result.result.supporting_links = uniqueResults;
                    });
                  } else {
                    console.log('No results found after filtering');
                    validResults.forEach(result => {
                      result.result.supporting_links = ['No verification sources found - please verify independently.'];
                    });
                  }

                  setAnalysis(validResults);
                  setShowButton(false);
                  setIsAnalyzing(false);
                  setHasAttemptedAnalysis(true); // Ensure this stays true

                } catch (error) {
                  console.error('Error during web search:', error);
                  validResults.forEach(result => {
                    result.result.supporting_links = ['Search error - please verify independently.'];
                  });
                  setAnalysis(validResults);
                  setShowButton(false);
                  setIsAnalyzing(false);
                  setHasAttemptedAnalysis(true); // Ensure this stays true
                }
              });
            } catch (error) {
              console.error('Error initiating tab query:', error);
              validResults.forEach(result => {
                result.result.supporting_links = ['Error accessing tab information.'];
              });
              setAnalysis(validResults);
              setShowButton(false);
              setIsAnalyzing(false);
              setHasAttemptedAnalysis(true); // Ensure this stays true
            }
          } else {
            setError('Failed to parse analysis results. Please try again.');
            setTimeout(() => {
              setIsAnalyzing(false);
              setHasAttemptedAnalysis(true); // Ensure this stays true
            }, 1500);
          }
        } catch (e) {
          console.error('Error processing analysis results:', e);
          setError('An error occurred while processing the results.');
          setTimeout(() => {
            setIsAnalyzing(false);
            setHasAttemptedAnalysis(true); // Ensure this stays true
          }, 1500);
        }
        
      });
    });
  }

  // If we're showing the welcome screen, render it directly without the container
  if (!hasAttemptedAnalysis && !pageInfo && !isDetectingPage) {
    return <Welcome onStartAnalysis={getPageInfo} />;
  }

  return (
    <div className={styles.container}>
      {/* Modern Analysis Loading Overlay */}
      {(isAnalyzing || isDetectingPage) && (
        <div className={styles.analysisLoadingState}>
          <div className={styles.analysisLoadingContent}>
            <h2 className={styles.analysisLoadingTitle}>
              {isDetectingPage ? 'Detecting Article' : 'Analyzing Article'}
            </h2>
            <p className={styles.analysisLoadingSubtitle}>
              {isDetectingPage 
                ? 'Please wait while we analyze this page'
                : 'AI models are currently evaluating the credibility of this content'
              }
            </p>
            
            <div className={styles.modernSpinner}>
              <div className={styles.spinnerRing}></div>
              <div className={styles.spinnerRing}></div>
              <div className={styles.spinnerRing}></div>
            </div>
            
            {isAnalyzing && (
              <div className={styles.aiProviders}>
                {Object.entries(providerStatuses).map(([provider, status]) => (
                  <div 
                    key={`${provider}-${status}`} 
                    className={`${styles.providerStatus} ${
                      status === 'complete' ? styles.complete : 
                      status === 'failed' ? styles.failed :
                      status === 'analyzing' ? styles.analyzing : ''
                    }`}
                  >
                    <span className={styles.providerName}>{provider}</span>
                    <div className={`${styles.statusDot} ${styles[`status${status.charAt(0).toUpperCase() + status.slice(1)}`]}`}></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className={styles.header}>
        <h1 className={styles.title}>Fake News Reader</h1>
        <div className={styles.headerButtons}>
          <button 
            className={`${styles.button} ${!hasAttemptedAnalysis ? styles.headerButtonHidden : ''}`} 
            onClick={getPageInfo}
          >
            New Analysis
          </button>
          {hasAttemptedAnalysis && (
            <button 
              className={styles.resetButton} 
              onClick={resetState}
              title="Reset to welcome screen"
            >
              ↺
            </button>
          )}
        </div>
      </div>

      <div className={styles.content}>
        {isDetectingPage ? (
          <div className={styles.analysisLoadingState}>
            <div className={styles.analysisLoadingContent}>
              <h2 className={styles.analysisLoadingTitle}>Detecting Article</h2>
              <p className={styles.analysisLoadingSubtitle}>
                Please wait while we analyze this page
              </p>
              
              <div className={styles.modernSpinner}>
                <div className={styles.spinnerRing}></div>
                <div className={styles.spinnerRing}></div>
                <div className={styles.spinnerRing}></div>
              </div>
            </div>
          </div>
        ) : pageInfo ? (
          <>
            <h2 className={styles.pageTitle}>
              {pageInfo.title || 'No title found'}
            </h2>
            
            {/* Show PageDetails only when not analyzing AND no analysis results yet */}
            {!isAnalyzing && analysis.length === 0 && <PageDetails pageInfo={pageInfo} />}
            
            {/* Show analysis results when available */}
            {analysis.length > 0 && (
              <AnalysisResults 
                analysis={analysis}
                selectedProvider={selectedProvider}
                onProviderSelect={setSelectedProvider}
              />
            )}
            
          </>
        ) : error ? (
          <div className={styles.errorState}>
            <div className={styles.errorMessage}>
              {error || "Unable to analyze this page"}
            </div>
            <p className={styles.errorDescription}>
              Click "New Analysis" above to try a different page, or "Try Again" to retry this page.
            </p>
            <button className={styles.button} onClick={getPageInfo}>
              Try Again
            </button>
          </div>
        ) : !hasAttemptedAnalysis ? (
          <Welcome onStartAnalysis={getPageInfo} />
        ) : null}
      </div>
      
      {/* Fixed Analyze Button - Only show when no analysis results yet */}
      {pageInfo && !isAnalyzing && analysis.length === 0 && (
        <div className={styles.fixedAnalyzeButton}>
          <button 
            className={styles.analyzeButton} 
            onClick={analyzeArticle}
          >
            Analyze Article
          </button>
        </div>
      )}
    </div>
  );
}

export default App; 