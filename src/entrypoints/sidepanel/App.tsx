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
      topic: string;
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
  const [error, setError] = useState('');
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult[]>([]);
  const [failedProviders, setFailedProviders] = useState<string[]>([]);
  const [showButton, setShowButton] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<string>('');

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
    
    setError('')
    setAnalysis([])
    setFailedProviders([])
    setSelectedProvider('')
    setIsAnalyzing(true)
    
    chrome.runtime.sendMessage({
      type: 'ANALYZE_ARTICLE',
      content: 
      `Please analyze this article and provide the response in the following JSON structure:
        {
          "topic": "brief 2-3 word description of the article's main topic",
          "credibility_score": (1-100),
          "credibility_summary": "balanced summary showing both what makes the article credible and any credibility concerns",
          "reasoning": "detailed explanation of the score",
          "evidence_sentences": [
            {
              "quote": "direct quote from the article",
              "impact": "explanation of how this quote increases credibility"
            },
            ...
          ],
          "supporting_links": []
        }

        Source URL: ${pageInfo.url}
        
        Article to analyze (from source): 
        """
        ${pageInfo.content}
        """

        Instructions:
        1. Use the source URL to verify the publisher's credibility
        2. Cross-reference the content with other news sources
        3. For topic, keep it concise and focused on the main specific subject (not broad)
        4. Verify specific quotes and claims from the text
        5. For evidence_sentences, extract up to 3 direct quotes from the article that support your analysis and explain how each increases credibility
        6. For credibility_summary, provide a 1-2 brief sentence balanced view showing both strengths and potential credibility concerns
        7. Leave supporting_links empty - they will be added separately
        `,
      providers: ['Cohere', 'Gemini', "Llama", "Mistral7B", "Mixtral8x7B"] //FIX HUGGINGFACE API KEY`
      //verification sources bugging out
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
                    const reasoningMatch = r.value.match(/reasoning["\s:]+(.+?)(?=supporting_links|deduction_explanation|evidence_sentences|$)/s);
                    const linksMatch = r.value.match(/supporting_links["\s:]+\[(.*?)\]/s);
                    const deductionMatch = r.value.match(/deduction_explanation["\s:]+(.+?)(?=reasoning|supporting_links|evidence_sentences|$)/s);
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
                            impact: parsed.impact?.trim().replace(/['"]+/g, '') || ''
                          };
                        } catch (e: unknown) {
                          // Fallback for simpler format
                          const quoteMatch = obj.match(/quote["\s:]+([^,}]+)/);
                          const impactMatch = obj.match(/impact["\s:]+([^,}]+)/);
                          return {
                            quote: quoteMatch ? quoteMatch[1].trim().replace(/['"]+/g, '') : '',
                            impact: impactMatch ? impactMatch[1].trim().replace(/['"]+/g, '') : ''
                          };
                        }
                      }).filter((e: { quote: string; impact: string }) => e.quote && e.impact);
                    }
                    
                    parsedResult = {
                      credibility_score: scoreMatch ? parseInt(scoreMatch[1]) : 0,
                      deduction_explanation: deductionMatch ? deductionMatch[1].trim().replace(/['"]+/g, '') : 'No explanation provided',
                      reasoning: reasoningMatch ? reasoningMatch[1].trim().replace(/['"]+/g, '') : r.value,
                      evidence_sentences: evidenceSentences,
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

                // Validate the result structure
                if (typeof parsedResult.credibility_score !== 'number' || 
                    typeof parsedResult.reasoning !== 'string' ||
                    !Array.isArray(parsedResult.supporting_links)) {
                  console.error('Invalid result structure:', parsedResult);
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
        
        if (validResults.length > 0) {
          // Get the most common topic
          const topicCounts = validResults.reduce((acc, curr) => {
            const topic = curr.result.topic;
            acc[topic] = (acc[topic] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          const mainTopic = Object.entries(topicCounts)
            .sort(([,a], [,b]) => (b as number) - (a as number))[0][0];

          // Search for verification sources
          chrome.runtime.sendMessage({ 
            type: 'WEB_SEARCH', 
            query: `${mainTopic} news article fact check verify`,
            max_results: 5
          }, (searchResponse: { 
            success: boolean; 
            data?: { 
              results: Array<{ 
                url: string;
              }> 
            } 
          }) => {
            const results = searchResponse?.data?.results;
            if (searchResponse?.success && results && results.length > 0) {
              // Add real URLs to all results
              const verificationUrls = results
                .filter((r: { url: string }) => r.url.startsWith('http'))
                .map((r: { url: string }) => r.url)
                .slice(0, 5);
                
              validResults.forEach(result => {
                result.result.supporting_links = verificationUrls;
              });
            }
            
            setAnalysis(validResults);
            setShowButton(false);
            setIsAnalyzing(false);
          });
        } else {
          setError('Failed to parse analysis results. Please try again.');
          setIsAnalyzing(false);
        }
      } catch (e) {
        console.error('Error processing analysis results:', e);
        setError('An error occurred while processing the results.');
        setIsAnalyzing(false);
      }
      
      setIsAnalyzing(false);
    });
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Fake News Reader</h1>
        <button className={styles.button} onClick={getPageInfo}>
          New Analysis
        </button>
      </div>

      <div className={styles.content}>
        {error && <p className={styles.error}>{error}</p>}
        {pageInfo && (
          <>
            <h2 className={styles.pageTitle}>
              {pageInfo.title || 'No title found'}
            </h2>
            
            {(showButton || isAnalyzing) ? (
              <>
                <PageDetails pageInfo={pageInfo} />
                <button 
                  className={styles.analyzeButton} 
                  onClick={analyzeArticle}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Article'}
                </button>
              </>
            ) : (
              analysis.length > 0 && (
                <AnalysisResults 
                  analysis={analysis}
                  selectedProvider={selectedProvider}
                  onProviderSelect={setSelectedProvider}
                />
              )
            )}
            
            <FailedProviders providers={failedProviders} />
          </>
        )}
      </div>
    </div>
  );
}

export default App; 