import React, { useState, useEffect } from 'react'

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

  // Add function to calculate average score
  const calculateAverageScore = (results: AnalysisResult[]): number => {
    if (results.length === 0) return 0;
    const sum = results.reduce((acc, curr) => acc + curr.result.credibility_score, 0);
    return Math.round(sum / results.length);
  };

  // Add function to validate URL
  const validateUrl = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  // Add function to filter and validate links
  const processLinks = async (links: string[]): Promise<string[]> => {
    // First, filter out obviously invalid URLs
    const validFormatLinks = links.filter(link => {
      try {
        new URL(link);
        return true;
      } catch {
        return false;
      }
    });

    // Then check each link's availability
    const validationResults = await Promise.all(
      validFormatLinks.map(async link => ({
        link,
        isValid: await validateUrl(link)
      }))
    );

    return validationResults
      .filter(result => result.isValid)
      .map(result => result.link);
  };

  const [error, setError] = useState('')
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult[]>([])
  const [failedProviders, setFailedProviders] = useState<string[]>([])
  const [showButton, setShowButton] = useState(true)

  // Add state for selected AI provider
  const [selectedProvider, setSelectedProvider] = useState<string>('');

  // Add state for collapse toggle
  const [isPageDetailsExpanded, setIsPageDetailsExpanded] = useState(false);

  // Load saved state when popup opens
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_TAB_STATE' }, (response) => {
      if (response?.success && response.data) {
        const state = response.data;
        
        // Set state from background
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

        // Set the page info
        setPageInfo({
          title: response.data.title || 'No title found',
          content: response.data.content || 'No content found',
          url: response.data.url || 'No URL found',
          wordCount: response.data.wordCount || 0
        });
      });
    });
  }

  // Update analyzeArticle to set initial selected provider
  const analyzeArticle = () => {
    if (!pageInfo) {
      setError('No page info found')
      return
    }
    
    setShowButton(false)
    setError('')
    setAnalysis([])
    setFailedProviders([])
    setSelectedProvider('') // Reset selected provider
    
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
      providers: ['Cohere', 'Gemini']
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

                // Validate links before returning result
                const validLinks = await processLinks(parsedResult.supporting_links);
                
                return {
                  provider: response.providers?.[i] || 'Unknown Provider',
                  result: {
                    ...parsedResult,
                    supporting_links: validLinks
                  }
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
      console.log('Successful results with validated links:', validResults);
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

  // Helper function to get the selected analysis result
  const getSelectedAnalysis = () => {
    return analysis.find(result => result.provider === selectedProvider);
  }

  return (
    <div>
      <h1>My Chrome Extension</h1>
      <button onClick={getPageInfo}>New Analysis</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {pageInfo && 
        <div>
          <h2>Title: {pageInfo.title || 'No title found'}</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <button 
              onClick={() => setIsPageDetailsExpanded(!isPageDetailsExpanded)}
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '15px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                backgroundColor: '#fff',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              {isPageDetailsExpanded ? '▼' : '▶'} Page Details
            </button>
            
            {isPageDetailsExpanded && (
              <div style={{
                padding: '15px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: '#fff'
              }}>
                <div style={{ marginBottom: '15px' }}>
                  <strong>URL: </strong>
                  <span><a href={pageInfo.url}>{pageInfo.url}</a></span>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <strong>Word Count: </strong>
                  <span>{pageInfo.wordCount || 'No word count found'}</span>
                </div>
                <div>
                  <strong>Content:</strong>
                  <p style={{ 
                    marginTop: '10px',
                    padding: '10px',
                    backgroundColor: '#f8f8f8',
                    borderRadius: '4px',
                    maxHeight: '200px', 
                    overflowY: 'auto'
                  }}>
                    {pageInfo.content || 'No content found'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {showButton && <button onClick={analyzeArticle}>Analyze Article</button>}
          {analysis.length > 0 && 
          <div>
            <h2>Analysis Results</h2>
            <div style={{ 
              padding: '15px', 
              marginBottom: '20px',
              backgroundColor: '#f0f0f0',
              borderRadius: '5px'
            }}>
              <h3>Overall Credibility Score</h3>
              <span style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {calculateAverageScore(analysis)}/100
              </span>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3>AI Responses</h3>
              <select 
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  marginBottom: '15px',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              >
                <option value="">Select an AI Provider</option>
                {analysis.map((result, idx) => (
                  <option key={idx} value={result.provider}>
                    {result.provider}
                  </option>
                ))}
              </select>

              {selectedProvider && getSelectedAnalysis() && (
                <div style={{
                  padding: '15px',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}>
                  <div style={{ marginBottom: '15px' }}>
                    <strong>Credibility Score: </strong>
                    <span>{getSelectedAnalysis()?.result.credibility_score}/100</span>
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <strong>Reasoning: </strong>
                    <p>{getSelectedAnalysis()?.result.reasoning}</p>
                  </div>
                  <div>
                    <strong>Supporting Links: </strong>
                    <ul style={{ marginTop: '10px' }}>
                      {getSelectedAnalysis()?.result.supporting_links.map((link, linkIdx) => (
                        <li key={linkIdx}>
                          <a href={link} target="_blank" rel="noopener noreferrer">{link}</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
          }
          {failedProviders.length > 0 && 
            <div>
              <h2>Failed Providers</h2>
              {failedProviders.map((provider, idx) => (
                <div key={idx}>
                  <h3>{provider}</h3>
                  <p style={{ color: 'red' }}>Failed to analyze</p>
                </div>
              ))}
            </div>
          }
        </div>
      }
    </div>
  )
}

export default App 