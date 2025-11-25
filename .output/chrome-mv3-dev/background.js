var background = function() {
  "use strict";
  var _a, _b;
  function defineBackground(arg) {
    if (arg == null || typeof arg === "function") return { main: arg };
    return arg;
  }
  async function fetchOpenAI(content, apiKey) {
    var _a2;
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
      throw new Error(((_a2 = data.error) == null ? void 0 : _a2.message) || "No response from OpenAI");
    }
  }
  async function fetchGemini(content, apiKey) {
    var _a2;
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
      throw new Error(((_a2 = data.error) == null ? void 0 : _a2.message) || "No candidates in Gemini response");
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
  background;
  console.log("[WebSearch] Module loaded - web search tracking is active");
  async function generateSearchQuery(title) {
    var _a2, _b2, _c, _d, _e, _f;
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
      const generatedQuery = (_f = (_e = (_d = (_c = (_b2 = (_a2 = data.candidates) == null ? void 0 : _a2[0]) == null ? void 0 : _b2.content) == null ? void 0 : _c.parts) == null ? void 0 : _d[0]) == null ? void 0 : _e.text) == null ? void 0 : _f.trim();
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
        var _a2;
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
          title: ((_a2 = result2.title) == null ? void 0 : _a2.substring(0, 50)) + "...",
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
  background;
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
  background;
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
            var _a2, _b2;
            return {
              quote: ((_a2 = evidence.quote) == null ? void 0 : _a2.trim().replace(/\s+/g, " ").replace(/\.+$/, "")) || "",
              impact: ((_b2 = evidence.impact) == null ? void 0 : _b2.trim().replace(/\s+/g, " ").replace(/\.+$/, "")) || ""
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
  background;
  async function handleGetPageInfo(message, sender, sendResponse) {
    var _a2, _b2;
    try {
      const tabId2 = message.tabId || ((_a2 = sender.tab) == null ? void 0 : _a2.id);
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
      const isSamePage = ((_b2 = state.pageInfo) == null ? void 0 : _b2.url) === pageInfo.data.url;
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
    var _a2, _b2;
    try {
      const tabId2 = message.tabId || ((_a2 = sender.tab) == null ? void 0 : _a2.id);
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
          if (((_b2 = tabState.pageInfo) == null ? void 0 : _b2.url) === message.url && tabState.analysis && tabState.analysis.length > 0) {
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
    var _a2;
    try {
      const tabId2 = message.tabId || ((_a2 = sender.tab) == null ? void 0 : _a2.id);
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
    var _a2, _b2;
    try {
      const tabId2 = message.tabId || ((_a2 = sender.tab) == null ? void 0 : _a2.id);
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
      if (((_b2 = message.data.pageInfo) == null ? void 0 : _b2.url) && message.data.analysis && message.data.analysis.length > 0) {
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
    var _a2;
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
      if ((_a2 = analysisData.pageInfo) == null ? void 0 : _a2.url) {
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
    var _a2, _b2;
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
        score: ((_b2 = (_a2 = analysis[0]) == null ? void 0 : _a2.result) == null ? void 0 : _b2.credibility_score) || null,
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
  background;
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
  background;
  function initPlugins() {
  }
  const browser$1 = ((_b = (_a = globalThis.browser) == null ? void 0 : _a.runtime) == null ? void 0 : _b.id) ? globalThis.browser : globalThis.chrome;
  const browser = browser$1;
  var _MatchPattern = class {
    constructor(matchPattern) {
      if (matchPattern === "<all_urls>") {
        this.isAllUrls = true;
        this.protocolMatches = [..._MatchPattern.PROTOCOLS];
        this.hostnameMatch = "*";
        this.pathnameMatch = "*";
      } else {
        const groups = /(.*):\/\/(.*?)(\/.*)/.exec(matchPattern);
        if (groups == null)
          throw new InvalidMatchPattern(matchPattern, "Incorrect format");
        const [_, protocol, hostname, pathname] = groups;
        validateProtocol(matchPattern, protocol);
        validateHostname(matchPattern, hostname);
        this.protocolMatches = protocol === "*" ? ["http", "https"] : [protocol];
        this.hostnameMatch = hostname;
        this.pathnameMatch = pathname;
      }
    }
    includes(url) {
      if (this.isAllUrls)
        return true;
      const u = typeof url === "string" ? new URL(url) : url instanceof Location ? new URL(url.href) : url;
      return !!this.protocolMatches.find((protocol) => {
        if (protocol === "http")
          return this.isHttpMatch(u);
        if (protocol === "https")
          return this.isHttpsMatch(u);
        if (protocol === "file")
          return this.isFileMatch(u);
        if (protocol === "ftp")
          return this.isFtpMatch(u);
        if (protocol === "urn")
          return this.isUrnMatch(u);
      });
    }
    isHttpMatch(url) {
      return url.protocol === "http:" && this.isHostPathMatch(url);
    }
    isHttpsMatch(url) {
      return url.protocol === "https:" && this.isHostPathMatch(url);
    }
    isHostPathMatch(url) {
      if (!this.hostnameMatch || !this.pathnameMatch)
        return false;
      const hostnameMatchRegexs = [
        this.convertPatternToRegex(this.hostnameMatch),
        this.convertPatternToRegex(this.hostnameMatch.replace(/^\*\./, ""))
      ];
      const pathnameMatchRegex = this.convertPatternToRegex(this.pathnameMatch);
      return !!hostnameMatchRegexs.find((regex) => regex.test(url.hostname)) && pathnameMatchRegex.test(url.pathname);
    }
    isFileMatch(url) {
      throw Error("Not implemented: file:// pattern matching. Open a PR to add support");
    }
    isFtpMatch(url) {
      throw Error("Not implemented: ftp:// pattern matching. Open a PR to add support");
    }
    isUrnMatch(url) {
      throw Error("Not implemented: urn:// pattern matching. Open a PR to add support");
    }
    convertPatternToRegex(pattern) {
      const escaped = this.escapeForRegex(pattern);
      const starsReplaced = escaped.replace(/\\\*/g, ".*");
      return RegExp(`^${starsReplaced}$`);
    }
    escapeForRegex(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  };
  var MatchPattern = _MatchPattern;
  MatchPattern.PROTOCOLS = ["http", "https", "file", "ftp", "urn"];
  var InvalidMatchPattern = class extends Error {
    constructor(matchPattern, reason) {
      super(`Invalid match pattern "${matchPattern}": ${reason}`);
    }
  };
  function validateProtocol(matchPattern, protocol) {
    if (!MatchPattern.PROTOCOLS.includes(protocol) && protocol !== "*")
      throw new InvalidMatchPattern(
        matchPattern,
        `${protocol} not a valid protocol (${MatchPattern.PROTOCOLS.join(", ")})`
      );
  }
  function validateHostname(matchPattern, hostname) {
    if (hostname.includes(":"))
      throw new InvalidMatchPattern(matchPattern, `Hostname cannot include a port`);
    if (hostname.includes("*") && hostname.length > 1 && !hostname.startsWith("*."))
      throw new InvalidMatchPattern(
        matchPattern,
        `If using a wildcard (*), it must go at the start of the hostname`
      );
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
  let ws;
  function getDevServerWebSocket() {
    if (ws == null) {
      const serverUrl = "http://localhost:3000";
      logger.debug("Connecting to dev server @", serverUrl);
      ws = new WebSocket(serverUrl, "vite-hmr");
      ws.addWxtEventListener = ws.addEventListener.bind(ws);
      ws.sendCustom = (event, payload) => ws == null ? void 0 : ws.send(JSON.stringify({ type: "custom", event, payload }));
      ws.addEventListener("open", () => {
        logger.debug("Connected to dev server");
      });
      ws.addEventListener("close", () => {
        logger.debug("Disconnected from dev server");
      });
      ws.addEventListener("error", (event) => {
        logger.error("Failed to connect to dev server", event);
      });
      ws.addEventListener("message", (e) => {
        try {
          const message = JSON.parse(e.data);
          if (message.type === "custom") {
            ws == null ? void 0 : ws.dispatchEvent(
              new CustomEvent(message.event, { detail: message.data })
            );
          }
        } catch (err) {
          logger.error("Failed to handle message", err);
        }
      });
    }
    return ws;
  }
  function keepServiceWorkerAlive() {
    setInterval(async () => {
      await browser.runtime.getPlatformInfo();
    }, 5e3);
  }
  function reloadContentScript(payload) {
    const manifest = browser.runtime.getManifest();
    if (manifest.manifest_version == 2) {
      void reloadContentScriptMv2();
    } else {
      void reloadContentScriptMv3(payload);
    }
  }
  async function reloadContentScriptMv3({
    registration,
    contentScript
  }) {
    if (registration === "runtime") {
      await reloadRuntimeContentScriptMv3(contentScript);
    } else {
      await reloadManifestContentScriptMv3(contentScript);
    }
  }
  async function reloadManifestContentScriptMv3(contentScript) {
    const id = `wxt:${contentScript.js[0]}`;
    logger.log("Reloading content script:", contentScript);
    const registered = await browser.scripting.getRegisteredContentScripts();
    logger.debug("Existing scripts:", registered);
    const existing = registered.find((cs) => cs.id === id);
    if (existing) {
      logger.debug("Updating content script", existing);
      await browser.scripting.updateContentScripts([{ ...contentScript, id }]);
    } else {
      logger.debug("Registering new content script...");
      await browser.scripting.registerContentScripts([{ ...contentScript, id }]);
    }
    await reloadTabsForContentScript(contentScript);
  }
  async function reloadRuntimeContentScriptMv3(contentScript) {
    logger.log("Reloading content script:", contentScript);
    const registered = await browser.scripting.getRegisteredContentScripts();
    logger.debug("Existing scripts:", registered);
    const matches = registered.filter((cs) => {
      var _a2, _b2;
      const hasJs = (_a2 = contentScript.js) == null ? void 0 : _a2.find((js) => {
        var _a3;
        return (_a3 = cs.js) == null ? void 0 : _a3.includes(js);
      });
      const hasCss = (_b2 = contentScript.css) == null ? void 0 : _b2.find((css) => {
        var _a3;
        return (_a3 = cs.css) == null ? void 0 : _a3.includes(css);
      });
      return hasJs || hasCss;
    });
    if (matches.length === 0) {
      logger.log(
        "Content script is not registered yet, nothing to reload",
        contentScript
      );
      return;
    }
    await browser.scripting.updateContentScripts(matches);
    await reloadTabsForContentScript(contentScript);
  }
  async function reloadTabsForContentScript(contentScript) {
    const allTabs = await browser.tabs.query({});
    const matchPatterns = contentScript.matches.map(
      (match) => new MatchPattern(match)
    );
    const matchingTabs = allTabs.filter((tab) => {
      const url = tab.url;
      if (!url) return false;
      return !!matchPatterns.find((pattern) => pattern.includes(url));
    });
    await Promise.all(
      matchingTabs.map(async (tab) => {
        try {
          await browser.tabs.reload(tab.id);
        } catch (err) {
          logger.warn("Failed to reload tab:", err);
        }
      })
    );
  }
  async function reloadContentScriptMv2(_payload) {
    throw Error("TODO: reloadContentScriptMv2");
  }
  {
    try {
      const ws2 = getDevServerWebSocket();
      ws2.addWxtEventListener("wxt:reload-extension", () => {
        browser.runtime.reload();
      });
      ws2.addWxtEventListener("wxt:reload-content-script", (event) => {
        reloadContentScript(event.detail);
      });
      if (true) {
        ws2.addEventListener(
          "open",
          () => ws2.sendCustom("wxt:background-initialized")
        );
        keepServiceWorkerAlive();
      }
    } catch (err) {
      logger.error("Failed to setup web socket connection with dev server", err);
    }
    browser.commands.onCommand.addListener((command) => {
      if (command === "wxt:reload-extension") {
        browser.runtime.reload();
      }
    });
  }
  let result;
  try {
    initPlugins();
    result = definition.main();
    if (result instanceof Promise) {
      console.warn(
        "The background's main() function return a promise, but it must be synchronous"
      );
    }
  } catch (err) {
    logger.error("The background crashed on startup!");
    throw err;
  }
  const result$1 = result;
  return result$1;
}();
background;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2RlZmluZS1iYWNrZ3JvdW5kLm1qcyIsIi4uLy4uL3NyYy91dGlscy9haUhhbmRsaW5nLnRzIiwiLi4vLi4vc3JjL3V0aWxzL3dlYlNlYXJjaC50cyIsIi4uLy4uL3NyYy91dGlscy90YWJTdGF0ZS50cyIsIi4uLy4uL3NyYy91dGlscy9hbmFseXNpc1Byb2Nlc3Nvci50cyIsIi4uLy4uL3NyYy91dGlscy9tZXNzYWdlSGFuZGxlcnMudHMiLCIuLi8uLi9zcmMvZW50cnlwb2ludHMvYmFja2dyb3VuZC50cyIsIi4uLy4uL25vZGVfbW9kdWxlcy9Ad3h0LWRldi9icm93c2VyL3NyYy9pbmRleC5tanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvYnJvd3Nlci5tanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvQHdlYmV4dC1jb3JlL21hdGNoLXBhdHRlcm5zL2xpYi9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZnVuY3Rpb24gZGVmaW5lQmFja2dyb3VuZChhcmcpIHtcbiAgaWYgKGFyZyA9PSBudWxsIHx8IHR5cGVvZiBhcmcgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHsgbWFpbjogYXJnIH07XG4gIHJldHVybiBhcmc7XG59XG4iLCJleHBvcnQgYXN5bmMgZnVuY3Rpb24gZmV0Y2hPcGVuQUkoY29udGVudDogc3RyaW5nLCBhcGlLZXk6IHN0cmluZykge1xyXG4gICAgY29uc29sZS50aW1lKCdbQUldIE9wZW5BSSByZXF1ZXN0Jyk7XHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKCdodHRwczovL2FwaS5vcGVuYWkuY29tL3YxL2NoYXQvY29tcGxldGlvbnMnLCB7XHJcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0F1dGhvcml6YXRpb24nOiBgQmVhcmVyICR7YXBpS2V5fWAsXHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgbW9kZWw6ICdncHQtMy41LXR1cmJvJyxcclxuICAgICAgICBtZXNzYWdlczogW3sgcm9sZTogJ3VzZXInLCBjb250ZW50IH1dXHJcbiAgICAgIH0pXHJcbiAgICB9KVxyXG4gICAgY29uc29sZS50aW1lRW5kKCdbQUldIE9wZW5BSSByZXF1ZXN0Jyk7XHJcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xyXG4gICAgaWYgKGRhdGEuY2hvaWNlcyAmJiBkYXRhLmNob2ljZXNbMF0gJiYgZGF0YS5jaG9pY2VzWzBdLm1lc3NhZ2UuY29udGVudCkge1xyXG4gICAgICByZXR1cm4gZGF0YS5jaG9pY2VzWzBdLm1lc3NhZ2UuY29udGVudDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihkYXRhLmVycm9yPy5tZXNzYWdlIHx8ICdObyByZXNwb25zZSBmcm9tIE9wZW5BSScpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmZXRjaEdlbWluaShjb250ZW50OiBzdHJpbmcsIGFwaUtleTogc3RyaW5nKSB7XHJcbiAgICBjb25zb2xlLnRpbWUoJ1tBSV0gR2VtaW5pIHJlcXVlc3QnKTtcclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYGh0dHBzOi8vZ2VuZXJhdGl2ZWxhbmd1YWdlLmdvb2dsZWFwaXMuY29tL3YxYmV0YS9tb2RlbHMvZ2VtaW5pLTIuNS1mbGFzaDpnZW5lcmF0ZUNvbnRlbnQ/a2V5PSR7YXBpS2V5fWAsIHtcclxuICAgICAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgY29udGVudHM6IFt7XHJcbiAgICAgICAgICAgICAgICBwYXJ0czogW3tcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBjb250ZW50XHJcbiAgICAgICAgICAgICAgICB9XVxyXG4gICAgICAgICAgICB9XSxcclxuICAgICAgICAgICAgZ2VuZXJhdGlvbkNvbmZpZzoge1xyXG4gICAgICAgICAgICAgICAgdGVtcGVyYXR1cmU6IDAuNyxcclxuICAgICAgICAgICAgICAgIG1heE91dHB1dFRva2VuczogNDA5NlxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgIH0pO1xyXG4gICAgY29uc29sZS50aW1lRW5kKCdbQUldIEdlbWluaSByZXF1ZXN0Jyk7XHJcblxyXG4gICAgaWYgKCFyZXNwb25zZS5vaykge1xyXG4gICAgICAgIGNvbnN0IGVycm9yVGV4dCA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEdlbWluaSBBUEkgZXJyb3I6ICR7cmVzcG9uc2Uuc3RhdHVzfSAke3Jlc3BvbnNlLnN0YXR1c1RleHR9IC0gJHtlcnJvclRleHR9YCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcclxuICAgIGNvbnNvbGUubG9nKCdHZW1pbmkgQVBJIFJlc3BvbnNlIERhdGE6JywgSlNPTi5zdHJpbmdpZnkoZGF0YSwgbnVsbCwgMikpO1xyXG4gICAgXHJcbiAgICBpZiAoZGF0YS5jYW5kaWRhdGVzICYmIGRhdGEuY2FuZGlkYXRlc1swXSkge1xyXG4gICAgICAgIGNvbnN0IGNhbmRpZGF0ZSA9IGRhdGEuY2FuZGlkYXRlc1swXTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBDaGVjayBmb3IgZGlmZmVyZW50IGZpbmlzaCByZWFzb25zXHJcbiAgICAgICAgaWYgKGNhbmRpZGF0ZS5maW5pc2hSZWFzb24gPT09ICdNQVhfVE9LRU5TJykge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0dlbWluaSByZXNwb25zZSB3YXMgdHJ1bmNhdGVkIGR1ZSB0byB0b2tlbiBsaW1pdC4gVHJ5IHJlZHVjaW5nIHlvdXIgaW5wdXQgbGVuZ3RoLicpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBpZiAoY2FuZGlkYXRlLmZpbmlzaFJlYXNvbiA9PT0gJ1NBRkVUWScpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdHZW1pbmkgcmVzcG9uc2Ugd2FzIGJsb2NrZWQgZHVlIHRvIHNhZmV0eSBmaWx0ZXJzLicpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyBDaGVjayBpZiB3ZSBoYXZlIGNvbnRlbnQgd2l0aCBwYXJ0c1xyXG4gICAgICAgIGlmIChjYW5kaWRhdGUuY29udGVudCAmJiBjYW5kaWRhdGUuY29udGVudC5wYXJ0cyAmJiBjYW5kaWRhdGUuY29udGVudC5wYXJ0c1swXSAmJiBjYW5kaWRhdGUuY29udGVudC5wYXJ0c1swXS50ZXh0KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBjYW5kaWRhdGUuY29udGVudC5wYXJ0c1swXS50ZXh0O1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyBJZiBubyBwYXJ0cywgY2hlY2sgaWYgdGhlcmUncyB0ZXh0IGRpcmVjdGx5IGluIGNvbnRlbnRcclxuICAgICAgICBpZiAoY2FuZGlkYXRlLmNvbnRlbnQgJiYgY2FuZGlkYXRlLmNvbnRlbnQudGV4dCkge1xyXG4gICAgICAgICAgICByZXR1cm4gY2FuZGlkYXRlLmNvbnRlbnQudGV4dDtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBHZW1pbmkgcmVzcG9uc2UgaW5jb21wbGV0ZS4gRmluaXNoIHJlYXNvbjogJHtjYW5kaWRhdGUuZmluaXNoUmVhc29uIHx8ICd1bmtub3duJ31gKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignR2VtaW5pIHJlc3BvbnNlIHN0cnVjdHVyZTonLCBkYXRhKTtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZGF0YS5lcnJvcj8ubWVzc2FnZSB8fCAnTm8gY2FuZGlkYXRlcyBpbiBHZW1pbmkgcmVzcG9uc2UnKTtcclxuICAgIH1cclxufVxyXG5cclxuLy8gUmVtb3ZlZCBMbGFtYSBwcm92aWRlclxyXG5cclxuLy9hZGQgZ2VtaW5pIGluIGxhdGVyLCBuZWVkIHRvIGJlIDE4KyBcclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZldGNoQ29oZXJlKGNvbnRlbnQ6IHN0cmluZywgYXBpS2V5OiBzdHJpbmcpIHtcclxuICAgIGNvbnNvbGUubG9nKCdDb2hlcmUgQVBJIEtleTonLCBhcGlLZXkgPyAnUHJlc2VudCcgOiAnTWlzc2luZycpO1xyXG4gICAgY29uc29sZS5sb2coJ0NvaGVyZSBBUEkgS2V5IGxlbmd0aDonLCBhcGlLZXkubGVuZ3RoKTtcclxuICAgIGNvbnNvbGUubG9nKCdDb2hlcmUgQ29udGVudCBsZW5ndGg6JywgY29udGVudC5sZW5ndGgpO1xyXG4gICAgY29uc29sZS5sb2coJ0NvaGVyZSBDb250ZW50IHByZXZpZXc6JywgY29udGVudC5zdWJzdHJpbmcoMCwgMjAwKSArICcuLi4nKTtcclxuICAgIFxyXG4gICAgLy8gVmFsaWRhdGUgY29udGVudFxyXG4gICAgaWYgKCFjb250ZW50IHx8IGNvbnRlbnQudHJpbSgpLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ29udGVudCBpcyBlbXB0eSBvciBpbnZhbGlkJyk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHRyeSB7XHJcbiAgICAgICAgY29uc29sZS50aW1lKCdbQUldIENvaGVyZSByZXF1ZXN0Jyk7XHJcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCgnaHR0cHM6Ly9hcGkuY29oZXJlLmFpL3YxL2NoYXQnLCB7XHJcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAgICAgICAnQXV0aG9yaXphdGlvbic6IGBCZWFyZXIgJHthcGlLZXl9YCxcclxuICAgICAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBcclxuICAgICAgICAgICAgICAgIG1vZGVsOiAnY29tbWFuZC1yJyxcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGNvbnRlbnQsXHJcbiAgICAgICAgICAgICAgICBtYXhfdG9rZW5zOiAxMjUwLFxyXG4gICAgICAgICAgICAgICAgdGVtcGVyYXR1cmU6IDAuMyxcclxuICAgICAgICAgICAgICAgIGNoYXRfaGlzdG9yeTogW10sXHJcbiAgICAgICAgICAgICAgICBwcm9tcHRfdHJ1bmNhdGlvbjogJ0FVVE8nXHJcbiAgICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGNvbnNvbGUudGltZUVuZCgnW0FJXSBDb2hlcmUgcmVxdWVzdCcpO1xyXG5cclxuICAgICAgICBjb25zb2xlLmxvZygnQ29oZXJlIFJlc3BvbnNlIFN0YXR1czonLCByZXNwb25zZS5zdGF0dXMsIHJlc3BvbnNlLnN0YXR1c1RleHQpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcclxuICAgICAgICAgICAgY29uc3QgZXJyb3JUZXh0ID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdDb2hlcmUgQVBJIEZ1bGwgRXJyb3I6Jywge1xyXG4gICAgICAgICAgICAgICAgc3RhdHVzOiByZXNwb25zZS5zdGF0dXMsXHJcbiAgICAgICAgICAgICAgICBzdGF0dXNUZXh0OiByZXNwb25zZS5zdGF0dXNUZXh0LFxyXG4gICAgICAgICAgICAgICAgZXJyb3JUZXh0OiBlcnJvclRleHQsXHJcbiAgICAgICAgICAgICAgICBoZWFkZXJzOiBPYmplY3QuZnJvbUVudHJpZXMocmVzcG9uc2UuaGVhZGVycy5lbnRyaWVzKCkpXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENvaGVyZSBBUEkgZXJyb3I6ICR7cmVzcG9uc2Uuc3RhdHVzfSAke3Jlc3BvbnNlLnN0YXR1c1RleHR9IC0gJHtlcnJvclRleHR9YCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ0NvaGVyZSBBUEkgUmVzcG9uc2UgRGF0YTonLCBkYXRhKTtcclxuXHJcbiAgICAgICAgaWYgKGRhdGEudGV4dCkge1xyXG4gICAgICAgICAgICByZXR1cm4gZGF0YS50ZXh0O1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihkYXRhLm1lc3NhZ2UgfHwgJ05vIHJlc3BvbnNlIGZyb20gQ29oZXJlJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdDb2hlcmUgQVBJIENhbGwgRmFpbGVkOicsIGVycm9yKTtcclxuICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxufVxyXG5cclxuLy8gUmVtb3ZlZCBNaXN0cmFsN0IgcHJvdmlkZXJcclxuXHJcbi8vIFJlbW92ZWQgTWl4dHJhbDh4N0IgcHJvdmlkZXJcclxuIiwiLy8gQUktcG93ZXJlZCB3ZWIgc2VhcmNoIGZ1bmN0aW9uYWxpdHlcclxuY29uc29sZS5sb2coJ1tXZWJTZWFyY2hdIE1vZHVsZSBsb2FkZWQgLSB3ZWIgc2VhcmNoIHRyYWNraW5nIGlzIGFjdGl2ZScpO1xyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdlbmVyYXRlU2VhcmNoUXVlcnkodGl0bGU6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHByb21wdCA9IGBHaXZlbiB0aGlzIGFydGljbGUgdGl0bGU6IFwiJHt0aXRsZX1cIlxyXG5cclxuR2VuZXJhdGUgYSBzaW1wbGUgR29vZ2xlIHNlYXJjaCBxdWVyeSB0byBmaW5kIHJlbGF0ZWQgbmV3cyBhcnRpY2xlcyBhbmQgZmFjdC1jaGVja2luZyBjb250ZW50LlxyXG5cclxuSW5zdHJ1Y3Rpb25zOlxyXG4tIEV4dHJhY3QgdGhlIG1haW4gcGVyc29uLCBwbGFjZSwgb3IgZXZlbnQgZnJvbSB0aGUgdGl0bGVcclxuLSBDcmVhdGUgYSBzaW1wbGUgcXVlcnkgd2l0aCAyLTQga2V5IHdvcmRzXHJcbi0gRm9jdXMgb24gdGhlIG1vc3QgaW1wb3J0YW50IGVsZW1lbnRzIChuYW1lcywgbG9jYXRpb25zLCBldmVudHMpXHJcbi0gQXZvaWQgY29tcGxleCBvcGVyYXRvcnMgb3IgcmVzdHJpY3Rpb25zXHJcbi0gTWFrZSBpdCBicm9hZCBlbm91Z2ggdG8gZmluZCByZXN1bHRzIGJ1dCBzcGVjaWZpYyBlbm91Z2ggdG8gYmUgcmVsZXZhbnRcclxuXHJcbkV4YW1wbGVzOlxyXG4tIEZvciBcIlN0YXRlbiBJc2xhbmQgbWFuIGFycmVzdGVkIGF0IFpvaHJhbiBNYW1kYW5pJ3MgYW50aS1UcnVtcCBldmVudFwiIOKGkiBcIlpvaHJhbiBNYW1kYW5pIFN0YXRlbiBJc2xhbmQgYXJyZXN0XCJcclxuLSBGb3IgQmFkIEJ1bm55IHRvIFBlcmZvcm0gYXQgQXBwbGUgTXVzaWMgMjAyNiBTdXBlciBCb3dsIEhhbGZ0aW1lIFNob3cg4oaSIGZvY3VzIG9uIEJhZCBCdW5ueSBhbmQgU3VwZXIgQm93bCwgbm90IEFwcGxlIE11c2ljIG9yIDIwMjZcclxuLSBGb3IgXCJWYWNjaW5lIHNhZmV0eSBjbGFpbXMgdmVyaWZpZWRcIiDihpIgXCJ2YWNjaW5lIHNhZmV0eSB2ZXJpZmljYXRpb25cIlxyXG5cclxuUmV0dXJuIE9OTFkgdGhlIHNlYXJjaCBxdWVyeSwgbm90aGluZyBlbHNlLmA7XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgaHR0cHM6Ly9nZW5lcmF0aXZlbGFuZ3VhZ2UuZ29vZ2xlYXBpcy5jb20vdjFiZXRhL21vZGVscy9nZW1pbmktMi41LWZsYXNoLWxpdGU6Z2VuZXJhdGVDb250ZW50P2tleT0ke2ltcG9ydC5tZXRhLmVudi5WSVRFX0dFTUlOSV9BUElfS0VZfWAsIHtcclxuICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBjb250ZW50czogW3tcclxuICAgICAgICAgIHBhcnRzOiBbe1xyXG4gICAgICAgICAgICB0ZXh0OiBwcm9tcHRcclxuICAgICAgICAgIH1dXHJcbiAgICAgICAgfV0sXHJcbiAgICAgICAgZ2VuZXJhdGlvbkNvbmZpZzoge1xyXG4gICAgICAgICAgdGVtcGVyYXR1cmU6IDAuMyxcclxuICAgICAgICAgIG1heE91dHB1dFRva2VuczogMTAwXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgfSk7XHJcblxyXG4gICAgaWYgKCFyZXNwb25zZS5vaykge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdHZW1pbmkgQVBJIGVycm9yOicsIHJlc3BvbnNlLnN0YXR1cywgcmVzcG9uc2Uuc3RhdHVzVGV4dCk7XHJcbiAgICAgIGNvbnN0IGVycm9yVGV4dCA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcclxuICAgICAgY29uc29sZS5lcnJvcignR2VtaW5pIEFQSSBlcnJvciBkZXRhaWxzOicsIGVycm9yVGV4dCk7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdbV2ViU2VhcmNoXSBGYWxsaW5nIGJhY2sgdG8gYmFzaWMgcGF0dGVybiBkdWUgdG8gQVBJIGVycm9yJyk7XHJcbiAgICAgIHJldHVybiBgXCIke3RpdGxlfVwiIGZhY3QgY2hlY2tgO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XHJcbiAgICBjb25zdCBnZW5lcmF0ZWRRdWVyeSA9IGRhdGEuY2FuZGlkYXRlcz8uWzBdPy5jb250ZW50Py5wYXJ0cz8uWzBdPy50ZXh0Py50cmltKCk7XHJcbiAgICBcclxuICAgIGlmIChnZW5lcmF0ZWRRdWVyeSkge1xyXG4gICAgICByZXR1cm4gZ2VuZXJhdGVkUXVlcnk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gYFwiJHt0aXRsZX1cIiBmYWN0IGNoZWNrYDtcclxuICAgIH1cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGdlbmVyYXRlIEFJIHF1ZXJ5OicsIGVycm9yKTtcclxuICAgIHJldHVybiBgXCIke3RpdGxlfVwiIGZhY3QgY2hlY2tgO1xyXG4gIH1cclxufVxyXG5cclxuaW50ZXJmYWNlIFNlYXJjaFJlc3VsdCB7XHJcbiAgdXJsOiBzdHJpbmc7XHJcbiAgdGl0bGU6IHN0cmluZztcclxuICBzbmlwcGV0OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgV2ViU2VhcmNoUmVzcG9uc2Uge1xyXG4gIHJlc3VsdHM6IFNlYXJjaFJlc3VsdFtdO1xyXG4gIHNlYXJjaE1ldGhvZDogJ2FpLWdlbmVyYXRlZCcgfCAnZmFsbGJhY2snO1xyXG4gIHF1ZXJ5VXNlZDogc3RyaW5nO1xyXG4gIGFpUXVlcnlHZW5lcmF0ZWQ/OiBzdHJpbmc7XHJcbiAgZmFsbGJhY2tRdWVyeVVzZWQ/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwZXJmb3JtV2ViU2VhcmNoKHF1ZXJ5OiBzdHJpbmcsIG1heFJlc3VsdHM6IG51bWJlciA9IDUpOiBQcm9taXNlPFdlYlNlYXJjaFJlc3BvbnNlPiB7XHJcbiAgdHJ5IHtcclxuICAgIC8vIEV4dHJhY3Qgc2VhcmNoIHRlcm1zIGZyb20gdGhlIHF1ZXJ5IChyZW1vdmUgVVJMcylcclxuICAgIGNvbnN0IHNlYXJjaFRlcm1zID0gcXVlcnkucmVwbGFjZSgvaHR0cHM/OlxcL1xcL1teXFxzXSsvZywgJycpLnRyaW0oKTtcclxuICAgIFxyXG4gICAgLy8gRXh0cmFjdCBjdXJyZW50IGRvbWFpbiBhbmQgeWVhciB0byBleGNsdWRlIGZyb20gcmVzdWx0c1xyXG4gICAgbGV0IGN1cnJlbnREb21haW4gPSAnJztcclxuICAgIGxldCBvcmlnaW5hbEFydGljbGVZZWFyID0gbnVsbDtcclxuICAgIFxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgdXJsTWF0Y2ggPSBxdWVyeS5tYXRjaCgvaHR0cHM/OlxcL1xcL1teXFwvXSsvKTtcclxuICAgICAgaWYgKHVybE1hdGNoKSB7XHJcbiAgICAgICAgY3VycmVudERvbWFpbiA9IHVybE1hdGNoWzFdLnJlcGxhY2UoJ3d3dy4nLCAnJyk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vIEV4dHJhY3QgeWVhciBmcm9tIHRoZSBvcmlnaW5hbCBhcnRpY2xlIFVSTFxyXG4gICAgICBjb25zdCB5ZWFyTWF0Y2ggPSBxdWVyeS5tYXRjaCgvXFwvKDIwXFxkezJ9KVxcLy8pO1xyXG4gICAgICBpZiAoeWVhck1hdGNoKSB7XHJcbiAgICAgICAgb3JpZ2luYWxBcnRpY2xlWWVhciA9IHBhcnNlSW50KHllYXJNYXRjaFsxXSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY29uc3QgYWx0WWVhck1hdGNoID0gcXVlcnkubWF0Y2goLygyMFxcZHsyfSkvKTtcclxuICAgICAgICBpZiAoYWx0WWVhck1hdGNoKSB7XHJcbiAgICAgICAgICBvcmlnaW5hbEFydGljbGVZZWFyID0gcGFyc2VJbnQoYWx0WWVhck1hdGNoWzFdKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgLy8gQ29udGludWUgd2l0aG91dCBkb21haW4veWVhciBmaWx0ZXJpbmdcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gR2VuZXJhdGUgQUktcG93ZXJlZCBzZWFyY2ggcXVlcnlcclxuICAgIGNvbnN0IGFpR2VuZXJhdGVkUXVlcnkgPSBhd2FpdCBnZW5lcmF0ZVNlYXJjaFF1ZXJ5KHNlYXJjaFRlcm1zKTtcclxuICAgIGNvbnNvbGUubG9nKCdbV2ViU2VhcmNoXSBBSSBnZW5lcmF0ZWQgcXVlcnk6JywgYWlHZW5lcmF0ZWRRdWVyeSk7XHJcbiAgICBcclxuICAgIC8vIEFkZCBkb21haW4gZXhjbHVzaW9uIGlmIHdlIGhhdmUgYSBjdXJyZW50IGRvbWFpblxyXG4gICAgY29uc3QgZmluYWxRdWVyeSA9IGN1cnJlbnREb21haW4gPyBgJHthaUdlbmVyYXRlZFF1ZXJ5fSAtc2l0ZToke2N1cnJlbnREb21haW59YCA6IGFpR2VuZXJhdGVkUXVlcnk7XHJcbiAgICBjb25zb2xlLmxvZygnW1dlYlNlYXJjaF0gRmluYWwgcXVlcnkgKHdpdGggZG9tYWluIGV4Y2x1c2lvbik6JywgZmluYWxRdWVyeSk7XHJcbiAgICBcclxuICAgIC8vIEV4ZWN1dGUgR29vZ2xlIHNlYXJjaCB3aXRoIEFJLWdlbmVyYXRlZCBxdWVyeVxyXG4gICAgY29uc3QgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh7XHJcbiAgICAgIGtleTogaW1wb3J0Lm1ldGEuZW52LlZJVEVfR09PR0xFX0FQSV9LRVksXHJcbiAgICAgIGN4OiBpbXBvcnQubWV0YS5lbnYuVklURV9HT09HTEVfU0VBUkNIX0VOR0lORV9JRCxcclxuICAgICAgcTogZmluYWxRdWVyeSxcclxuICAgICAgbnVtOiBNYXRoLm1pbigxMCwgbWF4UmVzdWx0cykudG9TdHJpbmcoKSxcclxuICAgICAgZmllbGRzOiAnaXRlbXModGl0bGUsc25pcHBldCxsaW5rKSdcclxuICAgIH0pO1xyXG4gICAgXHJcbiAgICBjb25zdCBzZWFyY2hVcmwgPSBgaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vY3VzdG9tc2VhcmNoL3YxPyR7cGFyYW1zLnRvU3RyaW5nKCl9YDtcclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goc2VhcmNoVXJsKTtcclxuICAgIFxyXG4gICAgaWYgKCFyZXNwb25zZS5vaykge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdHb29nbGUgc2VhcmNoIGZhaWxlZDonLCByZXNwb25zZS5zdGF0dXMsIHJlc3BvbnNlLnN0YXR1c1RleHQpO1xyXG4gICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MDMpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdBUEkgcXVvdGEgZXhjZWVkZWQgb3IgYWNjZXNzIGRlbmllZC4gQ2hlY2sgeW91ciBHb29nbGUgQ3VzdG9tIFNlYXJjaCBBUEkga2V5IGFuZCBxdW90YS4nKTtcclxuICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwMCkge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0JhZCByZXF1ZXN0IC0gY2hlY2sgQVBJIHBhcmFtZXRlcnMnKTtcclxuICAgICAgICBjb25zdCBlcnJvckJvZHkgPSBhd2FpdCByZXNwb25zZS50ZXh0KCk7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgcmVzcG9uc2U6JywgZXJyb3JCb2R5KTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHJlc3VsdHM6IFtdLFxyXG4gICAgICAgIHNlYXJjaE1ldGhvZDogJ2ZhbGxiYWNrJyxcclxuICAgICAgICBxdWVyeVVzZWQ6IGZpbmFsUXVlcnksXHJcbiAgICAgICAgYWlRdWVyeUdlbmVyYXRlZDogYWlHZW5lcmF0ZWRRdWVyeSxcclxuICAgICAgICBmYWxsYmFja1F1ZXJ5VXNlZDogYEdvb2dsZSBBUEkgZXJyb3I6ICR7cmVzcG9uc2Uuc3RhdHVzfWBcclxuICAgICAgfTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcclxuICAgIFxyXG4gICAgLy8gUHJvY2VzcyByZXN1bHRzIHdpdGggcXVhbGl0eSBmaWx0ZXJpbmdcclxuICAgIGxldCBwcm9jZXNzZWRSZXN1bHRzID0gKGRhdGEuaXRlbXMgfHwgW10pXHJcbiAgICAgIC5maWx0ZXIoKHJlc3VsdDogYW55KSA9PiB7XHJcbiAgICAgICAgaWYgKCFyZXN1bHQ/LmxpbmspIHJldHVybiBmYWxzZTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBGaWx0ZXIgb3V0IHJlc3VsdHMgZnJvbSB0aGUgc2FtZSBkb21haW4gYXMgdGhlIG9yaWdpbmFsIGFydGljbGVcclxuICAgICAgICBpZiAoY3VycmVudERvbWFpbiAmJiByZXN1bHQubGluay50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGN1cnJlbnREb21haW4pKSB7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEZpbHRlciBvdXQgcHJvYmxlbWF0aWMgZG9tYWluc1xyXG4gICAgICAgIGNvbnN0IHByb2JsZW1hdGljRG9tYWlucyA9IFtcclxuICAgICAgICAgICc0Y2hhbi5vcmcnLCAnOGt1bi50b3AnLCAnZ2FiLmNvbScsICdwYXJsZXIuY29tJywgJ3RydXRoc29jaWFsLmNvbSdcclxuICAgICAgICBdO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IHJlc3VsdERvbWFpbiA9IG5ldyBVUkwocmVzdWx0LmxpbmspLmhvc3RuYW1lLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgaWYgKHByb2JsZW1hdGljRG9tYWlucy5zb21lKGRvbWFpbiA9PiByZXN1bHREb21haW4uaW5jbHVkZXMoZG9tYWluKSkpIHtcclxuICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gRmlsdGVyIGFydGljbGVzIGJ5IHllYXIgLSBvbmx5IHNob3cgYXJ0aWNsZXMgZnJvbSB0aGUgc2FtZSB5ZWFyIGFzIHRoZSBvcmlnaW5hbCBhcnRpY2xlXHJcbiAgICAgICAgY29uc3QgdXJsUGF0aCA9IG5ldyBVUkwocmVzdWx0LmxpbmspLnBhdGhuYW1lO1xyXG4gICAgICAgIGNvbnN0IHllYXJNYXRjaCA9IHVybFBhdGgubWF0Y2goL1xcLygyMFxcZHsyfSlcXC8vKTtcclxuICAgICAgICBpZiAoeWVhck1hdGNoKSB7XHJcbiAgICAgICAgICBjb25zdCBhcnRpY2xlWWVhciA9IHBhcnNlSW50KHllYXJNYXRjaFsxXSk7XHJcbiAgICAgICAgICBpZiAob3JpZ2luYWxBcnRpY2xlWWVhciAmJiBhcnRpY2xlWWVhciAhPT0gb3JpZ2luYWxBcnRpY2xlWWVhcikge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEFsc28gY2hlY2sgZm9yIHZlcnkgb2xkIGFydGljbGVzIHdpdGhvdXQgY2xlYXIgeWVhciBpbiBVUkxcclxuICAgICAgICBjb25zdCBvbGRDb250ZW50UGF0dGVybnMgPSBbXHJcbiAgICAgICAgICAvXFwvMjAoMFswLTldfDFbMC01XSlcXC8vLCAvLyAyMDAwLTIwMTVcclxuICAgICAgICAgIC9hcmNoaXZlXFwuLyxcclxuICAgICAgICAgIC9vbGRcXC4vLFxyXG4gICAgICAgICAgL2xlZ2FjeVxcLi9cclxuICAgICAgICBdO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmIChvbGRDb250ZW50UGF0dGVybnMuc29tZShwYXR0ZXJuID0+IHBhdHRlcm4udGVzdChyZXN1bHQubGluaykpKSB7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEludGVsbGlnZW50IHJlbGV2YW5jZSBmaWx0ZXJpbmdcclxuICAgICAgICBjb25zdCBmYWN0Q2hlY2tLZXl3b3JkcyA9IFtcclxuICAgICAgICAgICdmYWN0JywgJ2NoZWNrJywgJ3ZlcmlmeScsICdkZWJ1bmsnLCAnaG9heCcsICdmYWtlJywgJ2ZhbHNlJywgJ21pc2xlYWRpbmcnLFxyXG4gICAgICAgICAgJ2FuYWx5c2lzJywgJ2ludmVzdGlnYXRpb24nLCAndHJ1dGgnLCAncmVhbGl0eScsICdjbGFpbScsICdydW1vcidcclxuICAgICAgICBdO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IHRpdGxlQW5kU25pcHBldCA9IGAke3Jlc3VsdC50aXRsZSB8fCAnJ30gJHtyZXN1bHQuc25pcHBldCB8fCAnJ31gLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgY29uc3QgaGFzUmVsZXZhbnRLZXl3b3JkcyA9IGZhY3RDaGVja0tleXdvcmRzLnNvbWUoa2V5d29yZCA9PiBcclxuICAgICAgICAgIHRpdGxlQW5kU25pcHBldC5pbmNsdWRlcyhrZXl3b3JkKVxyXG4gICAgICAgICk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gVHJ1c3RlZCBkb21haW5zIHRoYXQgd2UgYWx3YXlzIGFsbG93XHJcbiAgICAgICAgY29uc3QgdHJ1c3RlZERvbWFpbnMgPSBbXHJcbiAgICAgICAgICAnc25vcGVzLmNvbScsICdmYWN0Y2hlY2sub3JnJywgJ3BvbGl0aWZhY3QuY29tJywgJ3JldXRlcnMuY29tJywgJ2FwLm9yZycsXHJcbiAgICAgICAgICAnYmJjLmNvbScsICdiYmMuY28udWsnLCAnbnl0aW1lcy5jb20nLCAnd2FzaGluZ3RvbnBvc3QuY29tJywgJ3dzai5jb20nLFxyXG4gICAgICAgICAgJ25wci5vcmcnLCAncGJzLm9yZycsICdhYmNuZXdzLmdvLmNvbScsICdjYnNuZXdzLmNvbScsICduYmNuZXdzLmNvbScsXHJcbiAgICAgICAgICAnY25uLmNvbScsICdmb3huZXdzLmNvbScsICdtc25iYy5jb20nLCAnYWJjLm5ldC5hdScsICd0aGVndWFyZGlhbi5jb20nLFxyXG4gICAgICAgICAgJ2luZGVwZW5kZW50LmNvLnVrJywgJ3RlbGVncmFwaC5jby51aycsICdlY29ub21pc3QuY29tJywgJ3RpbWUuY29tJyxcclxuICAgICAgICAgICduZXdzd2Vlay5jb20nLCAndXNhdG9kYXkuY29tJywgJ2xhdGltZXMuY29tJywgJ2NoaWNhZ290cmlidW5lLmNvbSdcclxuICAgICAgICBdO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IGlzRnJvbVRydXN0ZWREb21haW4gPSB0cnVzdGVkRG9tYWlucy5zb21lKGRvbWFpbiA9PiBcclxuICAgICAgICAgIHJlc3VsdERvbWFpbi5pbmNsdWRlcyhkb21haW4pXHJcbiAgICAgICAgKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBFeHRyYWN0IGtleSBlbnRpdGllcyAobmFtZXMsIHBsYWNlcywgZXZlbnRzKSBmcm9tIHRoZSBvcmlnaW5hbCB0aXRsZVxyXG4gICAgICAgIGNvbnN0IG9yaWdpbmFsVGl0bGVMb3dlciA9IHNlYXJjaFRlcm1zLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gRXh0cmFjdCBwcm9wZXIgbm91bnMgYW5kIGltcG9ydGFudCB0ZXJtcyAobGVuZ3RoID4gMywgY2FwaXRhbGl6ZWQgaW4gb3JpZ2luYWwpXHJcbiAgICAgICAgY29uc3Qgb3JpZ2luYWxXb3JkcyA9IHNlYXJjaFRlcm1zLnNwbGl0KCcgJyk7XHJcbiAgICAgICAgY29uc3Qga2V5RW50aXRpZXMgPSBvcmlnaW5hbFdvcmRzLmZpbHRlcih3b3JkID0+IHtcclxuICAgICAgICAgIGNvbnN0IGNsZWFuV29yZCA9IHdvcmQudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICAgIHJldHVybiB3b3JkLmxlbmd0aCA+IDMgJiYgXHJcbiAgICAgICAgICAgICAgICAgIVsndGhlJywgJ2FuZCcsICdmb3InLCAnd2l0aCcsICdmcm9tJywgJ3RoYXQnLCAndGhpcycsICdoYXZlJywgJ2JlZW4nLCAndGhleScsICd3ZXJlJywgJ3NhaWQnLCAnbmV3cycsICdhcnRpY2xlJywgJ3JlcG9ydCcsICdzdG9yeSddLmluY2x1ZGVzKGNsZWFuV29yZCkgJiZcclxuICAgICAgICAgICAgICAgICAod29yZFswXSA9PT0gd29yZFswXS50b1VwcGVyQ2FzZSgpIHx8IGNsZWFuV29yZC5sZW5ndGggPiA1KTsgLy8gUHJvcGVyIG5vdW5zIG9yIGxvbmdlciB3b3Jkc1xyXG4gICAgICAgIH0pLm1hcCh3b3JkID0+IHdvcmQudG9Mb3dlckNhc2UoKSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc29sZS5sb2coJ1tXZWJTZWFyY2hdIEtleSBlbnRpdGllcyBleHRyYWN0ZWQ6Jywga2V5RW50aXRpZXMpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFJlcXVpcmUgYXQgbGVhc3QgMiBrZXkgZW50aXRpZXMgdG8gbWF0Y2gsIG9yIDEgaWYgaXQncyBhIG5hbWUgKDIrIHdvcmRzKVxyXG4gICAgICAgIGNvbnN0IGVudGl0eU1hdGNoZXMgPSBrZXlFbnRpdGllcy5maWx0ZXIoZW50aXR5ID0+IFxyXG4gICAgICAgICAgdGl0bGVBbmRTbmlwcGV0LmluY2x1ZGVzKGVudGl0eSlcclxuICAgICAgICApO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnNvbGUubG9nKCdbV2ViU2VhcmNoXSBFbnRpdHkgbWF0Y2hlcyBmb3VuZDonLCBlbnRpdHlNYXRjaGVzLCAnZm9yIHJlc3VsdDonLCByZXN1bHQudGl0bGUpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IGhhc1N0cm9uZ0VudGl0eU1hdGNoID0gZW50aXR5TWF0Y2hlcy5sZW5ndGggPj0gMiB8fCBcclxuICAgICAgICAgIChlbnRpdHlNYXRjaGVzLmxlbmd0aCA+PSAxICYmIGtleUVudGl0aWVzLnNvbWUoZW50aXR5ID0+IGVudGl0eS5pbmNsdWRlcygnICcpKSk7IC8vIE11bHRpLXdvcmQgZW50aXRpZXMgbGlrZSBcIkJhZCBCdW5ueVwiXHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gQWxsb3cgaWYgYW55IG9mIHRoZXNlIGNvbmRpdGlvbnMgYXJlIG1ldCwgYnV0IHByaW9yaXRpemUgc3Ryb25nIGVudGl0eSBtYXRjaGVzXHJcbiAgICAgICAgY29uc3Qgc2hvdWxkSW5jbHVkZSA9IGhhc1JlbGV2YW50S2V5d29yZHMgfHwgaXNGcm9tVHJ1c3RlZERvbWFpbiB8fCBoYXNTdHJvbmdFbnRpdHlNYXRjaDtcclxuICAgICAgICBcclxuICAgICAgICBjb25zb2xlLmxvZygnW1dlYlNlYXJjaF0gUmVzdWx0IGV2YWx1YXRpb246Jywge1xyXG4gICAgICAgICAgdGl0bGU6IHJlc3VsdC50aXRsZT8uc3Vic3RyaW5nKDAsIDUwKSArICcuLi4nLFxyXG4gICAgICAgICAgaGFzUmVsZXZhbnRLZXl3b3JkcyxcclxuICAgICAgICAgIGlzRnJvbVRydXN0ZWREb21haW4sXHJcbiAgICAgICAgICBoYXNTdHJvbmdFbnRpdHlNYXRjaCxcclxuICAgICAgICAgIHNob3VsZEluY2x1ZGVcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICByZXR1cm4gc2hvdWxkSW5jbHVkZTtcclxuICAgICAgfSlcclxuICAgICAgLm1hcCgocmVzdWx0OiBhbnkpID0+ICh7XHJcbiAgICAgICAgdXJsOiByZXN1bHQubGluayxcclxuICAgICAgICB0aXRsZTogcmVzdWx0LnRpdGxlLFxyXG4gICAgICAgIHNuaXBwZXQ6IHJlc3VsdC5zbmlwcGV0XHJcbiAgICAgIH0pKVxyXG4gICAgICAvLyBSZW1vdmUgZHVwbGljYXRlc1xyXG4gICAgICAuZmlsdGVyKChyZXN1bHQ6IGFueSwgaW5kZXg6IG51bWJlciwgc2VsZjogYW55W10pID0+IFxyXG4gICAgICAgIGluZGV4ID09PSBzZWxmLmZpbmRJbmRleCgocjogYW55KSA9PiByLnVybCA9PT0gcmVzdWx0LnVybClcclxuICAgICAgKVxyXG4gICAgICAuc2xpY2UoMCwgbWF4UmVzdWx0cyk7XHJcbiAgICBcclxuICAgIC8vIElmIHdlIGhhdmUgcmVzdWx0cyBmcm9tIEFJLWdlbmVyYXRlZCBxdWVyeSwgcmV0dXJuIHRoZW1cclxuICAgIGlmIChwcm9jZXNzZWRSZXN1bHRzLmxlbmd0aCA+IDApIHtcclxuICAgICAgY29uc29sZS5sb2coJ1tXZWJTZWFyY2hdIFJldHVybmluZycsIHByb2Nlc3NlZFJlc3VsdHMubGVuZ3RoLCAncmVzdWx0cyBmcm9tIEFJLWdlbmVyYXRlZCBxdWVyeScpO1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHJlc3VsdHM6IHByb2Nlc3NlZFJlc3VsdHMsXHJcbiAgICAgICAgc2VhcmNoTWV0aG9kOiAnYWktZ2VuZXJhdGVkJyxcclxuICAgICAgICBxdWVyeVVzZWQ6IGZpbmFsUXVlcnksXHJcbiAgICAgICAgYWlRdWVyeUdlbmVyYXRlZDogYWlHZW5lcmF0ZWRRdWVyeVxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIElmIG5vIHJlc3VsdHMgZnJvbSBBSS1nZW5lcmF0ZWQgcXVlcnksIHRyeSBmYWxsYmFjayBzdHJhdGVnaWVzXHJcbiAgICBjb25zb2xlLmxvZygnW1dlYlNlYXJjaF0gTm8gcmVzdWx0cyBmcm9tIEFJIHF1ZXJ5LCB0cnlpbmcgZmFsbGJhY2sgc3RyYXRlZ2llcy4uLicpO1xyXG4gICAgICBjb25zdCBmYWxsYmFja1N0cmF0ZWdpZXMgPSBbXHJcbiAgICAgICAgYFwiJHtzZWFyY2hUZXJtc31cIiBmYWN0IGNoZWNrYCxcclxuICAgICAgICBgJHtzZWFyY2hUZXJtc30gdmVyaWZpY2F0aW9uYCxcclxuICAgICAgICBgJHtzZWFyY2hUZXJtc30gZGVidW5rZWRgLFxyXG4gICAgICAgIGAke3NlYXJjaFRlcm1zfSBuZXdzIGFuYWx5c2lzYCxcclxuICAgICAgICBzZWFyY2hUZXJtc1xyXG4gICAgICBdO1xyXG4gICAgICBcclxuICAgICAgZm9yIChjb25zdCBmYWxsYmFja1F1ZXJ5IG9mIGZhbGxiYWNrU3RyYXRlZ2llcykge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdbV2ViU2VhcmNoXSBUcnlpbmcgZmFsbGJhY2sgcXVlcnk6JywgZmFsbGJhY2tRdWVyeSk7XHJcbiAgICAgICAgY29uc3QgZmFsbGJhY2tQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHtcclxuICAgICAgICAgIGtleTogaW1wb3J0Lm1ldGEuZW52LlZJVEVfR09PR0xFX0FQSV9LRVksXHJcbiAgICAgICAgICBjeDogaW1wb3J0Lm1ldGEuZW52LlZJVEVfR09PR0xFX1NFQVJDSF9FTkdJTkVfSUQsXHJcbiAgICAgICAgICBxOiBmYWxsYmFja1F1ZXJ5LFxyXG4gICAgICAgICAgbnVtOiBNYXRoLm1pbigxMCwgbWF4UmVzdWx0cykudG9TdHJpbmcoKSxcclxuICAgICAgICAgIGZpZWxkczogJ2l0ZW1zKHRpdGxlLHNuaXBwZXQsbGluayknXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgZmFsbGJhY2tVcmwgPSBgaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vY3VzdG9tc2VhcmNoL3YxPyR7ZmFsbGJhY2tQYXJhbXMudG9TdHJpbmcoKX1gO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICBjb25zdCBmYWxsYmFja1Jlc3BvbnNlID0gYXdhaXQgZmV0Y2goZmFsbGJhY2tVcmwpO1xyXG4gICAgICAgICAgaWYgKGZhbGxiYWNrUmVzcG9uc2Uub2spIHtcclxuICAgICAgICAgICAgY29uc3QgZmFsbGJhY2tEYXRhID0gYXdhaXQgZmFsbGJhY2tSZXNwb25zZS5qc29uKCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjb25zdCBmYWxsYmFja1Jlc3VsdHMgPSAoZmFsbGJhY2tEYXRhLml0ZW1zIHx8IFtdKVxyXG4gICAgICAgICAgICAgIC5maWx0ZXIoKHJlc3VsdDogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3VsdD8ubGluaykgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyBBcHBseSBzYW1lIGZpbHRlcmluZyBsb2dpYyBhcyBhYm92ZVxyXG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnREb21haW4gJiYgcmVzdWx0LmxpbmsudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhjdXJyZW50RG9tYWluKSkge1xyXG4gICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGNvbnN0IHByb2JsZW1hdGljRG9tYWlucyA9IFtcclxuICAgICAgICAgICAgICAgICAgJzRjaGFuLm9yZycsICc4a3VuLnRvcCcsICdnYWIuY29tJywgJ3Bhcmxlci5jb20nLCAndHJ1dGhzb2NpYWwuY29tJ1xyXG4gICAgICAgICAgICAgICAgXTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0RG9tYWluID0gbmV3IFVSTChyZXN1bHQubGluaykuaG9zdG5hbWUudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICAgICAgICAgIGlmIChwcm9ibGVtYXRpY0RvbWFpbnMuc29tZShkb21haW4gPT4gcmVzdWx0RG9tYWluLmluY2x1ZGVzKGRvbWFpbikpKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgY29uc3QgdXJsUGF0aCA9IG5ldyBVUkwocmVzdWx0LmxpbmspLnBhdGhuYW1lO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgeWVhck1hdGNoID0gdXJsUGF0aC5tYXRjaCgvXFwvKDIwXFxkezJ9KVxcLy8pO1xyXG4gICAgICAgICAgICAgICAgaWYgKHllYXJNYXRjaCkge1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBhcnRpY2xlWWVhciA9IHBhcnNlSW50KHllYXJNYXRjaFsxXSk7XHJcbiAgICAgICAgICAgICAgICAgIGlmIChvcmlnaW5hbEFydGljbGVZZWFyICYmIGFydGljbGVZZWFyICE9PSBvcmlnaW5hbEFydGljbGVZZWFyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGNvbnN0IG9sZENvbnRlbnRQYXR0ZXJucyA9IFtcclxuICAgICAgICAgICAgICAgICAgL1xcLzIwKDBbMC05XXwxWzAtNV0pXFwvLywgLy8gMjAwMC0yMDE1XHJcbiAgICAgICAgICAgICAgICAgIC9hcmNoaXZlXFwuLyxcclxuICAgICAgICAgICAgICAgICAgL29sZFxcLi8sXHJcbiAgICAgICAgICAgICAgICAgIC9sZWdhY3lcXC4vXHJcbiAgICAgICAgICAgICAgICBdO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBpZiAob2xkQ29udGVudFBhdHRlcm5zLnNvbWUocGF0dGVybiA9PiBwYXR0ZXJuLnRlc3QocmVzdWx0LmxpbmspKSkge1xyXG4gICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgLm1hcCgocmVzdWx0OiBhbnkpID0+ICh7XHJcbiAgICAgICAgICAgICAgICB1cmw6IHJlc3VsdC5saW5rLFxyXG4gICAgICAgICAgICAgICAgdGl0bGU6IHJlc3VsdC50aXRsZSxcclxuICAgICAgICAgICAgICAgIHNuaXBwZXQ6IHJlc3VsdC5zbmlwcGV0XHJcbiAgICAgICAgICAgICAgfSkpXHJcbiAgICAgICAgICAgICAgLmZpbHRlcigocmVzdWx0OiBhbnksIGluZGV4OiBudW1iZXIsIHNlbGY6IGFueVtdKSA9PiBcclxuICAgICAgICAgICAgICAgIGluZGV4ID09PSBzZWxmLmZpbmRJbmRleCgocjogYW55KSA9PiByLnVybCA9PT0gcmVzdWx0LnVybClcclxuICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgICAgLnNsaWNlKDAsIG1heFJlc3VsdHMpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKGZhbGxiYWNrUmVzdWx0cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tXZWJTZWFyY2hdIFJldHVybmluZycsIGZhbGxiYWNrUmVzdWx0cy5sZW5ndGgsICdyZXN1bHRzIGZyb20gZmFsbGJhY2sgcXVlcnk6JywgZmFsbGJhY2tRdWVyeSk7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdHM6IGZhbGxiYWNrUmVzdWx0cyxcclxuICAgICAgICAgICAgICAgIHNlYXJjaE1ldGhvZDogJ2ZhbGxiYWNrJyxcclxuICAgICAgICAgICAgICAgIHF1ZXJ5VXNlZDogZmFsbGJhY2tRdWVyeSxcclxuICAgICAgICAgICAgICAgIGFpUXVlcnlHZW5lcmF0ZWQ6IGFpR2VuZXJhdGVkUXVlcnksXHJcbiAgICAgICAgICAgICAgICBmYWxsYmFja1F1ZXJ5VXNlZDogZmFsbGJhY2tRdWVyeVxyXG4gICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChmYWxsYmFja0Vycm9yKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGBGYWxsYmFjayBxdWVyeSBcIiR7ZmFsbGJhY2tRdWVyeX1cIiBmYWlsZWQ6YCwgZmFsbGJhY2tFcnJvcik7XHJcbiAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIFxyXG4gICAgLy8gSWYgbm8gZmFsbGJhY2sgc3RyYXRlZ2llcyB3b3JrZWQsIHJldHVybiBlbXB0eSByZXN1bHRzXHJcbiAgICBjb25zb2xlLmxvZygnW1dlYlNlYXJjaF0gTm8gcmVzdWx0cyBmb3VuZCBmcm9tIGFueSBzdHJhdGVneScpO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcmVzdWx0czogW10sXHJcbiAgICAgIHNlYXJjaE1ldGhvZDogJ2ZhbGxiYWNrJyxcclxuICAgICAgcXVlcnlVc2VkOiAnTm8gc3VjY2Vzc2Z1bCBxdWVyeScsXHJcbiAgICAgIGFpUXVlcnlHZW5lcmF0ZWQ6IGFpR2VuZXJhdGVkUXVlcnksXHJcbiAgICAgIGZhbGxiYWNrUXVlcnlVc2VkOiAnQWxsIGZhbGxiYWNrIHF1ZXJpZXMgZmFpbGVkJ1xyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignQUktcG93ZXJlZCB3ZWIgc2VhcmNoIGZhaWxlZDonLCBlcnJvcik7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICByZXN1bHRzOiBbXSxcclxuICAgICAgc2VhcmNoTWV0aG9kOiAnZmFsbGJhY2snLFxyXG4gICAgICBxdWVyeVVzZWQ6ICdFcnJvciBvY2N1cnJlZCcsXHJcbiAgICAgIGFpUXVlcnlHZW5lcmF0ZWQ6ICdGYWlsZWQgdG8gZ2VuZXJhdGUnLFxyXG4gICAgICBmYWxsYmFja1F1ZXJ5VXNlZDogJ0Vycm9yIGJlZm9yZSBmYWxsYmFjaydcclxuICAgIH07XHJcbiAgfVxyXG59XHJcblxyXG4vLyBUZXN0IGZ1bmN0aW9uIHRvIHZlcmlmeSBsb2dnaW5nIGlzIHdvcmtpbmdcclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHRlc3RXZWJTZWFyY2hMb2dnaW5nKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gIGNvbnNvbGUubG9nKCdbV2ViU2VhcmNoXSBURVNUOiBTdGFydGluZyB3ZWIgc2VhcmNoIGxvZ2dpbmcgdGVzdC4uLicpO1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCB0ZXN0UmVzcG9uc2UgPSBhd2FpdCBwZXJmb3JtV2ViU2VhcmNoKCd0ZXN0IG5ld3MgYXJ0aWNsZSBodHRwczovL2V4YW1wbGUuY29tLzIwMjQvdGVzdCcsIDIpO1xyXG4gICAgY29uc29sZS5sb2coJ1tXZWJTZWFyY2hdIFRFU1Q6IFJlc3BvbnNlIHJlY2VpdmVkOicsIHtcclxuICAgICAgc2VhcmNoTWV0aG9kOiB0ZXN0UmVzcG9uc2Uuc2VhcmNoTWV0aG9kLFxyXG4gICAgICBxdWVyeVVzZWQ6IHRlc3RSZXNwb25zZS5xdWVyeVVzZWQsXHJcbiAgICAgIHJlc3VsdHNDb3VudDogdGVzdFJlc3BvbnNlLnJlc3VsdHMubGVuZ3RoLFxyXG4gICAgICBhaVF1ZXJ5R2VuZXJhdGVkOiB0ZXN0UmVzcG9uc2UuYWlRdWVyeUdlbmVyYXRlZCxcclxuICAgICAgZmFsbGJhY2tRdWVyeVVzZWQ6IHRlc3RSZXNwb25zZS5mYWxsYmFja1F1ZXJ5VXNlZFxyXG4gICAgfSk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUubG9nKCdbV2ViU2VhcmNoXSBURVNUOiBFcnJvciBkdXJpbmcgdGVzdDonLCBlcnJvcik7XHJcbiAgfVxyXG59XHJcblxyXG4vL2ZpeCB3ZWJzZWFyY2ggZXJyb3JzIiwiLy8gVGFiIHN0YXRlIG1hbmFnZW1lbnQgZnVuY3Rpb25hbGl0eVxyXG5cclxuZXhwb3J0IHR5cGUgVGFiU3RhdGUgPSB7XHJcbiAgcGFnZUluZm86IGFueTtcclxuICBhbmFseXNpczogYW55W107XHJcbiAgZmFpbGVkUHJvdmlkZXJzOiBzdHJpbmdbXTtcclxuICBzaG93QnV0dG9uOiBib29sZWFuO1xyXG4gIGlzQW5hbHl6aW5nOiBib29sZWFuO1xyXG4gIGhhc0F0dGVtcHRlZEFuYWx5c2lzOiBib29sZWFuO1xyXG4gIGlzVmlld2luZ0Zyb21SZWNlbnQ/OiBib29sZWFuO1xyXG4gIG9yaWdpbmFsVGFiSWQ/OiBudW1iZXI7XHJcbiAgaGFzUHJlbG9hZGVkQW5hbHlzaXM/OiBib29sZWFuO1xyXG4gIHJlcXVpcmVzTWFudWFsVHJpZ2dlcj86IGJvb2xlYW47XHJcbn07XHJcblxyXG4vLyBJbi1tZW1vcnkgdGFiIHN0YXRlIHN0b3JhZ2VcclxuY29uc3QgdGFiU3RhdGVzID0gbmV3IE1hcDxudW1iZXIsIFRhYlN0YXRlPigpO1xyXG5cclxuLy8gVVJMLWJhc2VkIHN0b3JhZ2UgZm9yIGJldHRlciBhbmFseXNpcyBwZXJzaXN0ZW5jZVxyXG5jb25zdCB1cmxBbmFseXNpc1N0b3JhZ2UgPSBuZXcgTWFwPHN0cmluZywge1xyXG4gIHBhZ2VJbmZvOiBhbnk7XHJcbiAgYW5hbHlzaXM6IGFueVtdO1xyXG4gIGZhaWxlZFByb3ZpZGVyczogc3RyaW5nW107XHJcbiAgdGltZXN0YW1wOiBudW1iZXI7XHJcbn0+KCk7XHJcblxyXG4vLyBUcmFjayB0YWJzIHRoYXQgYXJlIGN1cnJlbnRseSBiZWluZyBzZXQgdXAgdG8gcHJldmVudCBkb3VibGUgZXhlY3V0aW9uXHJcbmNvbnN0IHRhYnNCZWluZ1NldHVwID0gbmV3IFNldDxudW1iZXI+KCk7XHJcblxyXG4vLyBHZXQgZGVmYXVsdCBzdGF0ZSBmb3IgYSBuZXcgdGFiXHJcbmV4cG9ydCBjb25zdCBnZXREZWZhdWx0U3RhdGUgPSAoKTogVGFiU3RhdGUgPT4gKHtcclxuICBwYWdlSW5mbzogbnVsbCxcclxuICBhbmFseXNpczogW10sXHJcbiAgZmFpbGVkUHJvdmlkZXJzOiBbXSxcclxuICBzaG93QnV0dG9uOiB0cnVlLFxyXG4gIGlzQW5hbHl6aW5nOiBmYWxzZSxcclxuICBoYXNBdHRlbXB0ZWRBbmFseXNpczogZmFsc2VcclxufSk7XHJcblxyXG4vLyBQZXJzaXN0ZW50IHRhYiBzdGF0ZSBzdG9yYWdlIGhlbHBlcnNcclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNhdmVUYWJTdGF0ZSh0YWJJZDogbnVtYmVyLCBzdGF0ZTogVGFiU3RhdGUpOiBQcm9taXNlPHZvaWQ+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgZXhpc3RpbmcgPSBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoJ3RhYlN0YXRlcycpO1xyXG4gICAgY29uc3QgdGFiU3RhdGVzT2JqID0gZXhpc3RpbmcudGFiU3RhdGVzIHx8IHt9O1xyXG4gICAgdGFiU3RhdGVzT2JqW3RhYklkXSA9IHN0YXRlO1xyXG4gICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgdGFiU3RhdGVzOiB0YWJTdGF0ZXNPYmogfSk7XHJcbiAgICAvLyBBbHNvIGtlZXAgaW4gbWVtb3J5IGZvciBxdWljayBhY2Nlc3NcclxuICAgIHRhYlN0YXRlcy5zZXQodGFiSWQsIHN0YXRlKTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHNhdmUgdGFiIHN0YXRlOicsIGVycm9yKTtcclxuICAgIC8vIEZhbGxiYWNrIHRvIG1lbW9yeSBvbmx5XHJcbiAgICB0YWJTdGF0ZXMuc2V0KHRhYklkLCBzdGF0ZSk7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0VGFiU3RhdGUodGFiSWQ6IG51bWJlcik6IFByb21pc2U8VGFiU3RhdGUgfCB1bmRlZmluZWQ+IHtcclxuICAvLyBGaXJzdCBjaGVjayBtZW1vcnlcclxuICBpZiAodGFiU3RhdGVzLmhhcyh0YWJJZCkpIHtcclxuICAgIHJldHVybiB0YWJTdGF0ZXMuZ2V0KHRhYklkKTtcclxuICB9XHJcbiAgXHJcbiAgLy8gVGhlbiBjaGVjayBwZXJzaXN0ZW50IHN0b3JhZ2VcclxuICB0cnkge1xyXG4gICAgY29uc3QgZXhpc3RpbmcgPSBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoJ3RhYlN0YXRlcycpO1xyXG4gICAgY29uc3QgdGFiU3RhdGVzT2JqID0gZXhpc3RpbmcudGFiU3RhdGVzIHx8IHt9O1xyXG4gICAgY29uc3Qgc3RhdGUgPSB0YWJTdGF0ZXNPYmpbdGFiSWRdO1xyXG4gICAgaWYgKHN0YXRlKSB7XHJcbiAgICAgIC8vIFJlc3RvcmUgdG8gbWVtb3J5XHJcbiAgICAgIHRhYlN0YXRlcy5zZXQodGFiSWQsIHN0YXRlKTtcclxuICAgICAgcmV0dXJuIHN0YXRlO1xyXG4gICAgfVxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gZ2V0IHRhYiBzdGF0ZTonLCBlcnJvcik7XHJcbiAgfVxyXG4gIFxyXG4gIHJldHVybiB1bmRlZmluZWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkZWxldGVUYWJTdGF0ZSh0YWJJZDogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGV4aXN0aW5nID0gYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KCd0YWJTdGF0ZXMnKTtcclxuICAgIGNvbnN0IHRhYlN0YXRlc09iaiA9IGV4aXN0aW5nLnRhYlN0YXRlcyB8fCB7fTtcclxuICAgIGRlbGV0ZSB0YWJTdGF0ZXNPYmpbdGFiSWRdO1xyXG4gICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgdGFiU3RhdGVzOiB0YWJTdGF0ZXNPYmogfSk7XHJcbiAgICAvLyBBbHNvIHJlbW92ZSBmcm9tIG1lbW9yeVxyXG4gICAgdGFiU3RhdGVzLmRlbGV0ZSh0YWJJZCk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBkZWxldGUgdGFiIHN0YXRlOicsIGVycm9yKTtcclxuICAgIC8vIEZhbGxiYWNrIHRvIG1lbW9yeSBvbmx5XHJcbiAgICB0YWJTdGF0ZXMuZGVsZXRlKHRhYklkKTtcclxuICB9XHJcbn1cclxuXHJcbi8vIFVSTCBhbmFseXNpcyBzdG9yYWdlIGhlbHBlcnNcclxuZXhwb3J0IGZ1bmN0aW9uIGdldFVybEFuYWx5c2lzKHVybDogc3RyaW5nKSB7XHJcbiAgcmV0dXJuIHVybEFuYWx5c2lzU3RvcmFnZS5nZXQodXJsKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNldFVybEFuYWx5c2lzKHVybDogc3RyaW5nLCBkYXRhOiB7XHJcbiAgcGFnZUluZm86IGFueTtcclxuICBhbmFseXNpczogYW55W107XHJcbiAgZmFpbGVkUHJvdmlkZXJzOiBzdHJpbmdbXTtcclxuICB0aW1lc3RhbXA6IG51bWJlcjtcclxufSkge1xyXG4gIHVybEFuYWx5c2lzU3RvcmFnZS5zZXQodXJsLCBkYXRhKTtcclxufVxyXG5cclxuLy8gVGFiIHNldHVwIHRyYWNraW5nXHJcbmV4cG9ydCBmdW5jdGlvbiBpc1RhYkJlaW5nU2V0dXAodGFiSWQ6IG51bWJlcik6IGJvb2xlYW4ge1xyXG4gIHJldHVybiB0YWJzQmVpbmdTZXR1cC5oYXModGFiSWQpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbWFya1RhYkFzQmVpbmdTZXR1cCh0YWJJZDogbnVtYmVyKTogdm9pZCB7XHJcbiAgdGFic0JlaW5nU2V0dXAuYWRkKHRhYklkKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHVubWFya1RhYkFzQmVpbmdTZXR1cCh0YWJJZDogbnVtYmVyKTogdm9pZCB7XHJcbiAgdGFic0JlaW5nU2V0dXAuZGVsZXRlKHRhYklkKTtcclxufVxyXG5cclxuLy8gQ2xlYW51cCBvbGQgVVJMIGFuYWx5c2lzIGVudHJpZXMgKG9sZGVyIHRoYW4gMjQgaG91cnMpXHJcbmV4cG9ydCBjb25zdCBjbGVhbnVwVXJsU3RvcmFnZSA9ICgpOiB2b2lkID0+IHtcclxuICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xyXG4gIGNvbnN0IG1heEFnZSA9IDI0ICogNjAgKiA2MCAqIDEwMDA7IC8vIDI0IGhvdXJzXHJcbiAgZm9yIChjb25zdCBbdXJsLCBkYXRhXSBvZiB1cmxBbmFseXNpc1N0b3JhZ2UuZW50cmllcygpKSB7XHJcbiAgICBpZiAobm93IC0gZGF0YS50aW1lc3RhbXAgPiBtYXhBZ2UpIHtcclxuICAgICAgdXJsQW5hbHlzaXNTdG9yYWdlLmRlbGV0ZSh1cmwpO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbi8vIENsZWFudXAgb2xkIHRhYiBzdGF0ZXMgZnJvbSBzdG9yYWdlIChmb3IgY2xvc2VkIHRhYnMpXHJcbmV4cG9ydCBjb25zdCBjbGVhbnVwVGFiU3RhdGVzID0gYXN5bmMgKCk6IFByb21pc2U8dm9pZD4gPT4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCB0YWJTdGF0ZXNEYXRhID0gYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KCd0YWJTdGF0ZXMnKTtcclxuICAgIGNvbnN0IHRhYlN0YXRlc09iaiA9IHRhYlN0YXRlc0RhdGEudGFiU3RhdGVzIHx8IHt9O1xyXG4gICAgY29uc3QgYWxsVGFicyA9IGF3YWl0IGNocm9tZS50YWJzLnF1ZXJ5KHt9KTtcclxuICAgIGNvbnN0IGFjdGl2ZVRhYklkcyA9IG5ldyBTZXQoYWxsVGFicy5tYXAodGFiID0+IHRhYi5pZCkpO1xyXG4gICAgXHJcbiAgICAvLyBSZW1vdmUgc3RhdGVzIGZvciB0YWJzIHRoYXQgbm8gbG9uZ2VyIGV4aXN0XHJcbiAgICBsZXQgY2xlYW5lZCA9IGZhbHNlO1xyXG4gICAgZm9yIChjb25zdCB0YWJJZCBvZiBPYmplY3Qua2V5cyh0YWJTdGF0ZXNPYmopKSB7XHJcbiAgICAgIGlmICghYWN0aXZlVGFiSWRzLmhhcyhwYXJzZUludCh0YWJJZCkpKSB7XHJcbiAgICAgICAgZGVsZXRlIHRhYlN0YXRlc09ialt0YWJJZF07XHJcbiAgICAgICAgY2xlYW5lZCA9IHRydWU7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgaWYgKGNsZWFuZWQpIHtcclxuICAgICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgdGFiU3RhdGVzOiB0YWJTdGF0ZXNPYmogfSk7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdDbGVhbmVkIHVwIG9sZCB0YWIgc3RhdGVzJyk7XHJcbiAgICB9XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGNsZWFuaW5nIHVwIHRhYiBzdGF0ZXM6JywgZXJyb3IpO1xyXG4gIH1cclxufTtcclxuIiwiLy8gQW5hbHlzaXMgcHJvY2Vzc2luZyBhbmQgSlNPTiBwYXJzaW5nIHV0aWxpdGllc1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNsZWFuQW5kUGFyc2VKU09OKHRleHQ6IHN0cmluZykge1xyXG4gIHRyeSB7XHJcbiAgICAvLyBGaXJzdCB0cnkgZGlyZWN0IEpTT04gcGFyc2VcclxuICAgIHJldHVybiBKU09OLnBhcnNlKHRleHQpO1xyXG4gIH0gY2F0Y2ggKGUpIHtcclxuICAgIC8vIElmIHRoYXQgZmFpbHMsIHRyeSB0byBjbGVhbiBhbmQgZXh0cmFjdCBKU09OXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBSZW1vdmUgYW55IGxlYWRpbmcvdHJhaWxpbmcgbm9uLUpTT04gY29udGVudFxyXG4gICAgICBsZXQganNvblN0ciA9IHRleHQudHJpbSgpO1xyXG4gICAgICBcclxuICAgICAgLy8gRmluZCB0aGUgZmlyc3QgeyBhbmQgbGFzdCB9XHJcbiAgICAgIGNvbnN0IHN0YXJ0SWR4ID0ganNvblN0ci5pbmRleE9mKCd7Jyk7XHJcbiAgICAgIGNvbnN0IGVuZElkeCA9IGpzb25TdHIubGFzdEluZGV4T2YoJ30nKSArIDE7XHJcbiAgICAgIGlmIChzdGFydElkeCA+PSAwICYmIGVuZElkeCA+IHN0YXJ0SWR4KSB7XHJcbiAgICAgICAganNvblN0ciA9IGpzb25TdHIuc2xpY2Uoc3RhcnRJZHgsIGVuZElkeCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIENsZWFuIHVwIGNvbW1vbiBmb3JtYXR0aW5nIGlzc3Vlc1xyXG4gICAgICBqc29uU3RyID0ganNvblN0clxyXG4gICAgICAgIC5yZXBsYWNlKC9cXFxcbi9nLCAnICcpICAgICAgICAgICAvLyBSZXBsYWNlIFxcbiB3aXRoIHNwYWNlXHJcbiAgICAgICAgLnJlcGxhY2UoL1xccysvZywgJyAnKSAgICAgICAgICAgLy8gUmVwbGFjZSBtdWx0aXBsZSBzcGFjZXMgd2l0aCBzaW5nbGUgc3BhY2VcclxuICAgICAgICAucmVwbGFjZSgvXCJcXHMqLFxccyp9L2csICdcIn0nKSAgICAvLyBSZW1vdmUgdHJhaWxpbmcgY29tbWFzXHJcbiAgICAgICAgLnJlcGxhY2UoLywoXFxzKn0pL2csICckMScpICAgICAgLy8gUmVtb3ZlIHRyYWlsaW5nIGNvbW1hcyBpbiBvYmplY3RzXHJcbiAgICAgICAgLnJlcGxhY2UoL1xcLiwvZywgJy4nKSAgICAgICAgICAgLy8gRml4IFwiLixcIiBpc3N1ZXNcclxuICAgICAgICAucmVwbGFjZSgvXFwuXCIvZywgJ1wiJykgICAgICAgICAgIC8vIEZpeCB0cmFpbGluZyBwZXJpb2RzIGluIHN0cmluZ3NcclxuICAgICAgICAucmVwbGFjZSgvXCJcXHMqXFwuXFxzKiQvZywgJ1wiJykgICAgLy8gRml4IHRyYWlsaW5nIHBlcmlvZHMgYWZ0ZXIgcXVvdGVzXHJcbiAgICAgICAgLnJlcGxhY2UoL1xcW1xccyosL2csICdbJykgICAgICAgIC8vIEZpeCBsZWFkaW5nIGNvbW1hcyBpbiBhcnJheXNcclxuICAgICAgICAucmVwbGFjZSgvLFxccypcXF0vZywgJ10nKTsgICAgICAgLy8gRml4IHRyYWlsaW5nIGNvbW1hcyBpbiBhcnJheXNcclxuXHJcbiAgICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UoanNvblN0cik7XHJcblxyXG4gICAgICAvLyBDbGVhbiB1cCB0aGUgcGFyc2VkIG9iamVjdFxyXG4gICAgICBpZiAocGFyc2VkLmNyZWRpYmlsaXR5X3N1bW1hcnkpIHtcclxuICAgICAgICBwYXJzZWQuY3JlZGliaWxpdHlfc3VtbWFyeSA9IHBhcnNlZC5jcmVkaWJpbGl0eV9zdW1tYXJ5XHJcbiAgICAgICAgICAudHJpbSgpXHJcbiAgICAgICAgICAucmVwbGFjZSgvXFxzKy9nLCAnICcpXHJcbiAgICAgICAgICAucmVwbGFjZSgvXFwuLC9nLCAnLicpXHJcbiAgICAgICAgICAucmVwbGFjZSgvXFwuKyQvLCAnLicpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAocGFyc2VkLnJlYXNvbmluZykge1xyXG4gICAgICAgIHBhcnNlZC5yZWFzb25pbmcgPSBwYXJzZWQucmVhc29uaW5nXHJcbiAgICAgICAgICAudHJpbSgpXHJcbiAgICAgICAgICAucmVwbGFjZSgvXFxzKy9nLCAnICcpXHJcbiAgICAgICAgICAucmVwbGFjZSgvXFwuLC9nLCAnLicpXHJcbiAgICAgICAgICAucmVwbGFjZSgvXFwuKyQvLCAnLicpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShwYXJzZWQuZXZpZGVuY2Vfc2VudGVuY2VzKSkge1xyXG4gICAgICAgIHBhcnNlZC5ldmlkZW5jZV9zZW50ZW5jZXMgPSBwYXJzZWQuZXZpZGVuY2Vfc2VudGVuY2VzLm1hcCgoZXZpZGVuY2U6IGFueSkgPT4gKHtcclxuICAgICAgICAgIHF1b3RlOiBldmlkZW5jZS5xdW90ZT8udHJpbSgpLnJlcGxhY2UoL1xccysvZywgJyAnKS5yZXBsYWNlKC9cXC4rJC8sICcnKSB8fCAnJyxcclxuICAgICAgICAgIGltcGFjdDogZXZpZGVuY2UuaW1wYWN0Py50cmltKCkucmVwbGFjZSgvXFxzKy9nLCAnICcpLnJlcGxhY2UoL1xcLiskLywgJycpIHx8ICcnXHJcbiAgICAgICAgfSkpLmZpbHRlcigoZTogYW55KSA9PiBlLnF1b3RlICYmIGUuaW1wYWN0KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocGFyc2VkLnN1cHBvcnRpbmdfbGlua3MpKSB7XHJcbiAgICAgICAgcGFyc2VkLnN1cHBvcnRpbmdfbGlua3MgPSBwYXJzZWQuc3VwcG9ydGluZ19saW5rc1xyXG4gICAgICAgICAgLm1hcCgobGluazogc3RyaW5nKSA9PiBsaW5rLnRyaW0oKSlcclxuICAgICAgICAgIC5maWx0ZXIoQm9vbGVhbik7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEVuc3VyZSBjcmVkaWJpbGl0eV9zY29yZSBpcyBhIG51bWJlciBiZXR3ZWVuIDEtMTAwXHJcbiAgICAgIGlmICh0eXBlb2YgcGFyc2VkLmNyZWRpYmlsaXR5X3Njb3JlID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgIHBhcnNlZC5jcmVkaWJpbGl0eV9zY29yZSA9IHBhcnNlSW50KHBhcnNlZC5jcmVkaWJpbGl0eV9zY29yZSwgMTApO1xyXG4gICAgICB9XHJcbiAgICAgIHBhcnNlZC5jcmVkaWJpbGl0eV9zY29yZSA9IE1hdGgubWF4KDEsIE1hdGgubWluKDEwMCwgcGFyc2VkLmNyZWRpYmlsaXR5X3Njb3JlIHx8IDApKTtcclxuXHJcbiAgICAgIHJldHVybiBwYXJzZWQ7XHJcbiAgICB9IGNhdGNoIChlMikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gcGFyc2UgY2xlYW5lZCBKU09OOicsIGUyKTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIEpTT04gZm9ybWF0Jyk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEFuYWx5c2lzUmVzdWx0IHtcclxuICBwcm92aWRlcjogc3RyaW5nO1xyXG4gIHJlc3VsdDoge1xyXG4gICAgY3JlZGliaWxpdHlfc2NvcmU6IG51bWJlcjtcclxuICAgIGNyZWRpYmlsaXR5X3N1bW1hcnk6IHN0cmluZztcclxuICAgIHJlYXNvbmluZzogc3RyaW5nO1xyXG4gICAgZXZpZGVuY2Vfc2VudGVuY2VzOiBBcnJheTx7XHJcbiAgICAgIHF1b3RlOiBzdHJpbmc7XHJcbiAgICAgIGltcGFjdDogc3RyaW5nO1xyXG4gICAgfT47XHJcbiAgICBzdXBwb3J0aW5nX2xpbmtzOiBzdHJpbmdbXTtcclxuICB9O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcHJvY2Vzc0FuYWx5c2lzUmVzdWx0cyhcclxuICByZXN1bHRzOiBQcm9taXNlU2V0dGxlZFJlc3VsdDxhbnk+W10sXHJcbiAgcHJvdmlkZXJzOiBzdHJpbmdbXVxyXG4pOiB7IHN1Y2Nlc3NmdWxSZXN1bHRzOiBBbmFseXNpc1Jlc3VsdFtdOyBmYWlsZWRQcm92aWRlcnM6IHN0cmluZ1tdIH0ge1xyXG4gIGNvbnN0IHN1Y2Nlc3NmdWxSZXN1bHRzID0gcmVzdWx0c1xyXG4gICAgLm1hcCgociwgaSkgPT4ge1xyXG4gICAgICBpZiAoci5zdGF0dXMgPT09ICdmdWxmaWxsZWQnKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgIGxldCBwYXJzZWRSZXN1bHQ7XHJcbiAgICAgICAgICBpZiAodHlwZW9mIHIudmFsdWUgPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgcGFyc2VkUmVzdWx0ID0gY2xlYW5BbmRQYXJzZUpTT04oci52YWx1ZSk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gcGFyc2UgcmVzdWx0OicsIGUpO1xyXG4gICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBwYXJzZWRSZXN1bHQgPSByLnZhbHVlO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGlmICghcGFyc2VkUmVzdWx0KSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ05vIHBhcnNlZCByZXN1bHQgYXZhaWxhYmxlJyk7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIFZhbGlkYXRlIHRoZSBzdHJ1Y3R1cmVcclxuICAgICAgICAgIGlmICh0eXBlb2YgcGFyc2VkUmVzdWx0LmNyZWRpYmlsaXR5X3Njb3JlICE9PSAnbnVtYmVyJyB8fFxyXG4gICAgICAgICAgICAgIHR5cGVvZiBwYXJzZWRSZXN1bHQuY3JlZGliaWxpdHlfc3VtbWFyeSAhPT0gJ3N0cmluZycgfHxcclxuICAgICAgICAgICAgICB0eXBlb2YgcGFyc2VkUmVzdWx0LnJlYXNvbmluZyAhPT0gJ3N0cmluZycgfHxcclxuICAgICAgICAgICAgICAhQXJyYXkuaXNBcnJheShwYXJzZWRSZXN1bHQuZXZpZGVuY2Vfc2VudGVuY2VzKSB8fFxyXG4gICAgICAgICAgICAgICFBcnJheS5pc0FycmF5KHBhcnNlZFJlc3VsdC5zdXBwb3J0aW5nX2xpbmtzKSkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdJbnZhbGlkIHJlc3VsdCBzdHJ1Y3R1cmU6JywgcGFyc2VkUmVzdWx0KTtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcHJvdmlkZXI6IHByb3ZpZGVyc1tpXSxcclxuICAgICAgICAgICAgcmVzdWx0OiBwYXJzZWRSZXN1bHRcclxuICAgICAgICAgIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgcHJvY2Vzc2luZyByZXN1bHQgZnJvbSBwcm92aWRlciAke3Byb3ZpZGVyc1tpXX06YCwgZSk7XHJcbiAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9KVxyXG4gICAgLmZpbHRlcigoeCk6IHggaXMgTm9uTnVsbGFibGU8dHlwZW9mIHg+ID0+IHggIT09IG51bGwpO1xyXG5cclxuICBjb25zdCBmYWlsZWRQcm92aWRlcnMgPSByZXN1bHRzXHJcbiAgICAubWFwKChyLCBpKSA9PiB7XHJcbiAgICAgIGlmIChyLnN0YXR1cyA9PT0gJ3JlamVjdGVkJykge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYFByb3ZpZGVyICR7cHJvdmlkZXJzW2ldfSBmYWlsZWQ6YCwgci5yZWFzb24pO1xyXG4gICAgICAgIHJldHVybiBwcm92aWRlcnNbaV07XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9KVxyXG4gICAgLmZpbHRlcigoeCk6IHggaXMgc3RyaW5nID0+IHggIT09IG51bGwpO1xyXG5cclxuICByZXR1cm4geyBzdWNjZXNzZnVsUmVzdWx0cywgZmFpbGVkUHJvdmlkZXJzIH07XHJcbn1cclxuIiwiLy8gTWVzc2FnZSBoYW5kbGVycyBmb3IgYmFja2dyb3VuZCBzY3JpcHRcclxuaW1wb3J0IHsgZmV0Y2hPcGVuQUksIGZldGNoR2VtaW5pLCBmZXRjaENvaGVyZSB9IGZyb20gJy4vYWlIYW5kbGluZyc7XHJcbmltcG9ydCB7IHBlcmZvcm1XZWJTZWFyY2ggfSBmcm9tICcuL3dlYlNlYXJjaCc7XHJcbmltcG9ydCB7IFxyXG4gIHNhdmVUYWJTdGF0ZSwgXHJcbiAgZ2V0VGFiU3RhdGUsIFxyXG4gIGRlbGV0ZVRhYlN0YXRlLCBcclxuICBnZXREZWZhdWx0U3RhdGUsXHJcbiAgZ2V0VXJsQW5hbHlzaXMsXHJcbiAgc2V0VXJsQW5hbHlzaXMsXHJcbiAgaXNUYWJCZWluZ1NldHVwLFxyXG4gIG1hcmtUYWJBc0JlaW5nU2V0dXAsXHJcbiAgdW5tYXJrVGFiQXNCZWluZ1NldHVwXHJcbn0gZnJvbSAnLi90YWJTdGF0ZSc7XHJcbmltcG9ydCB7IHByb2Nlc3NBbmFseXNpc1Jlc3VsdHMgfSBmcm9tICcuL2FuYWx5c2lzUHJvY2Vzc29yJztcclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVHZXRQYWdlSW5mbyhtZXNzYWdlOiBhbnksIHNlbmRlcjogYW55LCBzZW5kUmVzcG9uc2U6IChyZXNwb25zZTogYW55KSA9PiB2b2lkKSB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHRhYklkID0gbWVzc2FnZS50YWJJZCB8fCBzZW5kZXIudGFiPy5pZDtcclxuICAgIGlmICghdGFiSWQpIHtcclxuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gdGFiIElEIGZvdW5kJyB9KTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHBhZ2VJbmZvID0gYXdhaXQgY2hyb21lLnRhYnMuc2VuZE1lc3NhZ2UodGFiSWQsIHsgdHlwZTogJ0dFVF9QQUdFX0NPTlRFTlQnIH0pO1xyXG4gICAgaWYgKHBhZ2VJbmZvICYmIHBhZ2VJbmZvLmVycm9yKSB7XHJcbiAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogcGFnZUluZm8uZXJyb3IgfSk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBHZXQgb3IgY3JlYXRlIHN0YXRlIGZvciB0aGlzIHRhYlxyXG4gICAgbGV0IHN0YXRlID0gYXdhaXQgZ2V0VGFiU3RhdGUodGFiSWQpIHx8IGdldERlZmF1bHRTdGF0ZSgpO1xyXG4gICAgXHJcbiAgICAvLyBVcGRhdGUgc3RhdGUgd2l0aCBuZXcgcGFnZSBpbmZvLCBidXQgcHJlc2VydmUgZXhpc3RpbmcgYW5hbHlzaXMgaWYgcGFnZSBpcyB0aGUgc2FtZVxyXG4gICAgY29uc3QgaXNTYW1lUGFnZSA9IHN0YXRlLnBhZ2VJbmZvPy51cmwgPT09IHBhZ2VJbmZvLmRhdGEudXJsO1xyXG4gICAgXHJcbiAgICBzdGF0ZSA9IHtcclxuICAgICAgLi4uc3RhdGUsXHJcbiAgICAgIHBhZ2VJbmZvOiBwYWdlSW5mby5kYXRhLFxyXG4gICAgICBzaG93QnV0dG9uOiB0cnVlLFxyXG4gICAgICBhbmFseXNpczogaXNTYW1lUGFnZSA/IHN0YXRlLmFuYWx5c2lzIDogW10sXHJcbiAgICAgIGZhaWxlZFByb3ZpZGVyczogaXNTYW1lUGFnZSA/IHN0YXRlLmZhaWxlZFByb3ZpZGVycyA6IFtdLFxyXG4gICAgICBoYXNBdHRlbXB0ZWRBbmFseXNpczogZmFsc2VcclxuICAgIH07XHJcbiAgICBcclxuICAgIGF3YWl0IHNhdmVUYWJTdGF0ZSh0YWJJZCwgc3RhdGUpO1xyXG4gICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogcGFnZUluZm8uZGF0YSB9KTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyBwYWdlIGluZm86JywgZXJyb3IpO1xyXG4gICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnRmFpbGVkIHRvIGZldGNoIHBhZ2UgaW5mbycgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlQW5hbHl6ZUFydGljbGUobWVzc2FnZTogYW55LCBzZW5kZXI6IGFueSwgc2VuZFJlc3BvbnNlOiAocmVzcG9uc2U6IGFueSkgPT4gdm9pZCkge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zb2xlLmxvZygnW05ld3NTY2FuXSBoYW5kbGVBbmFseXplQXJ0aWNsZSBjYWxsZWQgd2l0aDonLCBtZXNzYWdlKTtcclxuICAgIGNvbnN0IHRhYklkID0gbWVzc2FnZS50YWJJZDtcclxuICAgIGlmICghdGFiSWQpIHtcclxuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gdGFiIElEIHByb3ZpZGVkJyB9KTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHByb3ZpZGVycyA9IG1lc3NhZ2UucHJvdmlkZXJzIHx8IFtdO1xyXG4gICAgY29uc29sZS5sb2coJ1tOZXdzU2Nhbl0gUHJvdmlkZXJzIHRvIHVzZTonLCBwcm92aWRlcnMpO1xyXG4gICAgXHJcbiAgICAvLyBTZXQgYW5hbHl6aW5nIHN0YXRlIGZvciB0aGlzIHRhYlxyXG4gICAgbGV0IGN1cnJlbnRTdGF0ZSA9IGF3YWl0IGdldFRhYlN0YXRlKHRhYklkKSB8fCBnZXREZWZhdWx0U3RhdGUoKTtcclxuICAgIGN1cnJlbnRTdGF0ZS5pc0FuYWx5emluZyA9IHRydWU7XHJcbiAgICBhd2FpdCBzYXZlVGFiU3RhdGUodGFiSWQsIGN1cnJlbnRTdGF0ZSk7XHJcbiAgICBcclxuICAgIC8vIENyZWF0ZSBpbmRpdmlkdWFsIHByb21pc2VzIHRoYXQgc2VuZCB1cGRhdGVzIGFzIHRoZXkgY29tcGxldGVcclxuICAgIGNvbnN0IHByb3ZpZGVyUHJvbWlzZXMgPSBwcm92aWRlcnMubWFwKGFzeW5jIChwcm92aWRlcjogc3RyaW5nKSA9PiB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgbGV0IHJlc3VsdDtcclxuICAgICAgICBzd2l0Y2ggKHByb3ZpZGVyKSB7XHJcbiAgICAgICAgICBjYXNlICdPcGVuQUknOlxyXG4gICAgICAgICAgICByZXN1bHQgPSBhd2FpdCBmZXRjaE9wZW5BSShtZXNzYWdlLmNvbnRlbnQsIGltcG9ydC5tZXRhLmVudi5WSVRFX09QRU5BSV9BUElfS0VZIHx8ICcnKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICBjYXNlICdHZW1pbmknOlxyXG4gICAgICAgICAgICByZXN1bHQgPSBhd2FpdCBmZXRjaEdlbWluaShtZXNzYWdlLmNvbnRlbnQsIGltcG9ydC5tZXRhLmVudi5WSVRFX0dFTUlOSV9BUElfS0VZIHx8ICcnKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICBjYXNlICdDb2hlcmUnOlxyXG4gICAgICAgICAgICByZXN1bHQgPSBhd2FpdCBmZXRjaENvaGVyZShtZXNzYWdlLmNvbnRlbnQsIGltcG9ydC5tZXRhLmVudi5WSVRFX0NPSEVSRV9BUElfS0VZIHx8ICcnKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gcHJvdmlkZXI6ICR7cHJvdmlkZXJ9YCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFNlbmQgc3VjY2VzcyB1cGRhdGUgaW1tZWRpYXRlbHlcclxuICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XHJcbiAgICAgICAgICB0eXBlOiAnUFJPVklERVJfVVBEQVRFJyxcclxuICAgICAgICAgIHByb3ZpZGVyOiBwcm92aWRlcixcclxuICAgICAgICAgIHN0YXR1czogJ2NvbXBsZXRlJ1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgaW4gcHJvdmlkZXIgJHtwcm92aWRlcn06YCwgZXJyb3IpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFNlbmQgZmFpbHVyZSB1cGRhdGUgaW1tZWRpYXRlbHlcclxuICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XHJcbiAgICAgICAgICB0eXBlOiAnUFJPVklERVJfVVBEQVRFJyxcclxuICAgICAgICAgIHByb3ZpZGVyOiBwcm92aWRlcixcclxuICAgICAgICAgIHN0YXR1czogJ2ZhaWxlZCdcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IFByb21pc2UuYWxsU2V0dGxlZChwcm92aWRlclByb21pc2VzKTtcclxuXHJcbiAgICAvLyBQcm9jZXNzIHJlc3VsdHNcclxuICAgIGNvbnN0IHsgc3VjY2Vzc2Z1bFJlc3VsdHMsIGZhaWxlZFByb3ZpZGVycyB9ID0gcHJvY2Vzc0FuYWx5c2lzUmVzdWx0cyhyZXN1bHRzLCBwcm92aWRlcnMpO1xyXG5cclxuICAgIC8vIFVwZGF0ZSB0YWIgc3RhdGUgd2l0aCBhbmFseXNpcyByZXN1bHRzXHJcbiAgICBsZXQgc3RhdGUgPSBhd2FpdCBnZXRUYWJTdGF0ZSh0YWJJZCk7XHJcbiAgICBpZiAoIXN0YXRlKSB7XHJcbiAgICAgIGNvbnNvbGUud2FybignTm8gZXhpc3RpbmcgdGFiIHN0YXRlIGZvdW5kIGR1cmluZyBhbmFseXNpcycpO1xyXG4gICAgICBzdGF0ZSA9IGdldERlZmF1bHRTdGF0ZSgpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBzdGF0ZS5hbmFseXNpcyA9IHN1Y2Nlc3NmdWxSZXN1bHRzO1xyXG4gICAgc3RhdGUuZmFpbGVkUHJvdmlkZXJzID0gZmFpbGVkUHJvdmlkZXJzO1xyXG4gICAgc3RhdGUuc2hvd0J1dHRvbiA9IGZhbHNlO1xyXG4gICAgc3RhdGUuaXNBbmFseXppbmcgPSBmYWxzZTtcclxuICAgIHN0YXRlLmhhc0F0dGVtcHRlZEFuYWx5c2lzID0gdHJ1ZTtcclxuICAgIFxyXG4gICAgYXdhaXQgc2F2ZVRhYlN0YXRlKHRhYklkLCBzdGF0ZSk7XHJcbiAgICBcclxuICAgIHNlbmRSZXNwb25zZSh7XHJcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgIGRhdGE6IHtcclxuICAgICAgICBzdWNjZXNzZnVsUmVzdWx0cyxcclxuICAgICAgICBmYWlsZWRQcm92aWRlcnNcclxuICAgICAgfSxcclxuICAgICAgcHJvdmlkZXJzOiBwcm92aWRlcnNcclxuICAgIH0pO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBpbiBhbmFseXplIGFydGljbGU6JywgZXJyb3IpO1xyXG4gICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnRmFpbGVkIHRvIGFuYWx5emUgYXJ0aWNsZScgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlR2V0VGFiU3RhdGUobWVzc2FnZTogYW55LCBzZW5kZXI6IGFueSwgc2VuZFJlc3BvbnNlOiAocmVzcG9uc2U6IGFueSkgPT4gdm9pZCkge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCB0YWJJZCA9IG1lc3NhZ2UudGFiSWQgfHwgc2VuZGVyLnRhYj8uaWQ7XHJcbiAgICBpZiAoIXRhYklkKSB7XHJcbiAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIHRhYiBJRCBmb3VuZCcgfSk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBJZiBVUkwgaXMgcHJvdmlkZWQsIHNlYXJjaCBmb3IgZXhpc3RpbmcgYW5hbHlzaXMgZm9yIHRoYXQgVVJMXHJcbiAgICBpZiAobWVzc2FnZS51cmwpIHtcclxuICAgICAgLy8gRmlyc3QgY2hlY2sgVVJMLWJhc2VkIHN0b3JhZ2VcclxuICAgICAgY29uc3QgdXJsQW5hbHlzaXMgPSBnZXRVcmxBbmFseXNpcyhtZXNzYWdlLnVybCk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAodXJsQW5hbHlzaXMpIHtcclxuICAgICAgICBjb25zdCBzdGF0ZSA9IHtcclxuICAgICAgICAgIHBhZ2VJbmZvOiB1cmxBbmFseXNpcy5wYWdlSW5mbyxcclxuICAgICAgICAgIGFuYWx5c2lzOiB1cmxBbmFseXNpcy5hbmFseXNpcyxcclxuICAgICAgICAgIGZhaWxlZFByb3ZpZGVyczogdXJsQW5hbHlzaXMuZmFpbGVkUHJvdmlkZXJzLFxyXG4gICAgICAgICAgc2hvd0J1dHRvbjogZmFsc2UsXHJcbiAgICAgICAgICBpc0FuYWx5emluZzogZmFsc2UsXHJcbiAgICAgICAgICBoYXNBdHRlbXB0ZWRBbmFseXNpczogdHJ1ZSxcclxuICAgICAgICAgIGlzVmlld2luZ0Zyb21SZWNlbnQ6IHRydWUsXHJcbiAgICAgICAgICBvcmlnaW5hbFRhYklkOiB1bmRlZmluZWRcclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFNhdmUgdGhpcyBzdGF0ZSBmb3IgdGhlIGN1cnJlbnQgdGFiXHJcbiAgICAgICAgYXdhaXQgc2F2ZVRhYlN0YXRlKHRhYklkLCBzdGF0ZSk7XHJcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogc3RhdGUgfSk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICAvLyBGYWxsYmFjazogc2VhcmNoIHRocm91Z2ggYWxsIHRhYiBzdGF0ZXMgdG8gZmluZCBhbmFseXNpcyBmb3IgdGhpcyBVUkxcclxuICAgICAgY29uc3QgdGFiU3RhdGVzRGF0YSA9IGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldCgndGFiU3RhdGVzJyk7XHJcbiAgICAgIGNvbnN0IHRhYlN0YXRlc09iaiA9IHRhYlN0YXRlc0RhdGEudGFiU3RhdGVzIHx8IHt9O1xyXG4gICAgICBcclxuICAgICAgZm9yIChjb25zdCBbdElkLCBzdGF0ZV0gb2YgT2JqZWN0LmVudHJpZXModGFiU3RhdGVzT2JqKSkge1xyXG4gICAgICAgIGNvbnN0IHRhYlN0YXRlID0gc3RhdGUgYXMgYW55O1xyXG4gICAgICAgIGlmICh0YWJTdGF0ZS5wYWdlSW5mbz8udXJsID09PSBtZXNzYWdlLnVybCAmJiB0YWJTdGF0ZS5hbmFseXNpcyAmJiB0YWJTdGF0ZS5hbmFseXNpcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB0YWJTdGF0ZSB9KTtcclxuICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vIE5vIGV4aXN0aW5nIGFuYWx5c2lzIGZvdW5kIGZvciB0aGlzIFVSTFxyXG4gICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBnZXREZWZhdWx0U3RhdGUoKSB9KTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvLyBPdGhlcndpc2UsIGdldCBzdGF0ZSBmb3IgdGhlIGN1cnJlbnQgdGFiXHJcbiAgICBjb25zdCBzdGF0ZSA9IGF3YWl0IGdldFRhYlN0YXRlKHRhYklkKSB8fCBnZXREZWZhdWx0U3RhdGUoKTtcclxuICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHN0YXRlIH0pO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBpbiBHRVRfVEFCX1NUQVRFOicsIGVycm9yKTtcclxuICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0ZhaWxlZCB0byBnZXQgdGFiIHN0YXRlJyB9KTtcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVSZXNldFRhYlN0YXRlKG1lc3NhZ2U6IGFueSwgc2VuZGVyOiBhbnksIHNlbmRSZXNwb25zZTogKHJlc3BvbnNlOiBhbnkpID0+IHZvaWQpIHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgdGFiSWQgPSBtZXNzYWdlLnRhYklkIHx8IHNlbmRlci50YWI/LmlkO1xyXG4gICAgaWYgKCF0YWJJZCkge1xyXG4gICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyB0YWIgSUQgZm91bmQnIH0pO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2xlYXIgdGhlIHN0YXRlIGNvbXBsZXRlbHlcclxuICAgIGF3YWl0IGRlbGV0ZVRhYlN0YXRlKHRhYklkKTtcclxuICAgIFxyXG4gICAgLy8gSW5pdGlhbGl6ZSB3aXRoIGRlZmF1bHQgc3RhdGVcclxuICAgIGNvbnN0IGRlZmF1bHRTdGF0ZSA9IGdldERlZmF1bHRTdGF0ZSgpO1xyXG4gICAgYXdhaXQgc2F2ZVRhYlN0YXRlKHRhYklkLCBkZWZhdWx0U3RhdGUpO1xyXG4gICAgXHJcbiAgICAvLyBOb3RpZnkgb3RoZXIgaW5zdGFuY2VzIG9mIHRoZSBzaWRlcGFuZWwgYWJvdXQgdGhlIHJlc2V0XHJcbiAgICBjaHJvbWUudGFicy5zZW5kTWVzc2FnZSh0YWJJZCwge1xyXG4gICAgICB0eXBlOiAnVEFCX1NXSVRDSEVEJyxcclxuICAgICAgc3RhdGU6IGRlZmF1bHRTdGF0ZVxyXG4gICAgfSkuY2F0Y2goKCkgPT4ge1xyXG4gICAgICAvLyBJZ25vcmUgZXJyb3JzIGlmIGNvbnRlbnQgc2NyaXB0IGlzbid0IHJlYWR5XHJcbiAgICB9KTtcclxuICAgIFxyXG4gICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSB9KTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgcmVzZXR0aW5nIHRhYiBzdGF0ZTonLCBlcnJvcik7XHJcbiAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdGYWlsZWQgdG8gcmVzZXQgdGFiIHN0YXRlJyB9KTtcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVTYXZlVGFiU3RhdGUobWVzc2FnZTogYW55LCBzZW5kZXI6IGFueSwgc2VuZFJlc3BvbnNlOiAocmVzcG9uc2U6IGFueSkgPT4gdm9pZCkge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCB0YWJJZCA9IG1lc3NhZ2UudGFiSWQgfHwgc2VuZGVyLnRhYj8uaWQ7XHJcbiAgICBpZiAoIXRhYklkKSB7XHJcbiAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIHRhYiBJRCBhdmFpbGFibGUgdG8gc2F2ZSBzdGF0ZScgfSk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBTYXZlIHRoZSBwcm92aWRlZCBzdGF0ZSBmb3IgdGhpcyB0YWJcclxuICAgIGF3YWl0IHNhdmVUYWJTdGF0ZSh0YWJJZCwge1xyXG4gICAgICBwYWdlSW5mbzogbWVzc2FnZS5kYXRhLnBhZ2VJbmZvLFxyXG4gICAgICBhbmFseXNpczogbWVzc2FnZS5kYXRhLmFuYWx5c2lzLFxyXG4gICAgICBmYWlsZWRQcm92aWRlcnM6IG1lc3NhZ2UuZGF0YS5mYWlsZWRQcm92aWRlcnMsXHJcbiAgICAgIHNob3dCdXR0b246IG1lc3NhZ2UuZGF0YS5zaG93QnV0dG9uLFxyXG4gICAgICBpc0FuYWx5emluZzogbWVzc2FnZS5kYXRhLmlzQW5hbHl6aW5nIHx8IGZhbHNlLFxyXG4gICAgICBoYXNBdHRlbXB0ZWRBbmFseXNpczogbWVzc2FnZS5kYXRhLmhhc0F0dGVtcHRlZEFuYWx5c2lzIHx8IGZhbHNlLFxyXG4gICAgICBpc1ZpZXdpbmdGcm9tUmVjZW50OiBtZXNzYWdlLmRhdGEuaXNWaWV3aW5nRnJvbVJlY2VudCB8fCBmYWxzZSxcclxuICAgICAgb3JpZ2luYWxUYWJJZDogbWVzc2FnZS5kYXRhLm9yaWdpbmFsVGFiSWRcclxuICAgIH0pO1xyXG4gICAgXHJcbiAgICAvLyBBbHNvIHNhdmUgdG8gVVJMLWJhc2VkIHN0b3JhZ2UgaWYgd2UgaGF2ZSBhbmFseXNpc1xyXG4gICAgaWYgKG1lc3NhZ2UuZGF0YS5wYWdlSW5mbz8udXJsICYmIG1lc3NhZ2UuZGF0YS5hbmFseXNpcyAmJiBtZXNzYWdlLmRhdGEuYW5hbHlzaXMubGVuZ3RoID4gMCkge1xyXG4gICAgICBzZXRVcmxBbmFseXNpcyhtZXNzYWdlLmRhdGEucGFnZUluZm8udXJsLCB7XHJcbiAgICAgICAgcGFnZUluZm86IG1lc3NhZ2UuZGF0YS5wYWdlSW5mbyxcclxuICAgICAgICBhbmFseXNpczogbWVzc2FnZS5kYXRhLmFuYWx5c2lzLFxyXG4gICAgICAgIGZhaWxlZFByb3ZpZGVyczogbWVzc2FnZS5kYXRhLmZhaWxlZFByb3ZpZGVycyxcclxuICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KClcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0ZhaWxlZCB0byBzYXZlIHRhYiBzdGF0ZScgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlV2ViU2VhcmNoKG1lc3NhZ2U6IGFueSwgc2VuZGVyOiBhbnksIHNlbmRSZXNwb25zZTogKHJlc3BvbnNlOiBhbnkpID0+IHZvaWQpIHtcclxuICB0cnkge1xyXG4gICAgLy8gQ29tYmluZSB0aGUgcXVlcnkgd2l0aCB0aGUgb3JpZ2luYWwgVVJMIHRvIGV4dHJhY3QgeWVhciBpbmZvcm1hdGlvblxyXG4gICAgY29uc3Qgc2VhcmNoUXVlcnkgPSBtZXNzYWdlLm9yaWdpbmFsVXJsID8gYCR7bWVzc2FnZS5xdWVyeX0gJHttZXNzYWdlLm9yaWdpbmFsVXJsfWAgOiBtZXNzYWdlLnF1ZXJ5O1xyXG4gICAgXHJcbiAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgcGVyZm9ybVdlYlNlYXJjaChzZWFyY2hRdWVyeSwgbWVzc2FnZS5tYXhfcmVzdWx0cyk7XHJcbiAgICBzZW5kUmVzcG9uc2UoeyBcclxuICAgICAgc3VjY2VzczogdHJ1ZSwgXHJcbiAgICAgIGRhdGE6IHsgcmVzdWx0cyB9IFxyXG4gICAgfSk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ1dlYiBzZWFyY2ggZXJyb3I6JywgZXJyb3IpO1xyXG4gICAgc2VuZFJlc3BvbnNlKHsgXHJcbiAgICAgIHN1Y2Nlc3M6IGZhbHNlLCBcclxuICAgICAgZXJyb3I6ICdGYWlsZWQgdG8gcGVyZm9ybSB3ZWIgc2VhcmNoJyBcclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZUxvYWRBbmFseXNpc0luVGFiKG1lc3NhZ2U6IGFueSwgc2VuZGVyOiBhbnksIHNlbmRSZXNwb25zZTogKHJlc3BvbnNlOiBhbnkpID0+IHZvaWQpIHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgdGFiSWQgPSBtZXNzYWdlLnRhYklkO1xyXG4gICAgY29uc3QgYW5hbHlzaXNEYXRhID0gbWVzc2FnZS5hbmFseXNpc0RhdGE7XHJcblxyXG4gICAgLy8gUHJldmVudCBkb3VibGUgZXhlY3V0aW9uXHJcbiAgICBpZiAoaXNUYWJCZWluZ1NldHVwKHRhYklkKSkge1xyXG4gICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdUYWIgYWxyZWFkeSBiZWluZyBzZXQgdXAnIH0pO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIE1hcmsgdGhpcyB0YWIgYXMgYmVpbmcgc2V0IHVwXHJcbiAgICBtYXJrVGFiQXNCZWluZ1NldHVwKHRhYklkKTtcclxuXHJcbiAgICAvLyBTdG9yZSB0aGUgYW5hbHlzaXMgZGF0YSBmb3IgdGhpcyB0YWJcclxuICAgIGNvbnN0IG5ld1N0YXRlID0ge1xyXG4gICAgICBwYWdlSW5mbzogYW5hbHlzaXNEYXRhLnBhZ2VJbmZvLFxyXG4gICAgICBhbmFseXNpczogYW5hbHlzaXNEYXRhLmFuYWx5c2lzLFxyXG4gICAgICBmYWlsZWRQcm92aWRlcnM6IGFuYWx5c2lzRGF0YS5mYWlsZWRQcm92aWRlcnMsXHJcbiAgICAgIHNob3dCdXR0b246IGZhbHNlLFxyXG4gICAgICBpc0FuYWx5emluZzogZmFsc2UsXHJcbiAgICAgIGhhc0F0dGVtcHRlZEFuYWx5c2lzOiB0cnVlLFxyXG4gICAgICBpc1ZpZXdpbmdGcm9tUmVjZW50OiBhbmFseXNpc0RhdGEuaXNWaWV3aW5nRnJvbVJlY2VudCB8fCBmYWxzZSxcclxuICAgICAgb3JpZ2luYWxUYWJJZDogYW5hbHlzaXNEYXRhLm9yaWdpbmFsVGFiSWRcclxuICAgIH07XHJcbiAgICBcclxuICAgIGF3YWl0IHNhdmVUYWJTdGF0ZSh0YWJJZCwgbmV3U3RhdGUpO1xyXG5cclxuICAgIC8vIEFsc28gc3RvcmUgaW4gVVJMLWJhc2VkIHN0b3JhZ2VcclxuICAgIGlmIChhbmFseXNpc0RhdGEucGFnZUluZm8/LnVybCkge1xyXG4gICAgICBzZXRVcmxBbmFseXNpcyhhbmFseXNpc0RhdGEucGFnZUluZm8udXJsLCB7XHJcbiAgICAgICAgcGFnZUluZm86IGFuYWx5c2lzRGF0YS5wYWdlSW5mbyxcclxuICAgICAgICBhbmFseXNpczogYW5hbHlzaXNEYXRhLmFuYWx5c2lzLFxyXG4gICAgICAgIGZhaWxlZFByb3ZpZGVyczogYW5hbHlzaXNEYXRhLmZhaWxlZFByb3ZpZGVycyxcclxuICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KClcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gTWFyayB0aGlzIHRhYiBhcyBoYXZpbmcgcHJlLWxvYWRlZCBhbmFseXNpcyB0byBwcmV2ZW50IGludGVyZmVyZW5jZVxyXG4gICAgYXdhaXQgc2F2ZVRhYlN0YXRlKHRhYklkLCB7XHJcbiAgICAgIC4uLm5ld1N0YXRlLFxyXG4gICAgICBoYXNQcmVsb2FkZWRBbmFseXNpczogdHJ1ZVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gV2FpdCBmb3IgcGFnZSB0byBsb2FkLCB0aGVuIGluamVjdCBjb250ZW50IHNjcmlwdCBhbmQgb3BlbiBzaWRlYmFyIGluIG9uZSBzdGVwXHJcbiAgICBzZXRUaW1lb3V0KGFzeW5jICgpID0+IHtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICAvLyBDaGVjayBpZiBjb250ZW50IHNjcmlwdCBpcyBhbHJlYWR5IGluamVjdGVkXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgIGF3YWl0IGNocm9tZS50YWJzLnNlbmRNZXNzYWdlKHRhYklkLCB7IHR5cGU6ICdGTlJfUElORycgfSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgIC8vIEluamVjdCBjb250ZW50IHNjcmlwdCBmaXJzdFxyXG4gICAgICAgICAgYXdhaXQgY2hyb21lLnNjcmlwdGluZy5leGVjdXRlU2NyaXB0KHtcclxuICAgICAgICAgICAgdGFyZ2V0OiB7IHRhYklkOiB0YWJJZCB9LFxyXG4gICAgICAgICAgICBmaWxlczogWydjb250ZW50LXNjcmlwdHMvY29udGVudC5qcyddLFxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFNtYWxsIGRlbGF5IHRvIGVuc3VyZSBjb250ZW50IHNjcmlwdCBpcyByZWFkeSwgdGhlbiBvcGVuIHNpZGViYXJcclxuICAgICAgICBzZXRUaW1lb3V0KGFzeW5jICgpID0+IHtcclxuICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRhYiBzdGlsbCBleGlzdHMgYmVmb3JlIHNlbmRpbmcgbWVzc2FnZVxyXG4gICAgICAgICAgICBjb25zdCB0YWIgPSBhd2FpdCBjaHJvbWUudGFicy5nZXQodGFiSWQpO1xyXG4gICAgICAgICAgICBpZiAoIXRhYikge1xyXG4gICAgICAgICAgICAgIHVubWFya1RhYkFzQmVpbmdTZXR1cCh0YWJJZCk7XHJcbiAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnVGFiIG5vIGxvbmdlciBleGlzdHMnIH0pO1xyXG4gICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIGhpc3RvcnkgdmlldyAtIGlmIHNvLCB3ZSBTSE9VTEQgb3BlbiB0aGUgc2lkZWJhclxyXG4gICAgICAgICAgICBpZiAobmV3U3RhdGUuaXNWaWV3aW5nRnJvbVJlY2VudCkge1xyXG4gICAgICAgICAgICAgIGNocm9tZS50YWJzLnNlbmRNZXNzYWdlKHRhYklkLCB7IFxyXG4gICAgICAgICAgICAgICAgdHlwZTogJ1RPR0dMRV9JTkpFQ1RFRF9TSURFQkFSJyxcclxuICAgICAgICAgICAgICAgIGtlZXBPcGVuOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgcHJlbG9hZGVkQW5hbHlzaXM6IG5ld1N0YXRlXHJcbiAgICAgICAgICAgICAgfSwgKHJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgIHVubWFya1RhYkFzQmVpbmdTZXR1cCh0YWJJZCk7XHJcbiAgICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yLm1lc3NhZ2UgfSk7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHVubWFya1RhYkFzQmVpbmdTZXR1cCh0YWJJZCk7XHJcbiAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlIH0pO1xyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIC8vIEp1c3Qgc2F2ZSB0aGUgYW5hbHlzaXMgZGF0YSB3aXRob3V0IG9wZW5pbmcgc2lkZWJhclxyXG4gICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XHJcbiAgICAgICAgICAgICAgdW5tYXJrVGFiQXNCZWluZ1NldHVwKHRhYklkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgdW5tYXJrVGFiQXNCZWluZ1NldHVwKHRhYklkKTtcclxuICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnRmFpbGVkIHRvIG9wZW4gc2lkZWJhcicgfSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSwgMjAwKTtcclxuICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3Igc2V0dGluZyB1cCBhbmFseXNpcyB0YWI6JywgZXJyKTtcclxuICAgICAgICB1bm1hcmtUYWJBc0JlaW5nU2V0dXAodGFiSWQpO1xyXG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0ZhaWxlZCB0byBzZXR1cCBhbmFseXNpcyB0YWInIH0pO1xyXG4gICAgICB9XHJcbiAgICB9LCAxMDAwKTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgaW4gTE9BRF9BTkFMWVNJU19JTl9UQUI6JywgZXJyb3IpO1xyXG4gICAgdW5tYXJrVGFiQXNCZWluZ1NldHVwKHRhYklkKTtcclxuICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0ZhaWxlZCB0byBsb2FkIGFuYWx5c2lzIGluIHRhYicgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlTmF2aWdhdGVBbmRSZW9wZW5TaWRlYmFyKG1lc3NhZ2U6IGFueSwgc2VuZGVyOiBhbnksIHNlbmRSZXNwb25zZTogKHJlc3BvbnNlOiBhbnkpID0+IHZvaWQpIHtcclxuICB0cnkge1xyXG4gICAgLy8gQ3JlYXRlIGEgbmV3IHRhYiB3aXRoIHRoZSBVUkxcclxuICAgIGNvbnN0IG5ld1RhYiA9IGF3YWl0IGNocm9tZS50YWJzLmNyZWF0ZSh7IHVybDogbWVzc2FnZS51cmwgfSk7XHJcbiAgICBpZiAoIW5ld1RhYi5pZCkge1xyXG4gICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdGYWlsZWQgdG8gY3JlYXRlIG5ldyB0YWInIH0pO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgdGFiSWQgPSBuZXdUYWIuaWQ7XHJcblxyXG4gICAgLy8gV2FpdCBmb3IgcGFnZSB0byBsb2FkLCB0aGVuIGluamVjdCBjb250ZW50IHNjcmlwdCBhbmQgb3BlbiBzaWRlYmFyXHJcbiAgICBzZXRUaW1lb3V0KGFzeW5jICgpID0+IHtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICAvLyBJbmplY3QgY29udGVudCBzY3JpcHRcclxuICAgICAgICBhd2FpdCBjaHJvbWUuc2NyaXB0aW5nLmV4ZWN1dGVTY3JpcHQoe1xyXG4gICAgICAgICAgdGFyZ2V0OiB7IHRhYklkOiB0YWJJZCB9LFxyXG4gICAgICAgICAgZmlsZXM6IFsnY29udGVudC1zY3JpcHRzL2NvbnRlbnQuanMnXSxcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBXYWl0IGZvciBjb250ZW50IHNjcmlwdCB0byBiZSByZWFkeVxyXG4gICAgICAgIGNvbnN0IHdhaXRGb3JDb250ZW50U2NyaXB0ID0gKCkgPT4ge1xyXG4gICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ0NvbnRlbnQgc2NyaXB0IG5vdCByZWFkeSBhZnRlciA1IHNlY29uZHMnKSk7XHJcbiAgICAgICAgICAgIH0sIDUwMDApO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgY2hyb21lLnRhYnMuc2VuZE1lc3NhZ2UodGFiSWQsIHsgdHlwZTogJ0ZOUl9QSU5HJyB9LCAocmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XHJcbiAgICAgICAgICAgICAgaWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xyXG4gICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihjaHJvbWUucnVudGltZS5sYXN0RXJyb3IubWVzc2FnZSkpO1xyXG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2U/Lm9rKSB7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xyXG4gICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKCdDb250ZW50IHNjcmlwdCBub3QgcmVzcG9uZGluZycpKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBcclxuICAgICAgICBhd2FpdCB3YWl0Rm9yQ29udGVudFNjcmlwdCgpO1xyXG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XHJcbiAgICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGluIHNpZGViYXIgc2V0dXA6JywgZXJyKTtcclxuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyciBpbnN0YW5jZW9mIEVycm9yID8gZXJyLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcicgfSk7XHJcbiAgICAgIH1cclxuICAgIH0sIDEwMDApO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBpbiBOQVZJR0FURV9BTkRfUkVPUEVOX1NJREVCQVI6JywgZXJyb3IpO1xyXG4gICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTmF2aWdhdGlvbiBmYWlsZWQnIH0pO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZVByZWxvYWRVcmxBbmFseXNpcyhtZXNzYWdlOiBhbnksIHNlbmRlcjogYW55LCBzZW5kUmVzcG9uc2U6IChyZXNwb25zZTogYW55KSA9PiB2b2lkKSB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHsgdXJsLCBwYWdlSW5mbywgYW5hbHlzaXMsIGZhaWxlZFByb3ZpZGVycyB9ID0gbWVzc2FnZTtcclxuICAgIGlmICghdXJsIHx8ICFhbmFseXNpcyB8fCBhbmFseXNpcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTWlzc2luZyB1cmwgb3IgYW5hbHlzaXMnIH0pO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIFN0b3JlIGluIFVSTC1iYXNlZCBzdG9yYWdlXHJcbiAgICBzZXRVcmxBbmFseXNpcyh1cmwsIHtcclxuICAgICAgcGFnZUluZm86IHBhZ2VJbmZvLFxyXG4gICAgICBhbmFseXNpczogYW5hbHlzaXMsXHJcbiAgICAgIGZhaWxlZFByb3ZpZGVyczogZmFpbGVkUHJvdmlkZXJzIHx8IFtdLFxyXG4gICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXHJcbiAgICB9KTtcclxuICAgIFxyXG4gICAgLy8gQWxzbyBzdG9yZSBpbiByZWNlbnQgYW5hbHlzZXMgZm9yIGhpc3RvcnlcclxuICAgIGNvbnN0IHJlY2VudERhdGEgPSBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoJ3JlY2VudEFuYWx5c2VzJyk7XHJcbiAgICBjb25zdCByZWNlbnRMaXN0ID0gcmVjZW50RGF0YS5yZWNlbnRBbmFseXNlcyB8fCBbXTtcclxuICAgIFxyXG4gICAgLy8gVXBkYXRlIGV4aXN0aW5nIGVudHJ5IG9yIGFkZCBuZXcgb25lXHJcbiAgICBjb25zdCBleGlzdGluZ0luZGV4ID0gcmVjZW50TGlzdC5maW5kSW5kZXgoKGl0ZW06IGFueSkgPT4gaXRlbS51cmwgPT09IHVybCk7XHJcbiAgICBjb25zdCBoaXN0b3J5RW50cnkgPSB7XHJcbiAgICAgIHRpdGxlOiBwYWdlSW5mby50aXRsZSB8fCAnVW5rbm93biBUaXRsZScsXHJcbiAgICAgIHVybDogdXJsLFxyXG4gICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXHJcbiAgICAgIHNjb3JlOiBhbmFseXNpc1swXT8ucmVzdWx0Py5jcmVkaWJpbGl0eV9zY29yZSB8fCBudWxsLFxyXG4gICAgICBmdWxsQW5hbHlzaXM6IGFuYWx5c2lzLFxyXG4gICAgICBwYWdlSW5mbzogcGFnZUluZm8sXHJcbiAgICAgIGZhaWxlZFByb3ZpZGVyczogZmFpbGVkUHJvdmlkZXJzIHx8IFtdXHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICBpZiAoZXhpc3RpbmdJbmRleCA+PSAwKSB7XHJcbiAgICAgIHJlY2VudExpc3RbZXhpc3RpbmdJbmRleF0gPSBoaXN0b3J5RW50cnk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZWNlbnRMaXN0LnVuc2hpZnQoaGlzdG9yeUVudHJ5KTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gS2VlcCBvbmx5IGxhc3QgNTAgZW50cmllc1xyXG4gICAgY29uc3QgdHJpbW1lZExpc3QgPSByZWNlbnRMaXN0LnNsaWNlKDAsIDUwKTtcclxuICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IHJlY2VudEFuYWx5c2VzOiB0cmltbWVkTGlzdCB9KTtcclxuICAgIFxyXG4gICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSB9KTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgaW4gUFJFTE9BRF9VUkxfQU5BTFlTSVM6JywgZXJyb3IpO1xyXG4gICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnRmFpbGVkIHRvIHByZWxvYWQgYW5hbHlzaXMnIH0pO1xyXG4gIH1cclxufVxyXG4iLCJpbXBvcnQgeyBkZWZpbmVCYWNrZ3JvdW5kIH0gZnJvbSAnd3h0L3V0aWxzL2RlZmluZS1iYWNrZ3JvdW5kJ1xyXG5pbXBvcnQgeyBcclxuICBoYW5kbGVHZXRQYWdlSW5mbyxcclxuICBoYW5kbGVBbmFseXplQXJ0aWNsZSxcclxuICBoYW5kbGVHZXRUYWJTdGF0ZSxcclxuICBoYW5kbGVSZXNldFRhYlN0YXRlLFxyXG4gIGhhbmRsZVNhdmVUYWJTdGF0ZSxcclxuICBoYW5kbGVXZWJTZWFyY2gsXHJcbiAgaGFuZGxlTG9hZEFuYWx5c2lzSW5UYWIsXHJcbiAgaGFuZGxlTmF2aWdhdGVBbmRSZW9wZW5TaWRlYmFyLFxyXG4gIGhhbmRsZVByZWxvYWRVcmxBbmFseXNpc1xyXG59IGZyb20gJy4uL3V0aWxzL21lc3NhZ2VIYW5kbGVycydcclxuaW1wb3J0IHsgXHJcbiAgZGVsZXRlVGFiU3RhdGUsIFxyXG4gIGNsZWFudXBVcmxTdG9yYWdlLCBcclxuICBjbGVhbnVwVGFiU3RhdGVzLFxyXG4gIHVubWFya1RhYkFzQmVpbmdTZXR1cFxyXG59IGZyb20gJy4uL3V0aWxzL3RhYlN0YXRlJ1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQmFja2dyb3VuZCh7XHJcbiAgbWFpbigpIHtcclxuICAgIC8vIExpc3RlbiBmb3IgZXh0ZW5zaW9uIGluc3RhbGxhdGlvblxyXG4gICAgY2hyb21lLnJ1bnRpbWUub25JbnN0YWxsZWQuYWRkTGlzdGVuZXIoKCkgPT4ge1xyXG4gICAgICBjb25zb2xlLmxvZygnRXh0ZW5zaW9uIGluc3RhbGxlZCcpXHJcbiAgICB9KVxyXG4gICAgXHJcbiAgICAvLyBDbGVhbnVwIFVSTCBzdG9yYWdlIGV2ZXJ5IGhvdXJcclxuICAgIHNldEludGVydmFsKGNsZWFudXBVcmxTdG9yYWdlLCA2MCAqIDYwICogMTAwMCk7XHJcbiAgICBcclxuICAgIC8vIENsZWFudXAgdGFiIHN0YXRlcyBldmVyeSA1IG1pbnV0ZXNcclxuICAgIHNldEludGVydmFsKGNsZWFudXBUYWJTdGF0ZXMsIDUgKiA2MCAqIDEwMDApO1xyXG5cclxuICAgIC8vIEhhbmRsZSBleHRlbnNpb24gaWNvbiBjbGlja3MgdG8gdG9nZ2xlIGluamVjdGVkIHNpZGViYXJcclxuICAgIGNocm9tZS5hY3Rpb24ub25DbGlja2VkLmFkZExpc3RlbmVyKGFzeW5jICgpID0+IHtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICBjb25zdCBbdGFiXSA9IGF3YWl0IGNocm9tZS50YWJzLnF1ZXJ5KHsgYWN0aXZlOiB0cnVlLCBjdXJyZW50V2luZG93OiB0cnVlIH0pO1xyXG4gICAgICAgIGlmICghdGFiPy5pZCkge1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgcGluZyA9ICh0YWJJZDogbnVtYmVyKSA9PlxyXG4gICAgICAgICAgbmV3IFByb21pc2U8Ym9vbGVhbj4oKHJlc29sdmUpID0+IHtcclxuICAgICAgICAgICAgbGV0IHNldHRsZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICBjaHJvbWUudGFicy5zZW5kTWVzc2FnZSh0YWJJZCwgeyB0eXBlOiAnRk5SX1BJTkcnIH0sIChyZXNwKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgIGlmICghc2V0dGxlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNldHRsZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICghc2V0dGxlZCkge1xyXG4gICAgICAgICAgICAgICAgICBzZXR0bGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgcmVzb2x2ZSghIXJlc3A/Lm9rKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgIGlmICghc2V0dGxlZCkge1xyXG4gICAgICAgICAgICAgICAgc2V0dGxlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKGZhbHNlKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgaWYgKCFzZXR0bGVkKSB7XHJcbiAgICAgICAgICAgICAgICBzZXR0bGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoZmFsc2UpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSwgNDAwKTtcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjb25zdCBzZW5kVG9nZ2xlID0gYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgYXdhaXQgY2hyb21lLnRhYnMuc2VuZE1lc3NhZ2UodGFiLmlkISwgeyB0eXBlOiAnVE9HR0xFX0lOSkVDVEVEX1NJREVCQVInIH0pO1xyXG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnVG9nZ2xlIHNlbmQgZXJyb3I6JywgZSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy8gQ2hlY2sgaWYgY29udGVudCBzY3JpcHQgaXMgYWxyZWFkeSBpbmplY3RlZFxyXG4gICAgICAgIGNvbnN0IGhhc0xpc3RlbmVyID0gYXdhaXQgcGluZyh0YWIuaWQpO1xyXG4gICAgICAgIGlmIChoYXNMaXN0ZW5lcikge1xyXG4gICAgICAgICAgYXdhaXQgc2VuZFRvZ2dsZSgpO1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gSW5qZWN0IGNvbnRlbnQgc2NyaXB0IHRoZW4gcmV0cnlcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgYXdhaXQgY2hyb21lLnNjcmlwdGluZy5leGVjdXRlU2NyaXB0KHtcclxuICAgICAgICAgICAgdGFyZ2V0OiB7IHRhYklkOiB0YWIuaWQgfSxcclxuICAgICAgICAgICAgZmlsZXM6IFsnY29udGVudC1zY3JpcHRzL2NvbnRlbnQuanMnXSxcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coJ0ZhaWxlZCB0byBpbmplY3QgY29udGVudCBzY3JpcHQ6JywgZXJyKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGhhc0xpc3RlbmVyQWZ0ZXIgPSBhd2FpdCBwaW5nKHRhYi5pZCk7XHJcbiAgICAgICAgYXdhaXQgc2VuZFRvZ2dsZSgpO1xyXG4gICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ0ZhaWxlZCB0byB0b2dnbGUgaW5qZWN0ZWQgc2lkZWJhcjonLCBlKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gTGlzdGVuIGZvciB0YWIgcmVtb3ZhbCB0byBjbGVhbiB1cCBzdGF0ZVxyXG4gICAgY2hyb21lLnRhYnMub25SZW1vdmVkLmFkZExpc3RlbmVyKCh0YWJJZCkgPT4ge1xyXG4gICAgICBkZWxldGVUYWJTdGF0ZSh0YWJJZCk7XHJcbiAgICAgIHVubWFya1RhYkFzQmVpbmdTZXR1cCh0YWJJZCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBMaXN0ZW4gZm9yIHRhYiBhY3RpdmF0aW9uIHRvIGhhbmRsZSBzdGF0ZSBtYW5hZ2VtZW50IHdoZW4gc3dpdGNoaW5nIHRhYnNcclxuICAgIGNocm9tZS50YWJzLm9uQWN0aXZhdGVkLmFkZExpc3RlbmVyKGFzeW5jIChhY3RpdmVJbmZvKSA9PiB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgLy8gU2VuZCBhIG1lc3NhZ2UgdG8gdGhlIHNpZGViYXIgdG8gdXBkYXRlIGl0cyBzdGF0ZVxyXG4gICAgICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHtcclxuICAgICAgICAgIHR5cGU6ICdUQUJfU1dJVENIRUQnLFxyXG4gICAgICAgICAgdGFiSWQ6IGFjdGl2ZUluZm8udGFiSWQsXHJcbiAgICAgICAgfSkuY2F0Y2goKCkgPT4ge1xyXG4gICAgICAgICAgLy8gSWdub3JlIGVycm9ycyBpZiBzaWRlYmFyIGlzIG5vdCBvcGVuXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ0Vycm9yIGhhbmRsaW5nIHRhYiBzd2l0Y2g6JywgZXJyb3IpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBNZXNzYWdlIGhhbmRsZXJcclxuICAgIGNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcclxuICAgICAgY29uc3QgbWVzc2FnZVR5cGUgPSBtZXNzYWdlLnR5cGU7XHJcblxyXG4gICAgICBzd2l0Y2ggKG1lc3NhZ2VUeXBlKSB7XHJcbiAgICAgICAgY2FzZSAnR0VUX1BBR0VfSU5GTyc6XHJcbiAgICAgICAgICBoYW5kbGVHZXRQYWdlSW5mbyhtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSk7XHJcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuXHJcbiAgICAgICAgY2FzZSAnQU5BTFlaRV9BUlRJQ0xFJzpcclxuICAgICAgICAgIGhhbmRsZUFuYWx5emVBcnRpY2xlKG1lc3NhZ2UsIHNlbmRlciwgc2VuZFJlc3BvbnNlKTtcclxuICAgICAgICAgIHJldHVybiB0cnVlO1xyXG5cclxuICAgICAgICBjYXNlICdHRVRfVEFCX1NUQVRFJzpcclxuICAgICAgICAgIGhhbmRsZUdldFRhYlN0YXRlKG1lc3NhZ2UsIHNlbmRlciwgc2VuZFJlc3BvbnNlKTtcclxuICAgICAgICAgIHJldHVybiB0cnVlO1xyXG5cclxuICAgICAgICBjYXNlICdSRVNFVF9UQUJfU1RBVEUnOlxyXG4gICAgICAgICAgaGFuZGxlUmVzZXRUYWJTdGF0ZShtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSk7XHJcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuXHJcbiAgICAgICAgY2FzZSAnU0FWRV9UQUJfU1RBVEUnOlxyXG4gICAgICAgICAgaGFuZGxlU2F2ZVRhYlN0YXRlKG1lc3NhZ2UsIHNlbmRlciwgc2VuZFJlc3BvbnNlKTtcclxuICAgICAgICAgIHJldHVybiB0cnVlO1xyXG5cclxuICAgICAgICBjYXNlICdXRUJfU0VBUkNIJzpcclxuICAgICAgICAgIGhhbmRsZVdlYlNlYXJjaChtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSk7XHJcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuXHJcbiAgICAgICAgY2FzZSAnVEFCX1NXSVRDSEVEJzpcclxuICAgICAgICAgIC8vIFRoaXMgbWVzc2FnZSBpcyBzZW50IGZyb20gdGhlIGJhY2tncm91bmQgc2NyaXB0IHRvIHRoZSBzaWRlYmFyXHJcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuXHJcbiAgICAgICAgY2FzZSAnTE9BRF9BTkFMWVNJU19JTl9UQUInOlxyXG4gICAgICAgICAgaGFuZGxlTG9hZEFuYWx5c2lzSW5UYWIobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpO1xyXG4gICAgICAgICAgcmV0dXJuIHRydWU7XHJcblxyXG4gICAgICAgIGNhc2UgJ05BVklHQVRFX0FORF9SRU9QRU5fU0lERUJBUic6XHJcbiAgICAgICAgICBoYW5kbGVOYXZpZ2F0ZUFuZFJlb3BlblNpZGViYXIobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpO1xyXG4gICAgICAgICAgcmV0dXJuIHRydWU7XHJcblxyXG4gICAgICAgIGNhc2UgJ1BSRUxPQURfVVJMX0FOQUxZU0lTJzpcclxuICAgICAgICAgIGhhbmRsZVByZWxvYWRVcmxBbmFseXNpcyhtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSk7XHJcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuXHJcbiAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBIYW5kbGUgdGFiIHVwZGF0ZXMgd2l0aCBzaW1wbGlmaWVkIGxvZ2ljXHJcbiAgICBjaHJvbWUudGFicy5vblVwZGF0ZWQuYWRkTGlzdGVuZXIoYXN5bmMgKHRhYklkLCBjaGFuZ2VJbmZvLCB0YWIpID0+IHtcclxuICAgICAgaWYgKGNoYW5nZUluZm8uc3RhdHVzID09PSAnY29tcGxldGUnICYmIHRhYi51cmwpIHtcclxuICAgICAgICAvLyBCYXNpYyB0YWIgY29tcGxldGlvbiBoYW5kbGluZyAtIGRldGFpbGVkIGxvZ2ljIG1vdmVkIHRvIG1lc3NhZ2VIYW5kbGVyc1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAvLyBTbWFsbCBkZWxheSB0byBwcmV2ZW50IGludGVyZmVyZW5jZVxyXG4gICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMDApKTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgaW4gdGFiIHVwZGF0ZSBoYW5kbGVyOicsIGVycm9yKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxufSk7XHJcbiIsIi8vICNyZWdpb24gc25pcHBldFxuZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSBnbG9iYWxUaGlzLmJyb3dzZXI/LnJ1bnRpbWU/LmlkXG4gID8gZ2xvYmFsVGhpcy5icm93c2VyXG4gIDogZ2xvYmFsVGhpcy5jaHJvbWU7XG4vLyAjZW5kcmVnaW9uIHNuaXBwZXRcbiIsImltcG9ydCB7IGJyb3dzZXIgYXMgX2Jyb3dzZXIgfSBmcm9tIFwiQHd4dC1kZXYvYnJvd3NlclwiO1xuZXhwb3J0IGNvbnN0IGJyb3dzZXIgPSBfYnJvd3NlcjtcbmV4cG9ydCB7fTtcbiIsIi8vIHNyYy9pbmRleC50c1xudmFyIF9NYXRjaFBhdHRlcm4gPSBjbGFzcyB7XG4gIGNvbnN0cnVjdG9yKG1hdGNoUGF0dGVybikge1xuICAgIGlmIChtYXRjaFBhdHRlcm4gPT09IFwiPGFsbF91cmxzPlwiKSB7XG4gICAgICB0aGlzLmlzQWxsVXJscyA9IHRydWU7XG4gICAgICB0aGlzLnByb3RvY29sTWF0Y2hlcyA9IFsuLi5fTWF0Y2hQYXR0ZXJuLlBST1RPQ09MU107XG4gICAgICB0aGlzLmhvc3RuYW1lTWF0Y2ggPSBcIipcIjtcbiAgICAgIHRoaXMucGF0aG5hbWVNYXRjaCA9IFwiKlwiO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBncm91cHMgPSAvKC4qKTpcXC9cXC8oLio/KShcXC8uKikvLmV4ZWMobWF0Y2hQYXR0ZXJuKTtcbiAgICAgIGlmIChncm91cHMgPT0gbnVsbClcbiAgICAgICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4obWF0Y2hQYXR0ZXJuLCBcIkluY29ycmVjdCBmb3JtYXRcIik7XG4gICAgICBjb25zdCBbXywgcHJvdG9jb2wsIGhvc3RuYW1lLCBwYXRobmFtZV0gPSBncm91cHM7XG4gICAgICB2YWxpZGF0ZVByb3RvY29sKG1hdGNoUGF0dGVybiwgcHJvdG9jb2wpO1xuICAgICAgdmFsaWRhdGVIb3N0bmFtZShtYXRjaFBhdHRlcm4sIGhvc3RuYW1lKTtcbiAgICAgIHZhbGlkYXRlUGF0aG5hbWUobWF0Y2hQYXR0ZXJuLCBwYXRobmFtZSk7XG4gICAgICB0aGlzLnByb3RvY29sTWF0Y2hlcyA9IHByb3RvY29sID09PSBcIipcIiA/IFtcImh0dHBcIiwgXCJodHRwc1wiXSA6IFtwcm90b2NvbF07XG4gICAgICB0aGlzLmhvc3RuYW1lTWF0Y2ggPSBob3N0bmFtZTtcbiAgICAgIHRoaXMucGF0aG5hbWVNYXRjaCA9IHBhdGhuYW1lO1xuICAgIH1cbiAgfVxuICBpbmNsdWRlcyh1cmwpIHtcbiAgICBpZiAodGhpcy5pc0FsbFVybHMpXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICBjb25zdCB1ID0gdHlwZW9mIHVybCA9PT0gXCJzdHJpbmdcIiA/IG5ldyBVUkwodXJsKSA6IHVybCBpbnN0YW5jZW9mIExvY2F0aW9uID8gbmV3IFVSTCh1cmwuaHJlZikgOiB1cmw7XG4gICAgcmV0dXJuICEhdGhpcy5wcm90b2NvbE1hdGNoZXMuZmluZCgocHJvdG9jb2wpID0+IHtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJodHRwXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzSHR0cE1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImh0dHBzXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzSHR0cHNNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJmaWxlXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzRmlsZU1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImZ0cFwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0Z0cE1hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcInVyblwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc1Vybk1hdGNoKHUpO1xuICAgIH0pO1xuICB9XG4gIGlzSHR0cE1hdGNoKHVybCkge1xuICAgIHJldHVybiB1cmwucHJvdG9jb2wgPT09IFwiaHR0cDpcIiAmJiB0aGlzLmlzSG9zdFBhdGhNYXRjaCh1cmwpO1xuICB9XG4gIGlzSHR0cHNNYXRjaCh1cmwpIHtcbiAgICByZXR1cm4gdXJsLnByb3RvY29sID09PSBcImh0dHBzOlwiICYmIHRoaXMuaXNIb3N0UGF0aE1hdGNoKHVybCk7XG4gIH1cbiAgaXNIb3N0UGF0aE1hdGNoKHVybCkge1xuICAgIGlmICghdGhpcy5ob3N0bmFtZU1hdGNoIHx8ICF0aGlzLnBhdGhuYW1lTWF0Y2gpXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgaG9zdG5hbWVNYXRjaFJlZ2V4cyA9IFtcbiAgICAgIHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMuaG9zdG5hbWVNYXRjaCksXG4gICAgICB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLmhvc3RuYW1lTWF0Y2gucmVwbGFjZSgvXlxcKlxcLi8sIFwiXCIpKVxuICAgIF07XG4gICAgY29uc3QgcGF0aG5hbWVNYXRjaFJlZ2V4ID0gdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5wYXRobmFtZU1hdGNoKTtcbiAgICByZXR1cm4gISFob3N0bmFtZU1hdGNoUmVnZXhzLmZpbmQoKHJlZ2V4KSA9PiByZWdleC50ZXN0KHVybC5ob3N0bmFtZSkpICYmIHBhdGhuYW1lTWF0Y2hSZWdleC50ZXN0KHVybC5wYXRobmFtZSk7XG4gIH1cbiAgaXNGaWxlTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IGZpbGU6Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGlzRnRwTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IGZ0cDovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgaXNVcm5NYXRjaCh1cmwpIHtcbiAgICB0aHJvdyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogdXJuOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBjb252ZXJ0UGF0dGVyblRvUmVnZXgocGF0dGVybikge1xuICAgIGNvbnN0IGVzY2FwZWQgPSB0aGlzLmVzY2FwZUZvclJlZ2V4KHBhdHRlcm4pO1xuICAgIGNvbnN0IHN0YXJzUmVwbGFjZWQgPSBlc2NhcGVkLnJlcGxhY2UoL1xcXFxcXCovZywgXCIuKlwiKTtcbiAgICByZXR1cm4gUmVnRXhwKGBeJHtzdGFyc1JlcGxhY2VkfSRgKTtcbiAgfVxuICBlc2NhcGVGb3JSZWdleChzdHJpbmcpIHtcbiAgICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoL1suKis/XiR7fSgpfFtcXF1cXFxcXS9nLCBcIlxcXFwkJlwiKTtcbiAgfVxufTtcbnZhciBNYXRjaFBhdHRlcm4gPSBfTWF0Y2hQYXR0ZXJuO1xuTWF0Y2hQYXR0ZXJuLlBST1RPQ09MUyA9IFtcImh0dHBcIiwgXCJodHRwc1wiLCBcImZpbGVcIiwgXCJmdHBcIiwgXCJ1cm5cIl07XG52YXIgSW52YWxpZE1hdGNoUGF0dGVybiA9IGNsYXNzIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihtYXRjaFBhdHRlcm4sIHJlYXNvbikge1xuICAgIHN1cGVyKGBJbnZhbGlkIG1hdGNoIHBhdHRlcm4gXCIke21hdGNoUGF0dGVybn1cIjogJHtyZWFzb259YCk7XG4gIH1cbn07XG5mdW5jdGlvbiB2YWxpZGF0ZVByb3RvY29sKG1hdGNoUGF0dGVybiwgcHJvdG9jb2wpIHtcbiAgaWYgKCFNYXRjaFBhdHRlcm4uUFJPVE9DT0xTLmluY2x1ZGVzKHByb3RvY29sKSAmJiBwcm90b2NvbCAhPT0gXCIqXCIpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4oXG4gICAgICBtYXRjaFBhdHRlcm4sXG4gICAgICBgJHtwcm90b2NvbH0gbm90IGEgdmFsaWQgcHJvdG9jb2wgKCR7TWF0Y2hQYXR0ZXJuLlBST1RPQ09MUy5qb2luKFwiLCBcIil9KWBcbiAgICApO1xufVxuZnVuY3Rpb24gdmFsaWRhdGVIb3N0bmFtZShtYXRjaFBhdHRlcm4sIGhvc3RuYW1lKSB7XG4gIGlmIChob3N0bmFtZS5pbmNsdWRlcyhcIjpcIikpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4obWF0Y2hQYXR0ZXJuLCBgSG9zdG5hbWUgY2Fubm90IGluY2x1ZGUgYSBwb3J0YCk7XG4gIGlmIChob3N0bmFtZS5pbmNsdWRlcyhcIipcIikgJiYgaG9zdG5hbWUubGVuZ3RoID4gMSAmJiAhaG9zdG5hbWUuc3RhcnRzV2l0aChcIiouXCIpKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKFxuICAgICAgbWF0Y2hQYXR0ZXJuLFxuICAgICAgYElmIHVzaW5nIGEgd2lsZGNhcmQgKCopLCBpdCBtdXN0IGdvIGF0IHRoZSBzdGFydCBvZiB0aGUgaG9zdG5hbWVgXG4gICAgKTtcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlUGF0aG5hbWUobWF0Y2hQYXR0ZXJuLCBwYXRobmFtZSkge1xuICByZXR1cm47XG59XG5leHBvcnQge1xuICBJbnZhbGlkTWF0Y2hQYXR0ZXJuLFxuICBNYXRjaFBhdHRlcm5cbn07XG4iXSwibmFtZXMiOlsiX2EiLCJfYiIsInJlc3VsdCIsInRhYklkIiwiZSIsInN0YXRlIiwiYnJvd3NlciIsIl9icm93c2VyIl0sIm1hcHBpbmdzIjoiOzs7QUFBTyxXQUFTLGlCQUFpQixLQUFLO0FBQ3BDLFFBQUksT0FBTyxRQUFRLE9BQU8sUUFBUSxXQUFZLFFBQU8sRUFBRSxNQUFNLElBQUs7QUFDbEUsV0FBTztBQUFBLEVBQ1Q7QUNIc0IsaUJBQUEsWUFBWSxTQUFpQixRQUFnQjs7QUFDL0QsWUFBUSxLQUFLLHFCQUFxQjtBQUM1QixVQUFBLFdBQVcsTUFBTSxNQUFNLDhDQUE4QztBQUFBLE1BQ3pFLFFBQVE7QUFBQSxNQUNSLFNBQVM7QUFBQSxRQUNQLGlCQUFpQixVQUFVLE1BQU07QUFBQSxRQUNqQyxnQkFBZ0I7QUFBQSxNQUNsQjtBQUFBLE1BQ0EsTUFBTSxLQUFLLFVBQVU7QUFBQSxR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
