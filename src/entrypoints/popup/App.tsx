import React, { useState, useEffect } from 'react';
import { PageDetails } from './components/PageDetails';
import { AnalysisResults } from './components/AnalysisResults';
import { FailedProviders } from './components/FailedProviders';
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
      credibility_score: number,
      reasoning: string,
      supporting_links: string[]
    }
  }

  // State management
  const [error, setError] = useState('')
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult[]>([])
  const [failedProviders, setFailedProviders] = useState<string[]>([])
  const [showButton, setShowButton] = useState(true)
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [isPageDetailsExpanded, setIsPageDetailsExpanded] = useState(false);

  // Load saved state when popup opens
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_TAB_STATE' }, (response) => {
      if (response?.success && response.data) {
        const state = response.data;
        if (state.pageInfo) setPageInfo(state.pageInfo);
        if (state.analysis) setAnalysis(state.analysis);
        if (state.failedProviders) setFailedProviders(state.failedProviders);
        if (typeof state.showButton === 'boolean') setShowButton(state.showButton);
      }
    });
  }, []);

  const getPageInfo = () => {
    // Reset state
    setError('');
    setPageInfo(null);
    setAnalysis([]);
    setFailedProviders([]);
    setShowButton(true);

    // Reset background state
    chrome.runtime.sendMessage({ type: 'RESET_TAB_STATE' }, (response) => {
      if (!response?.success) {
        setError('Failed to reset state');
        return;
      }

      // Get new page info
      chrome.runtime.sendMessage({ type: 'GET_PAGE_INFO' }, (response) => {
        if (!response.success) {
          setError(response.error || 'Failed to get page info');
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
      });
    });
  }

  const analyzeArticle = () => {
    if (!pageInfo) {
      setError('No page info found')
      return
    }
    
    setShowButton(false)
    setError('')
    setAnalysis([])
    setFailedProviders([])
    setSelectedProvider('')
    
    chrome.runtime.sendMessage({
      type: 'ANALYZE_ARTICLE',
      content: 
      `Please analyze this article and provide the response in the following JSON structure:
        {
          "credibility_score": (1-100),
          "reasoning": "detailed explanation of the score",
          "supporting_links": ["link1", "link2", ...]
        }

        Source URL: ${pageInfo.url}
        
        Article to analyze (from source): 
        """
        ${pageInfo.content}
        """

        Instructions:
        1. Use the source URL to verify the publisher's credibility
        2. Cross-reference the content with other news sources
        3. Verify specific quotes and claims from the text
        4. For supporting_links, ONLY include real, existing URLs from major news sources or official websites that you are confident exist
        5. Each supporting link MUST be a complete URL starting with https:// and should be from well-known news sources
        6. Do NOT generate or guess URLs - only include links you find during fact-checking
        `,
      providers: ['Cohere']
    }, async (response) => {
      if (!response?.data) {
        setError('Failed to get analysis response');
        return;
      }

      const anySuccess = response.data.some((r: any) => r.status === 'fulfilled');
      if (!anySuccess) {
        setError('All AI providers failed. Please try again later.');
        return;
      }

      // Parse and validate results
      const successfulResults = await Promise.all(
        response.data
          .map(async (r: any, i: number) => {
            if (r?.status === 'fulfilled') {
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

                if (!parsedResult) {
                  console.error('No parsed result available');
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
            }
            return null;
          })
      );

      const validResults = successfulResults.filter((x): x is NonNullable<typeof x> => x !== null);
      setAnalysis(validResults);

      // Failed providers
      const failedResults = response.data
        .map((r: any, i: number) => {
          if (r?.status === 'rejected') {
            return response.providers?.[i] || 'Unknown Provider';
          }
          return null;
        })
        .filter((x: any) => x !== null);
      setFailedProviders(failedResults);
    });
  }

  return (
    <div>
      <h1>My Chrome Extension</h1>
      <button onClick={getPageInfo}>New Analysis</button>
      {error && <p className={styles.error}>{error}</p>}
      {pageInfo && 
        <div>
          <h2>Title: {pageInfo.title || 'No title found'}</h2>
          
          <PageDetails 
            pageInfo={pageInfo}
            isExpanded={isPageDetailsExpanded}
            onToggle={() => setIsPageDetailsExpanded(!isPageDetailsExpanded)}
          />

          {showButton && <button onClick={analyzeArticle}>Analyze Article</button>}
          
          {analysis.length > 0 && 
            <AnalysisResults 
              analysis={analysis}
              selectedProvider={selectedProvider}
              onProviderSelect={setSelectedProvider}
            />
          }
          
          <FailedProviders providers={failedProviders} />
        </div>
      }
    </div>
  );
}

export default App; 