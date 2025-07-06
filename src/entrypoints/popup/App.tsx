import React, { useState } from 'react'

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

  const [error, setError] = useState('')
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult[]>([])
  const [failedProviders, setFailedProviders] = useState<string[]>([])
  const [showButton, setShowButton] = useState(true)

  const getPageInfo = () => {
    // Reset state
    setError('');
    setPageInfo(null);
    setAnalysis([]);
    setFailedProviders([]);
    setShowButton(true);

    // Get new page info
    chrome.runtime.sendMessage({ type: 'GET_PAGE_INFO' }, (response) => {
      console.log('Received page info response:', response);
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
        4. Provide supporting links from reputable sources that corroborate the information`,
      providers: ['Cohere']
    }, (response) => {
      if (!response?.data) {
        setError('Failed to get analysis response');
        return;
      }

      const anySuccess = response.data.some((r: any) => r.status === 'fulfilled');
      if (!anySuccess) {
        setError('All AI providers failed. Please try again later.');
        return;
      }

      // Parse successful results
      const successfulResults = response.data
        .map((r: any, i: number) => {
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
        .filter((x: any) => x !== null);

      console.log('Successful results:', successfulResults);
      setAnalysis(successfulResults);

      // Failed providers
      const failedResults = response.data
        .map((r: any, i: number) => {
          if (r?.status === 'rejected') {
            return { 
              provider: response.providers?.[i] || 'Unknown Provider', 
              reason: r.reason || 'Unknown error' 
            };
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
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {pageInfo && 
        <div>
          <h2>Title: {pageInfo.title || 'No title found'}</h2>
          <p>Content: {pageInfo.content || 'No content found'}</p>
          <p>Word Count: {pageInfo.wordCount || 'No word count found'}</p>
          <p>URL: {pageInfo.url || 'No URL found'}</p>
          {showButton && <button onClick={analyzeArticle}>Analyze Article</button>}
          {analysis.length > 0 && 
          <div>
            <h2>Analysis Results</h2>
            {analysis.map((result, idx) => (
              <div key={idx} style={{ marginBottom: '20px' }}>
                <h3>{result.provider}</h3>
                <div>
                  <strong>Credibility Score: </strong>
                  <span>{result.result.credibility_score}/100</span>
                </div>
                <div>
                  <strong>Reasoning: </strong>
                  <p>{result.result.reasoning}</p>
                </div>
                <div>
                  <strong>Supporting Links: </strong>
                  <ul>
                    {result.result.supporting_links.map((link, linkIdx) => (
                      <li key={linkIdx}>
                        <a href={link} target="_blank" rel="noopener noreferrer">{link}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
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