var backgroundNew = function() {
  "use strict";
  function defineBackground(arg) {
    if (arg == null || typeof arg === "function") return { main: arg };
    return arg;
  }
  async function fetchOpenAI(content, apiKey) {
    var _a;
    console.time("[AI] OpenAI request");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content }]
      })
    });
    console.timeEnd("[AI] OpenAI request");
    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message.content) {
      return data.choices[0].message.content;
    } else {
      throw new Error(((_a = data.error) == null ? void 0 : _a.message) || "No response from OpenAI");
    }
  }
  async function fetchGemini(content, apiKey) {
    var _a;
    console.time("[AI] Gemini request");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: content
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096
        }
      })
    });
    console.timeEnd("[AI] Gemini request");
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    const data = await response.json();
    console.log("Gemini API Response Data:", JSON.stringify(data, null, 2));
    if (data.candidates && data.candidates[0]) {
      const candidate = data.candidates[0];
      if (candidate.finishReason === "MAX_TOKENS") {
        throw new Error("Gemini response was truncated due to token limit. Try reducing your input length.");
      }
      if (candidate.finishReason === "SAFETY") {
        throw new Error("Gemini response was blocked due to safety filters.");
      }
      if (candidate.content && candidate.content.parts && candidate.content.parts[0] && candidate.content.parts[0].text) {
        return candidate.content.parts[0].text;
      }
      if (candidate.content && candidate.content.text) {
        return candidate.content.text;
      }
      throw new Error(`Gemini response incomplete. Finish reason: ${candidate.finishReason || "unknown"}`);
    } else {
      console.error("Gemini response structure:", data);
      throw new Error(((_a = data.error) == null ? void 0 : _a.message) || "No candidates in Gemini response");
    }
  }
  async function fetchCohere(content, apiKey) {
    console.log("Cohere API Key:", "Present");
    console.log("Cohere API Key length:", apiKey.length);
    console.log("Cohere Content length:", content.length);
    console.log("Cohere Content preview:", content.substring(0, 200) + "...");
    if (!content || content.trim().length === 0) {
      throw new Error("Content is empty or invalid");
    }
    try {
      console.time("[AI] Cohere request");
      const response = await fetch("https://api.cohere.ai/v1/chat", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "command-r",
          message: content,
          max_tokens: 1250,
          temperature: 0.3,
          chat_history: [],
          prompt_truncation: "AUTO"
        })
      });
      console.timeEnd("[AI] Cohere request");
      console.log("Cohere Response Status:", response.status, response.statusText);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Cohere API Full Error:", {
          status: response.status,
          statusText: response.statusText,
          errorText,
          headers: Object.fromEntries(response.headers.entries())
        });
        throw new Error(`Cohere API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      const data = await response.json();
      console.log("Cohere API Response Data:", data);
      if (data.text) {
        return data.text;
      } else {
        throw new Error(data.message || "No response from Cohere");
      }
    } catch (error) {
      console.error("Cohere API Call Failed:", error);
      throw error;
    }
  }
  backgroundNew;
  console.log("[WebSearch] Module loaded - web search tracking is active");
  async function generateSearchQuery(title) {
    var _a, _b, _c, _d, _e, _f;
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
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${"AIzaSyDPDnXHi6y7weR-_9GB-yE9zeEp9M17fNM"}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
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
      });
      if (!response.ok) {
        console.error("Gemini API error:", response.status, response.statusText);
        const errorText = await response.text();
        console.error("Gemini API error details:", errorText);
        console.log("[WebSearch] Falling back to basic pattern due to API error");
        return `"${title}" fact check`;
      }
      const data = await response.json();
      const generatedQuery = (_f = (_e = (_d = (_c = (_b = (_a = data.candidates) == null ? void 0 : _a[0]) == null ? void 0 : _b.content) == null ? void 0 : _c.parts) == null ? void 0 : _d[0]) == null ? void 0 : _e.text) == null ? void 0 : _f.trim();
      if (generatedQuery) {
        return generatedQuery;
      } else {
        return `"${title}" fact check`;
      }
    } catch (error) {
      console.error("Failed to generate AI query:", error);
      return `"${title}" fact check`;
    }
  }
  async function performWebSearch(query, maxResults = 5) {
    try {
      const searchTerms = query.replace(/https?:\/\/[^\s]+/g, "").trim();
      let currentDomain = "";
      let originalArticleYear = null;
      try {
        const urlMatch = query.match(/https?:\/\/[^\/]+/);
        if (urlMatch) {
          currentDomain = urlMatch[1].replace("www.", "");
        }
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
      }
      const aiGeneratedQuery = await generateSearchQuery(searchTerms);
      console.log("[WebSearch] AI generated query:", aiGeneratedQuery);
      const finalQuery = currentDomain ? `${aiGeneratedQuery} -site:${currentDomain}` : aiGeneratedQuery;
      console.log("[WebSearch] Final query (with domain exclusion):", finalQuery);
      const params = new URLSearchParams({
        key: "AIzaSyAIQCMO6dv-Ywnqfv2ctmV-UlBD3z1xHzI",
        cx: "c424f03b2cfd34523",
        q: finalQuery,
        num: Math.min(10, maxResults).toString(),
        fields: "items(title,snippet,link)"
      });
      const searchUrl = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;
      const response = await fetch(searchUrl);
      if (!response.ok) {
        console.error("Google search failed:", response.status, response.statusText);
        if (response.status === 403) {
          console.error("API quota exceeded or access denied. Check your Google Custom Search API key and quota.");
        } else if (response.status === 400) {
          console.error("Bad request - check API parameters");
          const errorBody = await response.text();
          console.error("Error response:", errorBody);
        }
        return {
          results: [],
          searchMethod: "fallback",
          queryUsed: finalQuery,
          aiQueryGenerated: aiGeneratedQuery,
          fallbackQueryUsed: `Google API error: ${response.status}`
        };
      }
      const data = await response.json();
      let processedResults = (data.items || []).filter((result2) => {
        var _a;
        if (!(result2 == null ? void 0 : result2.link)) return false;
        if (currentDomain && result2.link.toLowerCase().includes(currentDomain)) {
          return false;
        }
        const problematicDomains = [
          "4chan.org",
          "8kun.top",
          "gab.com",
          "parler.com",
          "truthsocial.com"
        ];
        const resultDomain = new URL(result2.link).hostname.toLowerCase();
        if (problematicDomains.some((domain) => resultDomain.includes(domain))) {
          return false;
        }
        const urlPath = new URL(result2.link).pathname;
        const yearMatch = urlPath.match(/\/(20\d{2})\//);
        if (yearMatch) {
          const articleYear = parseInt(yearMatch[1]);
          if (originalArticleYear && articleYear !== originalArticleYear) {
            return false;
          }
        }
        const oldContentPatterns = [
          /\/20(0[0-9]|1[0-5])\//,
          // 2000-2015
          /archive\./,
          /old\./,
          /legacy\./
        ];
        if (oldContentPatterns.some((pattern) => pattern.test(result2.link))) {
          return false;
        }
        const factCheckKeywords = [
          "fact",
          "check",
          "verify",
          "debunk",
          "hoax",
          "fake",
          "false",
          "misleading",
          "analysis",
          "investigation",
          "truth",
          "reality",
          "claim",
          "rumor"
        ];
        const titleAndSnippet = `${result2.title || ""} ${result2.snippet || ""}`.toLowerCase();
        const hasRelevantKeywords = factCheckKeywords.some(
          (keyword) => titleAndSnippet.includes(keyword)
        );
        const trustedDomains = [
          "snopes.com",
          "factcheck.org",
          "politifact.com",
          "reuters.com",
          "ap.org",
          "bbc.com",
          "bbc.co.uk",
          "nytimes.com",
          "washingtonpost.com",
          "wsj.com",
          "npr.org",
          "pbs.org",
          "abcnews.go.com",
          "cbsnews.com",
          "nbcnews.com",
          "cnn.com",
          "foxnews.com",
          "msnbc.com",
          "abc.net.au",
          "theguardian.com",
          "independent.co.uk",
          "telegraph.co.uk",
          "economist.com",
          "time.com",
          "newsweek.com",
          "usatoday.com",
          "latimes.com",
          "chicagotribune.com"
        ];
        const isFromTrustedDomain = trustedDomains.some(
          (domain) => resultDomain.includes(domain)
        );
        const originalTitleLower = searchTerms.toLowerCase();
        const originalWords = searchTerms.split(" ");
        const keyEntities = originalWords.filter((word) => {
          const cleanWord = word.toLowerCase();
          return word.length > 3 && !["the", "and", "for", "with", "from", "that", "this", "have", "been", "they", "were", "said", "news", "article", "report", "story"].includes(cleanWord) && (word[0] === word[0].toUpperCase() || cleanWord.length > 5);
        }).map((word) => word.toLowerCase());
        console.log("[WebSearch] Key entities extracted:", keyEntities);
        const entityMatches = keyEntities.filter(
          (entity) => titleAndSnippet.includes(entity)
        );
        console.log("[WebSearch] Entity matches found:", entityMatches, "for result:", result2.title);
        const hasStrongEntityMatch = entityMatches.length >= 2 || entityMatches.length >= 1 && keyEntities.some((entity) => entity.includes(" "));
        const shouldInclude = hasRelevantKeywords || isFromTrustedDomain || hasStrongEntityMatch;
        console.log("[WebSearch] Result evaluation:", {
          title: ((_a = result2.title) == null ? void 0 : _a.substring(0, 50)) + "...",
          hasRelevantKeywords,
          isFromTrustedDomain,
          hasStrongEntityMatch,
          shouldInclude
        });
        return shouldInclude;
      }).map((result2) => ({
        url: result2.link,
        title: result2.title,
        snippet: result2.snippet
      })).filter(
        (result2, index, self) => index === self.findIndex((r) => r.url === result2.url)
      ).slice(0, maxResults);
      if (processedResults.length > 0) {
        console.log("[WebSearch] Returning", processedResults.length, "results from AI-generated query");
        return {
          results: processedResults,
          searchMethod: "ai-generated",
          queryUsed: finalQuery,
          aiQueryGenerated: aiGeneratedQuery
        };
      }
      console.log("[WebSearch] No results from AI query, trying fallback strategies...");
      const fallbackStrategies = [
        `"${searchTerms}" fact check`,
        `${searchTerms} verification`,
        `${searchTerms} debunked`,
        `${searchTerms} news analysis`,
        searchTerms
      ];
      for (const fallbackQuery of fallbackStrategies) {
        console.log("[WebSearch] Trying fallback query:", fallbackQuery);
        const fallbackParams = new URLSearchParams({
          key: "AIzaSyAIQCMO6dv-Ywnqfv2ctmV-UlBD3z1xHzI",
          cx: "c424f03b2cfd34523",
          q: fallbackQuery,
          num: Math.min(10, maxResults).toString(),
          fields: "items(title,snippet,link)"
        });
        const fallbackUrl = `https://www.googleapis.com/customsearch/v1?${fallbackParams.toString()}`;
        try {
          const fallbackResponse = await fetch(fallbackUrl);
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            const fallbackResults = (fallbackData.items || []).filter((result2) => {
              if (!(result2 == null ? void 0 : result2.link)) return false;
              if (currentDomain && result2.link.toLowerCase().includes(currentDomain)) {
                return false;
              }
              const problematicDomains = [
                "4chan.org",
                "8kun.top",
                "gab.com",
                "parler.com",
                "truthsocial.com"
              ];
              const resultDomain = new URL(result2.link).hostname.toLowerCase();
              if (problematicDomains.some((domain) => resultDomain.includes(domain))) {
                return false;
              }
              const urlPath = new URL(result2.link).pathname;
              const yearMatch = urlPath.match(/\/(20\d{2})\//);
              if (yearMatch) {
                const articleYear = parseInt(yearMatch[1]);
                if (originalArticleYear && articleYear !== originalArticleYear) {
                  return false;
                }
              }
              const oldContentPatterns = [
                /\/20(0[0-9]|1[0-5])\//,
                // 2000-2015
                /archive\./,
                /old\./,
                /legacy\./
              ];
              if (oldContentPatterns.some((pattern) => pattern.test(result2.link))) {
                return false;
              }
              return true;
            }).map((result2) => ({
              url: result2.link,
              title: result2.title,
              snippet: result2.snippet
            })).filter(
              (result2, index, self) => index === self.findIndex((r) => r.url === result2.url)
            ).slice(0, maxResults);
            if (fallbackResults.length > 0) {
              console.log("[WebSearch] Returning", fallbackResults.length, "results from fallback query:", fallbackQuery);
              return {
                results: fallbackResults,
                searchMethod: "fallback",
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
      console.log("[WebSearch] No results found from any strategy");
      return {
        results: [],
        searchMethod: "fallback",
        queryUsed: "No successful query",
        aiQueryGenerated: aiGeneratedQuery,
        fallbackQueryUsed: "All fallback queries failed"
      };
    } catch (error) {
      console.error("AI-powered web search failed:", error);
      return {
        results: [],
        searchMethod: "fallback",
        queryUsed: "Error occurred",
        aiQueryGenerated: "Failed to generate",
        fallbackQueryUsed: "Error before fallback"
      };
    }
  }
  backgroundNew;
  const tabStates = /* @__PURE__ */ new Map();
  const urlAnalysisStorage = /* @__PURE__ */ new Map();
  const tabsBeingSetup = /* @__PURE__ */ new Set();
  const getDefaultState = () => ({
    pageInfo: null,
    analysis: [],
    failedProviders: [],
    showButton: true,
    isAnalyzing: false,
    hasAttemptedAnalysis: false
  });
  async function saveTabState(tabId2, state) {
    try {
      const existing = await chrome.storage.local.get("tabStates");
      const tabStatesObj = existing.tabStates || {};
      tabStatesObj[tabId2] = state;
      await chrome.storage.local.set({ tabStates: tabStatesObj });
      tabStates.set(tabId2, state);
    } catch (error) {
      console.error("Failed to save tab state:", error);
      tabStates.set(tabId2, state);
    }
  }
  async function getTabState(tabId2) {
    if (tabStates.has(tabId2)) {
      return tabStates.get(tabId2);
    }
    try {
      const existing = await chrome.storage.local.get("tabStates");
      const tabStatesObj = existing.tabStates || {};
      const state = tabStatesObj[tabId2];
      if (state) {
        tabStates.set(tabId2, state);
        return state;
      }
    } catch (error) {
      console.error("Failed to get tab state:", error);
    }
    return void 0;
  }
  async function deleteTabState(tabId2) {
    try {
      const existing = await chrome.storage.local.get("tabStates");
      const tabStatesObj = existing.tabStates || {};
      delete tabStatesObj[tabId2];
      await chrome.storage.local.set({ tabStates: tabStatesObj });
      tabStates.delete(tabId2);
    } catch (error) {
      console.error("Failed to delete tab state:", error);
      tabStates.delete(tabId2);
    }
  }
  function getUrlAnalysis(url) {
    return urlAnalysisStorage.get(url);
  }
  function setUrlAnalysis(url, data) {
    urlAnalysisStorage.set(url, data);
  }
  function isTabBeingSetup(tabId2) {
    return tabsBeingSetup.has(tabId2);
  }
  function markTabAsBeingSetup(tabId2) {
    tabsBeingSetup.add(tabId2);
  }
  function unmarkTabAsBeingSetup(tabId2) {
    tabsBeingSetup.delete(tabId2);
  }
  const cleanupUrlStorage = () => {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1e3;
    for (const [url, data] of urlAnalysisStorage.entries()) {
      if (now - data.timestamp > maxAge) {
        urlAnalysisStorage.delete(url);
      }
    }
  };
  const cleanupTabStates = async () => {
    try {
      const tabStatesData = await chrome.storage.local.get("tabStates");
      const tabStatesObj = tabStatesData.tabStates || {};
      const allTabs = await chrome.tabs.query({});
      const activeTabIds = new Set(allTabs.map((tab) => tab.id));
      let cleaned = false;
      for (const tabId2 of Object.keys(tabStatesObj)) {
        if (!activeTabIds.has(parseInt(tabId2))) {
          delete tabStatesObj[tabId2];
          cleaned = true;
        }
      }
      if (cleaned) {
        await chrome.storage.local.set({ tabStates: tabStatesObj });
        console.log("Cleaned up old tab states");
      }
    } catch (error) {
      console.error("Error cleaning up tab states:", error);
    }
  };
  backgroundNew;
  function cleanAndParseJSON(text) {
    try {
      return JSON.parse(text);
    } catch (e) {
      try {
        let jsonStr = text.trim();
        const startIdx = jsonStr.indexOf("{");
        const endIdx = jsonStr.lastIndexOf("}") + 1;
        if (startIdx >= 0 && endIdx > startIdx) {
          jsonStr = jsonStr.slice(startIdx, endIdx);
        }
        jsonStr = jsonStr.replace(/\\n/g, " ").replace(/\s+/g, " ").replace(/"\s*,\s*}/g, '"}').replace(/,(\s*})/g, "$1").replace(/\.,/g, ".").replace(/\."/g, '"').replace(/"\s*\.\s*$/g, '"').replace(/\[\s*,/g, "[").replace(/,\s*\]/g, "]");
        const parsed = JSON.parse(jsonStr);
        if (parsed.credibility_summary) {
          parsed.credibility_summary = parsed.credibility_summary.trim().replace(/\s+/g, " ").replace(/\.,/g, ".").replace(/\.+$/, ".");
        }
        if (parsed.reasoning) {
          parsed.reasoning = parsed.reasoning.trim().replace(/\s+/g, " ").replace(/\.,/g, ".").replace(/\.+$/, ".");
        }
        if (Array.isArray(parsed.evidence_sentences)) {
          parsed.evidence_sentences = parsed.evidence_sentences.map((evidence) => {
            var _a, _b;
            return {
              quote: ((_a = evidence.quote) == null ? void 0 : _a.trim().replace(/\s+/g, " ").replace(/\.+$/, "")) || "",
              impact: ((_b = evidence.impact) == null ? void 0 : _b.trim().replace(/\s+/g, " ").replace(/\.+$/, "")) || ""
            };
          }).filter((e2) => e2.quote && e2.impact);
        }
        if (Array.isArray(parsed.supporting_links)) {
          parsed.supporting_links = parsed.supporting_links.map((link) => link.trim()).filter(Boolean);
        }
        if (typeof parsed.credibility_score === "string") {
          parsed.credibility_score = parseInt(parsed.credibility_score, 10);
        }
        parsed.credibility_score = Math.max(1, Math.min(100, parsed.credibility_score || 0));
        return parsed;
      } catch (e2) {
        console.error("Failed to parse cleaned JSON:", e2);
        throw new Error("Invalid JSON format");
      }
    }
  }
  function processAnalysisResults(results, providers) {
    const successfulResults = results.map((r, i) => {
      if (r.status === "fulfilled") {
        try {
          let parsedResult;
          if (typeof r.value === "string") {
            try {
              parsedResult = cleanAndParseJSON(r.value);
            } catch (e) {
              console.error("Failed to parse result:", e);
              return null;
            }
          } else {
            parsedResult = r.value;
          }
          if (!parsedResult) {
            console.error("No parsed result available");
            return null;
          }
          if (typeof parsedResult.credibility_score !== "number" || typeof parsedResult.credibility_summary !== "string" || typeof parsedResult.reasoning !== "string" || !Array.isArray(parsedResult.evidence_sentences) || !Array.isArray(parsedResult.supporting_links)) {
            console.error("Invalid result structure:", parsedResult);
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
    }).filter((x) => x !== null);
    const failedProviders = results.map((r, i) => {
      if (r.status === "rejected") {
        console.error(`Provider ${providers[i]} failed:`, r.reason);
        return providers[i];
      }
      return null;
    }).filter((x) => x !== null);
    return { successfulResults, failedProviders };
  }
  backgroundNew;
  async function handleGetPageInfo(message, sender, sendResponse) {
    var _a, _b;
    try {
      const tabId2 = message.tabId || ((_a = sender.tab) == null ? void 0 : _a.id);
      if (!tabId2) {
        sendResponse({ success: false, error: "No tab ID found" });
        return;
      }
      const pageInfo = await chrome.tabs.sendMessage(tabId2, { type: "GET_PAGE_CONTENT" });
      if (pageInfo && pageInfo.error) {
        sendResponse({ success: false, error: pageInfo.error });
        return;
      }
      let state = await getTabState(tabId2) || getDefaultState();
      const isSamePage = ((_b = state.pageInfo) == null ? void 0 : _b.url) === pageInfo.data.url;
      state = {
        ...state,
        pageInfo: pageInfo.data,
        showButton: true,
        analysis: isSamePage ? state.analysis : [],
        failedProviders: isSamePage ? state.failedProviders : [],
        hasAttemptedAnalysis: false
      };
      await saveTabState(tabId2, state);
      sendResponse({ success: true, data: pageInfo.data });
    } catch (error) {
      console.error("Error getting page info:", error);
      sendResponse({ success: false, error: "Failed to fetch page info" });
    }
  }
  async function handleAnalyzeArticle(message, sender, sendResponse) {
    try {
      console.log("[NewsScan] handleAnalyzeArticle called with:", message);
      const tabId2 = message.tabId;
      if (!tabId2) {
        sendResponse({ success: false, error: "No tab ID provided" });
        return;
      }
      const providers = message.providers || [];
      console.log("[NewsScan] Providers to use:", providers);
      let currentState = await getTabState(tabId2) || getDefaultState();
      currentState.isAnalyzing = true;
      await saveTabState(tabId2, currentState);
      const providerPromises = providers.map(async (provider) => {
        try {
          let result2;
          switch (provider) {
            case "OpenAI":
              result2 = await fetchOpenAI(message.content, "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");
              break;
            case "Gemini":
              result2 = await fetchGemini(message.content, "AIzaSyDPDnXHi6y7weR-_9GB-yE9zeEp9M17fNM");
              break;
            case "Cohere":
              result2 = await fetchCohere(message.content, "d4rtWmY3HK9su8mrSbxlsrWEJod7TZyGeNH3ZvdG");
              break;
            default:
              throw new Error(`Unknown provider: ${provider}`);
          }
          chrome.runtime.sendMessage({
            type: "PROVIDER_UPDATE",
            provider,
            status: "complete"
          });
          return result2;
        } catch (error) {
          console.error(`Error in provider ${provider}:`, error);
          chrome.runtime.sendMessage({
            type: "PROVIDER_UPDATE",
            provider,
            status: "failed"
          });
          throw error;
        }
      });
      const results = await Promise.allSettled(providerPromises);
      const { successfulResults, failedProviders } = processAnalysisResults(results, providers);
      let state = await getTabState(tabId2);
      if (!state) {
        console.warn("No existing tab state found during analysis");
        state = getDefaultState();
      }
      state.analysis = successfulResults;
      state.failedProviders = failedProviders;
      state.showButton = false;
      state.isAnalyzing = false;
      state.hasAttemptedAnalysis = true;
      await saveTabState(tabId2, state);
      sendResponse({
        success: true,
        data: {
          successfulResults,
          failedProviders
        },
        providers
      });
    } catch (error) {
      console.error("Error in analyze article:", error);
      sendResponse({ success: false, error: "Failed to analyze article" });
    }
  }
  async function handleGetTabState(message, sender, sendResponse) {
    var _a, _b;
    try {
      const tabId2 = message.tabId || ((_a = sender.tab) == null ? void 0 : _a.id);
      if (!tabId2) {
        sendResponse({ success: false, error: "No tab ID found" });
        return;
      }
      if (message.url) {
        const urlAnalysis = getUrlAnalysis(message.url);
        if (urlAnalysis) {
          const state2 = {
            pageInfo: urlAnalysis.pageInfo,
            analysis: urlAnalysis.analysis,
            failedProviders: urlAnalysis.failedProviders,
            showButton: false,
            isAnalyzing: false,
            hasAttemptedAnalysis: true,
            isViewingFromRecent: true,
            originalTabId: void 0
          };
          await saveTabState(tabId2, state2);
          sendResponse({ success: true, data: state2 });
          return;
        }
        const tabStatesData = await chrome.storage.local.get("tabStates");
        const tabStatesObj = tabStatesData.tabStates || {};
        for (const [tId, state2] of Object.entries(tabStatesObj)) {
          const tabState = state2;
          if (((_b = tabState.pageInfo) == null ? void 0 : _b.url) === message.url && tabState.analysis && tabState.analysis.length > 0) {
            sendResponse({ success: true, data: tabState });
            return;
          }
        }
        sendResponse({ success: true, data: getDefaultState() });
        return;
      }
      const state = await getTabState(tabId2) || getDefaultState();
      sendResponse({ success: true, data: state });
    } catch (error) {
      console.error("Error in GET_TAB_STATE:", error);
      sendResponse({ success: false, error: "Failed to get tab state" });
    }
  }
  async function handleResetTabState(message, sender, sendResponse) {
    var _a;
    try {
      const tabId2 = message.tabId || ((_a = sender.tab) == null ? void 0 : _a.id);
      if (!tabId2) {
        sendResponse({ success: false, error: "No tab ID found" });
        return;
      }
      await deleteTabState(tabId2);
      const defaultState = getDefaultState();
      await saveTabState(tabId2, defaultState);
      chrome.tabs.sendMessage(tabId2, {
        type: "TAB_SWITCHED",
        state: defaultState
      }).catch(() => {
      });
      sendResponse({ success: true });
    } catch (error) {
      console.error("Error resetting tab state:", error);
      sendResponse({ success: false, error: "Failed to reset tab state" });
    }
  }
  async function handleSaveTabState(message, sender, sendResponse) {
    var _a, _b;
    try {
      const tabId2 = message.tabId || ((_a = sender.tab) == null ? void 0 : _a.id);
      if (!tabId2) {
        sendResponse({ success: false, error: "No tab ID available to save state" });
        return;
      }
      await saveTabState(tabId2, {
        pageInfo: message.data.pageInfo,
        analysis: message.data.analysis,
        failedProviders: message.data.failedProviders,
        showButton: message.data.showButton,
        isAnalyzing: message.data.isAnalyzing || false,
        hasAttemptedAnalysis: message.data.hasAttemptedAnalysis || false,
        isViewingFromRecent: message.data.isViewingFromRecent || false,
        originalTabId: message.data.originalTabId
      });
      if (((_b = message.data.pageInfo) == null ? void 0 : _b.url) && message.data.analysis && message.data.analysis.length > 0) {
        setUrlAnalysis(message.data.pageInfo.url, {
          pageInfo: message.data.pageInfo,
          analysis: message.data.analysis,
          failedProviders: message.data.failedProviders,
          timestamp: Date.now()
        });
      }
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: "Failed to save tab state" });
    }
  }
  async function handleWebSearch(message, sender, sendResponse) {
    try {
      const searchQuery = message.originalUrl ? `${message.query} ${message.originalUrl}` : message.query;
      const results = await performWebSearch(searchQuery, message.max_results);
      sendResponse({
        success: true,
        data: { results }
      });
    } catch (error) {
      console.error("Web search error:", error);
      sendResponse({
        success: false,
        error: "Failed to perform web search"
      });
    }
  }
  async function handleLoadAnalysisInTab(message, sender, sendResponse) {
    var _a;
    try {
      const tabId2 = message.tabId;
      const analysisData = message.analysisData;
      if (isTabBeingSetup(tabId2)) {
        sendResponse({ success: false, error: "Tab already being set up" });
        return;
      }
      markTabAsBeingSetup(tabId2);
      const newState = {
        pageInfo: analysisData.pageInfo,
        analysis: analysisData.analysis,
        failedProviders: analysisData.failedProviders,
        showButton: false,
        isAnalyzing: false,
        hasAttemptedAnalysis: true,
        isViewingFromRecent: analysisData.isViewingFromRecent || false,
        originalTabId: analysisData.originalTabId
      };
      await saveTabState(tabId2, newState);
      if ((_a = analysisData.pageInfo) == null ? void 0 : _a.url) {
        setUrlAnalysis(analysisData.pageInfo.url, {
          pageInfo: analysisData.pageInfo,
          analysis: analysisData.analysis,
          failedProviders: analysisData.failedProviders,
          timestamp: Date.now()
        });
      }
      await saveTabState(tabId2, {
        ...newState,
        hasPreloadedAnalysis: true
      });
      setTimeout(async () => {
        try {
          try {
            await chrome.tabs.sendMessage(tabId2, { type: "FNR_PING" });
          } catch (error) {
            await chrome.scripting.executeScript({
              target: { tabId: tabId2 },
              files: ["content-scripts/content.js"]
            });
          }
          setTimeout(async () => {
            try {
              const tab = await chrome.tabs.get(tabId2);
              if (!tab) {
                unmarkTabAsBeingSetup(tabId2);
                sendResponse({ success: false, error: "Tab no longer exists" });
                return;
              }
              if (newState.isViewingFromRecent) {
                chrome.tabs.sendMessage(tabId2, {
                  type: "TOGGLE_INJECTED_SIDEBAR",
                  keepOpen: true,
                  preloadedAnalysis: newState
                }, (response) => {
                  if (chrome.runtime.lastError) {
                    unmarkTabAsBeingSetup(tabId2);
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                    return;
                  }
                  unmarkTabAsBeingSetup(tabId2);
                  sendResponse({ success: true });
                });
              } else {
                sendResponse({ success: true });
                unmarkTabAsBeingSetup(tabId2);
              }
            } catch (error) {
              unmarkTabAsBeingSetup(tabId2);
              sendResponse({ success: false, error: "Failed to open sidebar" });
            }
          }, 200);
        } catch (err) {
          console.error("Error setting up analysis tab:", err);
          unmarkTabAsBeingSetup(tabId2);
          sendResponse({ success: false, error: "Failed to setup analysis tab" });
        }
      }, 1e3);
    } catch (error) {
      console.error("Error in LOAD_ANALYSIS_IN_TAB:", error);
      unmarkTabAsBeingSetup(tabId);
      sendResponse({ success: false, error: "Failed to load analysis in tab" });
    }
  }
  async function handleNavigateAndReopenSidebar(message, sender, sendResponse) {
    try {
      const newTab = await chrome.tabs.create({ url: message.url });
      if (!newTab.id) {
        sendResponse({ success: false, error: "Failed to create new tab" });
        return;
      }
      const tabId2 = newTab.id;
      setTimeout(async () => {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tabId2 },
            files: ["content-scripts/content.js"]
          });
          const waitForContentScript = () => {
            return new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error("Content script not ready after 5 seconds"));
              }, 5e3);
              chrome.tabs.sendMessage(tabId2, { type: "FNR_PING" }, (response) => {
                clearTimeout(timeout);
                if (chrome.runtime.lastError) {
                  reject(new Error(chrome.runtime.lastError.message));
                } else if (response == null ? void 0 : response.ok) {
                  resolve(true);
                } else {
                  reject(new Error("Content script not responding"));
                }
              });
            });
          };
          await waitForContentScript();
          sendResponse({ success: true });
        } catch (err) {
          console.error("Error in sidebar setup:", err);
          sendResponse({ success: false, error: err instanceof Error ? err.message : "Unknown error" });
        }
      }, 1e3);
    } catch (error) {
      console.error("Error in NAVIGATE_AND_REOPEN_SIDEBAR:", error);
      sendResponse({ success: false, error: "Navigation failed" });
    }
  }
  async function handlePreloadUrlAnalysis(message, sender, sendResponse) {
    var _a, _b;
    try {
      const { url, pageInfo, analysis, failedProviders } = message;
      if (!url || !analysis || analysis.length === 0) {
        sendResponse({ success: false, error: "Missing url or analysis" });
        return;
      }
      setUrlAnalysis(url, {
        pageInfo,
        analysis,
        failedProviders: failedProviders || [],
        timestamp: Date.now()
      });
      const recentData = await chrome.storage.local.get("recentAnalyses");
      const recentList = recentData.recentAnalyses || [];
      const existingIndex = recentList.findIndex((item) => item.url === url);
      const historyEntry = {
        title: pageInfo.title || "Unknown Title",
        url,
        timestamp: Date.now(),
        score: ((_b = (_a = analysis[0]) == null ? void 0 : _a.result) == null ? void 0 : _b.credibility_score) || null,
        fullAnalysis: analysis,
        pageInfo,
        failedProviders: failedProviders || []
      };
      if (existingIndex >= 0) {
        recentList[existingIndex] = historyEntry;
      } else {
        recentList.unshift(historyEntry);
      }
      const trimmedList = recentList.slice(0, 50);
      await chrome.storage.local.set({ recentAnalyses: trimmedList });
      sendResponse({ success: true });
    } catch (error) {
      console.error("Error in PRELOAD_URL_ANALYSIS:", error);
      sendResponse({ success: false, error: "Failed to preload analysis" });
    }
  }
  backgroundNew;
  const definition = defineBackground({
    main() {
      chrome.runtime.onInstalled.addListener(() => {
        console.log("Extension installed");
      });
      setInterval(cleanupUrlStorage, 60 * 60 * 1e3);
      setInterval(cleanupTabStates, 5 * 60 * 1e3);
      chrome.action.onClicked.addListener(async () => {
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!(tab == null ? void 0 : tab.id)) {
            return;
          }
          const ping = (tabId2) => new Promise((resolve) => {
            let settled = false;
            try {
              chrome.tabs.sendMessage(tabId2, { type: "FNR_PING" }, (resp) => {
                if (chrome.runtime.lastError) {
                  if (!settled) {
                    settled = true;
                    resolve(false);
                  }
                  return;
                }
                if (!settled) {
                  settled = true;
                  resolve(!!(resp == null ? void 0 : resp.ok));
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
              await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_INJECTED_SIDEBAR" });
            } catch (e) {
              console.log("Toggle send error:", e);
            }
          };
          const hasListener = await ping(tab.id);
          if (hasListener) {
            await sendToggle();
            return;
          }
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ["content-scripts/content.js"]
            });
          } catch (err) {
            console.log("Failed to inject content script:", err);
          }
          const hasListenerAfter = await ping(tab.id);
          await sendToggle();
        } catch (e) {
          console.log("Failed to toggle injected sidebar:", e);
        }
      });
      chrome.tabs.onRemoved.addListener((tabId2) => {
        deleteTabState(tabId2);
        unmarkTabAsBeingSetup(tabId2);
      });
      chrome.tabs.onActivated.addListener(async (activeInfo) => {
        try {
          chrome.runtime.sendMessage({
            type: "TAB_SWITCHED",
            tabId: activeInfo.tabId
          }).catch(() => {
          });
        } catch (error) {
          console.log("Error handling tab switch:", error);
        }
      });
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        const messageType = message.type;
        switch (messageType) {
          case "GET_PAGE_INFO":
            handleGetPageInfo(message, sender, sendResponse);
            return true;
          case "ANALYZE_ARTICLE":
            handleAnalyzeArticle(message, sender, sendResponse);
            return true;
          case "GET_TAB_STATE":
            handleGetTabState(message, sender, sendResponse);
            return true;
          case "RESET_TAB_STATE":
            handleResetTabState(message, sender, sendResponse);
            return true;
          case "SAVE_TAB_STATE":
            handleSaveTabState(message, sender, sendResponse);
            return true;
          case "WEB_SEARCH":
            handleWebSearch(message, sender, sendResponse);
            return true;
          case "TAB_SWITCHED":
            return true;
          case "LOAD_ANALYSIS_IN_TAB":
            handleLoadAnalysisInTab(message, sender, sendResponse);
            return true;
          case "NAVIGATE_AND_REOPEN_SIDEBAR":
            handleNavigateAndReopenSidebar(message, sender, sendResponse);
            return true;
          case "PRELOAD_URL_ANALYSIS":
            handlePreloadUrlAnalysis(message, sender, sendResponse);
            return true;
          default:
            return true;
        }
      });
      chrome.tabs.onUpdated.addListener(async (tabId2, changeInfo, tab) => {
        if (changeInfo.status === "complete" && tab.url) {
          try {
            await new Promise((resolve) => setTimeout(resolve, 1e3));
          } catch (error) {
            console.error("Error in tab update handler:", error);
          }
        }
      });
    }
  });
  backgroundNew;
  function initPlugins() {
  }
  function print(method, ...args) {
    if (typeof args[0] === "string") {
      const message = args.shift();
      method(`[wxt] ${message}`, ...args);
    } else {
      method("[wxt]", ...args);
    }
  }
  const logger = {
    debug: (...args) => print(console.debug, ...args),
    log: (...args) => print(console.log, ...args),
    warn: (...args) => print(console.warn, ...args),
    error: (...args) => print(console.error, ...args)
  };
  const result = (async () => {
    try {
      initPlugins();
      return await definition.main();
    } catch (err) {
      logger.error(
        `The unlisted script "${"background-new"}" crashed on startup!`,
        err
      );
      throw err;
    }
  })();
  return result;
}();
backgroundNew;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC1uZXcuanMiLCJzb3VyY2VzIjpbIi4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9kZWZpbmUtYmFja2dyb3VuZC5tanMiLCIuLi8uLi9zcmMvdXRpbHMvYWlIYW5kbGluZy50cyIsIi4uLy4uL3NyYy91dGlscy93ZWJTZWFyY2gudHMiLCIuLi8uLi9zcmMvdXRpbHMvdGFiU3RhdGUudHMiLCIuLi8uLi9zcmMvdXRpbHMvYW5hbHlzaXNQcm9jZXNzb3IudHMiLCIuLi8uLi9zcmMvdXRpbHMvbWVzc2FnZUhhbmRsZXJzLnRzIiwiLi4vLi4vc3JjL2VudHJ5cG9pbnRzL2JhY2tncm91bmQtbmV3LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBmdW5jdGlvbiBkZWZpbmVCYWNrZ3JvdW5kKGFyZykge1xuICBpZiAoYXJnID09IG51bGwgfHwgdHlwZW9mIGFyZyA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4geyBtYWluOiBhcmcgfTtcbiAgcmV0dXJuIGFyZztcbn1cbiIsImV4cG9ydCBhc3luYyBmdW5jdGlvbiBmZXRjaE9wZW5BSShjb250ZW50OiBzdHJpbmcsIGFwaUtleTogc3RyaW5nKSB7XHJcbiAgICBjb25zb2xlLnRpbWUoJ1tBSV0gT3BlbkFJIHJlcXVlc3QnKTtcclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goJ2h0dHBzOi8vYXBpLm9wZW5haS5jb20vdjEvY2hhdC9jb21wbGV0aW9ucycsIHtcclxuICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQXV0aG9yaXphdGlvbic6IGBCZWFyZXIgJHthcGlLZXl9YCxcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBtb2RlbDogJ2dwdC0zLjUtdHVyYm8nLFxyXG4gICAgICAgIG1lc3NhZ2VzOiBbeyByb2xlOiAndXNlcicsIGNvbnRlbnQgfV1cclxuICAgICAgfSlcclxuICAgIH0pXHJcbiAgICBjb25zb2xlLnRpbWVFbmQoJ1tBSV0gT3BlbkFJIHJlcXVlc3QnKTtcclxuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XHJcbiAgICBpZiAoZGF0YS5jaG9pY2VzICYmIGRhdGEuY2hvaWNlc1swXSAmJiBkYXRhLmNob2ljZXNbMF0ubWVzc2FnZS5jb250ZW50KSB7XHJcbiAgICAgIHJldHVybiBkYXRhLmNob2ljZXNbMF0ubWVzc2FnZS5jb250ZW50O1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGRhdGEuZXJyb3I/Lm1lc3NhZ2UgfHwgJ05vIHJlc3BvbnNlIGZyb20gT3BlbkFJJyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZldGNoR2VtaW5pKGNvbnRlbnQ6IHN0cmluZywgYXBpS2V5OiBzdHJpbmcpIHtcclxuICAgIGNvbnNvbGUudGltZSgnW0FJXSBHZW1pbmkgcmVxdWVzdCcpO1xyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgaHR0cHM6Ly9nZW5lcmF0aXZlbGFuZ3VhZ2UuZ29vZ2xlYXBpcy5jb20vdjFiZXRhL21vZGVscy9nZW1pbmktMi41LWZsYXNoOmdlbmVyYXRlQ29udGVudD9rZXk9JHthcGlLZXl9YCwge1xyXG4gICAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICBjb250ZW50czogW3tcclxuICAgICAgICAgICAgICAgIHBhcnRzOiBbe1xyXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGNvbnRlbnRcclxuICAgICAgICAgICAgICAgIH1dXHJcbiAgICAgICAgICAgIH1dLFxyXG4gICAgICAgICAgICBnZW5lcmF0aW9uQ29uZmlnOiB7XHJcbiAgICAgICAgICAgICAgICB0ZW1wZXJhdHVyZTogMC43LFxyXG4gICAgICAgICAgICAgICAgbWF4T3V0cHV0VG9rZW5zOiA0MDk2XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgfSk7XHJcbiAgICBjb25zb2xlLnRpbWVFbmQoJ1tBSV0gR2VtaW5pIHJlcXVlc3QnKTtcclxuXHJcbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XHJcbiAgICAgICAgY29uc3QgZXJyb3JUZXh0ID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgR2VtaW5pIEFQSSBlcnJvcjogJHtyZXNwb25zZS5zdGF0dXN9ICR7cmVzcG9uc2Uuc3RhdHVzVGV4dH0gLSAke2Vycm9yVGV4dH1gKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xyXG4gICAgY29uc29sZS5sb2coJ0dlbWluaSBBUEkgUmVzcG9uc2UgRGF0YTonLCBKU09OLnN0cmluZ2lmeShkYXRhLCBudWxsLCAyKSk7XHJcbiAgICBcclxuICAgIGlmIChkYXRhLmNhbmRpZGF0ZXMgJiYgZGF0YS5jYW5kaWRhdGVzWzBdKSB7XHJcbiAgICAgICAgY29uc3QgY2FuZGlkYXRlID0gZGF0YS5jYW5kaWRhdGVzWzBdO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIENoZWNrIGZvciBkaWZmZXJlbnQgZmluaXNoIHJlYXNvbnNcclxuICAgICAgICBpZiAoY2FuZGlkYXRlLmZpbmlzaFJlYXNvbiA9PT0gJ01BWF9UT0tFTlMnKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignR2VtaW5pIHJlc3BvbnNlIHdhcyB0cnVuY2F0ZWQgZHVlIHRvIHRva2VuIGxpbWl0LiBUcnkgcmVkdWNpbmcgeW91ciBpbnB1dCBsZW5ndGguJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGlmIChjYW5kaWRhdGUuZmluaXNoUmVhc29uID09PSAnU0FGRVRZJykge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0dlbWluaSByZXNwb25zZSB3YXMgYmxvY2tlZCBkdWUgdG8gc2FmZXR5IGZpbHRlcnMuJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIENoZWNrIGlmIHdlIGhhdmUgY29udGVudCB3aXRoIHBhcnRzXHJcbiAgICAgICAgaWYgKGNhbmRpZGF0ZS5jb250ZW50ICYmIGNhbmRpZGF0ZS5jb250ZW50LnBhcnRzICYmIGNhbmRpZGF0ZS5jb250ZW50LnBhcnRzWzBdICYmIGNhbmRpZGF0ZS5jb250ZW50LnBhcnRzWzBdLnRleHQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGNhbmRpZGF0ZS5jb250ZW50LnBhcnRzWzBdLnRleHQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIElmIG5vIHBhcnRzLCBjaGVjayBpZiB0aGVyZSdzIHRleHQgZGlyZWN0bHkgaW4gY29udGVudFxyXG4gICAgICAgIGlmIChjYW5kaWRhdGUuY29udGVudCAmJiBjYW5kaWRhdGUuY29udGVudC50ZXh0KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBjYW5kaWRhdGUuY29udGVudC50ZXh0O1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEdlbWluaSByZXNwb25zZSBpbmNvbXBsZXRlLiBGaW5pc2ggcmVhc29uOiAke2NhbmRpZGF0ZS5maW5pc2hSZWFzb24gfHwgJ3Vua25vd24nfWApO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdHZW1pbmkgcmVzcG9uc2Ugc3RydWN0dXJlOicsIGRhdGEpO1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihkYXRhLmVycm9yPy5tZXNzYWdlIHx8ICdObyBjYW5kaWRhdGVzIGluIEdlbWluaSByZXNwb25zZScpO1xyXG4gICAgfVxyXG59XHJcblxyXG4vLyBSZW1vdmVkIExsYW1hIHByb3ZpZGVyXHJcblxyXG4vL2FkZCBnZW1pbmkgaW4gbGF0ZXIsIG5lZWQgdG8gYmUgMTgrIFxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmV0Y2hDb2hlcmUoY29udGVudDogc3RyaW5nLCBhcGlLZXk6IHN0cmluZykge1xyXG4gICAgY29uc29sZS5sb2coJ0NvaGVyZSBBUEkgS2V5OicsIGFwaUtleSA/ICdQcmVzZW50JyA6ICdNaXNzaW5nJyk7XHJcbiAgICBjb25zb2xlLmxvZygnQ29oZXJlIEFQSSBLZXkgbGVuZ3RoOicsIGFwaUtleS5sZW5ndGgpO1xyXG4gICAgY29uc29sZS5sb2coJ0NvaGVyZSBDb250ZW50IGxlbmd0aDonLCBjb250ZW50Lmxlbmd0aCk7XHJcbiAgICBjb25zb2xlLmxvZygnQ29oZXJlIENvbnRlbnQgcHJldmlldzonLCBjb250ZW50LnN1YnN0cmluZygwLCAyMDApICsgJy4uLicpO1xyXG4gICAgXHJcbiAgICAvLyBWYWxpZGF0ZSBjb250ZW50XHJcbiAgICBpZiAoIWNvbnRlbnQgfHwgY29udGVudC50cmltKCkubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb250ZW50IGlzIGVtcHR5IG9yIGludmFsaWQnKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgdHJ5IHtcclxuICAgICAgICBjb25zb2xlLnRpbWUoJ1tBSV0gQ29oZXJlIHJlcXVlc3QnKTtcclxuICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKCdodHRwczovL2FwaS5jb2hlcmUuYWkvdjEvY2hhdCcsIHtcclxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgICAgICdBdXRob3JpemF0aW9uJzogYEJlYXJlciAke2FwaUtleX1gLFxyXG4gICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IFxyXG4gICAgICAgICAgICAgICAgbW9kZWw6ICdjb21tYW5kLXInLFxyXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogY29udGVudCxcclxuICAgICAgICAgICAgICAgIG1heF90b2tlbnM6IDEyNTAsXHJcbiAgICAgICAgICAgICAgICB0ZW1wZXJhdHVyZTogMC4zLFxyXG4gICAgICAgICAgICAgICAgY2hhdF9oaXN0b3J5OiBbXSxcclxuICAgICAgICAgICAgICAgIHByb21wdF90cnVuY2F0aW9uOiAnQVVUTydcclxuICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgY29uc29sZS50aW1lRW5kKCdbQUldIENvaGVyZSByZXF1ZXN0Jyk7XHJcblxyXG4gICAgICAgIGNvbnNvbGUubG9nKCdDb2hlcmUgUmVzcG9uc2UgU3RhdHVzOicsIHJlc3BvbnNlLnN0YXR1cywgcmVzcG9uc2Uuc3RhdHVzVGV4dCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xyXG4gICAgICAgICAgICBjb25zdCBlcnJvclRleHQgPSBhd2FpdCByZXNwb25zZS50ZXh0KCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0NvaGVyZSBBUEkgRnVsbCBFcnJvcjonLCB7XHJcbiAgICAgICAgICAgICAgICBzdGF0dXM6IHJlc3BvbnNlLnN0YXR1cyxcclxuICAgICAgICAgICAgICAgIHN0YXR1c1RleHQ6IHJlc3BvbnNlLnN0YXR1c1RleHQsXHJcbiAgICAgICAgICAgICAgICBlcnJvclRleHQ6IGVycm9yVGV4dCxcclxuICAgICAgICAgICAgICAgIGhlYWRlcnM6IE9iamVjdC5mcm9tRW50cmllcyhyZXNwb25zZS5oZWFkZXJzLmVudHJpZXMoKSlcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQ29oZXJlIEFQSSBlcnJvcjogJHtyZXNwb25zZS5zdGF0dXN9ICR7cmVzcG9uc2Uuc3RhdHVzVGV4dH0gLSAke2Vycm9yVGV4dH1gKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcclxuICAgICAgICBjb25zb2xlLmxvZygnQ29oZXJlIEFQSSBSZXNwb25zZSBEYXRhOicsIGRhdGEpO1xyXG5cclxuICAgICAgICBpZiAoZGF0YS50ZXh0KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBkYXRhLnRleHQ7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGRhdGEubWVzc2FnZSB8fCAnTm8gcmVzcG9uc2UgZnJvbSBDb2hlcmUnKTtcclxuICAgICAgICB9XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0NvaGVyZSBBUEkgQ2FsbCBGYWlsZWQ6JywgZXJyb3IpO1xyXG4gICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG59XHJcblxyXG4vLyBSZW1vdmVkIE1pc3RyYWw3QiBwcm92aWRlclxyXG5cclxuLy8gUmVtb3ZlZCBNaXh0cmFsOHg3QiBwcm92aWRlclxyXG4iLCIvLyBBSS1wb3dlcmVkIHdlYiBzZWFyY2ggZnVuY3Rpb25hbGl0eVxyXG5jb25zb2xlLmxvZygnW1dlYlNlYXJjaF0gTW9kdWxlIGxvYWRlZCAtIHdlYiBzZWFyY2ggdHJhY2tpbmcgaXMgYWN0aXZlJyk7XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2VuZXJhdGVTZWFyY2hRdWVyeSh0aXRsZTogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgcHJvbXB0ID0gYEdpdmVuIHRoaXMgYXJ0aWNsZSB0aXRsZTogXCIke3RpdGxlfVwiXHJcblxyXG5HZW5lcmF0ZSBhIHNpbXBsZSBHb29nbGUgc2VhcmNoIHF1ZXJ5IHRvIGZpbmQgcmVsYXRlZCBuZXdzIGFydGljbGVzIGFuZCBmYWN0LWNoZWNraW5nIGNvbnRlbnQuXHJcblxyXG5JbnN0cnVjdGlvbnM6XHJcbi0gRXh0cmFjdCB0aGUgbWFpbiBwZXJzb24sIHBsYWNlLCBvciBldmVudCBmcm9tIHRoZSB0aXRsZVxyXG4tIENyZWF0ZSBhIHNpbXBsZSBxdWVyeSB3aXRoIDItNCBrZXkgd29yZHNcclxuLSBGb2N1cyBvbiB0aGUgbW9zdCBpbXBvcnRhbnQgZWxlbWVudHMgKG5hbWVzLCBsb2NhdGlvbnMsIGV2ZW50cylcclxuLSBBdm9pZCBjb21wbGV4IG9wZXJhdG9ycyBvciByZXN0cmljdGlvbnNcclxuLSBNYWtlIGl0IGJyb2FkIGVub3VnaCB0byBmaW5kIHJlc3VsdHMgYnV0IHNwZWNpZmljIGVub3VnaCB0byBiZSByZWxldmFudFxyXG5cclxuRXhhbXBsZXM6XHJcbi0gRm9yIFwiU3RhdGVuIElzbGFuZCBtYW4gYXJyZXN0ZWQgYXQgWm9ocmFuIE1hbWRhbmkncyBhbnRpLVRydW1wIGV2ZW50XCIg4oaSIFwiWm9ocmFuIE1hbWRhbmkgU3RhdGVuIElzbGFuZCBhcnJlc3RcIlxyXG4tIEZvciBCYWQgQnVubnkgdG8gUGVyZm9ybSBhdCBBcHBsZSBNdXNpYyAyMDI2IFN1cGVyIEJvd2wgSGFsZnRpbWUgU2hvdyDihpIgZm9jdXMgb24gQmFkIEJ1bm55IGFuZCBTdXBlciBCb3dsLCBub3QgQXBwbGUgTXVzaWMgb3IgMjAyNlxyXG4tIEZvciBcIlZhY2NpbmUgc2FmZXR5IGNsYWltcyB2ZXJpZmllZFwiIOKGkiBcInZhY2NpbmUgc2FmZXR5IHZlcmlmaWNhdGlvblwiXHJcblxyXG5SZXR1cm4gT05MWSB0aGUgc2VhcmNoIHF1ZXJ5LCBub3RoaW5nIGVsc2UuYDtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGBodHRwczovL2dlbmVyYXRpdmVsYW5ndWFnZS5nb29nbGVhcGlzLmNvbS92MWJldGEvbW9kZWxzL2dlbWluaS0yLjUtZmxhc2gtbGl0ZTpnZW5lcmF0ZUNvbnRlbnQ/a2V5PSR7aW1wb3J0Lm1ldGEuZW52LlZJVEVfR0VNSU5JX0FQSV9LRVl9YCwge1xyXG4gICAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGNvbnRlbnRzOiBbe1xyXG4gICAgICAgICAgcGFydHM6IFt7XHJcbiAgICAgICAgICAgIHRleHQ6IHByb21wdFxyXG4gICAgICAgICAgfV1cclxuICAgICAgICB9XSxcclxuICAgICAgICBnZW5lcmF0aW9uQ29uZmlnOiB7XHJcbiAgICAgICAgICB0ZW1wZXJhdHVyZTogMC4zLFxyXG4gICAgICAgICAgbWF4T3V0cHV0VG9rZW5zOiAxMDBcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICB9KTtcclxuXHJcbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0dlbWluaSBBUEkgZXJyb3I6JywgcmVzcG9uc2Uuc3RhdHVzLCByZXNwb25zZS5zdGF0dXNUZXh0KTtcclxuICAgICAgY29uc3QgZXJyb3JUZXh0ID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdHZW1pbmkgQVBJIGVycm9yIGRldGFpbHM6JywgZXJyb3JUZXh0KTtcclxuICAgICAgY29uc29sZS5sb2coJ1tXZWJTZWFyY2hdIEZhbGxpbmcgYmFjayB0byBiYXNpYyBwYXR0ZXJuIGR1ZSB0byBBUEkgZXJyb3InKTtcclxuICAgICAgcmV0dXJuIGBcIiR7dGl0bGV9XCIgZmFjdCBjaGVja2A7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcclxuICAgIGNvbnN0IGdlbmVyYXRlZFF1ZXJ5ID0gZGF0YS5jYW5kaWRhdGVzPy5bMF0/LmNvbnRlbnQ/LnBhcnRzPy5bMF0/LnRleHQ/LnRyaW0oKTtcclxuICAgIFxyXG4gICAgaWYgKGdlbmVyYXRlZFF1ZXJ5KSB7XHJcbiAgICAgIHJldHVybiBnZW5lcmF0ZWRRdWVyeTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiBgXCIke3RpdGxlfVwiIGZhY3QgY2hlY2tgO1xyXG4gICAgfVxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gZ2VuZXJhdGUgQUkgcXVlcnk6JywgZXJyb3IpO1xyXG4gICAgcmV0dXJuIGBcIiR7dGl0bGV9XCIgZmFjdCBjaGVja2A7XHJcbiAgfVxyXG59XHJcblxyXG5pbnRlcmZhY2UgU2VhcmNoUmVzdWx0IHtcclxuICB1cmw6IHN0cmluZztcclxuICB0aXRsZTogc3RyaW5nO1xyXG4gIHNuaXBwZXQ6IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBXZWJTZWFyY2hSZXNwb25zZSB7XHJcbiAgcmVzdWx0czogU2VhcmNoUmVzdWx0W107XHJcbiAgc2VhcmNoTWV0aG9kOiAnYWktZ2VuZXJhdGVkJyB8ICdmYWxsYmFjayc7XHJcbiAgcXVlcnlVc2VkOiBzdHJpbmc7XHJcbiAgYWlRdWVyeUdlbmVyYXRlZD86IHN0cmluZztcclxuICBmYWxsYmFja1F1ZXJ5VXNlZD86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHBlcmZvcm1XZWJTZWFyY2gocXVlcnk6IHN0cmluZywgbWF4UmVzdWx0czogbnVtYmVyID0gNSk6IFByb21pc2U8V2ViU2VhcmNoUmVzcG9uc2U+IHtcclxuICB0cnkge1xyXG4gICAgLy8gRXh0cmFjdCBzZWFyY2ggdGVybXMgZnJvbSB0aGUgcXVlcnkgKHJlbW92ZSBVUkxzKVxyXG4gICAgY29uc3Qgc2VhcmNoVGVybXMgPSBxdWVyeS5yZXBsYWNlKC9odHRwcz86XFwvXFwvW15cXHNdKy9nLCAnJykudHJpbSgpO1xyXG4gICAgXHJcbiAgICAvLyBFeHRyYWN0IGN1cnJlbnQgZG9tYWluIGFuZCB5ZWFyIHRvIGV4Y2x1ZGUgZnJvbSByZXN1bHRzXHJcbiAgICBsZXQgY3VycmVudERvbWFpbiA9ICcnO1xyXG4gICAgbGV0IG9yaWdpbmFsQXJ0aWNsZVllYXIgPSBudWxsO1xyXG4gICAgXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCB1cmxNYXRjaCA9IHF1ZXJ5Lm1hdGNoKC9odHRwcz86XFwvXFwvW15cXC9dKy8pO1xyXG4gICAgICBpZiAodXJsTWF0Y2gpIHtcclxuICAgICAgICBjdXJyZW50RG9tYWluID0gdXJsTWF0Y2hbMV0ucmVwbGFjZSgnd3d3LicsICcnKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gRXh0cmFjdCB5ZWFyIGZyb20gdGhlIG9yaWdpbmFsIGFydGljbGUgVVJMXHJcbiAgICAgIGNvbnN0IHllYXJNYXRjaCA9IHF1ZXJ5Lm1hdGNoKC9cXC8oMjBcXGR7Mn0pXFwvLyk7XHJcbiAgICAgIGlmICh5ZWFyTWF0Y2gpIHtcclxuICAgICAgICBvcmlnaW5hbEFydGljbGVZZWFyID0gcGFyc2VJbnQoeWVhck1hdGNoWzFdKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjb25zdCBhbHRZZWFyTWF0Y2ggPSBxdWVyeS5tYXRjaCgvKDIwXFxkezJ9KS8pO1xyXG4gICAgICAgIGlmIChhbHRZZWFyTWF0Y2gpIHtcclxuICAgICAgICAgIG9yaWdpbmFsQXJ0aWNsZVllYXIgPSBwYXJzZUludChhbHRZZWFyTWF0Y2hbMV0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAvLyBDb250aW51ZSB3aXRob3V0IGRvbWFpbi95ZWFyIGZpbHRlcmluZ1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvLyBHZW5lcmF0ZSBBSS1wb3dlcmVkIHNlYXJjaCBxdWVyeVxyXG4gICAgY29uc3QgYWlHZW5lcmF0ZWRRdWVyeSA9IGF3YWl0IGdlbmVyYXRlU2VhcmNoUXVlcnkoc2VhcmNoVGVybXMpO1xyXG4gICAgY29uc29sZS5sb2coJ1tXZWJTZWFyY2hdIEFJIGdlbmVyYXRlZCBxdWVyeTonLCBhaUdlbmVyYXRlZFF1ZXJ5KTtcclxuICAgIFxyXG4gICAgLy8gQWRkIGRvbWFpbiBleGNsdXNpb24gaWYgd2UgaGF2ZSBhIGN1cnJlbnQgZG9tYWluXHJcbiAgICBjb25zdCBmaW5hbFF1ZXJ5ID0gY3VycmVudERvbWFpbiA/IGAke2FpR2VuZXJhdGVkUXVlcnl9IC1zaXRlOiR7Y3VycmVudERvbWFpbn1gIDogYWlHZW5lcmF0ZWRRdWVyeTtcclxuICAgIGNvbnNvbGUubG9nKCdbV2ViU2VhcmNoXSBGaW5hbCBxdWVyeSAod2l0aCBkb21haW4gZXhjbHVzaW9uKTonLCBmaW5hbFF1ZXJ5KTtcclxuICAgIFxyXG4gICAgLy8gRXhlY3V0ZSBHb29nbGUgc2VhcmNoIHdpdGggQUktZ2VuZXJhdGVkIHF1ZXJ5XHJcbiAgICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHtcclxuICAgICAga2V5OiBpbXBvcnQubWV0YS5lbnYuVklURV9HT09HTEVfQVBJX0tFWSxcclxuICAgICAgY3g6IGltcG9ydC5tZXRhLmVudi5WSVRFX0dPT0dMRV9TRUFSQ0hfRU5HSU5FX0lELFxyXG4gICAgICBxOiBmaW5hbFF1ZXJ5LFxyXG4gICAgICBudW06IE1hdGgubWluKDEwLCBtYXhSZXN1bHRzKS50b1N0cmluZygpLFxyXG4gICAgICBmaWVsZHM6ICdpdGVtcyh0aXRsZSxzbmlwcGV0LGxpbmspJ1xyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIGNvbnN0IHNlYXJjaFVybCA9IGBodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9jdXN0b21zZWFyY2gvdjE/JHtwYXJhbXMudG9TdHJpbmcoKX1gO1xyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChzZWFyY2hVcmwpO1xyXG4gICAgXHJcbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0dvb2dsZSBzZWFyY2ggZmFpbGVkOicsIHJlc3BvbnNlLnN0YXR1cywgcmVzcG9uc2Uuc3RhdHVzVGV4dCk7XHJcbiAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwMykge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0FQSSBxdW90YSBleGNlZWRlZCBvciBhY2Nlc3MgZGVuaWVkLiBDaGVjayB5b3VyIEdvb2dsZSBDdXN0b20gU2VhcmNoIEFQSSBrZXkgYW5kIHF1b3RhLicpO1xyXG4gICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAwKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignQmFkIHJlcXVlc3QgLSBjaGVjayBBUEkgcGFyYW1ldGVycycpO1xyXG4gICAgICAgIGNvbnN0IGVycm9yQm9keSA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciByZXNwb25zZTonLCBlcnJvckJvZHkpO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgcmVzdWx0czogW10sXHJcbiAgICAgICAgc2VhcmNoTWV0aG9kOiAnZmFsbGJhY2snLFxyXG4gICAgICAgIHF1ZXJ5VXNlZDogZmluYWxRdWVyeSxcclxuICAgICAgICBhaVF1ZXJ5R2VuZXJhdGVkOiBhaUdlbmVyYXRlZFF1ZXJ5LFxyXG4gICAgICAgIGZhbGxiYWNrUXVlcnlVc2VkOiBgR29vZ2xlIEFQSSBlcnJvcjogJHtyZXNwb25zZS5zdGF0dXN9YFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xyXG4gICAgXHJcbiAgICAvLyBQcm9jZXNzIHJlc3VsdHMgd2l0aCBxdWFsaXR5IGZpbHRlcmluZ1xyXG4gICAgbGV0IHByb2Nlc3NlZFJlc3VsdHMgPSAoZGF0YS5pdGVtcyB8fCBbXSlcclxuICAgICAgLmZpbHRlcigocmVzdWx0OiBhbnkpID0+IHtcclxuICAgICAgICBpZiAoIXJlc3VsdD8ubGluaykgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEZpbHRlciBvdXQgcmVzdWx0cyBmcm9tIHRoZSBzYW1lIGRvbWFpbiBhcyB0aGUgb3JpZ2luYWwgYXJ0aWNsZVxyXG4gICAgICAgIGlmIChjdXJyZW50RG9tYWluICYmIHJlc3VsdC5saW5rLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoY3VycmVudERvbWFpbikpIHtcclxuICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gRmlsdGVyIG91dCBwcm9ibGVtYXRpYyBkb21haW5zXHJcbiAgICAgICAgY29uc3QgcHJvYmxlbWF0aWNEb21haW5zID0gW1xyXG4gICAgICAgICAgJzRjaGFuLm9yZycsICc4a3VuLnRvcCcsICdnYWIuY29tJywgJ3Bhcmxlci5jb20nLCAndHJ1dGhzb2NpYWwuY29tJ1xyXG4gICAgICAgIF07XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgcmVzdWx0RG9tYWluID0gbmV3IFVSTChyZXN1bHQubGluaykuaG9zdG5hbWUudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICBpZiAocHJvYmxlbWF0aWNEb21haW5zLnNvbWUoZG9tYWluID0+IHJlc3VsdERvbWFpbi5pbmNsdWRlcyhkb21haW4pKSkge1xyXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyBGaWx0ZXIgYXJ0aWNsZXMgYnkgeWVhciAtIG9ubHkgc2hvdyBhcnRpY2xlcyBmcm9tIHRoZSBzYW1lIHllYXIgYXMgdGhlIG9yaWdpbmFsIGFydGljbGVcclxuICAgICAgICBjb25zdCB1cmxQYXRoID0gbmV3IFVSTChyZXN1bHQubGluaykucGF0aG5hbWU7XHJcbiAgICAgICAgY29uc3QgeWVhck1hdGNoID0gdXJsUGF0aC5tYXRjaCgvXFwvKDIwXFxkezJ9KVxcLy8pO1xyXG4gICAgICAgIGlmICh5ZWFyTWF0Y2gpIHtcclxuICAgICAgICAgIGNvbnN0IGFydGljbGVZZWFyID0gcGFyc2VJbnQoeWVhck1hdGNoWzFdKTtcclxuICAgICAgICAgIGlmIChvcmlnaW5hbEFydGljbGVZZWFyICYmIGFydGljbGVZZWFyICE9PSBvcmlnaW5hbEFydGljbGVZZWFyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gQWxzbyBjaGVjayBmb3IgdmVyeSBvbGQgYXJ0aWNsZXMgd2l0aG91dCBjbGVhciB5ZWFyIGluIFVSTFxyXG4gICAgICAgIGNvbnN0IG9sZENvbnRlbnRQYXR0ZXJucyA9IFtcclxuICAgICAgICAgIC9cXC8yMCgwWzAtOV18MVswLTVdKVxcLy8sIC8vIDIwMDAtMjAxNVxyXG4gICAgICAgICAgL2FyY2hpdmVcXC4vLFxyXG4gICAgICAgICAgL29sZFxcLi8sXHJcbiAgICAgICAgICAvbGVnYWN5XFwuL1xyXG4gICAgICAgIF07XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKG9sZENvbnRlbnRQYXR0ZXJucy5zb21lKHBhdHRlcm4gPT4gcGF0dGVybi50ZXN0KHJlc3VsdC5saW5rKSkpIHtcclxuICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gSW50ZWxsaWdlbnQgcmVsZXZhbmNlIGZpbHRlcmluZ1xyXG4gICAgICAgIGNvbnN0IGZhY3RDaGVja0tleXdvcmRzID0gW1xyXG4gICAgICAgICAgJ2ZhY3QnLCAnY2hlY2snLCAndmVyaWZ5JywgJ2RlYnVuaycsICdob2F4JywgJ2Zha2UnLCAnZmFsc2UnLCAnbWlzbGVhZGluZycsXHJcbiAgICAgICAgICAnYW5hbHlzaXMnLCAnaW52ZXN0aWdhdGlvbicsICd0cnV0aCcsICdyZWFsaXR5JywgJ2NsYWltJywgJ3J1bW9yJ1xyXG4gICAgICAgIF07XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgdGl0bGVBbmRTbmlwcGV0ID0gYCR7cmVzdWx0LnRpdGxlIHx8ICcnfSAke3Jlc3VsdC5zbmlwcGV0IHx8ICcnfWAudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICBjb25zdCBoYXNSZWxldmFudEtleXdvcmRzID0gZmFjdENoZWNrS2V5d29yZHMuc29tZShrZXl3b3JkID0+IFxyXG4gICAgICAgICAgdGl0bGVBbmRTbmlwcGV0LmluY2x1ZGVzKGtleXdvcmQpXHJcbiAgICAgICAgKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBUcnVzdGVkIGRvbWFpbnMgdGhhdCB3ZSBhbHdheXMgYWxsb3dcclxuICAgICAgICBjb25zdCB0cnVzdGVkRG9tYWlucyA9IFtcclxuICAgICAgICAgICdzbm9wZXMuY29tJywgJ2ZhY3RjaGVjay5vcmcnLCAncG9saXRpZmFjdC5jb20nLCAncmV1dGVycy5jb20nLCAnYXAub3JnJyxcclxuICAgICAgICAgICdiYmMuY29tJywgJ2JiYy5jby51aycsICdueXRpbWVzLmNvbScsICd3YXNoaW5ndG9ucG9zdC5jb20nLCAnd3NqLmNvbScsXHJcbiAgICAgICAgICAnbnByLm9yZycsICdwYnMub3JnJywgJ2FiY25ld3MuZ28uY29tJywgJ2Nic25ld3MuY29tJywgJ25iY25ld3MuY29tJyxcclxuICAgICAgICAgICdjbm4uY29tJywgJ2ZveG5ld3MuY29tJywgJ21zbmJjLmNvbScsICdhYmMubmV0LmF1JywgJ3RoZWd1YXJkaWFuLmNvbScsXHJcbiAgICAgICAgICAnaW5kZXBlbmRlbnQuY28udWsnLCAndGVsZWdyYXBoLmNvLnVrJywgJ2Vjb25vbWlzdC5jb20nLCAndGltZS5jb20nLFxyXG4gICAgICAgICAgJ25ld3N3ZWVrLmNvbScsICd1c2F0b2RheS5jb20nLCAnbGF0aW1lcy5jb20nLCAnY2hpY2Fnb3RyaWJ1bmUuY29tJ1xyXG4gICAgICAgIF07XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgaXNGcm9tVHJ1c3RlZERvbWFpbiA9IHRydXN0ZWREb21haW5zLnNvbWUoZG9tYWluID0+IFxyXG4gICAgICAgICAgcmVzdWx0RG9tYWluLmluY2x1ZGVzKGRvbWFpbilcclxuICAgICAgICApO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEV4dHJhY3Qga2V5IGVudGl0aWVzIChuYW1lcywgcGxhY2VzLCBldmVudHMpIGZyb20gdGhlIG9yaWdpbmFsIHRpdGxlXHJcbiAgICAgICAgY29uc3Qgb3JpZ2luYWxUaXRsZUxvd2VyID0gc2VhcmNoVGVybXMudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBFeHRyYWN0IHByb3BlciBub3VucyBhbmQgaW1wb3J0YW50IHRlcm1zIChsZW5ndGggPiAzLCBjYXBpdGFsaXplZCBpbiBvcmlnaW5hbClcclxuICAgICAgICBjb25zdCBvcmlnaW5hbFdvcmRzID0gc2VhcmNoVGVybXMuc3BsaXQoJyAnKTtcclxuICAgICAgICBjb25zdCBrZXlFbnRpdGllcyA9IG9yaWdpbmFsV29yZHMuZmlsdGVyKHdvcmQgPT4ge1xyXG4gICAgICAgICAgY29uc3QgY2xlYW5Xb3JkID0gd29yZC50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgICAgcmV0dXJuIHdvcmQubGVuZ3RoID4gMyAmJiBcclxuICAgICAgICAgICAgICAgICAhWyd0aGUnLCAnYW5kJywgJ2ZvcicsICd3aXRoJywgJ2Zyb20nLCAndGhhdCcsICd0aGlzJywgJ2hhdmUnLCAnYmVlbicsICd0aGV5JywgJ3dlcmUnLCAnc2FpZCcsICduZXdzJywgJ2FydGljbGUnLCAncmVwb3J0JywgJ3N0b3J5J10uaW5jbHVkZXMoY2xlYW5Xb3JkKSAmJlxyXG4gICAgICAgICAgICAgICAgICh3b3JkWzBdID09PSB3b3JkWzBdLnRvVXBwZXJDYXNlKCkgfHwgY2xlYW5Xb3JkLmxlbmd0aCA+IDUpOyAvLyBQcm9wZXIgbm91bnMgb3IgbG9uZ2VyIHdvcmRzXHJcbiAgICAgICAgfSkubWFwKHdvcmQgPT4gd29yZC50b0xvd2VyQ2FzZSgpKTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zb2xlLmxvZygnW1dlYlNlYXJjaF0gS2V5IGVudGl0aWVzIGV4dHJhY3RlZDonLCBrZXlFbnRpdGllcyk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gUmVxdWlyZSBhdCBsZWFzdCAyIGtleSBlbnRpdGllcyB0byBtYXRjaCwgb3IgMSBpZiBpdCdzIGEgbmFtZSAoMisgd29yZHMpXHJcbiAgICAgICAgY29uc3QgZW50aXR5TWF0Y2hlcyA9IGtleUVudGl0aWVzLmZpbHRlcihlbnRpdHkgPT4gXHJcbiAgICAgICAgICB0aXRsZUFuZFNuaXBwZXQuaW5jbHVkZXMoZW50aXR5KVxyXG4gICAgICAgICk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc29sZS5sb2coJ1tXZWJTZWFyY2hdIEVudGl0eSBtYXRjaGVzIGZvdW5kOicsIGVudGl0eU1hdGNoZXMsICdmb3IgcmVzdWx0OicsIHJlc3VsdC50aXRsZSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgaGFzU3Ryb25nRW50aXR5TWF0Y2ggPSBlbnRpdHlNYXRjaGVzLmxlbmd0aCA+PSAyIHx8IFxyXG4gICAgICAgICAgKGVudGl0eU1hdGNoZXMubGVuZ3RoID49IDEgJiYga2V5RW50aXRpZXMuc29tZShlbnRpdHkgPT4gZW50aXR5LmluY2x1ZGVzKCcgJykpKTsgLy8gTXVsdGktd29yZCBlbnRpdGllcyBsaWtlIFwiQmFkIEJ1bm55XCJcclxuICAgICAgICBcclxuICAgICAgICAvLyBBbGxvdyBpZiBhbnkgb2YgdGhlc2UgY29uZGl0aW9ucyBhcmUgbWV0LCBidXQgcHJpb3JpdGl6ZSBzdHJvbmcgZW50aXR5IG1hdGNoZXNcclxuICAgICAgICBjb25zdCBzaG91bGRJbmNsdWRlID0gaGFzUmVsZXZhbnRLZXl3b3JkcyB8fCBpc0Zyb21UcnVzdGVkRG9tYWluIHx8IGhhc1N0cm9uZ0VudGl0eU1hdGNoO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnNvbGUubG9nKCdbV2ViU2VhcmNoXSBSZXN1bHQgZXZhbHVhdGlvbjonLCB7XHJcbiAgICAgICAgICB0aXRsZTogcmVzdWx0LnRpdGxlPy5zdWJzdHJpbmcoMCwgNTApICsgJy4uLicsXHJcbiAgICAgICAgICBoYXNSZWxldmFudEtleXdvcmRzLFxyXG4gICAgICAgICAgaXNGcm9tVHJ1c3RlZERvbWFpbixcclxuICAgICAgICAgIGhhc1N0cm9uZ0VudGl0eU1hdGNoLFxyXG4gICAgICAgICAgc2hvdWxkSW5jbHVkZVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiBzaG91bGRJbmNsdWRlO1xyXG4gICAgICB9KVxyXG4gICAgICAubWFwKChyZXN1bHQ6IGFueSkgPT4gKHtcclxuICAgICAgICB1cmw6IHJlc3VsdC5saW5rLFxyXG4gICAgICAgIHRpdGxlOiByZXN1bHQudGl0bGUsXHJcbiAgICAgICAgc25pcHBldDogcmVzdWx0LnNuaXBwZXRcclxuICAgICAgfSkpXHJcbiAgICAgIC8vIFJlbW92ZSBkdXBsaWNhdGVzXHJcbiAgICAgIC5maWx0ZXIoKHJlc3VsdDogYW55LCBpbmRleDogbnVtYmVyLCBzZWxmOiBhbnlbXSkgPT4gXHJcbiAgICAgICAgaW5kZXggPT09IHNlbGYuZmluZEluZGV4KChyOiBhbnkpID0+IHIudXJsID09PSByZXN1bHQudXJsKVxyXG4gICAgICApXHJcbiAgICAgIC5zbGljZSgwLCBtYXhSZXN1bHRzKTtcclxuICAgIFxyXG4gICAgLy8gSWYgd2UgaGF2ZSByZXN1bHRzIGZyb20gQUktZ2VuZXJhdGVkIHF1ZXJ5LCByZXR1cm4gdGhlbVxyXG4gICAgaWYgKHByb2Nlc3NlZFJlc3VsdHMubGVuZ3RoID4gMCkge1xyXG4gICAgICBjb25zb2xlLmxvZygnW1dlYlNlYXJjaF0gUmV0dXJuaW5nJywgcHJvY2Vzc2VkUmVzdWx0cy5sZW5ndGgsICdyZXN1bHRzIGZyb20gQUktZ2VuZXJhdGVkIHF1ZXJ5Jyk7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgcmVzdWx0czogcHJvY2Vzc2VkUmVzdWx0cyxcclxuICAgICAgICBzZWFyY2hNZXRob2Q6ICdhaS1nZW5lcmF0ZWQnLFxyXG4gICAgICAgIHF1ZXJ5VXNlZDogZmluYWxRdWVyeSxcclxuICAgICAgICBhaVF1ZXJ5R2VuZXJhdGVkOiBhaUdlbmVyYXRlZFF1ZXJ5XHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gSWYgbm8gcmVzdWx0cyBmcm9tIEFJLWdlbmVyYXRlZCBxdWVyeSwgdHJ5IGZhbGxiYWNrIHN0cmF0ZWdpZXNcclxuICAgIGNvbnNvbGUubG9nKCdbV2ViU2VhcmNoXSBObyByZXN1bHRzIGZyb20gQUkgcXVlcnksIHRyeWluZyBmYWxsYmFjayBzdHJhdGVnaWVzLi4uJyk7XHJcbiAgICAgIGNvbnN0IGZhbGxiYWNrU3RyYXRlZ2llcyA9IFtcclxuICAgICAgICBgXCIke3NlYXJjaFRlcm1zfVwiIGZhY3QgY2hlY2tgLFxyXG4gICAgICAgIGAke3NlYXJjaFRlcm1zfSB2ZXJpZmljYXRpb25gLFxyXG4gICAgICAgIGAke3NlYXJjaFRlcm1zfSBkZWJ1bmtlZGAsXHJcbiAgICAgICAgYCR7c2VhcmNoVGVybXN9IG5ld3MgYW5hbHlzaXNgLFxyXG4gICAgICAgIHNlYXJjaFRlcm1zXHJcbiAgICAgIF07XHJcbiAgICAgIFxyXG4gICAgICBmb3IgKGNvbnN0IGZhbGxiYWNrUXVlcnkgb2YgZmFsbGJhY2tTdHJhdGVnaWVzKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1tXZWJTZWFyY2hdIFRyeWluZyBmYWxsYmFjayBxdWVyeTonLCBmYWxsYmFja1F1ZXJ5KTtcclxuICAgICAgICBjb25zdCBmYWxsYmFja1BhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoe1xyXG4gICAgICAgICAga2V5OiBpbXBvcnQubWV0YS5lbnYuVklURV9HT09HTEVfQVBJX0tFWSxcclxuICAgICAgICAgIGN4OiBpbXBvcnQubWV0YS5lbnYuVklURV9HT09HTEVfU0VBUkNIX0VOR0lORV9JRCxcclxuICAgICAgICAgIHE6IGZhbGxiYWNrUXVlcnksXHJcbiAgICAgICAgICBudW06IE1hdGgubWluKDEwLCBtYXhSZXN1bHRzKS50b1N0cmluZygpLFxyXG4gICAgICAgICAgZmllbGRzOiAnaXRlbXModGl0bGUsc25pcHBldCxsaW5rKSdcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCBmYWxsYmFja1VybCA9IGBodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9jdXN0b21zZWFyY2gvdjE/JHtmYWxsYmFja1BhcmFtcy50b1N0cmluZygpfWA7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgIGNvbnN0IGZhbGxiYWNrUmVzcG9uc2UgPSBhd2FpdCBmZXRjaChmYWxsYmFja1VybCk7XHJcbiAgICAgICAgICBpZiAoZmFsbGJhY2tSZXNwb25zZS5vaykge1xyXG4gICAgICAgICAgICBjb25zdCBmYWxsYmFja0RhdGEgPSBhd2FpdCBmYWxsYmFja1Jlc3BvbnNlLmpzb24oKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGNvbnN0IGZhbGxiYWNrUmVzdWx0cyA9IChmYWxsYmFja0RhdGEuaXRlbXMgfHwgW10pXHJcbiAgICAgICAgICAgICAgLmZpbHRlcigocmVzdWx0OiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICghcmVzdWx0Py5saW5rKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIEFwcGx5IHNhbWUgZmlsdGVyaW5nIGxvZ2ljIGFzIGFib3ZlXHJcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudERvbWFpbiAmJiByZXN1bHQubGluay50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGN1cnJlbnREb21haW4pKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgY29uc3QgcHJvYmxlbWF0aWNEb21haW5zID0gW1xyXG4gICAgICAgICAgICAgICAgICAnNGNoYW4ub3JnJywgJzhrdW4udG9wJywgJ2dhYi5jb20nLCAncGFybGVyLmNvbScsICd0cnV0aHNvY2lhbC5jb20nXHJcbiAgICAgICAgICAgICAgICBdO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHREb21haW4gPSBuZXcgVVJMKHJlc3VsdC5saW5rKS5ob3N0bmFtZS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHByb2JsZW1hdGljRG9tYWlucy5zb21lKGRvbWFpbiA9PiByZXN1bHREb21haW4uaW5jbHVkZXMoZG9tYWluKSkpIHtcclxuICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBjb25zdCB1cmxQYXRoID0gbmV3IFVSTChyZXN1bHQubGluaykucGF0aG5hbWU7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB5ZWFyTWF0Y2ggPSB1cmxQYXRoLm1hdGNoKC9cXC8oMjBcXGR7Mn0pXFwvLyk7XHJcbiAgICAgICAgICAgICAgICBpZiAoeWVhck1hdGNoKSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGFydGljbGVZZWFyID0gcGFyc2VJbnQoeWVhck1hdGNoWzFdKTtcclxuICAgICAgICAgICAgICAgICAgaWYgKG9yaWdpbmFsQXJ0aWNsZVllYXIgJiYgYXJ0aWNsZVllYXIgIT09IG9yaWdpbmFsQXJ0aWNsZVllYXIpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgY29uc3Qgb2xkQ29udGVudFBhdHRlcm5zID0gW1xyXG4gICAgICAgICAgICAgICAgICAvXFwvMjAoMFswLTldfDFbMC01XSlcXC8vLCAvLyAyMDAwLTIwMTVcclxuICAgICAgICAgICAgICAgICAgL2FyY2hpdmVcXC4vLFxyXG4gICAgICAgICAgICAgICAgICAvb2xkXFwuLyxcclxuICAgICAgICAgICAgICAgICAgL2xlZ2FjeVxcLi9cclxuICAgICAgICAgICAgICAgIF07XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGlmIChvbGRDb250ZW50UGF0dGVybnMuc29tZShwYXR0ZXJuID0+IHBhdHRlcm4udGVzdChyZXN1bHQubGluaykpKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAubWFwKChyZXN1bHQ6IGFueSkgPT4gKHtcclxuICAgICAgICAgICAgICAgIHVybDogcmVzdWx0LmxpbmssXHJcbiAgICAgICAgICAgICAgICB0aXRsZTogcmVzdWx0LnRpdGxlLFxyXG4gICAgICAgICAgICAgICAgc25pcHBldDogcmVzdWx0LnNuaXBwZXRcclxuICAgICAgICAgICAgICB9KSlcclxuICAgICAgICAgICAgICAuZmlsdGVyKChyZXN1bHQ6IGFueSwgaW5kZXg6IG51bWJlciwgc2VsZjogYW55W10pID0+IFxyXG4gICAgICAgICAgICAgICAgaW5kZXggPT09IHNlbGYuZmluZEluZGV4KChyOiBhbnkpID0+IHIudXJsID09PSByZXN1bHQudXJsKVxyXG4gICAgICAgICAgICAgIClcclxuICAgICAgICAgICAgICAuc2xpY2UoMCwgbWF4UmVzdWx0cyk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZiAoZmFsbGJhY2tSZXN1bHRzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW1dlYlNlYXJjaF0gUmV0dXJuaW5nJywgZmFsbGJhY2tSZXN1bHRzLmxlbmd0aCwgJ3Jlc3VsdHMgZnJvbSBmYWxsYmFjayBxdWVyeTonLCBmYWxsYmFja1F1ZXJ5KTtcclxuICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0czogZmFsbGJhY2tSZXN1bHRzLFxyXG4gICAgICAgICAgICAgICAgc2VhcmNoTWV0aG9kOiAnZmFsbGJhY2snLFxyXG4gICAgICAgICAgICAgICAgcXVlcnlVc2VkOiBmYWxsYmFja1F1ZXJ5LFxyXG4gICAgICAgICAgICAgICAgYWlRdWVyeUdlbmVyYXRlZDogYWlHZW5lcmF0ZWRRdWVyeSxcclxuICAgICAgICAgICAgICAgIGZhbGxiYWNrUXVlcnlVc2VkOiBmYWxsYmFja1F1ZXJ5XHJcbiAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggKGZhbGxiYWNrRXJyb3IpIHtcclxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEZhbGxiYWNrIHF1ZXJ5IFwiJHtmYWxsYmFja1F1ZXJ5fVwiIGZhaWxlZDpgLCBmYWxsYmFja0Vycm9yKTtcclxuICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgXHJcbiAgICAvLyBJZiBubyBmYWxsYmFjayBzdHJhdGVnaWVzIHdvcmtlZCwgcmV0dXJuIGVtcHR5IHJlc3VsdHNcclxuICAgIGNvbnNvbGUubG9nKCdbV2ViU2VhcmNoXSBObyByZXN1bHRzIGZvdW5kIGZyb20gYW55IHN0cmF0ZWd5Jyk7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICByZXN1bHRzOiBbXSxcclxuICAgICAgc2VhcmNoTWV0aG9kOiAnZmFsbGJhY2snLFxyXG4gICAgICBxdWVyeVVzZWQ6ICdObyBzdWNjZXNzZnVsIHF1ZXJ5JyxcclxuICAgICAgYWlRdWVyeUdlbmVyYXRlZDogYWlHZW5lcmF0ZWRRdWVyeSxcclxuICAgICAgZmFsbGJhY2tRdWVyeVVzZWQ6ICdBbGwgZmFsbGJhY2sgcXVlcmllcyBmYWlsZWQnXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdBSS1wb3dlcmVkIHdlYiBzZWFyY2ggZmFpbGVkOicsIGVycm9yKTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHJlc3VsdHM6IFtdLFxyXG4gICAgICBzZWFyY2hNZXRob2Q6ICdmYWxsYmFjaycsXHJcbiAgICAgIHF1ZXJ5VXNlZDogJ0Vycm9yIG9jY3VycmVkJyxcclxuICAgICAgYWlRdWVyeUdlbmVyYXRlZDogJ0ZhaWxlZCB0byBnZW5lcmF0ZScsXHJcbiAgICAgIGZhbGxiYWNrUXVlcnlVc2VkOiAnRXJyb3IgYmVmb3JlIGZhbGxiYWNrJ1xyXG4gICAgfTtcclxuICB9XHJcbn1cclxuXHJcbi8vIFRlc3QgZnVuY3Rpb24gdG8gdmVyaWZ5IGxvZ2dpbmcgaXMgd29ya2luZ1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdGVzdFdlYlNlYXJjaExvZ2dpbmcoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgY29uc29sZS5sb2coJ1tXZWJTZWFyY2hdIFRFU1Q6IFN0YXJ0aW5nIHdlYiBzZWFyY2ggbG9nZ2luZyB0ZXN0Li4uJyk7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHRlc3RSZXNwb25zZSA9IGF3YWl0IHBlcmZvcm1XZWJTZWFyY2goJ3Rlc3QgbmV3cyBhcnRpY2xlIGh0dHBzOi8vZXhhbXBsZS5jb20vMjAyNC90ZXN0JywgMik7XHJcbiAgICBjb25zb2xlLmxvZygnW1dlYlNlYXJjaF0gVEVTVDogUmVzcG9uc2UgcmVjZWl2ZWQ6Jywge1xyXG4gICAgICBzZWFyY2hNZXRob2Q6IHRlc3RSZXNwb25zZS5zZWFyY2hNZXRob2QsXHJcbiAgICAgIHF1ZXJ5VXNlZDogdGVzdFJlc3BvbnNlLnF1ZXJ5VXNlZCxcclxuICAgICAgcmVzdWx0c0NvdW50OiB0ZXN0UmVzcG9uc2UucmVzdWx0cy5sZW5ndGgsXHJcbiAgICAgIGFpUXVlcnlHZW5lcmF0ZWQ6IHRlc3RSZXNwb25zZS5haVF1ZXJ5R2VuZXJhdGVkLFxyXG4gICAgICBmYWxsYmFja1F1ZXJ5VXNlZDogdGVzdFJlc3BvbnNlLmZhbGxiYWNrUXVlcnlVc2VkXHJcbiAgICB9KTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5sb2coJ1tXZWJTZWFyY2hdIFRFU1Q6IEVycm9yIGR1cmluZyB0ZXN0OicsIGVycm9yKTtcclxuICB9XHJcbn1cclxuXHJcbi8vZml4IHdlYnNlYXJjaCBlcnJvcnMiLCIvLyBUYWIgc3RhdGUgbWFuYWdlbWVudCBmdW5jdGlvbmFsaXR5XHJcblxyXG5leHBvcnQgdHlwZSBUYWJTdGF0ZSA9IHtcclxuICBwYWdlSW5mbzogYW55O1xyXG4gIGFuYWx5c2lzOiBhbnlbXTtcclxuICBmYWlsZWRQcm92aWRlcnM6IHN0cmluZ1tdO1xyXG4gIHNob3dCdXR0b246IGJvb2xlYW47XHJcbiAgaXNBbmFseXppbmc6IGJvb2xlYW47XHJcbiAgaGFzQXR0ZW1wdGVkQW5hbHlzaXM6IGJvb2xlYW47XHJcbiAgaXNWaWV3aW5nRnJvbVJlY2VudD86IGJvb2xlYW47XHJcbiAgb3JpZ2luYWxUYWJJZD86IG51bWJlcjtcclxuICBoYXNQcmVsb2FkZWRBbmFseXNpcz86IGJvb2xlYW47XHJcbiAgcmVxdWlyZXNNYW51YWxUcmlnZ2VyPzogYm9vbGVhbjtcclxufTtcclxuXHJcbi8vIEluLW1lbW9yeSB0YWIgc3RhdGUgc3RvcmFnZVxyXG5jb25zdCB0YWJTdGF0ZXMgPSBuZXcgTWFwPG51bWJlciwgVGFiU3RhdGU+KCk7XHJcblxyXG4vLyBVUkwtYmFzZWQgc3RvcmFnZSBmb3IgYmV0dGVyIGFuYWx5c2lzIHBlcnNpc3RlbmNlXHJcbmNvbnN0IHVybEFuYWx5c2lzU3RvcmFnZSA9IG5ldyBNYXA8c3RyaW5nLCB7XHJcbiAgcGFnZUluZm86IGFueTtcclxuICBhbmFseXNpczogYW55W107XHJcbiAgZmFpbGVkUHJvdmlkZXJzOiBzdHJpbmdbXTtcclxuICB0aW1lc3RhbXA6IG51bWJlcjtcclxufT4oKTtcclxuXHJcbi8vIFRyYWNrIHRhYnMgdGhhdCBhcmUgY3VycmVudGx5IGJlaW5nIHNldCB1cCB0byBwcmV2ZW50IGRvdWJsZSBleGVjdXRpb25cclxuY29uc3QgdGFic0JlaW5nU2V0dXAgPSBuZXcgU2V0PG51bWJlcj4oKTtcclxuXHJcbi8vIEdldCBkZWZhdWx0IHN0YXRlIGZvciBhIG5ldyB0YWJcclxuZXhwb3J0IGNvbnN0IGdldERlZmF1bHRTdGF0ZSA9ICgpOiBUYWJTdGF0ZSA9PiAoe1xyXG4gIHBhZ2VJbmZvOiBudWxsLFxyXG4gIGFuYWx5c2lzOiBbXSxcclxuICBmYWlsZWRQcm92aWRlcnM6IFtdLFxyXG4gIHNob3dCdXR0b246IHRydWUsXHJcbiAgaXNBbmFseXppbmc6IGZhbHNlLFxyXG4gIGhhc0F0dGVtcHRlZEFuYWx5c2lzOiBmYWxzZVxyXG59KTtcclxuXHJcbi8vIFBlcnNpc3RlbnQgdGFiIHN0YXRlIHN0b3JhZ2UgaGVscGVyc1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2F2ZVRhYlN0YXRlKHRhYklkOiBudW1iZXIsIHN0YXRlOiBUYWJTdGF0ZSk6IFByb21pc2U8dm9pZD4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBleGlzdGluZyA9IGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldCgndGFiU3RhdGVzJyk7XHJcbiAgICBjb25zdCB0YWJTdGF0ZXNPYmogPSBleGlzdGluZy50YWJTdGF0ZXMgfHwge307XHJcbiAgICB0YWJTdGF0ZXNPYmpbdGFiSWRdID0gc3RhdGU7XHJcbiAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyB0YWJTdGF0ZXM6IHRhYlN0YXRlc09iaiB9KTtcclxuICAgIC8vIEFsc28ga2VlcCBpbiBtZW1vcnkgZm9yIHF1aWNrIGFjY2Vzc1xyXG4gICAgdGFiU3RhdGVzLnNldCh0YWJJZCwgc3RhdGUpO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gc2F2ZSB0YWIgc3RhdGU6JywgZXJyb3IpO1xyXG4gICAgLy8gRmFsbGJhY2sgdG8gbWVtb3J5IG9ubHlcclxuICAgIHRhYlN0YXRlcy5zZXQodGFiSWQsIHN0YXRlKTtcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRUYWJTdGF0ZSh0YWJJZDogbnVtYmVyKTogUHJvbWlzZTxUYWJTdGF0ZSB8IHVuZGVmaW5lZD4ge1xyXG4gIC8vIEZpcnN0IGNoZWNrIG1lbW9yeVxyXG4gIGlmICh0YWJTdGF0ZXMuaGFzKHRhYklkKSkge1xyXG4gICAgcmV0dXJuIHRhYlN0YXRlcy5nZXQodGFiSWQpO1xyXG4gIH1cclxuICBcclxuICAvLyBUaGVuIGNoZWNrIHBlcnNpc3RlbnQgc3RvcmFnZVxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBleGlzdGluZyA9IGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldCgndGFiU3RhdGVzJyk7XHJcbiAgICBjb25zdCB0YWJTdGF0ZXNPYmogPSBleGlzdGluZy50YWJTdGF0ZXMgfHwge307XHJcbiAgICBjb25zdCBzdGF0ZSA9IHRhYlN0YXRlc09ialt0YWJJZF07XHJcbiAgICBpZiAoc3RhdGUpIHtcclxuICAgICAgLy8gUmVzdG9yZSB0byBtZW1vcnlcclxuICAgICAgdGFiU3RhdGVzLnNldCh0YWJJZCwgc3RhdGUpO1xyXG4gICAgICByZXR1cm4gc3RhdGU7XHJcbiAgICB9XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBnZXQgdGFiIHN0YXRlOicsIGVycm9yKTtcclxuICB9XHJcbiAgXHJcbiAgcmV0dXJuIHVuZGVmaW5lZDtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRlbGV0ZVRhYlN0YXRlKHRhYklkOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgZXhpc3RpbmcgPSBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoJ3RhYlN0YXRlcycpO1xyXG4gICAgY29uc3QgdGFiU3RhdGVzT2JqID0gZXhpc3RpbmcudGFiU3RhdGVzIHx8IHt9O1xyXG4gICAgZGVsZXRlIHRhYlN0YXRlc09ialt0YWJJZF07XHJcbiAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyB0YWJTdGF0ZXM6IHRhYlN0YXRlc09iaiB9KTtcclxuICAgIC8vIEFsc28gcmVtb3ZlIGZyb20gbWVtb3J5XHJcbiAgICB0YWJTdGF0ZXMuZGVsZXRlKHRhYklkKTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGRlbGV0ZSB0YWIgc3RhdGU6JywgZXJyb3IpO1xyXG4gICAgLy8gRmFsbGJhY2sgdG8gbWVtb3J5IG9ubHlcclxuICAgIHRhYlN0YXRlcy5kZWxldGUodGFiSWQpO1xyXG4gIH1cclxufVxyXG5cclxuLy8gVVJMIGFuYWx5c2lzIHN0b3JhZ2UgaGVscGVyc1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0VXJsQW5hbHlzaXModXJsOiBzdHJpbmcpIHtcclxuICByZXR1cm4gdXJsQW5hbHlzaXNTdG9yYWdlLmdldCh1cmwpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc2V0VXJsQW5hbHlzaXModXJsOiBzdHJpbmcsIGRhdGE6IHtcclxuICBwYWdlSW5mbzogYW55O1xyXG4gIGFuYWx5c2lzOiBhbnlbXTtcclxuICBmYWlsZWRQcm92aWRlcnM6IHN0cmluZ1tdO1xyXG4gIHRpbWVzdGFtcDogbnVtYmVyO1xyXG59KSB7XHJcbiAgdXJsQW5hbHlzaXNTdG9yYWdlLnNldCh1cmwsIGRhdGEpO1xyXG59XHJcblxyXG4vLyBUYWIgc2V0dXAgdHJhY2tpbmdcclxuZXhwb3J0IGZ1bmN0aW9uIGlzVGFiQmVpbmdTZXR1cCh0YWJJZDogbnVtYmVyKTogYm9vbGVhbiB7XHJcbiAgcmV0dXJuIHRhYnNCZWluZ1NldHVwLmhhcyh0YWJJZCk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBtYXJrVGFiQXNCZWluZ1NldHVwKHRhYklkOiBudW1iZXIpOiB2b2lkIHtcclxuICB0YWJzQmVpbmdTZXR1cC5hZGQodGFiSWQpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdW5tYXJrVGFiQXNCZWluZ1NldHVwKHRhYklkOiBudW1iZXIpOiB2b2lkIHtcclxuICB0YWJzQmVpbmdTZXR1cC5kZWxldGUodGFiSWQpO1xyXG59XHJcblxyXG4vLyBDbGVhbnVwIG9sZCBVUkwgYW5hbHlzaXMgZW50cmllcyAob2xkZXIgdGhhbiAyNCBob3VycylcclxuZXhwb3J0IGNvbnN0IGNsZWFudXBVcmxTdG9yYWdlID0gKCk6IHZvaWQgPT4ge1xyXG4gIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XHJcbiAgY29uc3QgbWF4QWdlID0gMjQgKiA2MCAqIDYwICogMTAwMDsgLy8gMjQgaG91cnNcclxuICBmb3IgKGNvbnN0IFt1cmwsIGRhdGFdIG9mIHVybEFuYWx5c2lzU3RvcmFnZS5lbnRyaWVzKCkpIHtcclxuICAgIGlmIChub3cgLSBkYXRhLnRpbWVzdGFtcCA+IG1heEFnZSkge1xyXG4gICAgICB1cmxBbmFseXNpc1N0b3JhZ2UuZGVsZXRlKHVybCk7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuLy8gQ2xlYW51cCBvbGQgdGFiIHN0YXRlcyBmcm9tIHN0b3JhZ2UgKGZvciBjbG9zZWQgdGFicylcclxuZXhwb3J0IGNvbnN0IGNsZWFudXBUYWJTdGF0ZXMgPSBhc3luYyAoKTogUHJvbWlzZTx2b2lkPiA9PiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHRhYlN0YXRlc0RhdGEgPSBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoJ3RhYlN0YXRlcycpO1xyXG4gICAgY29uc3QgdGFiU3RhdGVzT2JqID0gdGFiU3RhdGVzRGF0YS50YWJTdGF0ZXMgfHwge307XHJcbiAgICBjb25zdCBhbGxUYWJzID0gYXdhaXQgY2hyb21lLnRhYnMucXVlcnkoe30pO1xyXG4gICAgY29uc3QgYWN0aXZlVGFiSWRzID0gbmV3IFNldChhbGxUYWJzLm1hcCh0YWIgPT4gdGFiLmlkKSk7XHJcbiAgICBcclxuICAgIC8vIFJlbW92ZSBzdGF0ZXMgZm9yIHRhYnMgdGhhdCBubyBsb25nZXIgZXhpc3RcclxuICAgIGxldCBjbGVhbmVkID0gZmFsc2U7XHJcbiAgICBmb3IgKGNvbnN0IHRhYklkIG9mIE9iamVjdC5rZXlzKHRhYlN0YXRlc09iaikpIHtcclxuICAgICAgaWYgKCFhY3RpdmVUYWJJZHMuaGFzKHBhcnNlSW50KHRhYklkKSkpIHtcclxuICAgICAgICBkZWxldGUgdGFiU3RhdGVzT2JqW3RhYklkXTtcclxuICAgICAgICBjbGVhbmVkID0gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICBpZiAoY2xlYW5lZCkge1xyXG4gICAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyB0YWJTdGF0ZXM6IHRhYlN0YXRlc09iaiB9KTtcclxuICAgICAgY29uc29sZS5sb2coJ0NsZWFuZWQgdXAgb2xkIHRhYiBzdGF0ZXMnKTtcclxuICAgIH1cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgY2xlYW5pbmcgdXAgdGFiIHN0YXRlczonLCBlcnJvcik7XHJcbiAgfVxyXG59O1xyXG4iLCIvLyBBbmFseXNpcyBwcm9jZXNzaW5nIGFuZCBKU09OIHBhcnNpbmcgdXRpbGl0aWVzXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2xlYW5BbmRQYXJzZUpTT04odGV4dDogc3RyaW5nKSB7XHJcbiAgdHJ5IHtcclxuICAgIC8vIEZpcnN0IHRyeSBkaXJlY3QgSlNPTiBwYXJzZVxyXG4gICAgcmV0dXJuIEpTT04ucGFyc2UodGV4dCk7XHJcbiAgfSBjYXRjaCAoZSkge1xyXG4gICAgLy8gSWYgdGhhdCBmYWlscywgdHJ5IHRvIGNsZWFuIGFuZCBleHRyYWN0IEpTT05cclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIFJlbW92ZSBhbnkgbGVhZGluZy90cmFpbGluZyBub24tSlNPTiBjb250ZW50XHJcbiAgICAgIGxldCBqc29uU3RyID0gdGV4dC50cmltKCk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBGaW5kIHRoZSBmaXJzdCB7IGFuZCBsYXN0IH1cclxuICAgICAgY29uc3Qgc3RhcnRJZHggPSBqc29uU3RyLmluZGV4T2YoJ3snKTtcclxuICAgICAgY29uc3QgZW5kSWR4ID0ganNvblN0ci5sYXN0SW5kZXhPZignfScpICsgMTtcclxuICAgICAgaWYgKHN0YXJ0SWR4ID49IDAgJiYgZW5kSWR4ID4gc3RhcnRJZHgpIHtcclxuICAgICAgICBqc29uU3RyID0ganNvblN0ci5zbGljZShzdGFydElkeCwgZW5kSWR4KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gQ2xlYW4gdXAgY29tbW9uIGZvcm1hdHRpbmcgaXNzdWVzXHJcbiAgICAgIGpzb25TdHIgPSBqc29uU3RyXHJcbiAgICAgICAgLnJlcGxhY2UoL1xcXFxuL2csICcgJykgICAgICAgICAgIC8vIFJlcGxhY2UgXFxuIHdpdGggc3BhY2VcclxuICAgICAgICAucmVwbGFjZSgvXFxzKy9nLCAnICcpICAgICAgICAgICAvLyBSZXBsYWNlIG11bHRpcGxlIHNwYWNlcyB3aXRoIHNpbmdsZSBzcGFjZVxyXG4gICAgICAgIC5yZXBsYWNlKC9cIlxccyosXFxzKn0vZywgJ1wifScpICAgIC8vIFJlbW92ZSB0cmFpbGluZyBjb21tYXNcclxuICAgICAgICAucmVwbGFjZSgvLChcXHMqfSkvZywgJyQxJykgICAgICAvLyBSZW1vdmUgdHJhaWxpbmcgY29tbWFzIGluIG9iamVjdHNcclxuICAgICAgICAucmVwbGFjZSgvXFwuLC9nLCAnLicpICAgICAgICAgICAvLyBGaXggXCIuLFwiIGlzc3Vlc1xyXG4gICAgICAgIC5yZXBsYWNlKC9cXC5cIi9nLCAnXCInKSAgICAgICAgICAgLy8gRml4IHRyYWlsaW5nIHBlcmlvZHMgaW4gc3RyaW5nc1xyXG4gICAgICAgIC5yZXBsYWNlKC9cIlxccypcXC5cXHMqJC9nLCAnXCInKSAgICAvLyBGaXggdHJhaWxpbmcgcGVyaW9kcyBhZnRlciBxdW90ZXNcclxuICAgICAgICAucmVwbGFjZSgvXFxbXFxzKiwvZywgJ1snKSAgICAgICAgLy8gRml4IGxlYWRpbmcgY29tbWFzIGluIGFycmF5c1xyXG4gICAgICAgIC5yZXBsYWNlKC8sXFxzKlxcXS9nLCAnXScpOyAgICAgICAvLyBGaXggdHJhaWxpbmcgY29tbWFzIGluIGFycmF5c1xyXG5cclxuICAgICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShqc29uU3RyKTtcclxuXHJcbiAgICAgIC8vIENsZWFuIHVwIHRoZSBwYXJzZWQgb2JqZWN0XHJcbiAgICAgIGlmIChwYXJzZWQuY3JlZGliaWxpdHlfc3VtbWFyeSkge1xyXG4gICAgICAgIHBhcnNlZC5jcmVkaWJpbGl0eV9zdW1tYXJ5ID0gcGFyc2VkLmNyZWRpYmlsaXR5X3N1bW1hcnlcclxuICAgICAgICAgIC50cmltKClcclxuICAgICAgICAgIC5yZXBsYWNlKC9cXHMrL2csICcgJylcclxuICAgICAgICAgIC5yZXBsYWNlKC9cXC4sL2csICcuJylcclxuICAgICAgICAgIC5yZXBsYWNlKC9cXC4rJC8sICcuJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChwYXJzZWQucmVhc29uaW5nKSB7XHJcbiAgICAgICAgcGFyc2VkLnJlYXNvbmluZyA9IHBhcnNlZC5yZWFzb25pbmdcclxuICAgICAgICAgIC50cmltKClcclxuICAgICAgICAgIC5yZXBsYWNlKC9cXHMrL2csICcgJylcclxuICAgICAgICAgIC5yZXBsYWNlKC9cXC4sL2csICcuJylcclxuICAgICAgICAgIC5yZXBsYWNlKC9cXC4rJC8sICcuJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHBhcnNlZC5ldmlkZW5jZV9zZW50ZW5jZXMpKSB7XHJcbiAgICAgICAgcGFyc2VkLmV2aWRlbmNlX3NlbnRlbmNlcyA9IHBhcnNlZC5ldmlkZW5jZV9zZW50ZW5jZXMubWFwKChldmlkZW5jZTogYW55KSA9PiAoe1xyXG4gICAgICAgICAgcXVvdGU6IGV2aWRlbmNlLnF1b3RlPy50cmltKCkucmVwbGFjZSgvXFxzKy9nLCAnICcpLnJlcGxhY2UoL1xcLiskLywgJycpIHx8ICcnLFxyXG4gICAgICAgICAgaW1wYWN0OiBldmlkZW5jZS5pbXBhY3Q/LnRyaW0oKS5yZXBsYWNlKC9cXHMrL2csICcgJykucmVwbGFjZSgvXFwuKyQvLCAnJykgfHwgJydcclxuICAgICAgICB9KSkuZmlsdGVyKChlOiBhbnkpID0+IGUucXVvdGUgJiYgZS5pbXBhY3QpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShwYXJzZWQuc3VwcG9ydGluZ19saW5rcykpIHtcclxuICAgICAgICBwYXJzZWQuc3VwcG9ydGluZ19saW5rcyA9IHBhcnNlZC5zdXBwb3J0aW5nX2xpbmtzXHJcbiAgICAgICAgICAubWFwKChsaW5rOiBzdHJpbmcpID0+IGxpbmsudHJpbSgpKVxyXG4gICAgICAgICAgLmZpbHRlcihCb29sZWFuKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gRW5zdXJlIGNyZWRpYmlsaXR5X3Njb3JlIGlzIGEgbnVtYmVyIGJldHdlZW4gMS0xMDBcclxuICAgICAgaWYgKHR5cGVvZiBwYXJzZWQuY3JlZGliaWxpdHlfc2NvcmUgPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgcGFyc2VkLmNyZWRpYmlsaXR5X3Njb3JlID0gcGFyc2VJbnQocGFyc2VkLmNyZWRpYmlsaXR5X3Njb3JlLCAxMCk7XHJcbiAgICAgIH1cclxuICAgICAgcGFyc2VkLmNyZWRpYmlsaXR5X3Njb3JlID0gTWF0aC5tYXgoMSwgTWF0aC5taW4oMTAwLCBwYXJzZWQuY3JlZGliaWxpdHlfc2NvcmUgfHwgMCkpO1xyXG5cclxuICAgICAgcmV0dXJuIHBhcnNlZDtcclxuICAgIH0gY2F0Y2ggKGUyKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBwYXJzZSBjbGVhbmVkIEpTT046JywgZTIpO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgSlNPTiBmb3JtYXQnKTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQW5hbHlzaXNSZXN1bHQge1xyXG4gIHByb3ZpZGVyOiBzdHJpbmc7XHJcbiAgcmVzdWx0OiB7XHJcbiAgICBjcmVkaWJpbGl0eV9zY29yZTogbnVtYmVyO1xyXG4gICAgY3JlZGliaWxpdHlfc3VtbWFyeTogc3RyaW5nO1xyXG4gICAgcmVhc29uaW5nOiBzdHJpbmc7XHJcbiAgICBldmlkZW5jZV9zZW50ZW5jZXM6IEFycmF5PHtcclxuICAgICAgcXVvdGU6IHN0cmluZztcclxuICAgICAgaW1wYWN0OiBzdHJpbmc7XHJcbiAgICB9PjtcclxuICAgIHN1cHBvcnRpbmdfbGlua3M6IHN0cmluZ1tdO1xyXG4gIH07XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBwcm9jZXNzQW5hbHlzaXNSZXN1bHRzKFxyXG4gIHJlc3VsdHM6IFByb21pc2VTZXR0bGVkUmVzdWx0PGFueT5bXSxcclxuICBwcm92aWRlcnM6IHN0cmluZ1tdXHJcbik6IHsgc3VjY2Vzc2Z1bFJlc3VsdHM6IEFuYWx5c2lzUmVzdWx0W107IGZhaWxlZFByb3ZpZGVyczogc3RyaW5nW10gfSB7XHJcbiAgY29uc3Qgc3VjY2Vzc2Z1bFJlc3VsdHMgPSByZXN1bHRzXHJcbiAgICAubWFwKChyLCBpKSA9PiB7XHJcbiAgICAgIGlmIChyLnN0YXR1cyA9PT0gJ2Z1bGZpbGxlZCcpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgbGV0IHBhcnNlZFJlc3VsdDtcclxuICAgICAgICAgIGlmICh0eXBlb2Ygci52YWx1ZSA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICBwYXJzZWRSZXN1bHQgPSBjbGVhbkFuZFBhcnNlSlNPTihyLnZhbHVlKTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBwYXJzZSByZXN1bHQ6JywgZSk7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHBhcnNlZFJlc3VsdCA9IHIudmFsdWU7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgaWYgKCFwYXJzZWRSZXN1bHQpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignTm8gcGFyc2VkIHJlc3VsdCBhdmFpbGFibGUnKTtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgLy8gVmFsaWRhdGUgdGhlIHN0cnVjdHVyZVxyXG4gICAgICAgICAgaWYgKHR5cGVvZiBwYXJzZWRSZXN1bHQuY3JlZGliaWxpdHlfc2NvcmUgIT09ICdudW1iZXInIHx8XHJcbiAgICAgICAgICAgICAgdHlwZW9mIHBhcnNlZFJlc3VsdC5jcmVkaWJpbGl0eV9zdW1tYXJ5ICE9PSAnc3RyaW5nJyB8fFxyXG4gICAgICAgICAgICAgIHR5cGVvZiBwYXJzZWRSZXN1bHQucmVhc29uaW5nICE9PSAnc3RyaW5nJyB8fFxyXG4gICAgICAgICAgICAgICFBcnJheS5pc0FycmF5KHBhcnNlZFJlc3VsdC5ldmlkZW5jZV9zZW50ZW5jZXMpIHx8XHJcbiAgICAgICAgICAgICAgIUFycmF5LmlzQXJyYXkocGFyc2VkUmVzdWx0LnN1cHBvcnRpbmdfbGlua3MpKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ludmFsaWQgcmVzdWx0IHN0cnVjdHVyZTonLCBwYXJzZWRSZXN1bHQpO1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBwcm92aWRlcjogcHJvdmlkZXJzW2ldLFxyXG4gICAgICAgICAgICByZXN1bHQ6IHBhcnNlZFJlc3VsdFxyXG4gICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBwcm9jZXNzaW5nIHJlc3VsdCBmcm9tIHByb3ZpZGVyICR7cHJvdmlkZXJzW2ldfTpgLCBlKTtcclxuICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gbnVsbDtcclxuICAgIH0pXHJcbiAgICAuZmlsdGVyKCh4KTogeCBpcyBOb25OdWxsYWJsZTx0eXBlb2YgeD4gPT4geCAhPT0gbnVsbCk7XHJcblxyXG4gIGNvbnN0IGZhaWxlZFByb3ZpZGVycyA9IHJlc3VsdHNcclxuICAgIC5tYXAoKHIsIGkpID0+IHtcclxuICAgICAgaWYgKHIuc3RhdHVzID09PSAncmVqZWN0ZWQnKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcihgUHJvdmlkZXIgJHtwcm92aWRlcnNbaV19IGZhaWxlZDpgLCByLnJlYXNvbik7XHJcbiAgICAgICAgcmV0dXJuIHByb3ZpZGVyc1tpXTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gbnVsbDtcclxuICAgIH0pXHJcbiAgICAuZmlsdGVyKCh4KTogeCBpcyBzdHJpbmcgPT4geCAhPT0gbnVsbCk7XHJcblxyXG4gIHJldHVybiB7IHN1Y2Nlc3NmdWxSZXN1bHRzLCBmYWlsZWRQcm92aWRlcnMgfTtcclxufVxyXG4iLCIvLyBNZXNzYWdlIGhhbmRsZXJzIGZvciBiYWNrZ3JvdW5kIHNjcmlwdFxyXG5pbXBvcnQgeyBmZXRjaE9wZW5BSSwgZmV0Y2hHZW1pbmksIGZldGNoQ29oZXJlIH0gZnJvbSAnLi9haUhhbmRsaW5nJztcclxuaW1wb3J0IHsgcGVyZm9ybVdlYlNlYXJjaCB9IGZyb20gJy4vd2ViU2VhcmNoJztcclxuaW1wb3J0IHsgXHJcbiAgc2F2ZVRhYlN0YXRlLCBcclxuICBnZXRUYWJTdGF0ZSwgXHJcbiAgZGVsZXRlVGFiU3RhdGUsIFxyXG4gIGdldERlZmF1bHRTdGF0ZSxcclxuICBnZXRVcmxBbmFseXNpcyxcclxuICBzZXRVcmxBbmFseXNpcyxcclxuICBpc1RhYkJlaW5nU2V0dXAsXHJcbiAgbWFya1RhYkFzQmVpbmdTZXR1cCxcclxuICB1bm1hcmtUYWJBc0JlaW5nU2V0dXBcclxufSBmcm9tICcuL3RhYlN0YXRlJztcclxuaW1wb3J0IHsgcHJvY2Vzc0FuYWx5c2lzUmVzdWx0cyB9IGZyb20gJy4vYW5hbHlzaXNQcm9jZXNzb3InO1xyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZUdldFBhZ2VJbmZvKG1lc3NhZ2U6IGFueSwgc2VuZGVyOiBhbnksIHNlbmRSZXNwb25zZTogKHJlc3BvbnNlOiBhbnkpID0+IHZvaWQpIHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgdGFiSWQgPSBtZXNzYWdlLnRhYklkIHx8IHNlbmRlci50YWI/LmlkO1xyXG4gICAgaWYgKCF0YWJJZCkge1xyXG4gICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyB0YWIgSUQgZm91bmQnIH0pO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcGFnZUluZm8gPSBhd2FpdCBjaHJvbWUudGFicy5zZW5kTWVzc2FnZSh0YWJJZCwgeyB0eXBlOiAnR0VUX1BBR0VfQ09OVEVOVCcgfSk7XHJcbiAgICBpZiAocGFnZUluZm8gJiYgcGFnZUluZm8uZXJyb3IpIHtcclxuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBwYWdlSW5mby5lcnJvciB9KTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEdldCBvciBjcmVhdGUgc3RhdGUgZm9yIHRoaXMgdGFiXHJcbiAgICBsZXQgc3RhdGUgPSBhd2FpdCBnZXRUYWJTdGF0ZSh0YWJJZCkgfHwgZ2V0RGVmYXVsdFN0YXRlKCk7XHJcbiAgICBcclxuICAgIC8vIFVwZGF0ZSBzdGF0ZSB3aXRoIG5ldyBwYWdlIGluZm8sIGJ1dCBwcmVzZXJ2ZSBleGlzdGluZyBhbmFseXNpcyBpZiBwYWdlIGlzIHRoZSBzYW1lXHJcbiAgICBjb25zdCBpc1NhbWVQYWdlID0gc3RhdGUucGFnZUluZm8/LnVybCA9PT0gcGFnZUluZm8uZGF0YS51cmw7XHJcbiAgICBcclxuICAgIHN0YXRlID0ge1xyXG4gICAgICAuLi5zdGF0ZSxcclxuICAgICAgcGFnZUluZm86IHBhZ2VJbmZvLmRhdGEsXHJcbiAgICAgIHNob3dCdXR0b246IHRydWUsXHJcbiAgICAgIGFuYWx5c2lzOiBpc1NhbWVQYWdlID8gc3RhdGUuYW5hbHlzaXMgOiBbXSxcclxuICAgICAgZmFpbGVkUHJvdmlkZXJzOiBpc1NhbWVQYWdlID8gc3RhdGUuZmFpbGVkUHJvdmlkZXJzIDogW10sXHJcbiAgICAgIGhhc0F0dGVtcHRlZEFuYWx5c2lzOiBmYWxzZVxyXG4gICAgfTtcclxuICAgIFxyXG4gICAgYXdhaXQgc2F2ZVRhYlN0YXRlKHRhYklkLCBzdGF0ZSk7XHJcbiAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBwYWdlSW5mby5kYXRhIH0pO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBnZXR0aW5nIHBhZ2UgaW5mbzonLCBlcnJvcik7XHJcbiAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdGYWlsZWQgdG8gZmV0Y2ggcGFnZSBpbmZvJyB9KTtcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVBbmFseXplQXJ0aWNsZShtZXNzYWdlOiBhbnksIHNlbmRlcjogYW55LCBzZW5kUmVzcG9uc2U6IChyZXNwb25zZTogYW55KSA9PiB2b2lkKSB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnNvbGUubG9nKCdbTmV3c1NjYW5dIGhhbmRsZUFuYWx5emVBcnRpY2xlIGNhbGxlZCB3aXRoOicsIG1lc3NhZ2UpO1xyXG4gICAgY29uc3QgdGFiSWQgPSBtZXNzYWdlLnRhYklkO1xyXG4gICAgaWYgKCF0YWJJZCkge1xyXG4gICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyB0YWIgSUQgcHJvdmlkZWQnIH0pO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcHJvdmlkZXJzID0gbWVzc2FnZS5wcm92aWRlcnMgfHwgW107XHJcbiAgICBjb25zb2xlLmxvZygnW05ld3NTY2FuXSBQcm92aWRlcnMgdG8gdXNlOicsIHByb3ZpZGVycyk7XHJcbiAgICBcclxuICAgIC8vIFNldCBhbmFseXppbmcgc3RhdGUgZm9yIHRoaXMgdGFiXHJcbiAgICBsZXQgY3VycmVudFN0YXRlID0gYXdhaXQgZ2V0VGFiU3RhdGUodGFiSWQpIHx8IGdldERlZmF1bHRTdGF0ZSgpO1xyXG4gICAgY3VycmVudFN0YXRlLmlzQW5hbHl6aW5nID0gdHJ1ZTtcclxuICAgIGF3YWl0IHNhdmVUYWJTdGF0ZSh0YWJJZCwgY3VycmVudFN0YXRlKTtcclxuICAgIFxyXG4gICAgLy8gQ3JlYXRlIGluZGl2aWR1YWwgcHJvbWlzZXMgdGhhdCBzZW5kIHVwZGF0ZXMgYXMgdGhleSBjb21wbGV0ZVxyXG4gICAgY29uc3QgcHJvdmlkZXJQcm9taXNlcyA9IHByb3ZpZGVycy5tYXAoYXN5bmMgKHByb3ZpZGVyOiBzdHJpbmcpID0+IHtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICBsZXQgcmVzdWx0O1xyXG4gICAgICAgIHN3aXRjaCAocHJvdmlkZXIpIHtcclxuICAgICAgICAgIGNhc2UgJ09wZW5BSSc6XHJcbiAgICAgICAgICAgIHJlc3VsdCA9IGF3YWl0IGZldGNoT3BlbkFJKG1lc3NhZ2UuY29udGVudCwgaW1wb3J0Lm1ldGEuZW52LlZJVEVfT1BFTkFJX0FQSV9LRVkgfHwgJycpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIGNhc2UgJ0dlbWluaSc6XHJcbiAgICAgICAgICAgIHJlc3VsdCA9IGF3YWl0IGZldGNoR2VtaW5pKG1lc3NhZ2UuY29udGVudCwgaW1wb3J0Lm1ldGEuZW52LlZJVEVfR0VNSU5JX0FQSV9LRVkgfHwgJycpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIGNhc2UgJ0NvaGVyZSc6XHJcbiAgICAgICAgICAgIHJlc3VsdCA9IGF3YWl0IGZldGNoQ29oZXJlKG1lc3NhZ2UuY29udGVudCwgaW1wb3J0Lm1ldGEuZW52LlZJVEVfQ09IRVJFX0FQSV9LRVkgfHwgJycpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBwcm92aWRlcjogJHtwcm92aWRlcn1gKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gU2VuZCBzdWNjZXNzIHVwZGF0ZSBpbW1lZGlhdGVseVxyXG4gICAgICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHtcclxuICAgICAgICAgIHR5cGU6ICdQUk9WSURFUl9VUERBVEUnLFxyXG4gICAgICAgICAgcHJvdmlkZXI6IHByb3ZpZGVyLFxyXG4gICAgICAgICAgc3RhdHVzOiAnY29tcGxldGUnXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBpbiBwcm92aWRlciAke3Byb3ZpZGVyfTpgLCBlcnJvcik7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gU2VuZCBmYWlsdXJlIHVwZGF0ZSBpbW1lZGlhdGVseVxyXG4gICAgICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHtcclxuICAgICAgICAgIHR5cGU6ICdQUk9WSURFUl9VUERBVEUnLFxyXG4gICAgICAgICAgcHJvdmlkZXI6IHByb3ZpZGVyLFxyXG4gICAgICAgICAgc3RhdHVzOiAnZmFpbGVkJ1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgUHJvbWlzZS5hbGxTZXR0bGVkKHByb3ZpZGVyUHJvbWlzZXMpO1xyXG5cclxuICAgIC8vIFByb2Nlc3MgcmVzdWx0c1xyXG4gICAgY29uc3QgeyBzdWNjZXNzZnVsUmVzdWx0cywgZmFpbGVkUHJvdmlkZXJzIH0gPSBwcm9jZXNzQW5hbHlzaXNSZXN1bHRzKHJlc3VsdHMsIHByb3ZpZGVycyk7XHJcblxyXG4gICAgLy8gVXBkYXRlIHRhYiBzdGF0ZSB3aXRoIGFuYWx5c2lzIHJlc3VsdHNcclxuICAgIGxldCBzdGF0ZSA9IGF3YWl0IGdldFRhYlN0YXRlKHRhYklkKTtcclxuICAgIGlmICghc3RhdGUpIHtcclxuICAgICAgY29uc29sZS53YXJuKCdObyBleGlzdGluZyB0YWIgc3RhdGUgZm91bmQgZHVyaW5nIGFuYWx5c2lzJyk7XHJcbiAgICAgIHN0YXRlID0gZ2V0RGVmYXVsdFN0YXRlKCk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHN0YXRlLmFuYWx5c2lzID0gc3VjY2Vzc2Z1bFJlc3VsdHM7XHJcbiAgICBzdGF0ZS5mYWlsZWRQcm92aWRlcnMgPSBmYWlsZWRQcm92aWRlcnM7XHJcbiAgICBzdGF0ZS5zaG93QnV0dG9uID0gZmFsc2U7XHJcbiAgICBzdGF0ZS5pc0FuYWx5emluZyA9IGZhbHNlO1xyXG4gICAgc3RhdGUuaGFzQXR0ZW1wdGVkQW5hbHlzaXMgPSB0cnVlO1xyXG4gICAgXHJcbiAgICBhd2FpdCBzYXZlVGFiU3RhdGUodGFiSWQsIHN0YXRlKTtcclxuICAgIFxyXG4gICAgc2VuZFJlc3BvbnNlKHtcclxuICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgZGF0YToge1xyXG4gICAgICAgIHN1Y2Nlc3NmdWxSZXN1bHRzLFxyXG4gICAgICAgIGZhaWxlZFByb3ZpZGVyc1xyXG4gICAgICB9LFxyXG4gICAgICBwcm92aWRlcnM6IHByb3ZpZGVyc1xyXG4gICAgfSk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGluIGFuYWx5emUgYXJ0aWNsZTonLCBlcnJvcik7XHJcbiAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdGYWlsZWQgdG8gYW5hbHl6ZSBhcnRpY2xlJyB9KTtcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVHZXRUYWJTdGF0ZShtZXNzYWdlOiBhbnksIHNlbmRlcjogYW55LCBzZW5kUmVzcG9uc2U6IChyZXNwb25zZTogYW55KSA9PiB2b2lkKSB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHRhYklkID0gbWVzc2FnZS50YWJJZCB8fCBzZW5kZXIudGFiPy5pZDtcclxuICAgIGlmICghdGFiSWQpIHtcclxuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gdGFiIElEIGZvdW5kJyB9KTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIElmIFVSTCBpcyBwcm92aWRlZCwgc2VhcmNoIGZvciBleGlzdGluZyBhbmFseXNpcyBmb3IgdGhhdCBVUkxcclxuICAgIGlmIChtZXNzYWdlLnVybCkge1xyXG4gICAgICAvLyBGaXJzdCBjaGVjayBVUkwtYmFzZWQgc3RvcmFnZVxyXG4gICAgICBjb25zdCB1cmxBbmFseXNpcyA9IGdldFVybEFuYWx5c2lzKG1lc3NhZ2UudXJsKTtcclxuICAgICAgXHJcbiAgICAgIGlmICh1cmxBbmFseXNpcykge1xyXG4gICAgICAgIGNvbnN0IHN0YXRlID0ge1xyXG4gICAgICAgICAgcGFnZUluZm86IHVybEFuYWx5c2lzLnBhZ2VJbmZvLFxyXG4gICAgICAgICAgYW5hbHlzaXM6IHVybEFuYWx5c2lzLmFuYWx5c2lzLFxyXG4gICAgICAgICAgZmFpbGVkUHJvdmlkZXJzOiB1cmxBbmFseXNpcy5mYWlsZWRQcm92aWRlcnMsXHJcbiAgICAgICAgICBzaG93QnV0dG9uOiBmYWxzZSxcclxuICAgICAgICAgIGlzQW5hbHl6aW5nOiBmYWxzZSxcclxuICAgICAgICAgIGhhc0F0dGVtcHRlZEFuYWx5c2lzOiB0cnVlLFxyXG4gICAgICAgICAgaXNWaWV3aW5nRnJvbVJlY2VudDogdHJ1ZSxcclxuICAgICAgICAgIG9yaWdpbmFsVGFiSWQ6IHVuZGVmaW5lZFxyXG4gICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gU2F2ZSB0aGlzIHN0YXRlIGZvciB0aGUgY3VycmVudCB0YWJcclxuICAgICAgICBhd2FpdCBzYXZlVGFiU3RhdGUodGFiSWQsIHN0YXRlKTtcclxuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBzdGF0ZSB9KTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vIEZhbGxiYWNrOiBzZWFyY2ggdGhyb3VnaCBhbGwgdGFiIHN0YXRlcyB0byBmaW5kIGFuYWx5c2lzIGZvciB0aGlzIFVSTFxyXG4gICAgICBjb25zdCB0YWJTdGF0ZXNEYXRhID0gYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KCd0YWJTdGF0ZXMnKTtcclxuICAgICAgY29uc3QgdGFiU3RhdGVzT2JqID0gdGFiU3RhdGVzRGF0YS50YWJTdGF0ZXMgfHwge307XHJcbiAgICAgIFxyXG4gICAgICBmb3IgKGNvbnN0IFt0SWQsIHN0YXRlXSBvZiBPYmplY3QuZW50cmllcyh0YWJTdGF0ZXNPYmopKSB7XHJcbiAgICAgICAgY29uc3QgdGFiU3RhdGUgPSBzdGF0ZSBhcyBhbnk7XHJcbiAgICAgICAgaWYgKHRhYlN0YXRlLnBhZ2VJbmZvPy51cmwgPT09IG1lc3NhZ2UudXJsICYmIHRhYlN0YXRlLmFuYWx5c2lzICYmIHRhYlN0YXRlLmFuYWx5c2lzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHRhYlN0YXRlIH0pO1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gTm8gZXhpc3RpbmcgYW5hbHlzaXMgZm91bmQgZm9yIHRoaXMgVVJMXHJcbiAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IGdldERlZmF1bHRTdGF0ZSgpIH0pO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIE90aGVyd2lzZSwgZ2V0IHN0YXRlIGZvciB0aGUgY3VycmVudCB0YWJcclxuICAgIGNvbnN0IHN0YXRlID0gYXdhaXQgZ2V0VGFiU3RhdGUodGFiSWQpIHx8IGdldERlZmF1bHRTdGF0ZSgpO1xyXG4gICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogc3RhdGUgfSk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGluIEdFVF9UQUJfU1RBVEU6JywgZXJyb3IpO1xyXG4gICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnRmFpbGVkIHRvIGdldCB0YWIgc3RhdGUnIH0pO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZVJlc2V0VGFiU3RhdGUobWVzc2FnZTogYW55LCBzZW5kZXI6IGFueSwgc2VuZFJlc3BvbnNlOiAocmVzcG9uc2U6IGFueSkgPT4gdm9pZCkge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCB0YWJJZCA9IG1lc3NhZ2UudGFiSWQgfHwgc2VuZGVyLnRhYj8uaWQ7XHJcbiAgICBpZiAoIXRhYklkKSB7XHJcbiAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIHRhYiBJRCBmb3VuZCcgfSk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDbGVhciB0aGUgc3RhdGUgY29tcGxldGVseVxyXG4gICAgYXdhaXQgZGVsZXRlVGFiU3RhdGUodGFiSWQpO1xyXG4gICAgXHJcbiAgICAvLyBJbml0aWFsaXplIHdpdGggZGVmYXVsdCBzdGF0ZVxyXG4gICAgY29uc3QgZGVmYXVsdFN0YXRlID0gZ2V0RGVmYXVsdFN0YXRlKCk7XHJcbiAgICBhd2FpdCBzYXZlVGFiU3RhdGUodGFiSWQsIGRlZmF1bHRTdGF0ZSk7XHJcbiAgICBcclxuICAgIC8vIE5vdGlmeSBvdGhlciBpbnN0YW5jZXMgb2YgdGhlIHNpZGVwYW5lbCBhYm91dCB0aGUgcmVzZXRcclxuICAgIGNocm9tZS50YWJzLnNlbmRNZXNzYWdlKHRhYklkLCB7XHJcbiAgICAgIHR5cGU6ICdUQUJfU1dJVENIRUQnLFxyXG4gICAgICBzdGF0ZTogZGVmYXVsdFN0YXRlXHJcbiAgICB9KS5jYXRjaCgoKSA9PiB7XHJcbiAgICAgIC8vIElnbm9yZSBlcnJvcnMgaWYgY29udGVudCBzY3JpcHQgaXNuJ3QgcmVhZHlcclxuICAgIH0pO1xyXG4gICAgXHJcbiAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlIH0pO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciByZXNldHRpbmcgdGFiIHN0YXRlOicsIGVycm9yKTtcclxuICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0ZhaWxlZCB0byByZXNldCB0YWIgc3RhdGUnIH0pO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZVNhdmVUYWJTdGF0ZShtZXNzYWdlOiBhbnksIHNlbmRlcjogYW55LCBzZW5kUmVzcG9uc2U6IChyZXNwb25zZTogYW55KSA9PiB2b2lkKSB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHRhYklkID0gbWVzc2FnZS50YWJJZCB8fCBzZW5kZXIudGFiPy5pZDtcclxuICAgIGlmICghdGFiSWQpIHtcclxuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gdGFiIElEIGF2YWlsYWJsZSB0byBzYXZlIHN0YXRlJyB9KTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFNhdmUgdGhlIHByb3ZpZGVkIHN0YXRlIGZvciB0aGlzIHRhYlxyXG4gICAgYXdhaXQgc2F2ZVRhYlN0YXRlKHRhYklkLCB7XHJcbiAgICAgIHBhZ2VJbmZvOiBtZXNzYWdlLmRhdGEucGFnZUluZm8sXHJcbiAgICAgIGFuYWx5c2lzOiBtZXNzYWdlLmRhdGEuYW5hbHlzaXMsXHJcbiAgICAgIGZhaWxlZFByb3ZpZGVyczogbWVzc2FnZS5kYXRhLmZhaWxlZFByb3ZpZGVycyxcclxuICAgICAgc2hvd0J1dHRvbjogbWVzc2FnZS5kYXRhLnNob3dCdXR0b24sXHJcbiAgICAgIGlzQW5hbHl6aW5nOiBtZXNzYWdlLmRhdGEuaXNBbmFseXppbmcgfHwgZmFsc2UsXHJcbiAgICAgIGhhc0F0dGVtcHRlZEFuYWx5c2lzOiBtZXNzYWdlLmRhdGEuaGFzQXR0ZW1wdGVkQW5hbHlzaXMgfHwgZmFsc2UsXHJcbiAgICAgIGlzVmlld2luZ0Zyb21SZWNlbnQ6IG1lc3NhZ2UuZGF0YS5pc1ZpZXdpbmdGcm9tUmVjZW50IHx8IGZhbHNlLFxyXG4gICAgICBvcmlnaW5hbFRhYklkOiBtZXNzYWdlLmRhdGEub3JpZ2luYWxUYWJJZFxyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIC8vIEFsc28gc2F2ZSB0byBVUkwtYmFzZWQgc3RvcmFnZSBpZiB3ZSBoYXZlIGFuYWx5c2lzXHJcbiAgICBpZiAobWVzc2FnZS5kYXRhLnBhZ2VJbmZvPy51cmwgJiYgbWVzc2FnZS5kYXRhLmFuYWx5c2lzICYmIG1lc3NhZ2UuZGF0YS5hbmFseXNpcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgIHNldFVybEFuYWx5c2lzKG1lc3NhZ2UuZGF0YS5wYWdlSW5mby51cmwsIHtcclxuICAgICAgICBwYWdlSW5mbzogbWVzc2FnZS5kYXRhLnBhZ2VJbmZvLFxyXG4gICAgICAgIGFuYWx5c2lzOiBtZXNzYWdlLmRhdGEuYW5hbHlzaXMsXHJcbiAgICAgICAgZmFpbGVkUHJvdmlkZXJzOiBtZXNzYWdlLmRhdGEuZmFpbGVkUHJvdmlkZXJzLFxyXG4gICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSB9KTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnRmFpbGVkIHRvIHNhdmUgdGFiIHN0YXRlJyB9KTtcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVXZWJTZWFyY2gobWVzc2FnZTogYW55LCBzZW5kZXI6IGFueSwgc2VuZFJlc3BvbnNlOiAocmVzcG9uc2U6IGFueSkgPT4gdm9pZCkge1xyXG4gIHRyeSB7XHJcbiAgICAvLyBDb21iaW5lIHRoZSBxdWVyeSB3aXRoIHRoZSBvcmlnaW5hbCBVUkwgdG8gZXh0cmFjdCB5ZWFyIGluZm9ybWF0aW9uXHJcbiAgICBjb25zdCBzZWFyY2hRdWVyeSA9IG1lc3NhZ2Uub3JpZ2luYWxVcmwgPyBgJHttZXNzYWdlLnF1ZXJ5fSAke21lc3NhZ2Uub3JpZ2luYWxVcmx9YCA6IG1lc3NhZ2UucXVlcnk7XHJcbiAgICBcclxuICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBwZXJmb3JtV2ViU2VhcmNoKHNlYXJjaFF1ZXJ5LCBtZXNzYWdlLm1heF9yZXN1bHRzKTtcclxuICAgIHNlbmRSZXNwb25zZSh7IFxyXG4gICAgICBzdWNjZXNzOiB0cnVlLCBcclxuICAgICAgZGF0YTogeyByZXN1bHRzIH0gXHJcbiAgICB9KTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignV2ViIHNlYXJjaCBlcnJvcjonLCBlcnJvcik7XHJcbiAgICBzZW5kUmVzcG9uc2UoeyBcclxuICAgICAgc3VjY2VzczogZmFsc2UsIFxyXG4gICAgICBlcnJvcjogJ0ZhaWxlZCB0byBwZXJmb3JtIHdlYiBzZWFyY2gnIFxyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlTG9hZEFuYWx5c2lzSW5UYWIobWVzc2FnZTogYW55LCBzZW5kZXI6IGFueSwgc2VuZFJlc3BvbnNlOiAocmVzcG9uc2U6IGFueSkgPT4gdm9pZCkge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCB0YWJJZCA9IG1lc3NhZ2UudGFiSWQ7XHJcbiAgICBjb25zdCBhbmFseXNpc0RhdGEgPSBtZXNzYWdlLmFuYWx5c2lzRGF0YTtcclxuXHJcbiAgICAvLyBQcmV2ZW50IGRvdWJsZSBleGVjdXRpb25cclxuICAgIGlmIChpc1RhYkJlaW5nU2V0dXAodGFiSWQpKSB7XHJcbiAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ1RhYiBhbHJlYWR5IGJlaW5nIHNldCB1cCcgfSk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gTWFyayB0aGlzIHRhYiBhcyBiZWluZyBzZXQgdXBcclxuICAgIG1hcmtUYWJBc0JlaW5nU2V0dXAodGFiSWQpO1xyXG5cclxuICAgIC8vIFN0b3JlIHRoZSBhbmFseXNpcyBkYXRhIGZvciB0aGlzIHRhYlxyXG4gICAgY29uc3QgbmV3U3RhdGUgPSB7XHJcbiAgICAgIHBhZ2VJbmZvOiBhbmFseXNpc0RhdGEucGFnZUluZm8sXHJcbiAgICAgIGFuYWx5c2lzOiBhbmFseXNpc0RhdGEuYW5hbHlzaXMsXHJcbiAgICAgIGZhaWxlZFByb3ZpZGVyczogYW5hbHlzaXNEYXRhLmZhaWxlZFByb3ZpZGVycyxcclxuICAgICAgc2hvd0J1dHRvbjogZmFsc2UsXHJcbiAgICAgIGlzQW5hbHl6aW5nOiBmYWxzZSxcclxuICAgICAgaGFzQXR0ZW1wdGVkQW5hbHlzaXM6IHRydWUsXHJcbiAgICAgIGlzVmlld2luZ0Zyb21SZWNlbnQ6IGFuYWx5c2lzRGF0YS5pc1ZpZXdpbmdGcm9tUmVjZW50IHx8IGZhbHNlLFxyXG4gICAgICBvcmlnaW5hbFRhYklkOiBhbmFseXNpc0RhdGEub3JpZ2luYWxUYWJJZFxyXG4gICAgfTtcclxuICAgIFxyXG4gICAgYXdhaXQgc2F2ZVRhYlN0YXRlKHRhYklkLCBuZXdTdGF0ZSk7XHJcblxyXG4gICAgLy8gQWxzbyBzdG9yZSBpbiBVUkwtYmFzZWQgc3RvcmFnZVxyXG4gICAgaWYgKGFuYWx5c2lzRGF0YS5wYWdlSW5mbz8udXJsKSB7XHJcbiAgICAgIHNldFVybEFuYWx5c2lzKGFuYWx5c2lzRGF0YS5wYWdlSW5mby51cmwsIHtcclxuICAgICAgICBwYWdlSW5mbzogYW5hbHlzaXNEYXRhLnBhZ2VJbmZvLFxyXG4gICAgICAgIGFuYWx5c2lzOiBhbmFseXNpc0RhdGEuYW5hbHlzaXMsXHJcbiAgICAgICAgZmFpbGVkUHJvdmlkZXJzOiBhbmFseXNpc0RhdGEuZmFpbGVkUHJvdmlkZXJzLFxyXG4gICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBNYXJrIHRoaXMgdGFiIGFzIGhhdmluZyBwcmUtbG9hZGVkIGFuYWx5c2lzIHRvIHByZXZlbnQgaW50ZXJmZXJlbmNlXHJcbiAgICBhd2FpdCBzYXZlVGFiU3RhdGUodGFiSWQsIHtcclxuICAgICAgLi4ubmV3U3RhdGUsXHJcbiAgICAgIGhhc1ByZWxvYWRlZEFuYWx5c2lzOiB0cnVlXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBXYWl0IGZvciBwYWdlIHRvIGxvYWQsIHRoZW4gaW5qZWN0IGNvbnRlbnQgc2NyaXB0IGFuZCBvcGVuIHNpZGViYXIgaW4gb25lIHN0ZXBcclxuICAgIHNldFRpbWVvdXQoYXN5bmMgKCkgPT4ge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIC8vIENoZWNrIGlmIGNvbnRlbnQgc2NyaXB0IGlzIGFscmVhZHkgaW5qZWN0ZWRcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgYXdhaXQgY2hyb21lLnRhYnMuc2VuZE1lc3NhZ2UodGFiSWQsIHsgdHlwZTogJ0ZOUl9QSU5HJyB9KTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgLy8gSW5qZWN0IGNvbnRlbnQgc2NyaXB0IGZpcnN0XHJcbiAgICAgICAgICBhd2FpdCBjaHJvbWUuc2NyaXB0aW5nLmV4ZWN1dGVTY3JpcHQoe1xyXG4gICAgICAgICAgICB0YXJnZXQ6IHsgdGFiSWQ6IHRhYklkIH0sXHJcbiAgICAgICAgICAgIGZpbGVzOiBbJ2NvbnRlbnQtc2NyaXB0cy9jb250ZW50LmpzJ10sXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gU21hbGwgZGVsYXkgdG8gZW5zdXJlIGNvbnRlbnQgc2NyaXB0IGlzIHJlYWR5LCB0aGVuIG9wZW4gc2lkZWJhclxyXG4gICAgICAgIHNldFRpbWVvdXQoYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGFiIHN0aWxsIGV4aXN0cyBiZWZvcmUgc2VuZGluZyBtZXNzYWdlXHJcbiAgICAgICAgICAgIGNvbnN0IHRhYiA9IGF3YWl0IGNocm9tZS50YWJzLmdldCh0YWJJZCk7XHJcbiAgICAgICAgICAgIGlmICghdGFiKSB7XHJcbiAgICAgICAgICAgICAgdW5tYXJrVGFiQXNCZWluZ1NldHVwKHRhYklkKTtcclxuICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdUYWIgbm8gbG9uZ2VyIGV4aXN0cycgfSk7XHJcbiAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGlzIGEgaGlzdG9yeSB2aWV3IC0gaWYgc28sIHdlIFNIT1VMRCBvcGVuIHRoZSBzaWRlYmFyXHJcbiAgICAgICAgICAgIGlmIChuZXdTdGF0ZS5pc1ZpZXdpbmdGcm9tUmVjZW50KSB7XHJcbiAgICAgICAgICAgICAgY2hyb21lLnRhYnMuc2VuZE1lc3NhZ2UodGFiSWQsIHsgXHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnVE9HR0xFX0lOSkVDVEVEX1NJREVCQVInLFxyXG4gICAgICAgICAgICAgICAga2VlcE9wZW46IHRydWUsXHJcbiAgICAgICAgICAgICAgICBwcmVsb2FkZWRBbmFseXNpczogbmV3U3RhdGVcclxuICAgICAgICAgICAgICB9LCAocmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgdW5tYXJrVGFiQXNCZWluZ1NldHVwKHRhYklkKTtcclxuICAgICAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBjaHJvbWUucnVudGltZS5sYXN0RXJyb3IubWVzc2FnZSB9KTtcclxuICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdW5tYXJrVGFiQXNCZWluZ1NldHVwKHRhYklkKTtcclxuICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgLy8gSnVzdCBzYXZlIHRoZSBhbmFseXNpcyBkYXRhIHdpdGhvdXQgb3BlbmluZyBzaWRlYmFyXHJcbiAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSB9KTtcclxuICAgICAgICAgICAgICB1bm1hcmtUYWJBc0JlaW5nU2V0dXAodGFiSWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICB1bm1hcmtUYWJBc0JlaW5nU2V0dXAodGFiSWQpO1xyXG4gICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdGYWlsZWQgdG8gb3BlbiBzaWRlYmFyJyB9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9LCAyMDApO1xyXG4gICAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBzZXR0aW5nIHVwIGFuYWx5c2lzIHRhYjonLCBlcnIpO1xyXG4gICAgICAgIHVubWFya1RhYkFzQmVpbmdTZXR1cCh0YWJJZCk7XHJcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnRmFpbGVkIHRvIHNldHVwIGFuYWx5c2lzIHRhYicgfSk7XHJcbiAgICAgIH1cclxuICAgIH0sIDEwMDApO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBpbiBMT0FEX0FOQUxZU0lTX0lOX1RBQjonLCBlcnJvcik7XHJcbiAgICB1bm1hcmtUYWJBc0JlaW5nU2V0dXAodGFiSWQpO1xyXG4gICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnRmFpbGVkIHRvIGxvYWQgYW5hbHlzaXMgaW4gdGFiJyB9KTtcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVOYXZpZ2F0ZUFuZFJlb3BlblNpZGViYXIobWVzc2FnZTogYW55LCBzZW5kZXI6IGFueSwgc2VuZFJlc3BvbnNlOiAocmVzcG9uc2U6IGFueSkgPT4gdm9pZCkge1xyXG4gIHRyeSB7XHJcbiAgICAvLyBDcmVhdGUgYSBuZXcgdGFiIHdpdGggdGhlIFVSTFxyXG4gICAgY29uc3QgbmV3VGFiID0gYXdhaXQgY2hyb21lLnRhYnMuY3JlYXRlKHsgdXJsOiBtZXNzYWdlLnVybCB9KTtcclxuICAgIGlmICghbmV3VGFiLmlkKSB7XHJcbiAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0ZhaWxlZCB0byBjcmVhdGUgbmV3IHRhYicgfSk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB0YWJJZCA9IG5ld1RhYi5pZDtcclxuXHJcbiAgICAvLyBXYWl0IGZvciBwYWdlIHRvIGxvYWQsIHRoZW4gaW5qZWN0IGNvbnRlbnQgc2NyaXB0IGFuZCBvcGVuIHNpZGViYXJcclxuICAgIHNldFRpbWVvdXQoYXN5bmMgKCkgPT4ge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIC8vIEluamVjdCBjb250ZW50IHNjcmlwdFxyXG4gICAgICAgIGF3YWl0IGNocm9tZS5zY3JpcHRpbmcuZXhlY3V0ZVNjcmlwdCh7XHJcbiAgICAgICAgICB0YXJnZXQ6IHsgdGFiSWQ6IHRhYklkIH0sXHJcbiAgICAgICAgICBmaWxlczogWydjb250ZW50LXNjcmlwdHMvY29udGVudC5qcyddLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFdhaXQgZm9yIGNvbnRlbnQgc2NyaXB0IHRvIGJlIHJlYWR5XHJcbiAgICAgICAgY29uc3Qgd2FpdEZvckNvbnRlbnRTY3JpcHQgPSAoKSA9PiB7XHJcbiAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCB0aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignQ29udGVudCBzY3JpcHQgbm90IHJlYWR5IGFmdGVyIDUgc2Vjb25kcycpKTtcclxuICAgICAgICAgICAgfSwgNTAwMCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjaHJvbWUudGFicy5zZW5kTWVzc2FnZSh0YWJJZCwgeyB0eXBlOiAnRk5SX1BJTkcnIH0sIChyZXNwb25zZSkgPT4ge1xyXG4gICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcclxuICAgICAgICAgICAgICBpZiAoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlKSk7XHJcbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZT8ub2spIHtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XHJcbiAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ0NvbnRlbnQgc2NyaXB0IG5vdCByZXNwb25kaW5nJykpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIGF3YWl0IHdhaXRGb3JDb250ZW50U2NyaXB0KCk7XHJcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSB9KTtcclxuICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgaW4gc2lkZWJhciBzZXR1cDonLCBlcnIpO1xyXG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJyB9KTtcclxuICAgICAgfVxyXG4gICAgfSwgMTAwMCk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGluIE5BVklHQVRFX0FORF9SRU9QRU5fU0lERUJBUjonLCBlcnJvcik7XHJcbiAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdOYXZpZ2F0aW9uIGZhaWxlZCcgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlUHJlbG9hZFVybEFuYWx5c2lzKG1lc3NhZ2U6IGFueSwgc2VuZGVyOiBhbnksIHNlbmRSZXNwb25zZTogKHJlc3BvbnNlOiBhbnkpID0+IHZvaWQpIHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgeyB1cmwsIHBhZ2VJbmZvLCBhbmFseXNpcywgZmFpbGVkUHJvdmlkZXJzIH0gPSBtZXNzYWdlO1xyXG4gICAgaWYgKCF1cmwgfHwgIWFuYWx5c2lzIHx8IGFuYWx5c2lzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdNaXNzaW5nIHVybCBvciBhbmFseXNpcycgfSk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gU3RvcmUgaW4gVVJMLWJhc2VkIHN0b3JhZ2VcclxuICAgIHNldFVybEFuYWx5c2lzKHVybCwge1xyXG4gICAgICBwYWdlSW5mbzogcGFnZUluZm8sXHJcbiAgICAgIGFuYWx5c2lzOiBhbmFseXNpcyxcclxuICAgICAgZmFpbGVkUHJvdmlkZXJzOiBmYWlsZWRQcm92aWRlcnMgfHwgW10sXHJcbiAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcclxuICAgIH0pO1xyXG4gICAgXHJcbiAgICAvLyBBbHNvIHN0b3JlIGluIHJlY2VudCBhbmFseXNlcyBmb3IgaGlzdG9yeVxyXG4gICAgY29uc3QgcmVjZW50RGF0YSA9IGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldCgncmVjZW50QW5hbHlzZXMnKTtcclxuICAgIGNvbnN0IHJlY2VudExpc3QgPSByZWNlbnREYXRhLnJlY2VudEFuYWx5c2VzIHx8IFtdO1xyXG4gICAgXHJcbiAgICAvLyBVcGRhdGUgZXhpc3RpbmcgZW50cnkgb3IgYWRkIG5ldyBvbmVcclxuICAgIGNvbnN0IGV4aXN0aW5nSW5kZXggPSByZWNlbnRMaXN0LmZpbmRJbmRleCgoaXRlbTogYW55KSA9PiBpdGVtLnVybCA9PT0gdXJsKTtcclxuICAgIGNvbnN0IGhpc3RvcnlFbnRyeSA9IHtcclxuICAgICAgdGl0bGU6IHBhZ2VJbmZvLnRpdGxlIHx8ICdVbmtub3duIFRpdGxlJyxcclxuICAgICAgdXJsOiB1cmwsXHJcbiAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcclxuICAgICAgc2NvcmU6IGFuYWx5c2lzWzBdPy5yZXN1bHQ/LmNyZWRpYmlsaXR5X3Njb3JlIHx8IG51bGwsXHJcbiAgICAgIGZ1bGxBbmFseXNpczogYW5hbHlzaXMsXHJcbiAgICAgIHBhZ2VJbmZvOiBwYWdlSW5mbyxcclxuICAgICAgZmFpbGVkUHJvdmlkZXJzOiBmYWlsZWRQcm92aWRlcnMgfHwgW11cclxuICAgIH07XHJcbiAgICBcclxuICAgIGlmIChleGlzdGluZ0luZGV4ID49IDApIHtcclxuICAgICAgcmVjZW50TGlzdFtleGlzdGluZ0luZGV4XSA9IGhpc3RvcnlFbnRyeTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJlY2VudExpc3QudW5zaGlmdChoaXN0b3J5RW50cnkpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvLyBLZWVwIG9ubHkgbGFzdCA1MCBlbnRyaWVzXHJcbiAgICBjb25zdCB0cmltbWVkTGlzdCA9IHJlY2VudExpc3Quc2xpY2UoMCwgNTApO1xyXG4gICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgcmVjZW50QW5hbHlzZXM6IHRyaW1tZWRMaXN0IH0pO1xyXG4gICAgXHJcbiAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlIH0pO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBpbiBQUkVMT0FEX1VSTF9BTkFMWVNJUzonLCBlcnJvcik7XHJcbiAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdGYWlsZWQgdG8gcHJlbG9hZCBhbmFseXNpcycgfSk7XHJcbiAgfVxyXG59XHJcbiIsImltcG9ydCB7IGRlZmluZUJhY2tncm91bmQgfSBmcm9tICd3eHQvdXRpbHMvZGVmaW5lLWJhY2tncm91bmQnXHJcbmltcG9ydCB7IFxyXG4gIGhhbmRsZUdldFBhZ2VJbmZvLFxyXG4gIGhhbmRsZUFuYWx5emVBcnRpY2xlLFxyXG4gIGhhbmRsZUdldFRhYlN0YXRlLFxyXG4gIGhhbmRsZVJlc2V0VGFiU3RhdGUsXHJcbiAgaGFuZGxlU2F2ZVRhYlN0YXRlLFxyXG4gIGhhbmRsZVdlYlNlYXJjaCxcclxuICBoYW5kbGVMb2FkQW5hbHlzaXNJblRhYixcclxuICBoYW5kbGVOYXZpZ2F0ZUFuZFJlb3BlblNpZGViYXIsXHJcbiAgaGFuZGxlUHJlbG9hZFVybEFuYWx5c2lzXHJcbn0gZnJvbSAnLi4vdXRpbHMvbWVzc2FnZUhhbmRsZXJzJ1xyXG5pbXBvcnQgeyBcclxuICBkZWxldGVUYWJTdGF0ZSwgXHJcbiAgY2xlYW51cFVybFN0b3JhZ2UsIFxyXG4gIGNsZWFudXBUYWJTdGF0ZXMsXHJcbiAgdW5tYXJrVGFiQXNCZWluZ1NldHVwXHJcbn0gZnJvbSAnLi4vdXRpbHMvdGFiU3RhdGUnXHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVCYWNrZ3JvdW5kKHtcclxuICBtYWluKCkge1xyXG4gICAgLy8gTGlzdGVuIGZvciBleHRlbnNpb24gaW5zdGFsbGF0aW9uXHJcbiAgICBjaHJvbWUucnVudGltZS5vbkluc3RhbGxlZC5hZGRMaXN0ZW5lcigoKSA9PiB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdFeHRlbnNpb24gaW5zdGFsbGVkJylcclxuICAgIH0pXHJcbiAgICBcclxuICAgIC8vIENsZWFudXAgVVJMIHN0b3JhZ2UgZXZlcnkgaG91clxyXG4gICAgc2V0SW50ZXJ2YWwoY2xlYW51cFVybFN0b3JhZ2UsIDYwICogNjAgKiAxMDAwKTtcclxuICAgIFxyXG4gICAgLy8gQ2xlYW51cCB0YWIgc3RhdGVzIGV2ZXJ5IDUgbWludXRlc1xyXG4gICAgc2V0SW50ZXJ2YWwoY2xlYW51cFRhYlN0YXRlcywgNSAqIDYwICogMTAwMCk7XHJcblxyXG4gICAgLy8gSGFuZGxlIGV4dGVuc2lvbiBpY29uIGNsaWNrcyB0byB0b2dnbGUgaW5qZWN0ZWQgc2lkZWJhclxyXG4gICAgY2hyb21lLmFjdGlvbi5vbkNsaWNrZWQuYWRkTGlzdGVuZXIoYXN5bmMgKCkgPT4ge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGNvbnN0IFt0YWJdID0gYXdhaXQgY2hyb21lLnRhYnMucXVlcnkoeyBhY3RpdmU6IHRydWUsIGN1cnJlbnRXaW5kb3c6IHRydWUgfSk7XHJcbiAgICAgICAgaWYgKCF0YWI/LmlkKSB7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBwaW5nID0gKHRhYklkOiBudW1iZXIpID0+XHJcbiAgICAgICAgICBuZXcgUHJvbWlzZTxib29sZWFuPigocmVzb2x2ZSkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgc2V0dGxlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgIGNocm9tZS50YWJzLnNlbmRNZXNzYWdlKHRhYklkLCB7IHR5cGU6ICdGTlJfUElORycgfSwgKHJlc3ApID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgaWYgKCFzZXR0bGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2V0dGxlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKCFzZXR0bGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgIHNldHRsZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICByZXNvbHZlKCEhcmVzcD8ub2spO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgaWYgKCFzZXR0bGVkKSB7XHJcbiAgICAgICAgICAgICAgICBzZXR0bGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoZmFsc2UpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICBpZiAoIXNldHRsZWQpIHtcclxuICAgICAgICAgICAgICAgIHNldHRsZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShmYWxzZSk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LCA0MDApO1xyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNvbnN0IHNlbmRUb2dnbGUgPSBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBhd2FpdCBjaHJvbWUudGFicy5zZW5kTWVzc2FnZSh0YWIuaWQhLCB7IHR5cGU6ICdUT0dHTEVfSU5KRUNURURfU0lERUJBUicgfSk7XHJcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdUb2dnbGUgc2VuZCBlcnJvcjonLCBlKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyBDaGVjayBpZiBjb250ZW50IHNjcmlwdCBpcyBhbHJlYWR5IGluamVjdGVkXHJcbiAgICAgICAgY29uc3QgaGFzTGlzdGVuZXIgPSBhd2FpdCBwaW5nKHRhYi5pZCk7XHJcbiAgICAgICAgaWYgKGhhc0xpc3RlbmVyKSB7XHJcbiAgICAgICAgICBhd2FpdCBzZW5kVG9nZ2xlKCk7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBJbmplY3QgY29udGVudCBzY3JpcHQgdGhlbiByZXRyeVxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICBhd2FpdCBjaHJvbWUuc2NyaXB0aW5nLmV4ZWN1dGVTY3JpcHQoe1xyXG4gICAgICAgICAgICB0YXJnZXQ6IHsgdGFiSWQ6IHRhYi5pZCB9LFxyXG4gICAgICAgICAgICBmaWxlczogWydjb250ZW50LXNjcmlwdHMvY29udGVudC5qcyddLFxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZygnRmFpbGVkIHRvIGluamVjdCBjb250ZW50IHNjcmlwdDonLCBlcnIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgaGFzTGlzdGVuZXJBZnRlciA9IGF3YWl0IHBpbmcodGFiLmlkKTtcclxuICAgICAgICBhd2FpdCBzZW5kVG9nZ2xlKCk7XHJcbiAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnRmFpbGVkIHRvIHRvZ2dsZSBpbmplY3RlZCBzaWRlYmFyOicsIGUpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBMaXN0ZW4gZm9yIHRhYiByZW1vdmFsIHRvIGNsZWFuIHVwIHN0YXRlXHJcbiAgICBjaHJvbWUudGFicy5vblJlbW92ZWQuYWRkTGlzdGVuZXIoKHRhYklkKSA9PiB7XHJcbiAgICAgIGRlbGV0ZVRhYlN0YXRlKHRhYklkKTtcclxuICAgICAgdW5tYXJrVGFiQXNCZWluZ1NldHVwKHRhYklkKTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIExpc3RlbiBmb3IgdGFiIGFjdGl2YXRpb24gdG8gaGFuZGxlIHN0YXRlIG1hbmFnZW1lbnQgd2hlbiBzd2l0Y2hpbmcgdGFic1xyXG4gICAgY2hyb21lLnRhYnMub25BY3RpdmF0ZWQuYWRkTGlzdGVuZXIoYXN5bmMgKGFjdGl2ZUluZm8pID0+IHtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICAvLyBTZW5kIGEgbWVzc2FnZSB0byB0aGUgc2lkZWJhciB0byB1cGRhdGUgaXRzIHN0YXRlXHJcbiAgICAgICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2Uoe1xyXG4gICAgICAgICAgdHlwZTogJ1RBQl9TV0lUQ0hFRCcsXHJcbiAgICAgICAgICB0YWJJZDogYWN0aXZlSW5mby50YWJJZCxcclxuICAgICAgICB9KS5jYXRjaCgoKSA9PiB7XHJcbiAgICAgICAgICAvLyBJZ25vcmUgZXJyb3JzIGlmIHNpZGViYXIgaXMgbm90IG9wZW5cclxuICAgICAgICB9KTtcclxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnRXJyb3IgaGFuZGxpbmcgdGFiIHN3aXRjaDonLCBlcnJvcik7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE1lc3NhZ2UgaGFuZGxlclxyXG4gICAgY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKChtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSkgPT4ge1xyXG4gICAgICBjb25zdCBtZXNzYWdlVHlwZSA9IG1lc3NhZ2UudHlwZTtcclxuXHJcbiAgICAgIHN3aXRjaCAobWVzc2FnZVR5cGUpIHtcclxuICAgICAgICBjYXNlICdHRVRfUEFHRV9JTkZPJzpcclxuICAgICAgICAgIGhhbmRsZUdldFBhZ2VJbmZvKG1lc3NhZ2UsIHNlbmRlciwgc2VuZFJlc3BvbnNlKTtcclxuICAgICAgICAgIHJldHVybiB0cnVlO1xyXG5cclxuICAgICAgICBjYXNlICdBTkFMWVpFX0FSVElDTEUnOlxyXG4gICAgICAgICAgaGFuZGxlQW5hbHl6ZUFydGljbGUobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpO1xyXG4gICAgICAgICAgcmV0dXJuIHRydWU7XHJcblxyXG4gICAgICAgIGNhc2UgJ0dFVF9UQUJfU1RBVEUnOlxyXG4gICAgICAgICAgaGFuZGxlR2V0VGFiU3RhdGUobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpO1xyXG4gICAgICAgICAgcmV0dXJuIHRydWU7XHJcblxyXG4gICAgICAgIGNhc2UgJ1JFU0VUX1RBQl9TVEFURSc6XHJcbiAgICAgICAgICBoYW5kbGVSZXNldFRhYlN0YXRlKG1lc3NhZ2UsIHNlbmRlciwgc2VuZFJlc3BvbnNlKTtcclxuICAgICAgICAgIHJldHVybiB0cnVlO1xyXG5cclxuICAgICAgICBjYXNlICdTQVZFX1RBQl9TVEFURSc6XHJcbiAgICAgICAgICBoYW5kbGVTYXZlVGFiU3RhdGUobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpO1xyXG4gICAgICAgICAgcmV0dXJuIHRydWU7XHJcblxyXG4gICAgICAgIGNhc2UgJ1dFQl9TRUFSQ0gnOlxyXG4gICAgICAgICAgaGFuZGxlV2ViU2VhcmNoKG1lc3NhZ2UsIHNlbmRlciwgc2VuZFJlc3BvbnNlKTtcclxuICAgICAgICAgIHJldHVybiB0cnVlO1xyXG5cclxuICAgICAgICBjYXNlICdUQUJfU1dJVENIRUQnOlxyXG4gICAgICAgICAgLy8gVGhpcyBtZXNzYWdlIGlzIHNlbnQgZnJvbSB0aGUgYmFja2dyb3VuZCBzY3JpcHQgdG8gdGhlIHNpZGViYXJcclxuICAgICAgICAgIHJldHVybiB0cnVlO1xyXG5cclxuICAgICAgICBjYXNlICdMT0FEX0FOQUxZU0lTX0lOX1RBQic6XHJcbiAgICAgICAgICBoYW5kbGVMb2FkQW5hbHlzaXNJblRhYihtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSk7XHJcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuXHJcbiAgICAgICAgY2FzZSAnTkFWSUdBVEVfQU5EX1JFT1BFTl9TSURFQkFSJzpcclxuICAgICAgICAgIGhhbmRsZU5hdmlnYXRlQW5kUmVvcGVuU2lkZWJhcihtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSk7XHJcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuXHJcbiAgICAgICAgY2FzZSAnUFJFTE9BRF9VUkxfQU5BTFlTSVMnOlxyXG4gICAgICAgICAgaGFuZGxlUHJlbG9hZFVybEFuYWx5c2lzKG1lc3NhZ2UsIHNlbmRlciwgc2VuZFJlc3BvbnNlKTtcclxuICAgICAgICAgIHJldHVybiB0cnVlO1xyXG5cclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEhhbmRsZSB0YWIgdXBkYXRlcyB3aXRoIHNpbXBsaWZpZWQgbG9naWNcclxuICAgIGNocm9tZS50YWJzLm9uVXBkYXRlZC5hZGRMaXN0ZW5lcihhc3luYyAodGFiSWQsIGNoYW5nZUluZm8sIHRhYikgPT4ge1xyXG4gICAgICBpZiAoY2hhbmdlSW5mby5zdGF0dXMgPT09ICdjb21wbGV0ZScgJiYgdGFiLnVybCkge1xyXG4gICAgICAgIC8vIEJhc2ljIHRhYiBjb21wbGV0aW9uIGhhbmRsaW5nIC0gZGV0YWlsZWQgbG9naWMgbW92ZWQgdG8gbWVzc2FnZUhhbmRsZXJzXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgIC8vIFNtYWxsIGRlbGF5IHRvIHByZXZlbnQgaW50ZXJmZXJlbmNlXHJcbiAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwMCkpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBpbiB0YWIgdXBkYXRlIGhhbmRsZXI6JywgZXJyb3IpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG59KTtcclxuIl0sIm5hbWVzIjpbInJlc3VsdCIsInRhYklkIiwiZSIsInN0YXRlIl0sIm1hcHBpbmdzIjoiOztBQUFPLFdBQVMsaUJBQWlCLEtBQUs7QUFDcEMsUUFBSSxPQUFPLFFBQVEsT0FBTyxRQUFRLFdBQVksUUFBTyxFQUFFLE1BQU0sSUFBSztBQUNsRSxX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QTtBQUVGLGlCQUFPLFFBQVEsWUFBWTtBQUFBLFlBQ3pCLE1BQU07QUFBQSxZQUNOLE9BQU8sV0FBVztBQUFBLFVBQUEsQ0FDbkIsRUFBRSxNQUFNLE1BQU07QUFBQSxVQUFBLENBRWQ7QUFBQSxpQkFDTSxPQUFPO0FBQ04sa0JBQUEsSUFBSSw4QkFBOEIsS0FBSztBQUFBLFFBQUE7QUFBQSxNQUNqRCxDQUNEO0FBR0QsYUFBTyxRQUFRLFVBQVUsWUFBWSxDQUFDLFNBQVMsUUFBUSxpQkFBaUI7QUFDdEUsY0FBTSxjQUFjLFFBQVE7QUFFNUIsZ0JBQVEsYUFBYTtBQUFBLFVBQ25CLEtBQUs7QUFDZSw4QkFBQSxTQUFTLFFBQVEsWUFBWTtBQUN4QyxtQkFBQTtBQUFBLFVBRVQsS0FBSztBQUNrQixpQ0FBQSxTQUFTLFFBQVEsWUFBWTtBQUMzQyxtQkFBQTtBQUFBLFVBRVQsS0FBSztBQUNlLDhCQUFBLFNBQVMsUUFBUSxZQUFZO0FBQ3hDLG1CQUFBO0FBQUEsVUFFVCxLQUFLO0FBQ2lCLGdDQUFBLFNBQVMsUUFBUSxZQUFZO0FBQzFDLG1CQUFBO0FBQUEsVUFFVCxLQUFLO0FBQ2dCLCtCQUFBLFNBQVMsUUFBUSxZQUFZO0FBQ3pDLG1CQUFBO0FBQUEsVUFFVCxLQUFLO0FBQ2EsNEJBQUEsU0FBUyxRQUFRLFlBQVk7QUFDdEMsbUJBQUE7QUFBQSxVQUVULEtBQUs7QUFFSSxtQkFBQTtBQUFBLFVBRVQsS0FBSztBQUNxQixvQ0FBQSxTQUFTLFFBQVEsWUFBWTtBQUM5QyxtQkFBQTtBQUFBLFVBRVQsS0FBSztBQUM0QiwyQ0FBQSxTQUFTLFFBQVEsWUFBWTtBQUNyRCxtQkFBQTtBQUFBLFVBRVQsS0FBSztBQUNzQixxQ0FBQSxTQUFTLFFBQVEsWUFBWTtBQUMvQyxtQkFBQTtBQUFBLFVBRVQ7QUFDUyxtQkFBQTtBQUFBLFFBQUE7QUFBQSxNQUNYLENBQ0Q7QUFHRCxhQUFPLEtBQUssVUFBVSxZQUFZLE9BQU9BLFFBQU8sWUFBWSxRQUFRO0FBQ2xFLFlBQUksV0FBVyxXQUFXLGNBQWMsSUFBSSxLQUFLO0FBRTNDLGNBQUE7QUFFRixrQkFBTSxJQUFJLFFBQVEsQ0FBQSxZQUFXLFdBQVcsU0FBUyxHQUFJLENBQUM7QUFBQSxtQkFDL0MsT0FBTztBQUNOLG9CQUFBLE1BQU0sZ0NBQWdDLEtBQUs7QUFBQSxVQUFBO0FBQUEsUUFDckQ7QUFBQSxNQUNGLENBQ0Q7QUFBQSxJQUFBO0FBQUEsRUFFTCxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJ4X2dvb2dsZV9pZ25vcmVMaXN0IjpbMF19
