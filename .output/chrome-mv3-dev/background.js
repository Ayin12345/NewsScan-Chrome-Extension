var background = function() {
  "use strict";
  var _a, _b;
  function defineBackground(arg) {
    if (arg == null || typeof arg === "function") return { main: arg };
    return arg;
  }
  const BACKEND_URL = "http://localhost:3000";
  async function callBackendAnalyze(request) {
    try {
      const headers = {
        "Content-Type": "application/json"
      };
      const response = await fetch(`${BACKEND_URL}/api/analyze`, {
        method: "POST",
        headers,
        body: JSON.stringify(request)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("[BackendClient] Analyze error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to call backend"
      };
    }
  }
  async function callBackendWebSearch(request) {
    try {
      const headers = {
        "Content-Type": "application/json"
      };
      const response = await fetch(`${BACKEND_URL}/api/web-search`, {
        method: "POST",
        headers,
        body: JSON.stringify(request)
      });
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `HTTP ${response.status}` };
        }
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("[BackendClient] Web search error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to call backend"
      };
    }
  }
  background;
  const backendClient = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    callBackendAnalyze,
    callBackendWebSearch
  }, Symbol.toStringTag, { value: "Module" }));
  const tabStates = /* @__PURE__ */ new Map();
  const tabsBeingSetup = /* @__PURE__ */ new Set();
  const getDefaultState = () => ({
    pageInfo: null,
    analysis: [],
    failedProviders: [],
    isAnalyzing: false
  });
  async function saveTabState(tabId, state) {
    try {
      const existing = await chrome.storage.local.get("tabStates");
      const tabStatesObj = existing.tabStates || {};
      tabStatesObj[tabId] = state;
      await chrome.storage.local.set({ tabStates: tabStatesObj });
      tabStates.set(tabId, state);
    } catch (error) {
      console.error("Failed to save tab state:", error);
      tabStates.set(tabId, state);
    }
  }
  async function getTabState(tabId) {
    if (tabStates.has(tabId)) {
      return tabStates.get(tabId);
    }
    try {
      const existing = await chrome.storage.local.get("tabStates");
      const tabStatesObj = existing.tabStates || {};
      const state = tabStatesObj[tabId];
      if (state) {
        tabStates.set(tabId, state);
        return state;
      }
    } catch (error) {
      console.error("Failed to get tab state:", error);
    }
    return void 0;
  }
  async function deleteTabState(tabId) {
    try {
      const existing = await chrome.storage.local.get("tabStates");
      const tabStatesObj = existing.tabStates || {};
      delete tabStatesObj[tabId];
      await chrome.storage.local.set({ tabStates: tabStatesObj });
      tabStates.delete(tabId);
    } catch (error) {
      console.error("Failed to delete tab state:", error);
      tabStates.delete(tabId);
    }
  }
  function isTabBeingSetup(tabId) {
    return tabsBeingSetup.has(tabId);
  }
  function markTabAsBeingSetup(tabId) {
    tabsBeingSetup.add(tabId);
  }
  function unmarkTabAsBeingSetup(tabId) {
    tabsBeingSetup.delete(tabId);
  }
  const cleanupTabStates = async () => {
    try {
      const tabStatesData = await chrome.storage.local.get("tabStates");
      const tabStatesObj = tabStatesData.tabStates || {};
      const allTabs = await chrome.tabs.query({});
      const activeTabIds = new Set(allTabs.map((tab) => tab.id));
      let cleaned = false;
      for (const tabId of Object.keys(tabStatesObj)) {
        if (!activeTabIds.has(parseInt(tabId))) {
          delete tabStatesObj[tabId];
          cleaned = true;
        }
      }
      if (cleaned) {
        await chrome.storage.local.set({ tabStates: tabStatesObj });
      }
    } catch (error) {
      console.error("Error cleaning up tab states:", error);
    }
  };
  background;
  async function handleGetPageInfo(message, sender, sendResponse) {
    var _a2, _b2;
    try {
      const tabId = message.tabId || ((_a2 = sender.tab) == null ? void 0 : _a2.id);
      if (!tabId) {
        sendResponse({ success: false, error: "No tab ID found" });
        return;
      }
      const pageInfo = await chrome.tabs.sendMessage(tabId, { type: "GET_PAGE_CONTENT" });
      if (pageInfo && pageInfo.error) {
        sendResponse({ success: false, error: pageInfo.error });
        return;
      }
      let state = await getTabState(tabId) || getDefaultState();
      const isSamePage = ((_b2 = state.pageInfo) == null ? void 0 : _b2.url) === pageInfo.data.url;
      state = {
        ...state,
        pageInfo: pageInfo.data,
        analysis: isSamePage ? state.analysis : [],
        failedProviders: isSamePage ? state.failedProviders : []
      };
      await saveTabState(tabId, state);
      sendResponse({ success: true, data: pageInfo.data });
    } catch (error) {
      console.error("Error getting page info:", error);
      sendResponse({ success: false, error: "Failed to fetch page info" });
    }
  }
  async function handleAnalyzeArticle(message, sender, sendResponse) {
    var _a2, _b2, _c, _d;
    try {
      const tabId = message.tabId;
      if (!tabId) {
        sendResponse({ success: false, error: "No tab ID provided" });
        return;
      }
      const providers = message.providers || [];
      let currentState = await getTabState(tabId) || getDefaultState();
      currentState.isAnalyzing = true;
      await saveTabState(tabId, currentState);
      providers.forEach((provider) => {
        chrome.runtime.sendMessage({
          type: "PROVIDER_UPDATE",
          provider,
          status: "analyzing"
        });
      });
      const supportingLinksMatch = message.content.match(/"supporting_links":\s*\[(.*?)\]/);
      let supportingLinks = [];
      if (supportingLinksMatch) {
        try {
          const linksStr = supportingLinksMatch[1];
          if (linksStr.trim()) {
            supportingLinks = linksStr.split(",").map(
              (link) => link.trim().replace(/^"|"$/g, "").trim()
            ).filter(Boolean);
          }
        } catch (e) {
          console.warn("Failed to extract supporting links from prompt:", e);
        }
      }
      const backendResponse = await callBackendAnalyze({
        prompt: message.content,
        providers,
        requestId: Date.now(),
        supportingLinks: message.supportingLinks || supportingLinks,
        url: message.url,
        title: message.title,
        content: message.articleContent
      });
      if (!backendResponse.success) {
        providers.forEach((provider) => {
          chrome.runtime.sendMessage({
            type: "PROVIDER_UPDATE",
            provider,
            status: "failed",
            error: backendResponse.error || "Backend request failed"
          });
        });
        let state2 = await getTabState(tabId);
        if (state2) {
          state2.isAnalyzing = false;
          await saveTabState(tabId, state2);
        }
        sendResponse({
          success: false,
          error: backendResponse.error || "Failed to analyze article"
        });
        return;
      }
      if (backendResponse.data) {
        backendResponse.data.successfulResults.forEach((result2) => {
          chrome.runtime.sendMessage({
            type: "PROVIDER_UPDATE",
            provider: result2.provider,
            status: "complete"
          });
        });
        backendResponse.data.failedProviders.forEach((failedProvider) => {
          const provider = typeof failedProvider === "string" ? failedProvider : failedProvider.provider;
          const error = typeof failedProvider === "string" ? "Provider failed" : failedProvider.error || "Provider failed";
          chrome.runtime.sendMessage({
            type: "PROVIDER_UPDATE",
            provider,
            status: "failed",
            error
          });
        });
      }
      let state = await getTabState(tabId);
      if (!state) {
        state = getDefaultState();
      }
      state.analysis = ((_a2 = backendResponse.data) == null ? void 0 : _a2.successfulResults) || [];
      state.failedProviders = ((_b2 = backendResponse.data) == null ? void 0 : _b2.failedProviders) || [];
      state.isAnalyzing = false;
      await saveTabState(tabId, state);
      sendResponse({
        success: true,
        data: {
          successfulResults: ((_c = backendResponse.data) == null ? void 0 : _c.successfulResults) || [],
          failedProviders: ((_d = backendResponse.data) == null ? void 0 : _d.failedProviders) || []
        },
        providers
      });
    } catch (error) {
      console.error("Error in analyze article:", error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : "Failed to analyze article"
      });
    }
  }
  async function handleGetTabState(message, sender, sendResponse) {
    var _a2, _b2;
    try {
      const tabId = message.tabId || ((_a2 = sender.tab) == null ? void 0 : _a2.id);
      if (!tabId) {
        sendResponse({ success: false, error: "No tab ID found" });
        return;
      }
      if (message.url) {
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
      const state = await getTabState(tabId) || getDefaultState();
      sendResponse({ success: true, data: state });
    } catch (error) {
      console.error("Error in GET_TAB_STATE:", error);
      sendResponse({ success: false, error: "Failed to get tab state" });
    }
  }
  async function handleResetTabState(message, sender, sendResponse) {
    var _a2;
    try {
      const tabId = message.tabId || ((_a2 = sender.tab) == null ? void 0 : _a2.id);
      if (!tabId) {
        sendResponse({ success: false, error: "No tab ID found" });
        return;
      }
      await deleteTabState(tabId);
      const defaultState = getDefaultState();
      await saveTabState(tabId, defaultState);
      chrome.tabs.sendMessage(tabId, {
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
    var _a2;
    try {
      const tabId = message.tabId || ((_a2 = sender.tab) == null ? void 0 : _a2.id);
      if (!tabId) {
        sendResponse({ success: false, error: "No tab ID available to save state" });
        return;
      }
      await saveTabState(tabId, {
        pageInfo: message.data.pageInfo,
        analysis: message.data.analysis,
        failedProviders: message.data.failedProviders,
        isAnalyzing: message.data.isAnalyzing || false,
        isViewingFromRecent: message.data.isViewingFromRecent || false,
        originalTabId: message.data.originalTabId
      });
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: "Failed to save tab state" });
    }
  }
  async function handleWebSearch(message, sender, sendResponse) {
    try {
      const { callBackendWebSearch: callBackendWebSearch2 } = await Promise.resolve().then(() => backendClient);
      const backendResponse = await callBackendWebSearch2({
        title: message.query,
        url: message.originalUrl,
        limit: message.max_results || 5
      });
      if (!backendResponse.success || !backendResponse.data) {
        sendResponse({
          success: false,
          error: backendResponse.error || "Failed to perform web search"
        });
        return;
      }
      sendResponse({
        success: true,
        data: { results: backendResponse.data }
      });
    } catch (error) {
      console.error("Web search error:", error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : "Failed to perform web search"
      });
    }
  }
  async function handleLoadAnalysisInTab(message, sender, sendResponse) {
    try {
      const tabId = message.tabId;
      const analysisData = message.analysisData;
      if (isTabBeingSetup(tabId)) {
        sendResponse({ success: false, error: "Tab already being set up" });
        return;
      }
      markTabAsBeingSetup(tabId);
      const newState = {
        pageInfo: analysisData.pageInfo,
        analysis: analysisData.analysis,
        failedProviders: analysisData.failedProviders,
        isAnalyzing: false,
        isViewingFromRecent: analysisData.isViewingFromRecent || false,
        originalTabId: analysisData.originalTabId
      };
      await saveTabState(tabId, newState);
      await saveTabState(tabId, {
        ...newState,
        hasPreloadedAnalysis: true
      });
      setTimeout(async () => {
        try {
          try {
            await chrome.tabs.sendMessage(tabId, { type: "FNR_PING" });
          } catch (error) {
            await chrome.scripting.executeScript({
              target: { tabId },
              files: ["content-scripts/content.js"]
            });
          }
          setTimeout(async () => {
            try {
              const tab = await chrome.tabs.get(tabId);
              if (!tab) {
                unmarkTabAsBeingSetup(tabId);
                sendResponse({ success: false, error: "Tab no longer exists" });
                return;
              }
              if (newState.isViewingFromRecent) {
                chrome.tabs.sendMessage(tabId, {
                  type: "TOGGLE_INJECTED_SIDEBAR",
                  keepOpen: true,
                  preloadedAnalysis: newState,
                  hasPreloadedAnalysis: true
                }, (response) => {
                  if (chrome.runtime.lastError) {
                    unmarkTabAsBeingSetup(tabId);
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                    return;
                  }
                  unmarkTabAsBeingSetup(tabId);
                  sendResponse({ success: true });
                });
              } else {
                sendResponse({ success: true });
                unmarkTabAsBeingSetup(tabId);
              }
            } catch (error) {
              unmarkTabAsBeingSetup(tabId);
              sendResponse({ success: false, error: "Failed to open sidebar" });
            }
          }, 200);
        } catch (err) {
          console.error("Error setting up analysis tab:", err);
          unmarkTabAsBeingSetup(tabId);
          sendResponse({ success: false, error: "Failed to setup analysis tab" });
        }
      }, 1e3);
    } catch (error) {
      console.error("Error in LOAD_ANALYSIS_IN_TAB:", error);
      if (message.tabId) {
        unmarkTabAsBeingSetup(message.tabId);
      }
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
      const tabId = newTab.id;
      setTimeout(async () => {
        try {
          await chrome.scripting.executeScript({
            target: { tabId },
            files: ["content-scripts/content.js"]
          });
          const waitForContentScript = () => {
            return new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error("Content script not ready after 5 seconds"));
              }, 5e3);
              chrome.tabs.sendMessage(tabId, { type: "FNR_PING" }, (response) => {
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
      setInterval(cleanupTabStates, 5 * 60 * 1e3);
      chrome.action.onClicked.addListener(async () => {
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!(tab == null ? void 0 : tab.id)) {
            return;
          }
          const ping = (tabId) => new Promise((resolve) => {
            let settled = false;
            try {
              chrome.tabs.sendMessage(tabId, { type: "FNR_PING" }, (resp) => {
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
      chrome.tabs.onRemoved.addListener((tabId) => {
        deleteTabState(tabId);
        unmarkTabAsBeingSetup(tabId);
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
      chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2RlZmluZS1iYWNrZ3JvdW5kLm1qcyIsIi4uLy4uL3NyYy91dGlscy9iYWNrZW5kQ2xpZW50LnRzIiwiLi4vLi4vc3JjL3V0aWxzL3RhYlN0YXRlLnRzIiwiLi4vLi4vc3JjL3V0aWxzL21lc3NhZ2VIYW5kbGVycy50cyIsIi4uLy4uL3NyYy9lbnRyeXBvaW50cy9iYWNrZ3JvdW5kLnRzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL0B3eHQtZGV2L2Jyb3dzZXIvc3JjL2luZGV4Lm1qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC9icm93c2VyLm1qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9Ad2ViZXh0LWNvcmUvbWF0Y2gtcGF0dGVybnMvbGliL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBmdW5jdGlvbiBkZWZpbmVCYWNrZ3JvdW5kKGFyZykge1xuICBpZiAoYXJnID09IG51bGwgfHwgdHlwZW9mIGFyZyA9PT0gXCJmdW5jdGlvblwiKSByZXR1cm4geyBtYWluOiBhcmcgfTtcbiAgcmV0dXJuIGFyZztcbn1cbiIsIi8vIEJhY2tlbmQgY2xpZW50IHV0aWxpdHkgZm9yIGV4dGVuc2lvblxuLy8gSGFuZGxlcyBjb21tdW5pY2F0aW9uIHdpdGggdGhlIGJhY2tlbmQgQVBJXG5cbmNvbnN0IEJBQ0tFTkRfVVJMID0gaW1wb3J0Lm1ldGEuZW52LlZJVEVfQkFDS0VORF9VUkwgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCc7XG5cbmludGVyZmFjZSBBbmFseXplUmVxdWVzdCB7XG4gIHByb21wdDogc3RyaW5nO1xuICBwcm92aWRlcnM6IHN0cmluZ1tdO1xuICByZXF1ZXN0SWQ/OiBudW1iZXI7XG4gIHN1cHBvcnRpbmdMaW5rcz86IHN0cmluZ1tdO1xuICAvLyBJbmRpdmlkdWFsIGNvbXBvbmVudHMgZm9yIHByb3ZpZGVyLXNwZWNpZmljIHByb21wdHNcbiAgdXJsPzogc3RyaW5nO1xuICB0aXRsZT86IHN0cmluZztcbiAgY29udGVudD86IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIEZhaWxlZFByb3ZpZGVyIHtcbiAgcHJvdmlkZXI6IHN0cmluZztcbiAgZXJyb3I6IHN0cmluZztcbiAgZXJyb3JDb2RlPzogc3RyaW5nO1xuICBkZXRhaWxzPzogUmVjb3JkPHN0cmluZywgYW55Pjtcbn1cblxuaW50ZXJmYWNlIEFuYWx5emVSZXNwb25zZSB7XG4gIHN1Y2Nlc3M6IGJvb2xlYW47XG4gIGRhdGE/OiB7XG4gICAgc3VjY2Vzc2Z1bFJlc3VsdHM6IGFueVtdO1xuICAgIGZhaWxlZFByb3ZpZGVyczogRmFpbGVkUHJvdmlkZXJbXSB8IHN0cmluZ1tdOyAvLyBTdXBwb3J0IGJvdGggZm9ybWF0cyBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eVxuICB9O1xuICBlcnJvcj86IHN0cmluZztcbiAgcmVxdWVzdElkPzogbnVtYmVyO1xufVxuXG5pbnRlcmZhY2UgV2ViU2VhcmNoUmVxdWVzdCB7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIHVybD86IHN0cmluZztcbiAgbGltaXQ/OiBudW1iZXI7XG59XG5cbmludGVyZmFjZSBXZWJTZWFyY2hSZXNwb25zZSB7XG4gIHN1Y2Nlc3M6IGJvb2xlYW47XG4gIGRhdGE/OiB7XG4gICAgcmVzdWx0czogQXJyYXk8e1xuICAgICAgdXJsOiBzdHJpbmc7XG4gICAgICB0aXRsZTogc3RyaW5nO1xuICAgICAgc25pcHBldDogc3RyaW5nO1xuICAgIH0+O1xuICAgIHNlYXJjaE1ldGhvZDogJ2FpLWdlbmVyYXRlZCcgfCAnZmFsbGJhY2snO1xuICAgIHF1ZXJ5VXNlZDogc3RyaW5nO1xuICAgIGFpUXVlcnlHZW5lcmF0ZWQ/OiBzdHJpbmc7XG4gICAgZmFsbGJhY2tRdWVyeVVzZWQ/OiBzdHJpbmc7XG4gIH07XG4gIGVycm9yPzogc3RyaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2FsbEJhY2tlbmRBbmFseXplKHJlcXVlc3Q6IEFuYWx5emVSZXF1ZXN0KTogUHJvbWlzZTxBbmFseXplUmVzcG9uc2U+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBoZWFkZXJzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgIH07XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke0JBQ0tFTkRfVVJMfS9hcGkvYW5hbHl6ZWAsIHtcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgaGVhZGVycyxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHJlcXVlc3QpXG4gICAgfSk7XG5cbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICBjb25zdCBlcnJvckRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCkuY2F0Y2goKCkgPT4gKHsgZXJyb3I6ICdVbmtub3duIGVycm9yJyB9KSk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoZXJyb3JEYXRhLmVycm9yIHx8IGBIVFRQICR7cmVzcG9uc2Uuc3RhdHVzfWApO1xuICAgIH1cblxuICAgIHJldHVybiBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignW0JhY2tlbmRDbGllbnRdIEFuYWx5emUgZXJyb3I6JywgZXJyb3IpO1xuICAgIHJldHVybiB7XG4gICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdGYWlsZWQgdG8gY2FsbCBiYWNrZW5kJ1xuICAgIH07XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNhbGxCYWNrZW5kV2ViU2VhcmNoKHJlcXVlc3Q6IFdlYlNlYXJjaFJlcXVlc3QpOiBQcm9taXNlPFdlYlNlYXJjaFJlc3BvbnNlPiB7XG4gIHRyeSB7XG4gICAgY29uc3QgaGVhZGVyczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcbiAgICB9O1xuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHtCQUNLRU5EX1VSTH0vYXBpL3dlYi1zZWFyY2hgLCB7XG4gICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgIGhlYWRlcnMsXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXF1ZXN0KVxuICAgIH0pO1xuXG4gICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgY29uc3QgZXJyb3JUZXh0ID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xuICAgICAgbGV0IGVycm9yRGF0YTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGVycm9yRGF0YSA9IEpTT04ucGFyc2UoZXJyb3JUZXh0KTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICBlcnJvckRhdGEgPSB7IGVycm9yOiBlcnJvclRleHQgfHwgYEhUVFAgJHtyZXNwb25zZS5zdGF0dXN9YCB9O1xuICAgICAgfVxuICAgICAgdGhyb3cgbmV3IEVycm9yKGVycm9yRGF0YS5lcnJvciB8fCBgSFRUUCAke3Jlc3BvbnNlLnN0YXR1c31gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1tCYWNrZW5kQ2xpZW50XSBXZWIgc2VhcmNoIGVycm9yOicsIGVycm9yKTtcbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnRmFpbGVkIHRvIGNhbGwgYmFja2VuZCdcbiAgICB9O1xuICB9XG59XG5cblxuIiwiLy8gVGFiIHN0YXRlIG1hbmFnZW1lbnQgZnVuY3Rpb25hbGl0eVxuXG5leHBvcnQgdHlwZSBUYWJTdGF0ZSA9IHtcbiAgcGFnZUluZm86IGFueTtcbiAgYW5hbHlzaXM6IGFueVtdO1xuICBmYWlsZWRQcm92aWRlcnM6IHN0cmluZ1tdO1xuICBpc0FuYWx5emluZzogYm9vbGVhbjtcbiAgaXNWaWV3aW5nRnJvbVJlY2VudD86IGJvb2xlYW47XG4gIG9yaWdpbmFsVGFiSWQ/OiBudW1iZXI7XG4gIGhhc1ByZWxvYWRlZEFuYWx5c2lzPzogYm9vbGVhbjtcbn07XG5cbi8vIEluLW1lbW9yeSB0YWIgc3RhdGUgc3RvcmFnZVxuY29uc3QgdGFiU3RhdGVzID0gbmV3IE1hcDxudW1iZXIsIFRhYlN0YXRlPigpO1xuXG4vLyBUcmFjayB0YWJzIHRoYXQgYXJlIGN1cnJlbnRseSBiZWluZyBzZXQgdXAgdG8gcHJldmVudCBkb3VibGUgZXhlY3V0aW9uXG5jb25zdCB0YWJzQmVpbmdTZXR1cCA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuXG4vLyBHZXQgZGVmYXVsdCBzdGF0ZSBmb3IgYSBuZXcgdGFiXG5leHBvcnQgY29uc3QgZ2V0RGVmYXVsdFN0YXRlID0gKCk6IFRhYlN0YXRlID0+ICh7XG4gIHBhZ2VJbmZvOiBudWxsLFxuICBhbmFseXNpczogW10sXG4gIGZhaWxlZFByb3ZpZGVyczogW10sXG4gIGlzQW5hbHl6aW5nOiBmYWxzZVxufSk7XG5cbi8vIFBlcnNpc3RlbnQgdGFiIHN0YXRlIHN0b3JhZ2UgaGVscGVyc1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNhdmVUYWJTdGF0ZSh0YWJJZDogbnVtYmVyLCBzdGF0ZTogVGFiU3RhdGUpOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBleGlzdGluZyA9IGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldCgndGFiU3RhdGVzJyk7XG4gICAgY29uc3QgdGFiU3RhdGVzT2JqID0gZXhpc3RpbmcudGFiU3RhdGVzIHx8IHt9O1xuICAgIHRhYlN0YXRlc09ialt0YWJJZF0gPSBzdGF0ZTtcbiAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyB0YWJTdGF0ZXM6IHRhYlN0YXRlc09iaiB9KTtcbiAgICAvLyBBbHNvIGtlZXAgaW4gbWVtb3J5IGZvciBxdWljayBhY2Nlc3NcbiAgICB0YWJTdGF0ZXMuc2V0KHRhYklkLCBzdGF0ZSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHNhdmUgdGFiIHN0YXRlOicsIGVycm9yKTtcbiAgICAvLyBGYWxsYmFjayB0byBtZW1vcnkgb25seVxuICAgIHRhYlN0YXRlcy5zZXQodGFiSWQsIHN0YXRlKTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0VGFiU3RhdGUodGFiSWQ6IG51bWJlcik6IFByb21pc2U8VGFiU3RhdGUgfCB1bmRlZmluZWQ+IHtcbiAgLy8gRmlyc3QgY2hlY2sgbWVtb3J5XG4gIGlmICh0YWJTdGF0ZXMuaGFzKHRhYklkKSkge1xuICAgIHJldHVybiB0YWJTdGF0ZXMuZ2V0KHRhYklkKTtcbiAgfVxuICBcbiAgLy8gVGhlbiBjaGVjayBwZXJzaXN0ZW50IHN0b3JhZ2VcbiAgdHJ5IHtcbiAgICBjb25zdCBleGlzdGluZyA9IGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldCgndGFiU3RhdGVzJyk7XG4gICAgY29uc3QgdGFiU3RhdGVzT2JqID0gZXhpc3RpbmcudGFiU3RhdGVzIHx8IHt9O1xuICAgIGNvbnN0IHN0YXRlID0gdGFiU3RhdGVzT2JqW3RhYklkXTtcbiAgICBpZiAoc3RhdGUpIHtcbiAgICAgIC8vIFJlc3RvcmUgdG8gbWVtb3J5XG4gICAgICB0YWJTdGF0ZXMuc2V0KHRhYklkLCBzdGF0ZSk7XG4gICAgICByZXR1cm4gc3RhdGU7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBnZXQgdGFiIHN0YXRlOicsIGVycm9yKTtcbiAgfVxuICBcbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRlbGV0ZVRhYlN0YXRlKHRhYklkOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBleGlzdGluZyA9IGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldCgndGFiU3RhdGVzJyk7XG4gICAgY29uc3QgdGFiU3RhdGVzT2JqID0gZXhpc3RpbmcudGFiU3RhdGVzIHx8IHt9O1xuICAgIGRlbGV0ZSB0YWJTdGF0ZXNPYmpbdGFiSWRdO1xuICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IHRhYlN0YXRlczogdGFiU3RhdGVzT2JqIH0pO1xuICAgIC8vIEFsc28gcmVtb3ZlIGZyb20gbWVtb3J5XG4gICAgdGFiU3RhdGVzLmRlbGV0ZSh0YWJJZCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGRlbGV0ZSB0YWIgc3RhdGU6JywgZXJyb3IpO1xuICAgIC8vIEZhbGxiYWNrIHRvIG1lbW9yeSBvbmx5XG4gICAgdGFiU3RhdGVzLmRlbGV0ZSh0YWJJZCk7XG4gIH1cbn1cblxuLy8gVGFiIHNldHVwIHRyYWNraW5nXG5leHBvcnQgZnVuY3Rpb24gaXNUYWJCZWluZ1NldHVwKHRhYklkOiBudW1iZXIpOiBib29sZWFuIHtcbiAgcmV0dXJuIHRhYnNCZWluZ1NldHVwLmhhcyh0YWJJZCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYXJrVGFiQXNCZWluZ1NldHVwKHRhYklkOiBudW1iZXIpOiB2b2lkIHtcbiAgdGFic0JlaW5nU2V0dXAuYWRkKHRhYklkKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHVubWFya1RhYkFzQmVpbmdTZXR1cCh0YWJJZDogbnVtYmVyKTogdm9pZCB7XG4gIHRhYnNCZWluZ1NldHVwLmRlbGV0ZSh0YWJJZCk7XG59XG5cbi8vIENsZWFudXAgb2xkIHRhYiBzdGF0ZXMgZnJvbSBzdG9yYWdlIChmb3IgY2xvc2VkIHRhYnMpXG5leHBvcnQgY29uc3QgY2xlYW51cFRhYlN0YXRlcyA9IGFzeW5jICgpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCB0YWJTdGF0ZXNEYXRhID0gYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KCd0YWJTdGF0ZXMnKTtcbiAgICBjb25zdCB0YWJTdGF0ZXNPYmogPSB0YWJTdGF0ZXNEYXRhLnRhYlN0YXRlcyB8fCB7fTtcbiAgICBjb25zdCBhbGxUYWJzID0gYXdhaXQgY2hyb21lLnRhYnMucXVlcnkoe30pO1xuICAgIGNvbnN0IGFjdGl2ZVRhYklkcyA9IG5ldyBTZXQoYWxsVGFicy5tYXAodGFiID0+IHRhYi5pZCkpO1xuICAgIFxuICAgIC8vIFJlbW92ZSBzdGF0ZXMgZm9yIHRhYnMgdGhhdCBubyBsb25nZXIgZXhpc3RcbiAgICBsZXQgY2xlYW5lZCA9IGZhbHNlO1xuICAgIGZvciAoY29uc3QgdGFiSWQgb2YgT2JqZWN0LmtleXModGFiU3RhdGVzT2JqKSkge1xuICAgICAgaWYgKCFhY3RpdmVUYWJJZHMuaGFzKHBhcnNlSW50KHRhYklkKSkpIHtcbiAgICAgICAgZGVsZXRlIHRhYlN0YXRlc09ialt0YWJJZF07XG4gICAgICAgIGNsZWFuZWQgPSB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBpZiAoY2xlYW5lZCkge1xuICAgICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgdGFiU3RhdGVzOiB0YWJTdGF0ZXNPYmogfSk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGNsZWFuaW5nIHVwIHRhYiBzdGF0ZXM6JywgZXJyb3IpO1xuICB9XG59O1xuIiwiLy8gTWVzc2FnZSBoYW5kbGVycyBmb3IgYmFja2dyb3VuZCBzY3JpcHRcbmltcG9ydCB7IGNhbGxCYWNrZW5kQW5hbHl6ZSB9IGZyb20gJy4vYmFja2VuZENsaWVudCc7XG5pbXBvcnQgeyBcbiAgc2F2ZVRhYlN0YXRlLCBcbiAgZ2V0VGFiU3RhdGUsIFxuICBkZWxldGVUYWJTdGF0ZSwgXG4gIGdldERlZmF1bHRTdGF0ZSxcbiAgaXNUYWJCZWluZ1NldHVwLFxuICBtYXJrVGFiQXNCZWluZ1NldHVwLFxuICB1bm1hcmtUYWJBc0JlaW5nU2V0dXBcbn0gZnJvbSAnLi90YWJTdGF0ZSc7XG5pbXBvcnQgeyBBbmFseXNpc1Jlc3VsdCB9IGZyb20gJy4vYW5hbHlzaXNQcm9jZXNzb3InO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlR2V0UGFnZUluZm8obWVzc2FnZTogYW55LCBzZW5kZXI6IGFueSwgc2VuZFJlc3BvbnNlOiAocmVzcG9uc2U6IGFueSkgPT4gdm9pZCkge1xuICB0cnkge1xuICAgIGNvbnN0IHRhYklkID0gbWVzc2FnZS50YWJJZCB8fCBzZW5kZXIudGFiPy5pZDtcbiAgICBpZiAoIXRhYklkKSB7XG4gICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyB0YWIgSUQgZm91bmQnIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHBhZ2VJbmZvID0gYXdhaXQgY2hyb21lLnRhYnMuc2VuZE1lc3NhZ2UodGFiSWQsIHsgdHlwZTogJ0dFVF9QQUdFX0NPTlRFTlQnIH0pO1xuICAgIGlmIChwYWdlSW5mbyAmJiBwYWdlSW5mby5lcnJvcikge1xuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBwYWdlSW5mby5lcnJvciB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBHZXQgb3IgY3JlYXRlIHN0YXRlIGZvciB0aGlzIHRhYlxuICAgIGxldCBzdGF0ZSA9IGF3YWl0IGdldFRhYlN0YXRlKHRhYklkKSB8fCBnZXREZWZhdWx0U3RhdGUoKTtcbiAgICBcbiAgICAvLyBVcGRhdGUgc3RhdGUgd2l0aCBuZXcgcGFnZSBpbmZvLCBidXQgcHJlc2VydmUgZXhpc3RpbmcgYW5hbHlzaXMgaWYgcGFnZSBpcyB0aGUgc2FtZVxuICAgIGNvbnN0IGlzU2FtZVBhZ2UgPSBzdGF0ZS5wYWdlSW5mbz8udXJsID09PSBwYWdlSW5mby5kYXRhLnVybDtcbiAgICBcbiAgICBzdGF0ZSA9IHtcbiAgICAgIC4uLnN0YXRlLFxuICAgICAgcGFnZUluZm86IHBhZ2VJbmZvLmRhdGEsXG4gICAgICBhbmFseXNpczogaXNTYW1lUGFnZSA/IHN0YXRlLmFuYWx5c2lzIDogW10sXG4gICAgICBmYWlsZWRQcm92aWRlcnM6IGlzU2FtZVBhZ2UgPyBzdGF0ZS5mYWlsZWRQcm92aWRlcnMgOiBbXVxuICAgIH07XG4gICAgXG4gICAgYXdhaXQgc2F2ZVRhYlN0YXRlKHRhYklkLCBzdGF0ZSk7XG4gICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogcGFnZUluZm8uZGF0YSB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBnZXR0aW5nIHBhZ2UgaW5mbzonLCBlcnJvcik7XG4gICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnRmFpbGVkIHRvIGZldGNoIHBhZ2UgaW5mbycgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZUFuYWx5emVBcnRpY2xlKG1lc3NhZ2U6IGFueSwgc2VuZGVyOiBhbnksIHNlbmRSZXNwb25zZTogKHJlc3BvbnNlOiBhbnkpID0+IHZvaWQpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCB0YWJJZCA9IG1lc3NhZ2UudGFiSWQ7XG4gICAgaWYgKCF0YWJJZCkge1xuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gdGFiIElEIHByb3ZpZGVkJyB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBwcm92aWRlcnMgPSBtZXNzYWdlLnByb3ZpZGVycyB8fCBbXTtcbiAgICBcbiAgICAvLyBTZXQgYW5hbHl6aW5nIHN0YXRlIGZvciB0aGlzIHRhYlxuICAgIGxldCBjdXJyZW50U3RhdGUgPSBhd2FpdCBnZXRUYWJTdGF0ZSh0YWJJZCkgfHwgZ2V0RGVmYXVsdFN0YXRlKCk7XG4gICAgY3VycmVudFN0YXRlLmlzQW5hbHl6aW5nID0gdHJ1ZTtcbiAgICBhd2FpdCBzYXZlVGFiU3RhdGUodGFiSWQsIGN1cnJlbnRTdGF0ZSk7XG4gICAgXG4gICAgLy8gU2VuZCBwcm92aWRlciBzdGF0dXMgdXBkYXRlcyAodGhleSdsbCBiZSBzZXQgdG8gYW5hbHl6aW5nKVxuICAgIHByb3ZpZGVycy5mb3JFYWNoKChwcm92aWRlcjogc3RyaW5nKSA9PiB7XG4gICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XG4gICAgICAgIHR5cGU6ICdQUk9WSURFUl9VUERBVEUnLFxuICAgICAgICBwcm92aWRlcjogcHJvdmlkZXIsXG4gICAgICAgIHN0YXR1czogJ2FuYWx5emluZydcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIFxuICAgIC8vIEV4dHJhY3Qgc3VwcG9ydGluZyBsaW5rcyBmcm9tIHByb21wdCBpZiBwcmVzZW50XG4gICAgY29uc3Qgc3VwcG9ydGluZ0xpbmtzTWF0Y2ggPSBtZXNzYWdlLmNvbnRlbnQubWF0Y2goL1wic3VwcG9ydGluZ19saW5rc1wiOlxccypcXFsoLio/KVxcXS8pO1xuICAgIGxldCBzdXBwb3J0aW5nTGlua3MgPSBbXTtcbiAgICBpZiAoc3VwcG9ydGluZ0xpbmtzTWF0Y2gpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGxpbmtzU3RyID0gc3VwcG9ydGluZ0xpbmtzTWF0Y2hbMV07XG4gICAgICAgIGlmIChsaW5rc1N0ci50cmltKCkpIHtcbiAgICAgICAgICBzdXBwb3J0aW5nTGlua3MgPSBsaW5rc1N0ci5zcGxpdCgnLCcpLm1hcChsaW5rID0+IFxuICAgICAgICAgICAgbGluay50cmltKCkucmVwbGFjZSgvXlwifFwiJC9nLCAnJykudHJpbSgpXG4gICAgICAgICAgKS5maWx0ZXIoQm9vbGVhbik7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS53YXJuKCdGYWlsZWQgdG8gZXh0cmFjdCBzdXBwb3J0aW5nIGxpbmtzIGZyb20gcHJvbXB0OicsIGUpO1xuICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvLyBDYWxsIGJhY2tlbmQgQVBJIGluc3RlYWQgb2YgZGlyZWN0IEFQSSBjYWxsc1xuICAgIC8vIFBhc3MgaW5kaXZpZHVhbCBjb21wb25lbnRzIHNvIGJhY2tlbmQgY2FuIGJ1aWxkIHByb3ZpZGVyLXNwZWNpZmljIHByb21wdHNcbiAgICBjb25zdCBiYWNrZW5kUmVzcG9uc2UgPSBhd2FpdCBjYWxsQmFja2VuZEFuYWx5emUoe1xuICAgICAgcHJvbXB0OiBtZXNzYWdlLmNvbnRlbnQsXG4gICAgICBwcm92aWRlcnM6IHByb3ZpZGVycyxcbiAgICAgIHJlcXVlc3RJZDogRGF0ZS5ub3coKSxcbiAgICAgIHN1cHBvcnRpbmdMaW5rczogbWVzc2FnZS5zdXBwb3J0aW5nTGlua3MgfHwgc3VwcG9ydGluZ0xpbmtzLFxuICAgICAgdXJsOiBtZXNzYWdlLnVybCxcbiAgICAgIHRpdGxlOiBtZXNzYWdlLnRpdGxlLFxuICAgICAgY29udGVudDogbWVzc2FnZS5hcnRpY2xlQ29udGVudFxuICAgIH0pO1xuXG4gICAgaWYgKCFiYWNrZW5kUmVzcG9uc2Uuc3VjY2Vzcykge1xuICAgICAgLy8gTWFyayBhbGwgcHJvdmlkZXJzIGFzIGZhaWxlZFxuICAgICAgcHJvdmlkZXJzLmZvckVhY2goKHByb3ZpZGVyOiBzdHJpbmcpID0+IHtcbiAgICAgICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2Uoe1xuICAgICAgICAgIHR5cGU6ICdQUk9WSURFUl9VUERBVEUnLFxuICAgICAgICAgIHByb3ZpZGVyOiBwcm92aWRlcixcbiAgICAgICAgICBzdGF0dXM6ICdmYWlsZWQnLFxuICAgICAgICAgIGVycm9yOiBiYWNrZW5kUmVzcG9uc2UuZXJyb3IgfHwgJ0JhY2tlbmQgcmVxdWVzdCBmYWlsZWQnXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIGxldCBzdGF0ZSA9IGF3YWl0IGdldFRhYlN0YXRlKHRhYklkKTtcbiAgICAgIGlmIChzdGF0ZSkge1xuICAgICAgICBzdGF0ZS5pc0FuYWx5emluZyA9IGZhbHNlO1xuICAgICAgICBhd2FpdCBzYXZlVGFiU3RhdGUodGFiSWQsIHN0YXRlKTtcbiAgICAgIH1cblxuICAgICAgc2VuZFJlc3BvbnNlKHtcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIGVycm9yOiBiYWNrZW5kUmVzcG9uc2UuZXJyb3IgfHwgJ0ZhaWxlZCB0byBhbmFseXplIGFydGljbGUnXG4gICAgICB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBNYXJrIHN1Y2Nlc3NmdWwgcHJvdmlkZXJzIGFzIGNvbXBsZXRlXG4gICAgaWYgKGJhY2tlbmRSZXNwb25zZS5kYXRhKSB7XG4gICAgICBiYWNrZW5kUmVzcG9uc2UuZGF0YS5zdWNjZXNzZnVsUmVzdWx0cy5mb3JFYWNoKChyZXN1bHQ6IEFuYWx5c2lzUmVzdWx0KSA9PiB7XG4gICAgICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgICB0eXBlOiAnUFJPVklERVJfVVBEQVRFJyxcbiAgICAgICAgICBwcm92aWRlcjogcmVzdWx0LnByb3ZpZGVyLFxuICAgICAgICAgIHN0YXR1czogJ2NvbXBsZXRlJ1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBNYXJrIGZhaWxlZCBwcm92aWRlcnMgYXMgZmFpbGVkXG4gICAgICBiYWNrZW5kUmVzcG9uc2UuZGF0YS5mYWlsZWRQcm92aWRlcnMuZm9yRWFjaCgoZmFpbGVkUHJvdmlkZXI6IGFueSkgPT4ge1xuICAgICAgICAvLyBIYW5kbGUgYm90aCBvbGQgZm9ybWF0IChzdHJpbmcpIGFuZCBuZXcgZm9ybWF0IChvYmplY3QpXG4gICAgICAgIGNvbnN0IHByb3ZpZGVyID0gdHlwZW9mIGZhaWxlZFByb3ZpZGVyID09PSAnc3RyaW5nJyA/IGZhaWxlZFByb3ZpZGVyIDogZmFpbGVkUHJvdmlkZXIucHJvdmlkZXI7XG4gICAgICAgIGNvbnN0IGVycm9yID0gdHlwZW9mIGZhaWxlZFByb3ZpZGVyID09PSAnc3RyaW5nJyA/ICdQcm92aWRlciBmYWlsZWQnIDogKGZhaWxlZFByb3ZpZGVyLmVycm9yIHx8ICdQcm92aWRlciBmYWlsZWQnKTtcbiAgICAgICAgXG4gICAgICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHtcbiAgICAgICAgICB0eXBlOiAnUFJPVklERVJfVVBEQVRFJyxcbiAgICAgICAgICBwcm92aWRlcjogcHJvdmlkZXIsXG4gICAgICAgICAgc3RhdHVzOiAnZmFpbGVkJyxcbiAgICAgICAgICBlcnJvcjogZXJyb3JcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBVcGRhdGUgdGFiIHN0YXRlIHdpdGggYW5hbHlzaXMgcmVzdWx0c1xuICAgIGxldCBzdGF0ZSA9IGF3YWl0IGdldFRhYlN0YXRlKHRhYklkKTtcbiAgICBpZiAoIXN0YXRlKSB7XG4gICAgICBzdGF0ZSA9IGdldERlZmF1bHRTdGF0ZSgpO1xuICAgIH1cbiAgICBcbiAgICBzdGF0ZS5hbmFseXNpcyA9IGJhY2tlbmRSZXNwb25zZS5kYXRhPy5zdWNjZXNzZnVsUmVzdWx0cyB8fCBbXTtcbiAgICBzdGF0ZS5mYWlsZWRQcm92aWRlcnMgPSBiYWNrZW5kUmVzcG9uc2UuZGF0YT8uZmFpbGVkUHJvdmlkZXJzIHx8IFtdO1xuICAgIHN0YXRlLmlzQW5hbHl6aW5nID0gZmFsc2U7XG4gICAgXG4gICAgYXdhaXQgc2F2ZVRhYlN0YXRlKHRhYklkLCBzdGF0ZSk7XG4gICAgXG4gICAgc2VuZFJlc3BvbnNlKHtcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICBkYXRhOiB7XG4gICAgICAgIHN1Y2Nlc3NmdWxSZXN1bHRzOiBiYWNrZW5kUmVzcG9uc2UuZGF0YT8uc3VjY2Vzc2Z1bFJlc3VsdHMgfHwgW10sXG4gICAgICAgIGZhaWxlZFByb3ZpZGVyczogYmFja2VuZFJlc3BvbnNlLmRhdGE/LmZhaWxlZFByb3ZpZGVycyB8fCBbXVxuICAgICAgfSxcbiAgICAgIHByb3ZpZGVyczogcHJvdmlkZXJzXG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgaW4gYW5hbHl6ZSBhcnRpY2xlOicsIGVycm9yKTtcbiAgICBzZW5kUmVzcG9uc2UoeyBcbiAgICAgIHN1Y2Nlc3M6IGZhbHNlLCBcbiAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdGYWlsZWQgdG8gYW5hbHl6ZSBhcnRpY2xlJyBcbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlR2V0VGFiU3RhdGUobWVzc2FnZTogYW55LCBzZW5kZXI6IGFueSwgc2VuZFJlc3BvbnNlOiAocmVzcG9uc2U6IGFueSkgPT4gdm9pZCkge1xuICB0cnkge1xuICAgIGNvbnN0IHRhYklkID0gbWVzc2FnZS50YWJJZCB8fCBzZW5kZXIudGFiPy5pZDtcbiAgICBpZiAoIXRhYklkKSB7XG4gICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyB0YWIgSUQgZm91bmQnIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIElmIFVSTCBpcyBwcm92aWRlZCwgc2VhcmNoIGZvciBleGlzdGluZyBhbmFseXNpcyBmb3IgdGhhdCBVUkxcbiAgICBpZiAobWVzc2FnZS51cmwpIHtcbiAgICAgIC8vIFNlYXJjaCB0aHJvdWdoIGFsbCB0YWIgc3RhdGVzIHRvIGZpbmQgYW5hbHlzaXMgZm9yIHRoaXMgVVJMXG4gICAgICBjb25zdCB0YWJTdGF0ZXNEYXRhID0gYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KCd0YWJTdGF0ZXMnKTtcbiAgICAgIGNvbnN0IHRhYlN0YXRlc09iaiA9IHRhYlN0YXRlc0RhdGEudGFiU3RhdGVzIHx8IHt9O1xuICAgICAgXG4gICAgICBmb3IgKGNvbnN0IFt0SWQsIHN0YXRlXSBvZiBPYmplY3QuZW50cmllcyh0YWJTdGF0ZXNPYmopKSB7XG4gICAgICAgIGNvbnN0IHRhYlN0YXRlID0gc3RhdGUgYXMgYW55O1xuICAgICAgICBpZiAodGFiU3RhdGUucGFnZUluZm8/LnVybCA9PT0gbWVzc2FnZS51cmwgJiYgdGFiU3RhdGUuYW5hbHlzaXMgJiYgdGFiU3RhdGUuYW5hbHlzaXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHRhYlN0YXRlIH0pO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBObyBleGlzdGluZyBhbmFseXNpcyBmb3VuZCBmb3IgdGhpcyBVUkxcbiAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IGdldERlZmF1bHRTdGF0ZSgpIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBcbiAgICAvLyBPdGhlcndpc2UsIGdldCBzdGF0ZSBmb3IgdGhlIGN1cnJlbnQgdGFiXG4gICAgY29uc3Qgc3RhdGUgPSBhd2FpdCBnZXRUYWJTdGF0ZSh0YWJJZCkgfHwgZ2V0RGVmYXVsdFN0YXRlKCk7XG4gICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogc3RhdGUgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgaW4gR0VUX1RBQl9TVEFURTonLCBlcnJvcik7XG4gICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnRmFpbGVkIHRvIGdldCB0YWIgc3RhdGUnIH0pO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVSZXNldFRhYlN0YXRlKG1lc3NhZ2U6IGFueSwgc2VuZGVyOiBhbnksIHNlbmRSZXNwb25zZTogKHJlc3BvbnNlOiBhbnkpID0+IHZvaWQpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCB0YWJJZCA9IG1lc3NhZ2UudGFiSWQgfHwgc2VuZGVyLnRhYj8uaWQ7XG4gICAgaWYgKCF0YWJJZCkge1xuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gdGFiIElEIGZvdW5kJyB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBDbGVhciB0aGUgc3RhdGUgY29tcGxldGVseVxuICAgIGF3YWl0IGRlbGV0ZVRhYlN0YXRlKHRhYklkKTtcbiAgICBcbiAgICAvLyBJbml0aWFsaXplIHdpdGggZGVmYXVsdCBzdGF0ZVxuICAgIGNvbnN0IGRlZmF1bHRTdGF0ZSA9IGdldERlZmF1bHRTdGF0ZSgpO1xuICAgIGF3YWl0IHNhdmVUYWJTdGF0ZSh0YWJJZCwgZGVmYXVsdFN0YXRlKTtcbiAgICBcbiAgICAvLyBOb3RpZnkgb3RoZXIgaW5zdGFuY2VzIG9mIHRoZSBzaWRlcGFuZWwgYWJvdXQgdGhlIHJlc2V0XG4gICAgY2hyb21lLnRhYnMuc2VuZE1lc3NhZ2UodGFiSWQsIHtcbiAgICAgIHR5cGU6ICdUQUJfU1dJVENIRUQnLFxuICAgICAgc3RhdGU6IGRlZmF1bHRTdGF0ZVxuICAgIH0pLmNhdGNoKCgpID0+IHtcbiAgICAgIC8vIElnbm9yZSBlcnJvcnMgaWYgY29udGVudCBzY3JpcHQgaXNuJ3QgcmVhZHlcbiAgICB9KTtcbiAgICBcbiAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHJlc2V0dGluZyB0YWIgc3RhdGU6JywgZXJyb3IpO1xuICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0ZhaWxlZCB0byByZXNldCB0YWIgc3RhdGUnIH0pO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYW5kbGVTYXZlVGFiU3RhdGUobWVzc2FnZTogYW55LCBzZW5kZXI6IGFueSwgc2VuZFJlc3BvbnNlOiAocmVzcG9uc2U6IGFueSkgPT4gdm9pZCkge1xuICB0cnkge1xuICAgIGNvbnN0IHRhYklkID0gbWVzc2FnZS50YWJJZCB8fCBzZW5kZXIudGFiPy5pZDtcbiAgICBpZiAoIXRhYklkKSB7XG4gICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyB0YWIgSUQgYXZhaWxhYmxlIHRvIHNhdmUgc3RhdGUnIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFNhdmUgdGhlIHByb3ZpZGVkIHN0YXRlIGZvciB0aGlzIHRhYlxuICAgIGF3YWl0IHNhdmVUYWJTdGF0ZSh0YWJJZCwge1xuICAgICAgcGFnZUluZm86IG1lc3NhZ2UuZGF0YS5wYWdlSW5mbyxcbiAgICAgIGFuYWx5c2lzOiBtZXNzYWdlLmRhdGEuYW5hbHlzaXMsXG4gICAgICBmYWlsZWRQcm92aWRlcnM6IG1lc3NhZ2UuZGF0YS5mYWlsZWRQcm92aWRlcnMsXG4gICAgICBpc0FuYWx5emluZzogbWVzc2FnZS5kYXRhLmlzQW5hbHl6aW5nIHx8IGZhbHNlLFxuICAgICAgaXNWaWV3aW5nRnJvbVJlY2VudDogbWVzc2FnZS5kYXRhLmlzVmlld2luZ0Zyb21SZWNlbnQgfHwgZmFsc2UsXG4gICAgICBvcmlnaW5hbFRhYklkOiBtZXNzYWdlLmRhdGEub3JpZ2luYWxUYWJJZFxuICAgIH0pO1xuICAgIFxuICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnRmFpbGVkIHRvIHNhdmUgdGFiIHN0YXRlJyB9KTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlV2ViU2VhcmNoKG1lc3NhZ2U6IGFueSwgc2VuZGVyOiBhbnksIHNlbmRSZXNwb25zZTogKHJlc3BvbnNlOiBhbnkpID0+IHZvaWQpIHtcbiAgdHJ5IHtcbiAgICAvLyBVc2UgYmFja2VuZCBmb3Igd2ViIHNlYXJjaCBpbnN0ZWFkIG9mIGRpcmVjdCBBUEkgY2FsbHNcbiAgICBjb25zdCB7IGNhbGxCYWNrZW5kV2ViU2VhcmNoIH0gPSBhd2FpdCBpbXBvcnQoJy4vYmFja2VuZENsaWVudCcpO1xuICAgIFxuICAgIGNvbnN0IGJhY2tlbmRSZXNwb25zZSA9IGF3YWl0IGNhbGxCYWNrZW5kV2ViU2VhcmNoKHtcbiAgICAgIHRpdGxlOiBtZXNzYWdlLnF1ZXJ5LFxuICAgICAgdXJsOiBtZXNzYWdlLm9yaWdpbmFsVXJsLFxuICAgICAgbGltaXQ6IG1lc3NhZ2UubWF4X3Jlc3VsdHMgfHwgNVxuICAgIH0pO1xuXG4gICAgaWYgKCFiYWNrZW5kUmVzcG9uc2Uuc3VjY2VzcyB8fCAhYmFja2VuZFJlc3BvbnNlLmRhdGEpIHtcbiAgICAgIHNlbmRSZXNwb25zZSh7XG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICBlcnJvcjogYmFja2VuZFJlc3BvbnNlLmVycm9yIHx8ICdGYWlsZWQgdG8gcGVyZm9ybSB3ZWIgc2VhcmNoJ1xuICAgICAgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc2VuZFJlc3BvbnNlKHtcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICBkYXRhOiB7IHJlc3VsdHM6IGJhY2tlbmRSZXNwb25zZS5kYXRhIH1cbiAgICB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdXZWIgc2VhcmNoIGVycm9yOicsIGVycm9yKTtcbiAgICBzZW5kUmVzcG9uc2Uoe1xuICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnRmFpbGVkIHRvIHBlcmZvcm0gd2ViIHNlYXJjaCdcbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlTG9hZEFuYWx5c2lzSW5UYWIobWVzc2FnZTogYW55LCBzZW5kZXI6IGFueSwgc2VuZFJlc3BvbnNlOiAocmVzcG9uc2U6IGFueSkgPT4gdm9pZCkge1xuICB0cnkge1xuICAgIGNvbnN0IHRhYklkID0gbWVzc2FnZS50YWJJZDtcbiAgICBjb25zdCBhbmFseXNpc0RhdGEgPSBtZXNzYWdlLmFuYWx5c2lzRGF0YTtcblxuICAgIC8vIFByZXZlbnQgZG91YmxlIGV4ZWN1dGlvblxuICAgIGlmIChpc1RhYkJlaW5nU2V0dXAodGFiSWQpKSB7XG4gICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdUYWIgYWxyZWFkeSBiZWluZyBzZXQgdXAnIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBcbiAgICAvLyBNYXJrIHRoaXMgdGFiIGFzIGJlaW5nIHNldCB1cFxuICAgIG1hcmtUYWJBc0JlaW5nU2V0dXAodGFiSWQpO1xuXG4gICAgLy8gU3RvcmUgdGhlIGFuYWx5c2lzIGRhdGEgZm9yIHRoaXMgdGFiXG4gICAgY29uc3QgbmV3U3RhdGUgPSB7XG4gICAgICBwYWdlSW5mbzogYW5hbHlzaXNEYXRhLnBhZ2VJbmZvLFxuICAgICAgYW5hbHlzaXM6IGFuYWx5c2lzRGF0YS5hbmFseXNpcyxcbiAgICAgIGZhaWxlZFByb3ZpZGVyczogYW5hbHlzaXNEYXRhLmZhaWxlZFByb3ZpZGVycyxcbiAgICAgIGlzQW5hbHl6aW5nOiBmYWxzZSxcbiAgICAgIGlzVmlld2luZ0Zyb21SZWNlbnQ6IGFuYWx5c2lzRGF0YS5pc1ZpZXdpbmdGcm9tUmVjZW50IHx8IGZhbHNlLFxuICAgICAgb3JpZ2luYWxUYWJJZDogYW5hbHlzaXNEYXRhLm9yaWdpbmFsVGFiSWRcbiAgICB9O1xuICAgIFxuICAgIGF3YWl0IHNhdmVUYWJTdGF0ZSh0YWJJZCwgbmV3U3RhdGUpO1xuXG4gICAgLy8gTWFyayB0aGlzIHRhYiBhcyBoYXZpbmcgcHJlLWxvYWRlZCBhbmFseXNpcyB0byBwcmV2ZW50IGludGVyZmVyZW5jZVxuICAgIGF3YWl0IHNhdmVUYWJTdGF0ZSh0YWJJZCwge1xuICAgICAgLi4ubmV3U3RhdGUsXG4gICAgICBoYXNQcmVsb2FkZWRBbmFseXNpczogdHJ1ZVxuICAgIH0pO1xuXG4gICAgLy8gV2FpdCBmb3IgcGFnZSB0byBsb2FkLCB0aGVuIGluamVjdCBjb250ZW50IHNjcmlwdCBhbmQgb3BlbiBzaWRlYmFyIGluIG9uZSBzdGVwXG4gICAgc2V0VGltZW91dChhc3luYyAoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICAvLyBDaGVjayBpZiBjb250ZW50IHNjcmlwdCBpcyBhbHJlYWR5IGluamVjdGVkXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgY2hyb21lLnRhYnMuc2VuZE1lc3NhZ2UodGFiSWQsIHsgdHlwZTogJ0ZOUl9QSU5HJyB9KTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAvLyBJbmplY3QgY29udGVudCBzY3JpcHQgZmlyc3RcbiAgICAgICAgICBhd2FpdCBjaHJvbWUuc2NyaXB0aW5nLmV4ZWN1dGVTY3JpcHQoe1xuICAgICAgICAgICAgdGFyZ2V0OiB7IHRhYklkOiB0YWJJZCB9LFxuICAgICAgICAgICAgZmlsZXM6IFsnY29udGVudC1zY3JpcHRzL2NvbnRlbnQuanMnXSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU21hbGwgZGVsYXkgdG8gZW5zdXJlIGNvbnRlbnQgc2NyaXB0IGlzIHJlYWR5LCB0aGVuIG9wZW4gc2lkZWJhclxuICAgICAgICBzZXRUaW1lb3V0KGFzeW5jICgpID0+IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGFiIHN0aWxsIGV4aXN0cyBiZWZvcmUgc2VuZGluZyBtZXNzYWdlXG4gICAgICAgICAgICBjb25zdCB0YWIgPSBhd2FpdCBjaHJvbWUudGFicy5nZXQodGFiSWQpO1xuICAgICAgICAgICAgaWYgKCF0YWIpIHtcbiAgICAgICAgICAgICAgdW5tYXJrVGFiQXNCZWluZ1NldHVwKHRhYklkKTtcbiAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnVGFiIG5vIGxvbmdlciBleGlzdHMnIH0pO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBoaXN0b3J5IHZpZXcgLSBpZiBzbywgd2UgU0hPVUxEIG9wZW4gdGhlIHNpZGViYXJcbiAgICAgICAgICAgIGlmIChuZXdTdGF0ZS5pc1ZpZXdpbmdGcm9tUmVjZW50KSB7XG4gICAgICAgICAgICAgIGNocm9tZS50YWJzLnNlbmRNZXNzYWdlKHRhYklkLCB7IFxuICAgICAgICAgICAgICAgIHR5cGU6ICdUT0dHTEVfSU5KRUNURURfU0lERUJBUicsXG4gICAgICAgICAgICAgICAga2VlcE9wZW46IHRydWUsXG4gICAgICAgICAgICAgICAgcHJlbG9hZGVkQW5hbHlzaXM6IG5ld1N0YXRlLFxuICAgICAgICAgICAgICAgIGhhc1ByZWxvYWRlZEFuYWx5c2lzOiB0cnVlXG4gICAgICAgICAgICAgIH0sIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgIHVubWFya1RhYkFzQmVpbmdTZXR1cCh0YWJJZCk7XG4gICAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGNocm9tZS5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB1bm1hcmtUYWJBc0JlaW5nU2V0dXAodGFiSWQpO1xuICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gSnVzdCBzYXZlIHRoZSBhbmFseXNpcyBkYXRhIHdpdGhvdXQgb3BlbmluZyBzaWRlYmFyXG4gICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XG4gICAgICAgICAgICAgIHVubWFya1RhYkFzQmVpbmdTZXR1cCh0YWJJZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIHVubWFya1RhYkFzQmVpbmdTZXR1cCh0YWJJZCk7XG4gICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdGYWlsZWQgdG8gb3BlbiBzaWRlYmFyJyB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIDIwMCk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3Igc2V0dGluZyB1cCBhbmFseXNpcyB0YWI6JywgZXJyKTtcbiAgICAgICAgdW5tYXJrVGFiQXNCZWluZ1NldHVwKHRhYklkKTtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnRmFpbGVkIHRvIHNldHVwIGFuYWx5c2lzIHRhYicgfSk7XG4gICAgICB9XG4gICAgfSwgMTAwMCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgaW4gTE9BRF9BTkFMWVNJU19JTl9UQUI6JywgZXJyb3IpO1xuICAgIGlmIChtZXNzYWdlLnRhYklkKSB7XG4gICAgICB1bm1hcmtUYWJBc0JlaW5nU2V0dXAobWVzc2FnZS50YWJJZCk7XG4gICAgfVxuICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0ZhaWxlZCB0byBsb2FkIGFuYWx5c2lzIGluIHRhYicgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZU5hdmlnYXRlQW5kUmVvcGVuU2lkZWJhcihtZXNzYWdlOiBhbnksIHNlbmRlcjogYW55LCBzZW5kUmVzcG9uc2U6IChyZXNwb25zZTogYW55KSA9PiB2b2lkKSB7XG4gIHRyeSB7XG4gICAgLy8gQ3JlYXRlIGEgbmV3IHRhYiB3aXRoIHRoZSBVUkxcbiAgICBjb25zdCBuZXdUYWIgPSBhd2FpdCBjaHJvbWUudGFicy5jcmVhdGUoeyB1cmw6IG1lc3NhZ2UudXJsIH0pO1xuICAgIGlmICghbmV3VGFiLmlkKSB7XG4gICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdGYWlsZWQgdG8gY3JlYXRlIG5ldyB0YWInIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHRhYklkID0gbmV3VGFiLmlkO1xuXG4gICAgLy8gV2FpdCBmb3IgcGFnZSB0byBsb2FkLCB0aGVuIGluamVjdCBjb250ZW50IHNjcmlwdCBhbmQgb3BlbiBzaWRlYmFyXG4gICAgc2V0VGltZW91dChhc3luYyAoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICAvLyBJbmplY3QgY29udGVudCBzY3JpcHRcbiAgICAgICAgYXdhaXQgY2hyb21lLnNjcmlwdGluZy5leGVjdXRlU2NyaXB0KHtcbiAgICAgICAgICB0YXJnZXQ6IHsgdGFiSWQ6IHRhYklkIH0sXG4gICAgICAgICAgZmlsZXM6IFsnY29udGVudC1zY3JpcHRzL2NvbnRlbnQuanMnXSxcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBXYWl0IGZvciBjb250ZW50IHNjcmlwdCB0byBiZSByZWFkeVxuICAgICAgICBjb25zdCB3YWl0Rm9yQ29udGVudFNjcmlwdCA9ICgpID0+IHtcbiAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKCdDb250ZW50IHNjcmlwdCBub3QgcmVhZHkgYWZ0ZXIgNSBzZWNvbmRzJykpO1xuICAgICAgICAgICAgfSwgNTAwMCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNocm9tZS50YWJzLnNlbmRNZXNzYWdlKHRhYklkLCB7IHR5cGU6ICdGTlJfUElORycgfSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgICAgICAgaWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xuICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yLm1lc3NhZ2UpKTtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZT8ub2spIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ0NvbnRlbnQgc2NyaXB0IG5vdCByZXNwb25kaW5nJykpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGF3YWl0IHdhaXRGb3JDb250ZW50U2NyaXB0KCk7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgaW4gc2lkZWJhciBzZXR1cDonLCBlcnIpO1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyciBpbnN0YW5jZW9mIEVycm9yID8gZXJyLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcicgfSk7XG4gICAgICB9XG4gICAgfSwgMTAwMCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgaW4gTkFWSUdBVEVfQU5EX1JFT1BFTl9TSURFQkFSOicsIGVycm9yKTtcbiAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdOYXZpZ2F0aW9uIGZhaWxlZCcgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZVByZWxvYWRVcmxBbmFseXNpcyhtZXNzYWdlOiBhbnksIHNlbmRlcjogYW55LCBzZW5kUmVzcG9uc2U6IChyZXNwb25zZTogYW55KSA9PiB2b2lkKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgeyB1cmwsIHBhZ2VJbmZvLCBhbmFseXNpcywgZmFpbGVkUHJvdmlkZXJzIH0gPSBtZXNzYWdlO1xuICAgIGlmICghdXJsIHx8ICFhbmFseXNpcyB8fCBhbmFseXNpcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ01pc3NpbmcgdXJsIG9yIGFuYWx5c2lzJyB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgXG4gICAgLy8gU3RvcmUgaW4gcmVjZW50IGFuYWx5c2VzIGZvciBoaXN0b3J5XG4gICAgY29uc3QgcmVjZW50RGF0YSA9IGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldCgncmVjZW50QW5hbHlzZXMnKTtcbiAgICBjb25zdCByZWNlbnRMaXN0ID0gcmVjZW50RGF0YS5yZWNlbnRBbmFseXNlcyB8fCBbXTtcbiAgICBcbiAgICAvLyBVcGRhdGUgZXhpc3RpbmcgZW50cnkgb3IgYWRkIG5ldyBvbmVcbiAgICBjb25zdCBleGlzdGluZ0luZGV4ID0gcmVjZW50TGlzdC5maW5kSW5kZXgoKGl0ZW06IGFueSkgPT4gaXRlbS51cmwgPT09IHVybCk7XG4gICAgY29uc3QgaGlzdG9yeUVudHJ5ID0ge1xuICAgICAgdGl0bGU6IHBhZ2VJbmZvLnRpdGxlIHx8ICdVbmtub3duIFRpdGxlJyxcbiAgICAgIHVybDogdXJsLFxuICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxuICAgICAgc2NvcmU6IGFuYWx5c2lzWzBdPy5yZXN1bHQ/LmNyZWRpYmlsaXR5X3Njb3JlIHx8IG51bGwsXG4gICAgICBmdWxsQW5hbHlzaXM6IGFuYWx5c2lzLFxuICAgICAgcGFnZUluZm86IHBhZ2VJbmZvLFxuICAgICAgZmFpbGVkUHJvdmlkZXJzOiBmYWlsZWRQcm92aWRlcnMgfHwgW11cbiAgICB9O1xuICAgIFxuICAgIGlmIChleGlzdGluZ0luZGV4ID49IDApIHtcbiAgICAgIHJlY2VudExpc3RbZXhpc3RpbmdJbmRleF0gPSBoaXN0b3J5RW50cnk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlY2VudExpc3QudW5zaGlmdChoaXN0b3J5RW50cnkpO1xuICAgIH1cbiAgICBcbiAgICAvLyBLZWVwIG9ubHkgbGFzdCA1MCBlbnRyaWVzXG4gICAgY29uc3QgdHJpbW1lZExpc3QgPSByZWNlbnRMaXN0LnNsaWNlKDAsIDUwKTtcbiAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyByZWNlbnRBbmFseXNlczogdHJpbW1lZExpc3QgfSk7XG4gICAgXG4gICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBpbiBQUkVMT0FEX1VSTF9BTkFMWVNJUzonLCBlcnJvcik7XG4gICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnRmFpbGVkIHRvIHByZWxvYWQgYW5hbHlzaXMnIH0pO1xuICB9XG59XG4iLCJpbXBvcnQgeyBkZWZpbmVCYWNrZ3JvdW5kIH0gZnJvbSAnd3h0L3V0aWxzL2RlZmluZS1iYWNrZ3JvdW5kJ1xuaW1wb3J0IHsgXG4gIGhhbmRsZUdldFBhZ2VJbmZvLFxuICBoYW5kbGVBbmFseXplQXJ0aWNsZSxcbiAgaGFuZGxlR2V0VGFiU3RhdGUsXG4gIGhhbmRsZVJlc2V0VGFiU3RhdGUsXG4gIGhhbmRsZVNhdmVUYWJTdGF0ZSxcbiAgaGFuZGxlV2ViU2VhcmNoLFxuICBoYW5kbGVMb2FkQW5hbHlzaXNJblRhYixcbiAgaGFuZGxlTmF2aWdhdGVBbmRSZW9wZW5TaWRlYmFyLFxuICBoYW5kbGVQcmVsb2FkVXJsQW5hbHlzaXNcbn0gZnJvbSAnLi4vdXRpbHMvbWVzc2FnZUhhbmRsZXJzJ1xuaW1wb3J0IHsgXG4gIGRlbGV0ZVRhYlN0YXRlLCBcbiAgY2xlYW51cFRhYlN0YXRlcyxcbiAgdW5tYXJrVGFiQXNCZWluZ1NldHVwXG59IGZyb20gJy4uL3V0aWxzL3RhYlN0YXRlJ1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVCYWNrZ3JvdW5kKHtcbiAgbWFpbigpIHtcbiAgICAvLyBMaXN0ZW4gZm9yIGV4dGVuc2lvbiBpbnN0YWxsYXRpb25cbiAgICBjaHJvbWUucnVudGltZS5vbkluc3RhbGxlZC5hZGRMaXN0ZW5lcigoKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZygnRXh0ZW5zaW9uIGluc3RhbGxlZCcpXG4gICAgfSlcbiAgICBcbiAgICAvLyBDbGVhbnVwIHRhYiBzdGF0ZXMgZXZlcnkgNSBtaW51dGVzXG4gICAgc2V0SW50ZXJ2YWwoY2xlYW51cFRhYlN0YXRlcywgNSAqIDYwICogMTAwMCk7XG5cbiAgICAvLyBIYW5kbGUgZXh0ZW5zaW9uIGljb24gY2xpY2tzIHRvIHRvZ2dsZSBpbmplY3RlZCBzaWRlYmFyXG4gICAgY2hyb21lLmFjdGlvbi5vbkNsaWNrZWQuYWRkTGlzdGVuZXIoYXN5bmMgKCkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgW3RhYl0gPSBhd2FpdCBjaHJvbWUudGFicy5xdWVyeSh7IGFjdGl2ZTogdHJ1ZSwgY3VycmVudFdpbmRvdzogdHJ1ZSB9KTtcbiAgICAgICAgaWYgKCF0YWI/LmlkKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcGluZyA9ICh0YWJJZDogbnVtYmVyKSA9PlxuICAgICAgICAgIG5ldyBQcm9taXNlPGJvb2xlYW4+KChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICBsZXQgc2V0dGxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgY2hyb21lLnRhYnMuc2VuZE1lc3NhZ2UodGFiSWQsIHsgdHlwZTogJ0ZOUl9QSU5HJyB9LCAocmVzcCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgIGlmICghc2V0dGxlZCkge1xuICAgICAgICAgICAgICAgICAgICBzZXR0bGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShmYWxzZSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghc2V0dGxlZCkge1xuICAgICAgICAgICAgICAgICAgc2V0dGxlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICByZXNvbHZlKCEhcmVzcD8ub2spO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgIGlmICghc2V0dGxlZCkge1xuICAgICAgICAgICAgICAgIHNldHRsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoZmFsc2UpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgaWYgKCFzZXR0bGVkKSB7XG4gICAgICAgICAgICAgICAgc2V0dGxlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShmYWxzZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDQwMCk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3Qgc2VuZFRvZ2dsZSA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgY2hyb21lLnRhYnMuc2VuZE1lc3NhZ2UodGFiLmlkISwgeyB0eXBlOiAnVE9HR0xFX0lOSkVDVEVEX1NJREVCQVInIH0pO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdUb2dnbGUgc2VuZCBlcnJvcjonLCBlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgY29udGVudCBzY3JpcHQgaXMgYWxyZWFkeSBpbmplY3RlZFxuICAgICAgICBjb25zdCBoYXNMaXN0ZW5lciA9IGF3YWl0IHBpbmcodGFiLmlkKTtcbiAgICAgICAgaWYgKGhhc0xpc3RlbmVyKSB7XG4gICAgICAgICAgYXdhaXQgc2VuZFRvZ2dsZSgpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluamVjdCBjb250ZW50IHNjcmlwdCB0aGVuIHJldHJ5XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgY2hyb21lLnNjcmlwdGluZy5leGVjdXRlU2NyaXB0KHtcbiAgICAgICAgICAgIHRhcmdldDogeyB0YWJJZDogdGFiLmlkIH0sXG4gICAgICAgICAgICBmaWxlczogWydjb250ZW50LXNjcmlwdHMvY29udGVudC5qcyddLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnRmFpbGVkIHRvIGluamVjdCBjb250ZW50IHNjcmlwdDonLCBlcnIpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaGFzTGlzdGVuZXJBZnRlciA9IGF3YWl0IHBpbmcodGFiLmlkKTtcbiAgICAgICAgYXdhaXQgc2VuZFRvZ2dsZSgpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjb25zb2xlLmxvZygnRmFpbGVkIHRvIHRvZ2dsZSBpbmplY3RlZCBzaWRlYmFyOicsIGUpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gTGlzdGVuIGZvciB0YWIgcmVtb3ZhbCB0byBjbGVhbiB1cCBzdGF0ZVxuICAgIGNocm9tZS50YWJzLm9uUmVtb3ZlZC5hZGRMaXN0ZW5lcigodGFiSWQpID0+IHtcbiAgICAgIGRlbGV0ZVRhYlN0YXRlKHRhYklkKTtcbiAgICAgIHVubWFya1RhYkFzQmVpbmdTZXR1cCh0YWJJZCk7XG4gICAgfSk7XG5cbiAgICAvLyBMaXN0ZW4gZm9yIHRhYiBhY3RpdmF0aW9uIHRvIGhhbmRsZSBzdGF0ZSBtYW5hZ2VtZW50IHdoZW4gc3dpdGNoaW5nIHRhYnNcbiAgICBjaHJvbWUudGFicy5vbkFjdGl2YXRlZC5hZGRMaXN0ZW5lcihhc3luYyAoYWN0aXZlSW5mbykgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gU2VuZCBhIG1lc3NhZ2UgdG8gdGhlIHNpZGViYXIgdG8gdXBkYXRlIGl0cyBzdGF0ZVxuICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XG4gICAgICAgICAgdHlwZTogJ1RBQl9TV0lUQ0hFRCcsXG4gICAgICAgICAgdGFiSWQ6IGFjdGl2ZUluZm8udGFiSWQsXG4gICAgICAgIH0pLmNhdGNoKCgpID0+IHtcbiAgICAgICAgICAvLyBJZ25vcmUgZXJyb3JzIGlmIHNpZGViYXIgaXMgbm90IG9wZW5cbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmxvZygnRXJyb3IgaGFuZGxpbmcgdGFiIHN3aXRjaDonLCBlcnJvcik7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBNZXNzYWdlIGhhbmRsZXJcbiAgICBjaHJvbWUucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoKG1lc3NhZ2UsIHNlbmRlciwgc2VuZFJlc3BvbnNlKSA9PiB7XG4gICAgICBjb25zdCBtZXNzYWdlVHlwZSA9IG1lc3NhZ2UudHlwZTtcblxuICAgICAgc3dpdGNoIChtZXNzYWdlVHlwZSkge1xuICAgICAgICBjYXNlICdHRVRfUEFHRV9JTkZPJzpcbiAgICAgICAgICBoYW5kbGVHZXRQYWdlSW5mbyhtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICAgICAgY2FzZSAnQU5BTFlaRV9BUlRJQ0xFJzpcbiAgICAgICAgICBoYW5kbGVBbmFseXplQXJ0aWNsZShtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICAgICAgY2FzZSAnR0VUX1RBQl9TVEFURSc6XG4gICAgICAgICAgaGFuZGxlR2V0VGFiU3RhdGUobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuXG4gICAgICAgIGNhc2UgJ1JFU0VUX1RBQl9TVEFURSc6XG4gICAgICAgICAgaGFuZGxlUmVzZXRUYWJTdGF0ZShtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICAgICAgY2FzZSAnU0FWRV9UQUJfU1RBVEUnOlxuICAgICAgICAgIGhhbmRsZVNhdmVUYWJTdGF0ZShtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICAgICAgY2FzZSAnV0VCX1NFQVJDSCc6XG4gICAgICAgICAgaGFuZGxlV2ViU2VhcmNoKG1lc3NhZ2UsIHNlbmRlciwgc2VuZFJlc3BvbnNlKTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcblxuICAgICAgICBjYXNlICdUQUJfU1dJVENIRUQnOlxuICAgICAgICAgIC8vIFRoaXMgbWVzc2FnZSBpcyBzZW50IGZyb20gdGhlIGJhY2tncm91bmQgc2NyaXB0IHRvIHRoZSBzaWRlYmFyXG4gICAgICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICAgICAgY2FzZSAnTE9BRF9BTkFMWVNJU19JTl9UQUInOlxuICAgICAgICAgIGhhbmRsZUxvYWRBbmFseXNpc0luVGFiKG1lc3NhZ2UsIHNlbmRlciwgc2VuZFJlc3BvbnNlKTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcblxuICAgICAgICBjYXNlICdOQVZJR0FURV9BTkRfUkVPUEVOX1NJREVCQVInOlxuICAgICAgICAgIGhhbmRsZU5hdmlnYXRlQW5kUmVvcGVuU2lkZWJhcihtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICAgICAgY2FzZSAnUFJFTE9BRF9VUkxfQU5BTFlTSVMnOlxuICAgICAgICAgIGhhbmRsZVByZWxvYWRVcmxBbmFseXNpcyhtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIEhhbmRsZSB0YWIgdXBkYXRlcyB3aXRoIHNpbXBsaWZpZWQgbG9naWNcbiAgICBjaHJvbWUudGFicy5vblVwZGF0ZWQuYWRkTGlzdGVuZXIoYXN5bmMgKHRhYklkLCBjaGFuZ2VJbmZvLCB0YWIpID0+IHtcbiAgICAgIGlmIChjaGFuZ2VJbmZvLnN0YXR1cyA9PT0gJ2NvbXBsZXRlJyAmJiB0YWIudXJsKSB7XG4gICAgICAgIC8vIEJhc2ljIHRhYiBjb21wbGV0aW9uIGhhbmRsaW5nIC0gZGV0YWlsZWQgbG9naWMgbW92ZWQgdG8gbWVzc2FnZUhhbmRsZXJzXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gU21hbGwgZGVsYXkgdG8gcHJldmVudCBpbnRlcmZlcmVuY2VcbiAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwMCkpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGluIHRhYiB1cGRhdGUgaGFuZGxlcjonLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufSk7XG4iLCIvLyAjcmVnaW9uIHNuaXBwZXRcbmV4cG9ydCBjb25zdCBicm93c2VyID0gZ2xvYmFsVGhpcy5icm93c2VyPy5ydW50aW1lPy5pZFxuICA/IGdsb2JhbFRoaXMuYnJvd3NlclxuICA6IGdsb2JhbFRoaXMuY2hyb21lO1xuLy8gI2VuZHJlZ2lvbiBzbmlwcGV0XG4iLCJpbXBvcnQgeyBicm93c2VyIGFzIF9icm93c2VyIH0gZnJvbSBcIkB3eHQtZGV2L2Jyb3dzZXJcIjtcbmV4cG9ydCBjb25zdCBicm93c2VyID0gX2Jyb3dzZXI7XG5leHBvcnQge307XG4iLCIvLyBzcmMvaW5kZXgudHNcbnZhciBfTWF0Y2hQYXR0ZXJuID0gY2xhc3Mge1xuICBjb25zdHJ1Y3RvcihtYXRjaFBhdHRlcm4pIHtcbiAgICBpZiAobWF0Y2hQYXR0ZXJuID09PSBcIjxhbGxfdXJscz5cIikge1xuICAgICAgdGhpcy5pc0FsbFVybHMgPSB0cnVlO1xuICAgICAgdGhpcy5wcm90b2NvbE1hdGNoZXMgPSBbLi4uX01hdGNoUGF0dGVybi5QUk9UT0NPTFNdO1xuICAgICAgdGhpcy5ob3N0bmFtZU1hdGNoID0gXCIqXCI7XG4gICAgICB0aGlzLnBhdGhuYW1lTWF0Y2ggPSBcIipcIjtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZ3JvdXBzID0gLyguKik6XFwvXFwvKC4qPykoXFwvLiopLy5leGVjKG1hdGNoUGF0dGVybik7XG4gICAgICBpZiAoZ3JvdXBzID09IG51bGwpXG4gICAgICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKG1hdGNoUGF0dGVybiwgXCJJbmNvcnJlY3QgZm9ybWF0XCIpO1xuICAgICAgY29uc3QgW18sIHByb3RvY29sLCBob3N0bmFtZSwgcGF0aG5hbWVdID0gZ3JvdXBzO1xuICAgICAgdmFsaWRhdGVQcm90b2NvbChtYXRjaFBhdHRlcm4sIHByb3RvY29sKTtcbiAgICAgIHZhbGlkYXRlSG9zdG5hbWUobWF0Y2hQYXR0ZXJuLCBob3N0bmFtZSk7XG4gICAgICB2YWxpZGF0ZVBhdGhuYW1lKG1hdGNoUGF0dGVybiwgcGF0aG5hbWUpO1xuICAgICAgdGhpcy5wcm90b2NvbE1hdGNoZXMgPSBwcm90b2NvbCA9PT0gXCIqXCIgPyBbXCJodHRwXCIsIFwiaHR0cHNcIl0gOiBbcHJvdG9jb2xdO1xuICAgICAgdGhpcy5ob3N0bmFtZU1hdGNoID0gaG9zdG5hbWU7XG4gICAgICB0aGlzLnBhdGhuYW1lTWF0Y2ggPSBwYXRobmFtZTtcbiAgICB9XG4gIH1cbiAgaW5jbHVkZXModXJsKSB7XG4gICAgaWYgKHRoaXMuaXNBbGxVcmxzKVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgY29uc3QgdSA9IHR5cGVvZiB1cmwgPT09IFwic3RyaW5nXCIgPyBuZXcgVVJMKHVybCkgOiB1cmwgaW5zdGFuY2VvZiBMb2NhdGlvbiA/IG5ldyBVUkwodXJsLmhyZWYpIDogdXJsO1xuICAgIHJldHVybiAhIXRoaXMucHJvdG9jb2xNYXRjaGVzLmZpbmQoKHByb3RvY29sKSA9PiB7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiaHR0cFwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0h0dHBNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJodHRwc1wiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0h0dHBzTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiZmlsZVwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0ZpbGVNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJmdHBcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNGdHBNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJ1cm5cIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNVcm5NYXRjaCh1KTtcbiAgICB9KTtcbiAgfVxuICBpc0h0dHBNYXRjaCh1cmwpIHtcbiAgICByZXR1cm4gdXJsLnByb3RvY29sID09PSBcImh0dHA6XCIgJiYgdGhpcy5pc0hvc3RQYXRoTWF0Y2godXJsKTtcbiAgfVxuICBpc0h0dHBzTWF0Y2godXJsKSB7XG4gICAgcmV0dXJuIHVybC5wcm90b2NvbCA9PT0gXCJodHRwczpcIiAmJiB0aGlzLmlzSG9zdFBhdGhNYXRjaCh1cmwpO1xuICB9XG4gIGlzSG9zdFBhdGhNYXRjaCh1cmwpIHtcbiAgICBpZiAoIXRoaXMuaG9zdG5hbWVNYXRjaCB8fCAhdGhpcy5wYXRobmFtZU1hdGNoKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGNvbnN0IGhvc3RuYW1lTWF0Y2hSZWdleHMgPSBbXG4gICAgICB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLmhvc3RuYW1lTWF0Y2gpLFxuICAgICAgdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5ob3N0bmFtZU1hdGNoLnJlcGxhY2UoL15cXCpcXC4vLCBcIlwiKSlcbiAgICBdO1xuICAgIGNvbnN0IHBhdGhuYW1lTWF0Y2hSZWdleCA9IHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMucGF0aG5hbWVNYXRjaCk7XG4gICAgcmV0dXJuICEhaG9zdG5hbWVNYXRjaFJlZ2V4cy5maW5kKChyZWdleCkgPT4gcmVnZXgudGVzdCh1cmwuaG9zdG5hbWUpKSAmJiBwYXRobmFtZU1hdGNoUmVnZXgudGVzdCh1cmwucGF0aG5hbWUpO1xuICB9XG4gIGlzRmlsZU1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiBmaWxlOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBpc0Z0cE1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiBmdHA6Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGlzVXJuTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IHVybjovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgY29udmVydFBhdHRlcm5Ub1JlZ2V4KHBhdHRlcm4pIHtcbiAgICBjb25zdCBlc2NhcGVkID0gdGhpcy5lc2NhcGVGb3JSZWdleChwYXR0ZXJuKTtcbiAgICBjb25zdCBzdGFyc1JlcGxhY2VkID0gZXNjYXBlZC5yZXBsYWNlKC9cXFxcXFwqL2csIFwiLipcIik7XG4gICAgcmV0dXJuIFJlZ0V4cChgXiR7c3RhcnNSZXBsYWNlZH0kYCk7XG4gIH1cbiAgZXNjYXBlRm9yUmVnZXgoc3RyaW5nKSB7XG4gICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKC9bLiorP14ke30oKXxbXFxdXFxcXF0vZywgXCJcXFxcJCZcIik7XG4gIH1cbn07XG52YXIgTWF0Y2hQYXR0ZXJuID0gX01hdGNoUGF0dGVybjtcbk1hdGNoUGF0dGVybi5QUk9UT0NPTFMgPSBbXCJodHRwXCIsIFwiaHR0cHNcIiwgXCJmaWxlXCIsIFwiZnRwXCIsIFwidXJuXCJdO1xudmFyIEludmFsaWRNYXRjaFBhdHRlcm4gPSBjbGFzcyBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IobWF0Y2hQYXR0ZXJuLCByZWFzb24pIHtcbiAgICBzdXBlcihgSW52YWxpZCBtYXRjaCBwYXR0ZXJuIFwiJHttYXRjaFBhdHRlcm59XCI6ICR7cmVhc29ufWApO1xuICB9XG59O1xuZnVuY3Rpb24gdmFsaWRhdGVQcm90b2NvbChtYXRjaFBhdHRlcm4sIHByb3RvY29sKSB7XG4gIGlmICghTWF0Y2hQYXR0ZXJuLlBST1RPQ09MUy5pbmNsdWRlcyhwcm90b2NvbCkgJiYgcHJvdG9jb2wgIT09IFwiKlwiKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKFxuICAgICAgbWF0Y2hQYXR0ZXJuLFxuICAgICAgYCR7cHJvdG9jb2x9IG5vdCBhIHZhbGlkIHByb3RvY29sICgke01hdGNoUGF0dGVybi5QUk9UT0NPTFMuam9pbihcIiwgXCIpfSlgXG4gICAgKTtcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlSG9zdG5hbWUobWF0Y2hQYXR0ZXJuLCBob3N0bmFtZSkge1xuICBpZiAoaG9zdG5hbWUuaW5jbHVkZXMoXCI6XCIpKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKG1hdGNoUGF0dGVybiwgYEhvc3RuYW1lIGNhbm5vdCBpbmNsdWRlIGEgcG9ydGApO1xuICBpZiAoaG9zdG5hbWUuaW5jbHVkZXMoXCIqXCIpICYmIGhvc3RuYW1lLmxlbmd0aCA+IDEgJiYgIWhvc3RuYW1lLnN0YXJ0c1dpdGgoXCIqLlwiKSlcbiAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihcbiAgICAgIG1hdGNoUGF0dGVybixcbiAgICAgIGBJZiB1c2luZyBhIHdpbGRjYXJkICgqKSwgaXQgbXVzdCBnbyBhdCB0aGUgc3RhcnQgb2YgdGhlIGhvc3RuYW1lYFxuICAgICk7XG59XG5mdW5jdGlvbiB2YWxpZGF0ZVBhdGhuYW1lKG1hdGNoUGF0dGVybiwgcGF0aG5hbWUpIHtcbiAgcmV0dXJuO1xufVxuZXhwb3J0IHtcbiAgSW52YWxpZE1hdGNoUGF0dGVybixcbiAgTWF0Y2hQYXR0ZXJuXG59O1xuIl0sIm5hbWVzIjpbIl9hIiwiX2IiLCJzdGF0ZSIsInJlc3VsdCIsImNhbGxCYWNrZW5kV2ViU2VhcmNoIiwiYnJvd3NlciIsIl9icm93c2VyIl0sIm1hcHBpbmdzIjoiOzs7QUFBTyxXQUFTLGlCQUFpQixLQUFLO0FBQ3BDLFFBQUksT0FBTyxRQUFRLE9BQU8sUUFBUSxXQUFZLFFBQU8sRUFBRSxNQUFNLElBQUs7QUFDbEUsV0FBTztBQUFBLEVBQ1Q7QUNBQSxRQUFNLGNBQWtEO0FBb0R4RCxpQkFBc0IsbUJBQW1CLFNBQW1EO0FBQ3RGLFFBQUE7QUFDRixZQUFNLFVBQWtDO0FBQUEsUUFDdEMsZ0JBQWdCO0FBQUEsTUFDbEI7QUFFQSxZQUFNLFdBQVcsTUFBTSxNQUFNLEdBQUcsV0FBVyxnQkFBZ0I7QUFBQSxRQUN6RCxRQUFRO0FBQUEsUUFDUjtBQUFBLFFBQ0EsTUFBTSxLQUFLLFVBQVUsT0FBTztBQUFBLE1BQUEsQ0FDN0I7QUFFRyxVQUFBLENBQUMsU0FBUyxJQUFJO0FBQ1YsY0FBQSxZQUFZ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QUFBQSxJQUNsSDtBQUFBLElBQ0UsWUFBWSxLQUFLO0FBQ2YsWUFBTSxNQUFNLHFFQUFxRTtBQUFBLElBQ3JGO0FBQUEsSUFDRSxXQUFXLEtBQUs7QUFDZCxZQUFNLE1BQU0sb0VBQW9FO0FBQUEsSUFDcEY7QUFBQSxJQUNFLFdBQVcsS0FBSztBQUNkLFlBQU0sTUFBTSxvRUFBb0U7QUFBQSxJQUNwRjtBQUFBLElBQ0Usc0JBQXNCLFNBQVM7QUFDN0IsWUFBTSxVQUFVLEtBQUssZUFBZSxPQUFPO0FBQzNDLFlBQU0sZ0JBQWdCLFFBQVEsUUFBUSxTQUFTLElBQUk7QUFDbkQsYUFBTyxPQUFPLElBQUksYUFBYSxHQUFHO0FBQUEsSUFDdEM7QUFBQSxJQUNFLGVBQWUsUUFBUTtBQUNyQixhQUFPLE9BQU8sUUFBUSx1QkFBdUIsTUFBTTtBQUFBLElBQ3ZEO0FBQUEsRUFDQTtBQUNBLE1BQUksZUFBZTtBQUNuQixlQUFhLFlBQVksQ0FBQyxRQUFRLFNBQVMsUUFBUSxPQUFPLEtBQUs7QUFDL0QsTUFBSSxzQkFBc0IsY0FBYyxNQUFNO0FBQUEsSUFDNUMsWUFBWSxjQUFjLFFBQVE7QUFDaEMsWUFBTSwwQkFBMEIsWUFBWSxNQUFNLE1BQU0sRUFBRTtBQUFBLElBQzlEO0FBQUEsRUFDQTtBQUNBLFdBQVMsaUJBQWlCLGNBQWMsVUFBVTtBQUNoRCxRQUFJLENBQUMsYUFBYSxVQUFVLFNBQVMsUUFBUSxLQUFLLGFBQWE7QUFDN0QsWUFBTSxJQUFJO0FBQUEsUUFDUjtBQUFBLFFBQ0EsR0FBRyxRQUFRLDBCQUEwQixhQUFhLFVBQVUsS0FBSyxJQUFJLENBQUM7QUFBQSxNQUN2RTtBQUFBLEVBQ0w7QUFDQSxXQUFTLGlCQUFpQixjQUFjLFVBQVU7QUFDaEQsUUFBSSxTQUFTLFNBQVMsR0FBRztBQUN2QixZQUFNLElBQUksb0JBQW9CLGNBQWMsZ0NBQWdDO0FBQzlFLFFBQUksU0FBUyxTQUFTLEdBQUcsS0FBSyxTQUFTLFNBQVMsS0FBSyxDQUFDLFNBQVMsV0FBVyxJQUFJO0FBQzVFLFlBQU0sSUFBSTtBQUFBLFFBQ1I7QUFBQSxRQUNBO0FBQUEsTUFDRDtBQUFBLEVBQ0w7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzAsNSw2LDddfQ==
