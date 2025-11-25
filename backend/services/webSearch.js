// Web search service for backend
// This mirrors the functionality from src/utils/webSearch.ts but runs server-side

export async function generateSearchQuery(title, geminiApiKey) {
  try {
    const prompt = `Given this article title: "${title}"

Generate a simple Google search query to find related news articles and fact-checking content.

Instructions:
- Extract the main person, place, or event from the title
- Create a simple query with 2-4 key words
- Focus on the most important elements (names, locations, events)
- Avoid complex operators or restrictions
- Make it broad enough to find results but specific enough to be relevant

Examples:
- For "Staten Island man arrested at Zohran Mamdani's anti-Trump event" → "Zohran Mamdani Staten Island arrest"
- For Bad Bunny to Perform at Apple Music 2026 Super Bowl Halftime Show → focus on Bad Bunny and Super Bowl, not Apple Music or 2026
- For "Vaccine safety claims verified" → "vaccine safety verification"

Return ONLY the search query, nothing else.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 100
          }
        })
      }
    );

    if (!response.ok) {
      console.error('Gemini API error:', response.status, response.statusText);
      return `"${title}" fact check`;
    }

    const data = await response.json();
    const generatedQuery = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    return generatedQuery || `"${title}" fact check`;
  } catch (error) {
    console.error('Failed to generate AI query:', error);
    return `"${title}" fact check`;
  }
}

export async function performWebSearch(query, maxResults, googleApiKey, googleSearchEngineId, geminiApiKey) {
  try {
    // Extract search terms from the query (remove URLs)
    const searchTerms = query.replace(/https?:\/\/[^\s]+/g, '').trim();
    
    // Extract current domain and year to exclude from results
    let currentDomain = '';
    let originalArticleYear = null;
    
    try {
      const urlMatch = query.match(/https?:\/\/([^\/]+)/);
      if (urlMatch) {
        currentDomain = urlMatch[1].replace('www.', '');
      }
      
      // Extract year from the original article URL
      const yearMatch = query.match(/\/(20\d{2})\//);
      if (yearMatch) {
        originalArticleYear = parseInt(yearMatch[1]);
      } else {
        const altYearMatch = query.match(/(20\d{2})/);
        if (altYearMatch) {
          originalArticleYear = parseInt(altYearMatch[1]);
        }
      }
    } catch (e) {
      // Continue without domain/year filtering
    }
    
    // Generate AI-powered search query
    const aiGeneratedQuery = await generateSearchQuery(searchTerms, geminiApiKey);
    
    // Add domain exclusion if we have a current domain
    const finalQuery = currentDomain ? `${aiGeneratedQuery} -site:${currentDomain}` : aiGeneratedQuery;
    
    // Execute Google search with AI-generated query
    const params = new URLSearchParams({
      key: googleApiKey,
      cx: googleSearchEngineId,
      q: finalQuery,
      num: Math.min(10, maxResults).toString(),
      fields: 'items(title,snippet,link)'
    });
    
    const searchUrl = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      console.error('Google search failed:', response.status, response.statusText);
      if (response.status === 403) {
        console.error('API quota exceeded or access denied. Check your Google Custom Search API key and quota.');
      } else if (response.status === 400) {
        console.error('Bad request - check API parameters');
        const errorBody = await response.text();
        console.error('Error response:', errorBody);
      }
      return {
        results: [],
        searchMethod: 'fallback',
        queryUsed: finalQuery,
        aiQueryGenerated: aiGeneratedQuery,
        fallbackQueryUsed: `Google API error: ${response.status}`
      };
    }
    
    const data = await response.json();
    
    // Process results with quality filtering (same logic as frontend)
    let processedResults = (data.items || [])
      .filter((result) => {
        if (!result?.link) return false;
        
        // Filter out results from the same domain as the original article
        if (currentDomain && result.link.toLowerCase().includes(currentDomain)) {
          return false;
        }
        // Filter out results same as original article
        if (result.link.toLowerCase() === query.toLowerCase()) {
          return false;
        }
        
        // Filter out problematic domains
        const problematicDomains = [
          '4chan.org', '8kun.top', 'gab.com', 'parler.com', 'truthsocial.com'
        ];
        
        const resultDomain = new URL(result.link).hostname.toLowerCase();
        if (problematicDomains.some(domain => resultDomain.includes(domain))) {
          return false;
        }
        
        // Filter articles by year
        const urlPath = new URL(result.link).pathname;
        const yearMatch = urlPath.match(/\/(20\d{2})\//);
        if (yearMatch) {
          const articleYear = parseInt(yearMatch[1]);
          if (originalArticleYear && articleYear !== originalArticleYear) {
            return false;
          }
        }
        
        // Filter very old articles
        const oldContentPatterns = [
          /\/20(0[0-9]|1[0-5])\//, // 2000-2015
          /archive\./,
          /old\./,
          /legacy\./
        ];
        
        if (oldContentPatterns.some(pattern => pattern.test(result.link))) {
          return false;
        }
        
        // Intelligent relevance filtering
        const factCheckKeywords = [
          'fact', 'check', 'verify', 'debunk', 'hoax', 'fake', 'false', 'misleading',
          'analysis', 'investigation', 'truth', 'reality', 'claim', 'rumor'
        ];
        
        const titleAndSnippet = `${result.title || ''} ${result.snippet || ''}`.toLowerCase();
        const hasRelevantKeywords = factCheckKeywords.some(keyword => 
          titleAndSnippet.includes(keyword)
        );
        
        // Trusted domains
        const trustedDomains = [
          'snopes.com', 'factcheck.org', 'politifact.com', 'reuters.com', 'ap.org',
          'bbc.com', 'bbc.co.uk', 'nytimes.com', 'washingtonpost.com', 'wsj.com',
          'npr.org', 'pbs.org', 'abcnews.go.com', 'cbsnews.com', 'nbcnews.com',
          'cnn.com', 'foxnews.com', 'msnbc.com', 'abc.net.au', 'theguardian.com',
          'independent.co.uk', 'telegraph.co.uk', 'economist.com', 'time.com',
          'newsweek.com', 'usatoday.com', 'latimes.com', 'chicagotribune.com'
        ];
        
        const isFromTrustedDomain = trustedDomains.some(domain => 
          resultDomain.includes(domain)
        );
        
        // Extract key entities
        const originalWords = searchTerms.split(' ');
        const keyEntities = originalWords.filter(word => {
          const cleanWord = word.toLowerCase();
          return word.length > 3 && 
                 !['the', 'and', 'for', 'with', 'from', 'that', 'this', 'have', 'been', 'they', 'were', 'said', 'news', 'article', 'report', 'story'].includes(cleanWord) &&
                 (word[0] === word[0].toUpperCase() || cleanWord.length > 5);
        }).map(word => word.toLowerCase());
        
        const entityMatches = keyEntities.filter(entity => 
          titleAndSnippet.includes(entity)
        );
        
        const hasStrongEntityMatch = entityMatches.length >= 2 || 
          (entityMatches.length >= 1 && keyEntities.some(entity => entity.includes(' ')));
        
        // Allow if any of these conditions are met
        return hasRelevantKeywords || isFromTrustedDomain || hasStrongEntityMatch;
      })
      .map((result) => ({
        url: result.link,
        title: result.title,
        snippet: result.snippet
      }))
      // Remove duplicates
      .filter((result, index, self) => 
        index === self.findIndex((r) => r.url === result.url)
      )
      .slice(0, maxResults);
    
    // If we have results from AI-generated query, return them
    if (processedResults.length > 0) {
      return {
        results: processedResults,
        searchMethod: 'ai-generated',
        queryUsed: finalQuery,
        aiQueryGenerated: aiGeneratedQuery
      };
    }

    // If no results from AI-generated query, try fallback strategies
    const fallbackStrategies = [
      `"${searchTerms}" fact check`,
      `${searchTerms} verification`,
      `${searchTerms} debunked`,
      `${searchTerms} news analysis`,
      searchTerms
    ];
    
    for (const fallbackQuery of fallbackStrategies) {
      const fallbackParams = new URLSearchParams({
        key: googleApiKey,
        cx: googleSearchEngineId,
        q: fallbackQuery,
        num: Math.min(10, maxResults).toString(),
        fields: 'items(title,snippet,link)'
      });
      
      const fallbackUrl = `https://www.googleapis.com/customsearch/v1?${fallbackParams.toString()}`;
      
      try {
        const fallbackResponse = await fetch(fallbackUrl);
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          
          const fallbackResults = (fallbackData.items || [])
            .filter((result) => {
              if (!result?.link) return false;
              
              // Apply same filtering logic
              if (currentDomain && result.link.toLowerCase().includes(currentDomain)) {
                return false;
              }
              
              const problematicDomains = [
                '4chan.org', '8kun.top', 'gab.com', 'parler.com', 'truthsocial.com'
              ];
              
              const resultDomain = new URL(result.link).hostname.toLowerCase();
              if (problematicDomains.some(domain => resultDomain.includes(domain))) {
                return false;
              }
              
              const urlPath = new URL(result.link).pathname;
              const yearMatch = urlPath.match(/\/(20\d{2})\//);
              if (yearMatch) {
                const articleYear = parseInt(yearMatch[1]);
                if (originalArticleYear && articleYear !== originalArticleYear) {
                  return false;
                }
              }
              
              const oldContentPatterns = [
                /\/20(0[0-9]|1[0-5])\//,
                /archive\./,
                /old\./,
                /legacy\./
              ];
              
              if (oldContentPatterns.some(pattern => pattern.test(result.link))) {
                return false;
              }
              
              return true;
            })
            .map((result) => ({
              url: result.link,
              title: result.title,
              snippet: result.snippet
            }))
            .filter((result, index, self) => 
              index === self.findIndex((r) => r.url === result.url)
            )
            .slice(0, maxResults);
          
          if (fallbackResults.length > 0) {
            return {
              results: fallbackResults,
              searchMethod: 'fallback',
              queryUsed: fallbackQuery,
              aiQueryGenerated: aiGeneratedQuery,
              fallbackQueryUsed: fallbackQuery
            };
          }
        }
      } catch (fallbackError) {
        console.error(`Fallback query "${fallbackQuery}" failed:`, fallbackError);
        continue;
      }
    }
    
    // If no fallback strategies worked, return empty results
    return {
      results: [],
      searchMethod: 'fallback',
      queryUsed: 'No successful query',
      aiQueryGenerated: aiGeneratedQuery,
      fallbackQueryUsed: 'All fallback queries failed'
    };
  } catch (error) {
    console.error('AI-powered web search failed:', error);
    return {
      results: [],
      searchMethod: 'fallback',
      queryUsed: 'Error occurred',
      aiQueryGenerated: 'Failed to generate',
      fallbackQueryUsed: 'Error before fallback'
    };
  }
}

