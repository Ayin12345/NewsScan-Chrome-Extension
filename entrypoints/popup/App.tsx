import React, { useState } from 'react'

function App() {
  type PageInfo = {
    title: string,
    content: string,
    url: string,
    wordCount: number
  }
  const [error, setError] = useState('')
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null)
  const [analysis, setAnalysis] = useState<string[]>([])
  const [failedProviders, setFailedProviders] = useState<string[]>([])

  const getPageInfo = () => {
    chrome.runtime.sendMessage({ type: 'GET_PAGE_INFO' }, (response) => {
      if (!response.success) {
        setError(response.error)
      } else {
        setPageInfo(response.data?.data)
      }
    });
  }

  const analyzeArticle = () => {
    if (!pageInfo) {
      setError('No page info found')
      return
    }
    
    // Clear previous results and errors
    setError('')
    setAnalysis([])
    setFailedProviders([])
    
    chrome.runtime.sendMessage({
      type: 'ANALYZE_ARTICLE',
      content: `Analyze this article for credibility (1-100 score) and explain why. Provide links to support as well: ${pageInfo.content}. `,
      providers: ['Cohere', 'Gemini'] // ALL AI PROVIDERS WORK
      //add openai and gemini to the list later
    }, (response) => {
      const anySuccess = response.data.some((r: any) => r.status === 'fulfilled');
      if (!anySuccess) {
        setError('All AI providers failed. Please try again later.');
      } else {
        // Collect all successful results
        const successfulResults = response.data
          .filter((r: any) => r.status === 'fulfilled')
          .map((r: any) => r.value);
        setAnalysis(successfulResults);
        //failed providers
        const failedResults = response.data
          .map((r: any, i: number) => r.status === 'rejected' ? { provider: response.providers[i], reason: r.reason } : null)
          .filter((x: any) => x !== null);
        setFailedProviders(failedResults);
      }
    });
  }
  /*
  Mixtral 8x7B: 
  > "Please review the following article for credibility. Give a credibility score from 1 to 10, explain your reasoning, 
   and list a few reputable sources or articles that support or contradict the main points.
    Article: [PASTE ARTICLE HERE]"
  Mistral 7B:
  > "Please review the following article for credibility. Give a credibility score from 1 to 10, explain your reasoning, 
  */
 //REFACTOR TYPESCRIPT CODE

  return (
    <div>
      <h1>My Chrome Extension</h1>
      <button onClick={getPageInfo}>Get Page Info</button>
      {error && <p>{error}</p>}
      {pageInfo && 
        <div>
          <h2>Title: {pageInfo.title || 'No title found'}</h2>
          <p>Content: {pageInfo.content || 'No content found'}</p>
          <p>Word Count: {pageInfo.wordCount || 'No word count found'}</p>
          <p>URL: {pageInfo.url || 'No URL found'}</p>
          <button onClick={analyzeArticle}>Analyze Article</button>
          {analysis.length > 0 && 
          <div>
            <h2>Analysis Results</h2>
            <ul>
              {analysis.map((result, idx) => <li key={idx}>{result}</li>)}
            </ul>
          </div>
          }
          {failedProviders.length > 0 && 
            <div>
              <h2>Failed Providers</h2>
              <ul>
                {failedProviders.map((provider: any) => (
                  <li key={provider.provider}>{provider.provider}: {provider.reason}</li>
                ))}
              </ul>
            </div>
          }
        </div>
      }
    </div>
  )
}

export default App 
