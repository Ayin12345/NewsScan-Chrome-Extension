var background = function() {
  "use strict";
  var _a, _b;
  async function fetchOpenAI(content, apiKey) {
    var _a2;
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
    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message.content) {
      return data.choices[0].message.content;
    } else {
      throw new Error(((_a2 = data.error) == null ? void 0 : _a2.message) || "No response from OpenAI");
    }
  }
  async function fetchGemini(content, apiKey) {
    var _a2;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
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
          maxOutputTokens: 1e3
        }
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    const data = await response.json();
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error(((_a2 = data.error) == null ? void 0 : _a2.message) || "No response from Gemini");
    }
  }
  async function fetchLlama(content, apiKey) {
    var _a2;
    console.log("Llama API Key:", "Present");
    console.log("API Key length:", apiKey.length);
    const response = await fetch("https://api-inference.huggingface.co/models/meta-llama/Llama-3.3-70B-Instruct", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: content,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.7,
          return_full_text: false
        }
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Llama API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    const data = await response.json();
    if (Array.isArray(data) && ((_a2 = data[0]) == null ? void 0 : _a2.generated_text)) {
      return data[0].generated_text;
    }
    throw new Error(data.error || "No valid response from Llama");
  }
  async function fetchCohere(content, apiKey) {
    const response = await fetch("https://api.cohere.ai/v1/generate", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "command",
        prompt: content,
        max_tokens: 1250
      })
    });
    if (!response.ok) {
      throw new Error(`Cohere API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    if (data.generations && data.generations[0] && data.generations[0].text) {
      return data.generations[0].text;
    } else {
      throw new Error(data.message || "No response from Cohere");
    }
  }
  async function fetchMistral7B(content, apiKey) {
    var _a2;
    const response = await fetch("https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: content,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.7,
          return_full_text: false
        }
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mistral API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    const data = await response.json();
    if (Array.isArray(data) && ((_a2 = data[0]) == null ? void 0 : _a2.generated_text)) {
      return data[0].generated_text;
    }
    throw new Error(data.error || "No valid response from Mistral 7B");
  }
  async function fetchMixtral8x7B(content, apiKey) {
    const response = await fetch("https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: content,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.7,
          return_full_text: false
        }
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mixtral API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    const data = await response.json();
    if (Array.isArray(data) && data[0] && data[0].generated_text) {
      return data[0].generated_text;
    } else {
      throw new Error(data.error || "No response from Mixtral 8x7B");
    }
  }
  background;
  function defineBackground(arg) {
    if (arg == null || typeof arg === "function") return { main: arg };
    return arg;
  }
  const tabStates = /* @__PURE__ */ new Map();
  const getDefaultState = () => ({
    pageInfo: null,
    analysis: [],
    failedProviders: [],
    showButton: true
  });
  const definition = defineBackground({
    main() {
      chrome.runtime.onInstalled.addListener(() => {
        console.log("Extension installed");
      });
      chrome.action.onClicked.addListener(() => {
        chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
      });
      chrome.tabs.onRemoved.addListener((tabId) => {
        tabStates.delete(tabId);
      });
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === "GET_PAGE_INFO") {
          (async () => {
            try {
              const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
              if (!(tab == null ? void 0 : tab.id)) {
                sendResponse({ success: false, error: "No active tab found" });
                return;
              }
              const pageInfo = await chrome.tabs.sendMessage(tab.id, { type: "GET_PAGE_CONTENT" });
              if (pageInfo && pageInfo.error) {
                sendResponse({ success: false, error: pageInfo.error });
                return;
              }
              let state = tabStates.get(tab.id) || getDefaultState();
              state = {
                ...state,
                pageInfo: pageInfo.data,
                showButton: true,
                analysis: [],
                failedProviders: []
              };
              tabStates.set(tab.id, state);
              sendResponse({ success: true, data: pageInfo.data });
            } catch (error) {
              sendResponse({ success: false, error: "Failed to fetch page info" });
            }
          })();
          return true;
        }
        if (message.type === "ANALYZE_ARTICLE") {
          (async () => {
            try {
              const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
              if (!(tab == null ? void 0 : tab.id)) {
                sendResponse({ success: false, error: "No active tab found" });
                return;
              }
              const providers = message.providers || [];
              const results = await Promise.allSettled(
                providers.map(async (provider) => {
                  switch (provider) {
                    case "OpenAI":
                      return await fetchOpenAI(message.content, "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");
                    case "Gemini":
                      return await fetchGemini(message.content, "AIzaSyA82I5_GdxU23af9sklb3mLb8T-tuPP1BE");
                    case "Cohere":
                      return await fetchCohere(message.content, "d4rtWmY3HK9su8mrSbxlsrWEJod7TZyGeNH3ZvdG");
                    case "Mistral7B":
                      return await fetchMistral7B(message.content, "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");
                    case "Mixtral8x7B":
                      return await fetchMixtral8x7B(message.content, "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");
                    case "Llama":
                      return await fetchLlama(message.content, "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");
                    default:
                      throw new Error(`Unknown provider: ${provider}`);
                  }
                })
              );
              const successfulResults = results.map((r, i) => {
                if (r.status === "fulfilled") {
                  try {
                    let parsedResult;
                    if (typeof r.value === "string") {
                      try {
                        parsedResult = JSON.parse(r.value);
                      } catch (e) {
                        const scoreMatch = r.value.match(/credibility_score["\s:]+(\d+)/);
                        const reasoningMatch = r.value.match(/reasoning["\s:]+(.+?)(?=supporting_links|$)/s);
                        const linksMatch = r.value.match(/supporting_links["\s:]+\[(.*?)\]/s);
                        parsedResult = {
                          credibility_score: scoreMatch ? parseInt(scoreMatch[1]) : 0,
                          reasoning: reasoningMatch ? reasoningMatch[1].trim().replace(/['"]+/g, "") : r.value,
                          supporting_links: linksMatch ? linksMatch[1].split(",").map((link) => link.trim().replace(/['"]+/g, "")).filter((link) => link.length > 0) : []
                        };
                      }
                    } else {
                      parsedResult = r.value;
                    }
                    if (!parsedResult) return null;
                    return {
                      provider: providers[i],
                      result: parsedResult
                    };
                  } catch (e) {
                    return null;
                  }
                }
                return null;
              }).filter((x) => x !== null);
              const failedProviders = results.map((r, i) => r.status === "rejected" ? providers[i] : null).filter((x) => x !== null);
              const state = tabStates.get(tab.id) || getDefaultState();
              state.analysis = successfulResults;
              state.failedProviders = failedProviders;
              state.showButton = false;
              tabStates.set(tab.id, state);
              sendResponse({
                success: true,
                data: results,
                providers
              });
            } catch (error) {
              sendResponse({ success: false, error: "Failed to analyze article" });
            }
          })();
          return true;
        }
        if (message.type === "GET_TAB_STATE") {
          (async () => {
            try {
              const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
              if (!(tab == null ? void 0 : tab.id)) {
                sendResponse({ success: false, error: "No active tab found" });
                return;
              }
              const state = tabStates.get(tab.id) || getDefaultState();
              sendResponse({ success: true, data: state });
            } catch (error) {
              sendResponse({ success: false, error: "Failed to get tab state" });
            }
          })();
          return true;
        }
        if (message.type === "RESET_TAB_STATE") {
          (async () => {
            try {
              const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
              if (!(tab == null ? void 0 : tab.id)) {
                sendResponse({ success: false, error: "No active tab found" });
                return;
              }
              tabStates.set(tab.id, getDefaultState());
              sendResponse({ success: true });
            } catch (error) {
              sendResponse({ success: false, error: "Failed to reset tab state" });
            }
          })();
          return true;
        }
        if (message.type === "SAVE_TAB_STATE") {
          (async () => {
            try {
              const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
              if (!(tab == null ? void 0 : tab.id)) {
                sendResponse({ success: false, error: "No active tab found" });
                return;
              }
              tabStates.set(tab.id, {
                pageInfo: message.data.pageInfo,
                analysis: message.data.analysis,
                failedProviders: message.data.failedProviders,
                showButton: message.data.showButton
              });
              sendResponse({ success: true });
            } catch (error) {
              sendResponse({ success: false, error: "Failed to save tab state" });
            }
          })();
          return true;
        }
        return true;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL2FpSGFuZGxpbmcudHMiLCIuLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvZGVmaW5lLWJhY2tncm91bmQubWpzIiwiLi4vLi4vc3JjL2VudHJ5cG9pbnRzL2JhY2tncm91bmQudHMiLCIuLi8uLi9ub2RlX21vZHVsZXMvQHd4dC1kZXYvYnJvd3Nlci9zcmMvaW5kZXgubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2Jyb3dzZXIubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL0B3ZWJleHQtY29yZS9tYXRjaC1wYXR0ZXJucy9saWIvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZldGNoT3BlbkFJKGNvbnRlbnQ6IHN0cmluZywgYXBpS2V5OiBzdHJpbmcpIHtcclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goJ2h0dHBzOi8vYXBpLm9wZW5haS5jb20vdjEvY2hhdC9jb21wbGV0aW9ucycsIHtcclxuICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQXV0aG9yaXphdGlvbic6IGBCZWFyZXIgJHthcGlLZXl9YCxcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBtb2RlbDogJ2dwdC0zLjUtdHVyYm8nLFxyXG4gICAgICAgIG1lc3NhZ2VzOiBbeyByb2xlOiAndXNlcicsIGNvbnRlbnQgfV1cclxuICAgICAgfSlcclxuICAgIH0pXHJcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xyXG4gICAgaWYgKGRhdGEuY2hvaWNlcyAmJiBkYXRhLmNob2ljZXNbMF0gJiYgZGF0YS5jaG9pY2VzWzBdLm1lc3NhZ2UuY29udGVudCkge1xyXG4gICAgICByZXR1cm4gZGF0YS5jaG9pY2VzWzBdLm1lc3NhZ2UuY29udGVudDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihkYXRhLmVycm9yPy5tZXNzYWdlIHx8ICdObyByZXNwb25zZSBmcm9tIE9wZW5BSScpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmZXRjaEdlbWluaShjb250ZW50OiBzdHJpbmcsIGFwaUtleTogc3RyaW5nKSB7XHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGBodHRwczovL2dlbmVyYXRpdmVsYW5ndWFnZS5nb29nbGVhcGlzLmNvbS92MWJldGEvbW9kZWxzL2dlbWluaS0xLjUtZmxhc2gtbGF0ZXN0OmdlbmVyYXRlQ29udGVudD9rZXk9JHthcGlLZXl9YCwge1xyXG4gICAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICBjb250ZW50czogW3tcclxuICAgICAgICAgICAgICAgIHBhcnRzOiBbe1xyXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGNvbnRlbnRcclxuICAgICAgICAgICAgICAgIH1dXHJcbiAgICAgICAgICAgIH1dLFxyXG4gICAgICAgICAgICBnZW5lcmF0aW9uQ29uZmlnOiB7XHJcbiAgICAgICAgICAgICAgICB0ZW1wZXJhdHVyZTogMC43LFxyXG4gICAgICAgICAgICAgICAgbWF4T3V0cHV0VG9rZW5zOiAxMDAwXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgfSk7XHJcblxyXG4gICAgaWYgKCFyZXNwb25zZS5vaykge1xyXG4gICAgICAgIGNvbnN0IGVycm9yVGV4dCA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEdlbWluaSBBUEkgZXJyb3I6ICR7cmVzcG9uc2Uuc3RhdHVzfSAke3Jlc3BvbnNlLnN0YXR1c1RleHR9IC0gJHtlcnJvclRleHR9YCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcclxuICAgIGlmIChkYXRhLmNhbmRpZGF0ZXMgJiYgZGF0YS5jYW5kaWRhdGVzWzBdICYmIGRhdGEuY2FuZGlkYXRlc1swXS5jb250ZW50ICYmIGRhdGEuY2FuZGlkYXRlc1swXS5jb250ZW50LnBhcnRzICYmIGRhdGEuY2FuZGlkYXRlc1swXS5jb250ZW50LnBhcnRzWzBdKSB7XHJcbiAgICAgICAgcmV0dXJuIGRhdGEuY2FuZGlkYXRlc1swXS5jb250ZW50LnBhcnRzWzBdLnRleHQ7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihkYXRhLmVycm9yPy5tZXNzYWdlIHx8ICdObyByZXNwb25zZSBmcm9tIEdlbWluaScpO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmV0Y2hMbGFtYShjb250ZW50OiBzdHJpbmcsIGFwaUtleTogc3RyaW5nKSB7XHJcbiAgICBjb25zb2xlLmxvZygnTGxhbWEgQVBJIEtleTonLCBhcGlLZXkgPyAnUHJlc2VudCcgOiAnTWlzc2luZycpO1xyXG4gICAgY29uc29sZS5sb2coJ0FQSSBLZXkgbGVuZ3RoOicsIGFwaUtleS5sZW5ndGgpO1xyXG4gICAgXHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKCdodHRwczovL2FwaS1pbmZlcmVuY2UuaHVnZ2luZ2ZhY2UuY28vbW9kZWxzL21ldGEtbGxhbWEvTGxhbWEtMy4zLTcwQi1JbnN0cnVjdCcsIHtcclxuICAgICAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAgICdBdXRob3JpemF0aW9uJzogYEJlYXJlciAke2FwaUtleX1gLFxyXG4gICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgIGlucHV0czogY29udGVudCxcclxuICAgICAgICAgICAgcGFyYW1ldGVyczoge1xyXG4gICAgICAgICAgICAgICAgbWF4X25ld190b2tlbnM6IDUwMCxcclxuICAgICAgICAgICAgICAgIHRlbXBlcmF0dXJlOiAwLjcsXHJcbiAgICAgICAgICAgICAgICByZXR1cm5fZnVsbF90ZXh0OiBmYWxzZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgIH0pO1xyXG5cclxuICAgIGlmICghcmVzcG9uc2Uub2spIHtcclxuICAgICAgICBjb25zdCBlcnJvclRleHQgPSBhd2FpdCByZXNwb25zZS50ZXh0KCk7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBMbGFtYSBBUEkgZXJyb3I6ICR7cmVzcG9uc2Uuc3RhdHVzfSAke3Jlc3BvbnNlLnN0YXR1c1RleHR9IC0gJHtlcnJvclRleHR9YCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcclxuXHJcbiAgICAvLyBIdWdnaW5nRmFjZSB0eXBpY2FsbHkgcmV0dXJucyB0aGlzIGZvcm1hdDpcclxuICAgIC8vIFt7IGdlbmVyYXRlZF90ZXh0OiBcIi4uLlwiIH1dXHJcbiAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhKSAmJiBkYXRhWzBdPy5nZW5lcmF0ZWRfdGV4dCkge1xyXG4gICAgICAgIHJldHVybiBkYXRhWzBdLmdlbmVyYXRlZF90ZXh0O1xyXG4gICAgfVxyXG5cclxuICAgIHRocm93IG5ldyBFcnJvcihkYXRhLmVycm9yIHx8ICdObyB2YWxpZCByZXNwb25zZSBmcm9tIExsYW1hJyk7XHJcbn1cclxuXHJcbi8vYWRkIGdlbWluaSBpbiBsYXRlciwgbmVlZCB0byBiZSAxOCsgXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmZXRjaENvaGVyZShjb250ZW50OiBzdHJpbmcsIGFwaUtleTogc3RyaW5nKSB7XHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKCdodHRwczovL2FwaS5jb2hlcmUuYWkvdjEvZ2VuZXJhdGUnLCB7XHJcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAnQXV0aG9yaXphdGlvbic6IGBCZWFyZXIgJHthcGlLZXl9YCxcclxuICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBcclxuICAgICAgICAgICAgbW9kZWw6ICdjb21tYW5kJyxcclxuICAgICAgICAgICAgcHJvbXB0OiBjb250ZW50LFxyXG4gICAgICAgICAgICBtYXhfdG9rZW5zOiAxMjUwLFxyXG4gICAgICAgICB9KVxyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIGlmICghcmVzcG9uc2Uub2spIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENvaGVyZSBBUEkgZXJyb3I6ICR7cmVzcG9uc2Uuc3RhdHVzfSAke3Jlc3BvbnNlLnN0YXR1c1RleHR9YCk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XHJcbiAgICBpZiAoZGF0YS5nZW5lcmF0aW9ucyAmJiBkYXRhLmdlbmVyYXRpb25zWzBdICYmIGRhdGEuZ2VuZXJhdGlvbnNbMF0udGV4dCkge1xyXG4gICAgICAgIHJldHVybiBkYXRhLmdlbmVyYXRpb25zWzBdLnRleHQ7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihkYXRhLm1lc3NhZ2UgfHwgJ05vIHJlc3BvbnNlIGZyb20gQ29oZXJlJyk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmZXRjaE1pc3RyYWw3Qihjb250ZW50OiBzdHJpbmcsIGFwaUtleTogc3RyaW5nKSB7XHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKCdodHRwczovL2FwaS1pbmZlcmVuY2UuaHVnZ2luZ2ZhY2UuY28vbW9kZWxzL21pc3RyYWxhaS9NaXN0cmFsLTdCLUluc3RydWN0LXYwLjMnLCB7XHJcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAnQXV0aG9yaXphdGlvbic6IGBCZWFyZXIgJHthcGlLZXl9YCxcclxuICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICBpbnB1dHM6IGNvbnRlbnQsXHJcbiAgICAgICAgICAgIHBhcmFtZXRlcnM6IHtcclxuICAgICAgICAgICAgICAgIG1heF9uZXdfdG9rZW5zOiA1MDAsXHJcbiAgICAgICAgICAgICAgICB0ZW1wZXJhdHVyZTogMC43LFxyXG4gICAgICAgICAgICAgICAgcmV0dXJuX2Z1bGxfdGV4dDogZmFsc2VcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICB9KTtcclxuXHJcbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XHJcbiAgICAgICAgY29uc3QgZXJyb3JUZXh0ID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTWlzdHJhbCBBUEkgZXJyb3I6ICR7cmVzcG9uc2Uuc3RhdHVzfSAke3Jlc3BvbnNlLnN0YXR1c1RleHR9IC0gJHtlcnJvclRleHR9YCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcclxuXHJcbiAgICAvLyBIdWdnaW5nRmFjZSB0eXBpY2FsbHkgcmV0dXJucyB0aGlzIGZvcm1hdDpcclxuICAgIC8vIFt7IGdlbmVyYXRlZF90ZXh0OiBcIi4uLlwiIH1dXHJcbiAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhKSAmJiBkYXRhWzBdPy5nZW5lcmF0ZWRfdGV4dCkge1xyXG4gICAgICAgIHJldHVybiBkYXRhWzBdLmdlbmVyYXRlZF90ZXh0O1xyXG4gICAgfVxyXG5cclxuICAgIHRocm93IG5ldyBFcnJvcihkYXRhLmVycm9yIHx8ICdObyB2YWxpZCByZXNwb25zZSBmcm9tIE1pc3RyYWwgN0InKTtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZldGNoTWl4dHJhbDh4N0IoY29udGVudDogc3RyaW5nLCBhcGlLZXk6IHN0cmluZykge1xyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCgnaHR0cHM6Ly9hcGktaW5mZXJlbmNlLmh1Z2dpbmdmYWNlLmNvL21vZGVscy9taXN0cmFsYWkvTWl4dHJhbC04eDdCLUluc3RydWN0LXYwLjEnLCB7XHJcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAnQXV0aG9yaXphdGlvbic6IGBCZWFyZXIgJHthcGlLZXl9YCxcclxuICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBcclxuICAgICAgICAgICAgaW5wdXRzOiBjb250ZW50LFxyXG4gICAgICAgICAgICBwYXJhbWV0ZXJzOiB7XHJcbiAgICAgICAgICAgICAgICBtYXhfbmV3X3Rva2VuczogNTAwLFxyXG4gICAgICAgICAgICAgICAgdGVtcGVyYXR1cmU6IDAuNyxcclxuICAgICAgICAgICAgICAgIHJldHVybl9mdWxsX3RleHQ6IGZhbHNlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgfSk7XHJcblxyXG4gICAgaWYgKCFyZXNwb25zZS5vaykge1xyXG4gICAgICAgIGNvbnN0IGVycm9yVGV4dCA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE1peHRyYWwgQVBJIGVycm9yOiAke3Jlc3BvbnNlLnN0YXR1c30gJHtyZXNwb25zZS5zdGF0dXNUZXh0fSAtICR7ZXJyb3JUZXh0fWApO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xyXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkgJiYgZGF0YVswXSAmJiBkYXRhWzBdLmdlbmVyYXRlZF90ZXh0KSB7XHJcbiAgICAgICAgcmV0dXJuIGRhdGFbMF0uZ2VuZXJhdGVkX3RleHQ7ICAgIFxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZGF0YS5lcnJvciB8fCAnTm8gcmVzcG9uc2UgZnJvbSBNaXh0cmFsIDh4N0InKTtcclxuICAgIH1cclxufVxyXG4iLCJleHBvcnQgZnVuY3Rpb24gZGVmaW5lQmFja2dyb3VuZChhcmcpIHtcbiAgaWYgKGFyZyA9PSBudWxsIHx8IHR5cGVvZiBhcmcgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIHsgbWFpbjogYXJnIH07XG4gIHJldHVybiBhcmc7XG59XG4iLCJpbXBvcnQgeyBmZXRjaE9wZW5BSSB9IGZyb20gJy4uL3V0aWxzL2FpSGFuZGxpbmcnXG5pbXBvcnQgeyBmZXRjaEdlbWluaSB9IGZyb20gJy4uL3V0aWxzL2FpSGFuZGxpbmcnXG5pbXBvcnQgeyBmZXRjaENvaGVyZSB9IGZyb20gJy4uL3V0aWxzL2FpSGFuZGxpbmcnXG5pbXBvcnQgeyBmZXRjaE1pc3RyYWw3QiB9IGZyb20gJy4uL3V0aWxzL2FpSGFuZGxpbmcnXG5pbXBvcnQgeyBmZXRjaE1peHRyYWw4eDdCIH0gZnJvbSAnLi4vdXRpbHMvYWlIYW5kbGluZydcbmltcG9ydCB7IGZldGNoTGxhbWEgfSBmcm9tICcuLi91dGlscy9haUhhbmRsaW5nJ1xuaW1wb3J0IHsgZGVmaW5lQmFja2dyb3VuZCB9IGZyb20gJ3d4dC91dGlscy9kZWZpbmUtYmFja2dyb3VuZCdcblxuLy8gRGVmaW5lIHRoZSBzdHJ1Y3R1cmUgb2YgdGFiLXNwZWNpZmljIHN0YXRlXG5pbnRlcmZhY2UgVGFiU3RhdGUge1xuICBwYWdlSW5mbzoge1xuICAgIHRpdGxlOiBzdHJpbmc7XG4gICAgY29udGVudDogc3RyaW5nO1xuICAgIHVybDogc3RyaW5nO1xuICAgIHdvcmRDb3VudDogbnVtYmVyO1xuICB9IHwgbnVsbDtcbiAgYW5hbHlzaXM6IEFycmF5PHtcbiAgICBwcm92aWRlcjogc3RyaW5nO1xuICAgIHJlc3VsdDoge1xuICAgICAgY3JlZGliaWxpdHlfc2NvcmU6IG51bWJlcjtcbiAgICAgIHJlYXNvbmluZzogc3RyaW5nO1xuICAgICAgc3VwcG9ydGluZ19saW5rczogc3RyaW5nW107XG4gICAgfTtcbiAgfT47XG4gIGZhaWxlZFByb3ZpZGVyczogc3RyaW5nW107XG4gIHNob3dCdXR0b246IGJvb2xlYW47XG59XG5cbi8vIFN0b3JlIHN0YXRlcyBmb3IgYWxsIHRhYnNcbmNvbnN0IHRhYlN0YXRlcyA9IG5ldyBNYXA8bnVtYmVyLCBUYWJTdGF0ZT4oKTtcblxuLy8gR2V0IGRlZmF1bHQgc3RhdGUgZm9yIGEgbmV3IHRhYlxuY29uc3QgZ2V0RGVmYXVsdFN0YXRlID0gKCk6IFRhYlN0YXRlID0+ICh7XG4gIHBhZ2VJbmZvOiBudWxsLFxuICBhbmFseXNpczogW10sXG4gIGZhaWxlZFByb3ZpZGVyczogW10sXG4gIHNob3dCdXR0b246IHRydWVcbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVCYWNrZ3JvdW5kKHtcbiAgbWFpbigpIHtcbiAgICAvLyBMaXN0ZW4gZm9yIGV4dGVuc2lvbiBpbnN0YWxsYXRpb25cbiAgICBjaHJvbWUucnVudGltZS5vbkluc3RhbGxlZC5hZGRMaXN0ZW5lcigoKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZygnRXh0ZW5zaW9uIGluc3RhbGxlZCcpXG4gICAgfSlcblxuICAgIC8vIEhhbmRsZSBleHRlbnNpb24gaWNvbiBjbGlja3MgdG8gb3BlbiBzaWRlIHBhbmVsXG4gICAgY2hyb21lLmFjdGlvbi5vbkNsaWNrZWQuYWRkTGlzdGVuZXIoKCkgPT4ge1xuICAgICAgY2hyb21lLnNpZGVQYW5lbC5vcGVuKHsgd2luZG93SWQ6IGNocm9tZS53aW5kb3dzLldJTkRPV19JRF9DVVJSRU5UIH0pO1xuICAgIH0pO1xuXG4gICAgLy8gTGlzdGVuIGZvciB0YWIgcmVtb3ZhbCB0byBjbGVhbiB1cCBzdGF0ZVxuICAgIGNocm9tZS50YWJzLm9uUmVtb3ZlZC5hZGRMaXN0ZW5lcigodGFiSWQpID0+IHtcbiAgICAgIHRhYlN0YXRlcy5kZWxldGUodGFiSWQpO1xuICAgIH0pO1xuXG4gICAgLy8gTWVzc2FnZSBoYW5kbGVyXG4gICAgY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKChtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSkgPT4ge1xuICAgICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gJ0dFVF9QQUdFX0lORk8nKSB7XG4gICAgICAgIChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IFt0YWJdID0gYXdhaXQgY2hyb21lLnRhYnMucXVlcnkoeyBhY3RpdmU6IHRydWUsIGN1cnJlbnRXaW5kb3c6IHRydWUgfSlcbiAgICAgICAgICAgIGlmICghdGFiPy5pZCkge1xuICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgdGFiIGZvdW5kJyB9KTtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBwYWdlSW5mbyA9IGF3YWl0IGNocm9tZS50YWJzLnNlbmRNZXNzYWdlKHRhYi5pZCwgeyB0eXBlOiAnR0VUX1BBR0VfQ09OVEVOVCd9KVxuICAgICAgICAgICAgaWYgKHBhZ2VJbmZvICYmIHBhZ2VJbmZvLmVycm9yKSB7XG4gICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogcGFnZUluZm8uZXJyb3IgfSlcbiAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEdldCBvciBjcmVhdGUgc3RhdGUgZm9yIHRoaXMgdGFiXG4gICAgICAgICAgICBsZXQgc3RhdGUgPSB0YWJTdGF0ZXMuZ2V0KHRhYi5pZCkgfHwgZ2V0RGVmYXVsdFN0YXRlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBzdGF0ZSB3aXRoIG5ldyBwYWdlIGluZm9cbiAgICAgICAgICAgIHN0YXRlID0ge1xuICAgICAgICAgICAgICAuLi5zdGF0ZSxcbiAgICAgICAgICAgICAgcGFnZUluZm86IHBhZ2VJbmZvLmRhdGEsXG4gICAgICAgICAgICAgIHNob3dCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgIGFuYWx5c2lzOiBbXSxcbiAgICAgICAgICAgICAgZmFpbGVkUHJvdmlkZXJzOiBbXVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2F2ZSBzdGF0ZVxuICAgICAgICAgICAgdGFiU3RhdGVzLnNldCh0YWIuaWQsIHN0YXRlKTtcblxuICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogcGFnZUluZm8uZGF0YSB9KVxuICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdGYWlsZWQgdG8gZmV0Y2ggcGFnZSBpbmZvJyB9KVxuICAgICAgICAgIH1cbiAgICAgICAgfSkoKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0gXG4gICAgICBcbiAgICAgIGlmIChtZXNzYWdlLnR5cGUgPT09ICdBTkFMWVpFX0FSVElDTEUnKSB7XG4gICAgICAgIChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IFt0YWJdID0gYXdhaXQgY2hyb21lLnRhYnMucXVlcnkoeyBhY3RpdmU6IHRydWUsIGN1cnJlbnRXaW5kb3c6IHRydWUgfSk7XG4gICAgICAgICAgICBpZiAoIXRhYj8uaWQpIHtcbiAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHRhYiBmb3VuZCcgfSk7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcHJvdmlkZXJzID0gbWVzc2FnZS5wcm92aWRlcnMgfHwgW11cbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBQcm9taXNlLmFsbFNldHRsZWQoXG4gICAgICAgICAgICAgIHByb3ZpZGVycy5tYXAoYXN5bmMgKHByb3ZpZGVyOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHByb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgICBjYXNlICdPcGVuQUknOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgZmV0Y2hPcGVuQUkobWVzc2FnZS5jb250ZW50LCBpbXBvcnQubWV0YS5lbnYuVklURV9PUEVOQUlfQVBJX0tFWSB8fCAnJylcbiAgICAgICAgICAgICAgICAgIGNhc2UgJ0dlbWluaSc6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCBmZXRjaEdlbWluaShtZXNzYWdlLmNvbnRlbnQsIGltcG9ydC5tZXRhLmVudi5WSVRFX0dFTUlOSV9BUElfS0VZIHx8ICcnKVxuICAgICAgICAgICAgICAgICAgY2FzZSAnQ29oZXJlJzpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IGZldGNoQ29oZXJlKG1lc3NhZ2UuY29udGVudCwgaW1wb3J0Lm1ldGEuZW52LlZJVEVfQ09IRVJFX0FQSV9LRVkgfHwgJycpXG4gICAgICAgICAgICAgICAgICBjYXNlICdNaXN0cmFsN0InOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgZmV0Y2hNaXN0cmFsN0IobWVzc2FnZS5jb250ZW50LCBpbXBvcnQubWV0YS5lbnYuVklURV9IVUdHSU5HRkFDRV9BUElfS0VZIHx8ICcnKVxuICAgICAgICAgICAgICAgICAgY2FzZSAnTWl4dHJhbDh4N0InOlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgZmV0Y2hNaXh0cmFsOHg3QihtZXNzYWdlLmNvbnRlbnQsIGltcG9ydC5tZXRhLmVudi5WSVRFX0hVR0dJTkdGQUNFX0FQSV9LRVkgfHwgJycpXG4gICAgICAgICAgICAgICAgICBjYXNlICdMbGFtYSc6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCBmZXRjaExsYW1hKG1lc3NhZ2UuY29udGVudCwgaW1wb3J0Lm1ldGEuZW52LlZJVEVfSFVHR0lOR0ZBQ0VfQVBJX0tFWSB8fCAnJylcbiAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBwcm92aWRlcjogJHtwcm92aWRlcn1gKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIClcblxuICAgICAgICAgICAgLy8gUHJvY2VzcyByZXN1bHRzXG4gICAgICAgICAgICBjb25zdCBzdWNjZXNzZnVsUmVzdWx0cyA9IHJlc3VsdHNcbiAgICAgICAgICAgICAgLm1hcCgociwgaSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyLnN0YXR1cyA9PT0gJ2Z1bGZpbGxlZCcpIHtcbiAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBwYXJzZWRSZXN1bHQ7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygci52YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VkUmVzdWx0ID0gSlNPTi5wYXJzZShyLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzY29yZU1hdGNoID0gci52YWx1ZS5tYXRjaCgvY3JlZGliaWxpdHlfc2NvcmVbXCJcXHM6XSsoXFxkKykvKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlYXNvbmluZ01hdGNoID0gci52YWx1ZS5tYXRjaCgvcmVhc29uaW5nW1wiXFxzOl0rKC4rPykoPz1zdXBwb3J0aW5nX2xpbmtzfCQpL3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbGlua3NNYXRjaCA9IHIudmFsdWUubWF0Y2goL3N1cHBvcnRpbmdfbGlua3NbXCJcXHM6XStcXFsoLio/KVxcXS9zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VkUmVzdWx0ID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBjcmVkaWJpbGl0eV9zY29yZTogc2NvcmVNYXRjaCA/IHBhcnNlSW50KHNjb3JlTWF0Y2hbMV0pIDogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcmVhc29uaW5nOiByZWFzb25pbmdNYXRjaCA/IHJlYXNvbmluZ01hdGNoWzFdLnRyaW0oKS5yZXBsYWNlKC9bJ1wiXSsvZywgJycpIDogci52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgc3VwcG9ydGluZ19saW5rczogbGlua3NNYXRjaCA/IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmtzTWF0Y2hbMV0uc3BsaXQoJywnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcCgobGluazogc3RyaW5nKSA9PiBsaW5rLnRyaW0oKS5yZXBsYWNlKC9bJ1wiXSsvZywgJycpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcigobGluazogc3RyaW5nKSA9PiBsaW5rLmxlbmd0aCA+IDApIDogW11cbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIHBhcnNlZFJlc3VsdCA9IHIudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoIXBhcnNlZFJlc3VsdCkgcmV0dXJuIG51bGw7XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICBwcm92aWRlcjogcHJvdmlkZXJzW2ldLFxuICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDogcGFyc2VkUmVzdWx0XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLmZpbHRlcigoeCk6IHggaXMgTm9uTnVsbGFibGU8dHlwZW9mIHg+ID0+IHggIT09IG51bGwpO1xuXG4gICAgICAgICAgICBjb25zdCBmYWlsZWRQcm92aWRlcnMgPSByZXN1bHRzXG4gICAgICAgICAgICAgIC5tYXAoKHIsIGkpID0+IHIuc3RhdHVzID09PSAncmVqZWN0ZWQnID8gcHJvdmlkZXJzW2ldIDogbnVsbClcbiAgICAgICAgICAgICAgLmZpbHRlcigoeCk6IHggaXMgc3RyaW5nID0+IHggIT09IG51bGwpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgdGFiIHN0YXRlIHdpdGggYW5hbHlzaXMgcmVzdWx0c1xuICAgICAgICAgICAgY29uc3Qgc3RhdGUgPSB0YWJTdGF0ZXMuZ2V0KHRhYi5pZCkgfHwgZ2V0RGVmYXVsdFN0YXRlKCk7XG4gICAgICAgICAgICBzdGF0ZS5hbmFseXNpcyA9IHN1Y2Nlc3NmdWxSZXN1bHRzO1xuICAgICAgICAgICAgc3RhdGUuZmFpbGVkUHJvdmlkZXJzID0gZmFpbGVkUHJvdmlkZXJzO1xuICAgICAgICAgICAgc3RhdGUuc2hvd0J1dHRvbiA9IGZhbHNlO1xuICAgICAgICAgICAgdGFiU3RhdGVzLnNldCh0YWIuaWQsIHN0YXRlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHtcbiAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgZGF0YTogcmVzdWx0cyxcbiAgICAgICAgICAgICAgcHJvdmlkZXJzOiBwcm92aWRlcnNcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0ZhaWxlZCB0byBhbmFseXplIGFydGljbGUnIH0pXG4gICAgICAgICAgfVxuICAgICAgICB9KSgpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAobWVzc2FnZS50eXBlID09PSAnR0VUX1RBQl9TVEFURScpIHtcbiAgICAgICAgKGFzeW5jICgpID0+IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgW3RhYl0gPSBhd2FpdCBjaHJvbWUudGFicy5xdWVyeSh7IGFjdGl2ZTogdHJ1ZSwgY3VycmVudFdpbmRvdzogdHJ1ZSB9KTtcbiAgICAgICAgICAgIGlmICghdGFiPy5pZCkge1xuICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgdGFiIGZvdW5kJyB9KTtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBHZXQgb3IgY3JlYXRlIHN0YXRlIGZvciB0aGlzIHRhYlxuICAgICAgICAgICAgY29uc3Qgc3RhdGUgPSB0YWJTdGF0ZXMuZ2V0KHRhYi5pZCkgfHwgZ2V0RGVmYXVsdFN0YXRlKCk7XG4gICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBzdGF0ZSB9KTtcbiAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnRmFpbGVkIHRvIGdldCB0YWIgc3RhdGUnIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSkoKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gJ1JFU0VUX1RBQl9TVEFURScpIHtcbiAgICAgICAgKGFzeW5jICgpID0+IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgW3RhYl0gPSBhd2FpdCBjaHJvbWUudGFicy5xdWVyeSh7IGFjdGl2ZTogdHJ1ZSwgY3VycmVudFdpbmRvdzogdHJ1ZSB9KTtcbiAgICAgICAgICAgIGlmICghdGFiPy5pZCkge1xuICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgdGFiIGZvdW5kJyB9KTtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBSZXNldCBzdGF0ZSBmb3IgdGhpcyB0YWIgb25seVxuICAgICAgICAgICAgdGFiU3RhdGVzLnNldCh0YWIuaWQsIGdldERlZmF1bHRTdGF0ZSgpKTtcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XG4gICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0ZhaWxlZCB0byByZXNldCB0YWIgc3RhdGUnIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSkoKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gJ1NBVkVfVEFCX1NUQVRFJykge1xuICAgICAgICAoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBbdGFiXSA9IGF3YWl0IGNocm9tZS50YWJzLnF1ZXJ5KHsgYWN0aXZlOiB0cnVlLCBjdXJyZW50V2luZG93OiB0cnVlIH0pO1xuICAgICAgICAgICAgaWYgKCF0YWI/LmlkKSB7XG4gICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSB0YWIgZm91bmQnIH0pO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNhdmUgdGhlIHByb3ZpZGVkIHN0YXRlIGZvciB0aGlzIHRhYlxuICAgICAgICAgICAgdGFiU3RhdGVzLnNldCh0YWIuaWQsIHtcbiAgICAgICAgICAgICAgcGFnZUluZm86IG1lc3NhZ2UuZGF0YS5wYWdlSW5mbyxcbiAgICAgICAgICAgICAgYW5hbHlzaXM6IG1lc3NhZ2UuZGF0YS5hbmFseXNpcyxcbiAgICAgICAgICAgICAgZmFpbGVkUHJvdmlkZXJzOiBtZXNzYWdlLmRhdGEuZmFpbGVkUHJvdmlkZXJzLFxuICAgICAgICAgICAgICBzaG93QnV0dG9uOiBtZXNzYWdlLmRhdGEuc2hvd0J1dHRvblxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XG4gICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0ZhaWxlZCB0byBzYXZlIHRhYiBzdGF0ZScgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KSgpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KVxuICB9XG59KTsiLCIvLyAjcmVnaW9uIHNuaXBwZXRcbmV4cG9ydCBjb25zdCBicm93c2VyID0gZ2xvYmFsVGhpcy5icm93c2VyPy5ydW50aW1lPy5pZFxuICA/IGdsb2JhbFRoaXMuYnJvd3NlclxuICA6IGdsb2JhbFRoaXMuY2hyb21lO1xuLy8gI2VuZHJlZ2lvbiBzbmlwcGV0XG4iLCJpbXBvcnQgeyBicm93c2VyIGFzIF9icm93c2VyIH0gZnJvbSBcIkB3eHQtZGV2L2Jyb3dzZXJcIjtcbmV4cG9ydCBjb25zdCBicm93c2VyID0gX2Jyb3dzZXI7XG5leHBvcnQge307XG4iLCIvLyBzcmMvaW5kZXgudHNcbnZhciBfTWF0Y2hQYXR0ZXJuID0gY2xhc3Mge1xuICBjb25zdHJ1Y3RvcihtYXRjaFBhdHRlcm4pIHtcbiAgICBpZiAobWF0Y2hQYXR0ZXJuID09PSBcIjxhbGxfdXJscz5cIikge1xuICAgICAgdGhpcy5pc0FsbFVybHMgPSB0cnVlO1xuICAgICAgdGhpcy5wcm90b2NvbE1hdGNoZXMgPSBbLi4uX01hdGNoUGF0dGVybi5QUk9UT0NPTFNdO1xuICAgICAgdGhpcy5ob3N0bmFtZU1hdGNoID0gXCIqXCI7XG4gICAgICB0aGlzLnBhdGhuYW1lTWF0Y2ggPSBcIipcIjtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZ3JvdXBzID0gLyguKik6XFwvXFwvKC4qPykoXFwvLiopLy5leGVjKG1hdGNoUGF0dGVybik7XG4gICAgICBpZiAoZ3JvdXBzID09IG51bGwpXG4gICAgICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKG1hdGNoUGF0dGVybiwgXCJJbmNvcnJlY3QgZm9ybWF0XCIpO1xuICAgICAgY29uc3QgW18sIHByb3RvY29sLCBob3N0bmFtZSwgcGF0aG5hbWVdID0gZ3JvdXBzO1xuICAgICAgdmFsaWRhdGVQcm90b2NvbChtYXRjaFBhdHRlcm4sIHByb3RvY29sKTtcbiAgICAgIHZhbGlkYXRlSG9zdG5hbWUobWF0Y2hQYXR0ZXJuLCBob3N0bmFtZSk7XG4gICAgICB2YWxpZGF0ZVBhdGhuYW1lKG1hdGNoUGF0dGVybiwgcGF0aG5hbWUpO1xuICAgICAgdGhpcy5wcm90b2NvbE1hdGNoZXMgPSBwcm90b2NvbCA9PT0gXCIqXCIgPyBbXCJodHRwXCIsIFwiaHR0cHNcIl0gOiBbcHJvdG9jb2xdO1xuICAgICAgdGhpcy5ob3N0bmFtZU1hdGNoID0gaG9zdG5hbWU7XG4gICAgICB0aGlzLnBhdGhuYW1lTWF0Y2ggPSBwYXRobmFtZTtcbiAgICB9XG4gIH1cbiAgaW5jbHVkZXModXJsKSB7XG4gICAgaWYgKHRoaXMuaXNBbGxVcmxzKVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgY29uc3QgdSA9IHR5cGVvZiB1cmwgPT09IFwic3RyaW5nXCIgPyBuZXcgVVJMKHVybCkgOiB1cmwgaW5zdGFuY2VvZiBMb2NhdGlvbiA/IG5ldyBVUkwodXJsLmhyZWYpIDogdXJsO1xuICAgIHJldHVybiAhIXRoaXMucHJvdG9jb2xNYXRjaGVzLmZpbmQoKHByb3RvY29sKSA9PiB7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiaHR0cFwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0h0dHBNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJodHRwc1wiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0h0dHBzTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiZmlsZVwiKVxuICAgICAgICByZXR1cm4gdGhpcy5pc0ZpbGVNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJmdHBcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNGdHBNYXRjaCh1KTtcbiAgICAgIGlmIChwcm90b2NvbCA9PT0gXCJ1cm5cIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNVcm5NYXRjaCh1KTtcbiAgICB9KTtcbiAgfVxuICBpc0h0dHBNYXRjaCh1cmwpIHtcbiAgICByZXR1cm4gdXJsLnByb3RvY29sID09PSBcImh0dHA6XCIgJiYgdGhpcy5pc0hvc3RQYXRoTWF0Y2godXJsKTtcbiAgfVxuICBpc0h0dHBzTWF0Y2godXJsKSB7XG4gICAgcmV0dXJuIHVybC5wcm90b2NvbCA9PT0gXCJodHRwczpcIiAmJiB0aGlzLmlzSG9zdFBhdGhNYXRjaCh1cmwpO1xuICB9XG4gIGlzSG9zdFBhdGhNYXRjaCh1cmwpIHtcbiAgICBpZiAoIXRoaXMuaG9zdG5hbWVNYXRjaCB8fCAhdGhpcy5wYXRobmFtZU1hdGNoKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGNvbnN0IGhvc3RuYW1lTWF0Y2hSZWdleHMgPSBbXG4gICAgICB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLmhvc3RuYW1lTWF0Y2gpLFxuICAgICAgdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5ob3N0bmFtZU1hdGNoLnJlcGxhY2UoL15cXCpcXC4vLCBcIlwiKSlcbiAgICBdO1xuICAgIGNvbnN0IHBhdGhuYW1lTWF0Y2hSZWdleCA9IHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMucGF0aG5hbWVNYXRjaCk7XG4gICAgcmV0dXJuICEhaG9zdG5hbWVNYXRjaFJlZ2V4cy5maW5kKChyZWdleCkgPT4gcmVnZXgudGVzdCh1cmwuaG9zdG5hbWUpKSAmJiBwYXRobmFtZU1hdGNoUmVnZXgudGVzdCh1cmwucGF0aG5hbWUpO1xuICB9XG4gIGlzRmlsZU1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiBmaWxlOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBpc0Z0cE1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiBmdHA6Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGlzVXJuTWF0Y2godXJsKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQ6IHVybjovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgY29udmVydFBhdHRlcm5Ub1JlZ2V4KHBhdHRlcm4pIHtcbiAgICBjb25zdCBlc2NhcGVkID0gdGhpcy5lc2NhcGVGb3JSZWdleChwYXR0ZXJuKTtcbiAgICBjb25zdCBzdGFyc1JlcGxhY2VkID0gZXNjYXBlZC5yZXBsYWNlKC9cXFxcXFwqL2csIFwiLipcIik7XG4gICAgcmV0dXJuIFJlZ0V4cChgXiR7c3RhcnNSZXBsYWNlZH0kYCk7XG4gIH1cbiAgZXNjYXBlRm9yUmVnZXgoc3RyaW5nKSB7XG4gICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKC9bLiorP14ke30oKXxbXFxdXFxcXF0vZywgXCJcXFxcJCZcIik7XG4gIH1cbn07XG52YXIgTWF0Y2hQYXR0ZXJuID0gX01hdGNoUGF0dGVybjtcbk1hdGNoUGF0dGVybi5QUk9UT0NPTFMgPSBbXCJodHRwXCIsIFwiaHR0cHNcIiwgXCJmaWxlXCIsIFwiZnRwXCIsIFwidXJuXCJdO1xudmFyIEludmFsaWRNYXRjaFBhdHRlcm4gPSBjbGFzcyBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IobWF0Y2hQYXR0ZXJuLCByZWFzb24pIHtcbiAgICBzdXBlcihgSW52YWxpZCBtYXRjaCBwYXR0ZXJuIFwiJHttYXRjaFBhdHRlcm59XCI6ICR7cmVhc29ufWApO1xuICB9XG59O1xuZnVuY3Rpb24gdmFsaWRhdGVQcm90b2NvbChtYXRjaFBhdHRlcm4sIHByb3RvY29sKSB7XG4gIGlmICghTWF0Y2hQYXR0ZXJuLlBST1RPQ09MUy5pbmNsdWRlcyhwcm90b2NvbCkgJiYgcHJvdG9jb2wgIT09IFwiKlwiKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKFxuICAgICAgbWF0Y2hQYXR0ZXJuLFxuICAgICAgYCR7cHJvdG9jb2x9IG5vdCBhIHZhbGlkIHByb3RvY29sICgke01hdGNoUGF0dGVybi5QUk9UT0NPTFMuam9pbihcIiwgXCIpfSlgXG4gICAgKTtcbn1cbmZ1bmN0aW9uIHZhbGlkYXRlSG9zdG5hbWUobWF0Y2hQYXR0ZXJuLCBob3N0bmFtZSkge1xuICBpZiAoaG9zdG5hbWUuaW5jbHVkZXMoXCI6XCIpKVxuICAgIHRocm93IG5ldyBJbnZhbGlkTWF0Y2hQYXR0ZXJuKG1hdGNoUGF0dGVybiwgYEhvc3RuYW1lIGNhbm5vdCBpbmNsdWRlIGEgcG9ydGApO1xuICBpZiAoaG9zdG5hbWUuaW5jbHVkZXMoXCIqXCIpICYmIGhvc3RuYW1lLmxlbmd0aCA+IDEgJiYgIWhvc3RuYW1lLnN0YXJ0c1dpdGgoXCIqLlwiKSlcbiAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihcbiAgICAgIG1hdGNoUGF0dGVybixcbiAgICAgIGBJZiB1c2luZyBhIHdpbGRjYXJkICgqKSwgaXQgbXVzdCBnbyBhdCB0aGUgc3RhcnQgb2YgdGhlIGhvc3RuYW1lYFxuICAgICk7XG59XG5mdW5jdGlvbiB2YWxpZGF0ZVBhdGhuYW1lKG1hdGNoUGF0dGVybiwgcGF0aG5hbWUpIHtcbiAgcmV0dXJuO1xufVxuZXhwb3J0IHtcbiAgSW52YWxpZE1hdGNoUGF0dGVybixcbiAgTWF0Y2hQYXR0ZXJuXG59O1xuIl0sIm5hbWVzIjpbIl9hIiwiYnJvd3NlciIsIl9icm93c2VyIl0sIm1hcHBpbmdzIjoiOzs7QUFBc0IsaUJBQUEsWUFBWSxTQUFpQixRQUFnQjs7QUFDekQsVUFBQSxXQUFXLE1BQU0sTUFBTSw4Q0FBOEM7QUFBQSxNQUN6RSxRQUFRO0FBQUEsTUFDUixTQUFTO0FBQUEsUUFDUCxpQkFBaUIsVUFBVSxNQUFNO0FBQUEsUUFDakMsZ0JBQWdCO0FBQUEsTUFDbEI7QUFBQSxNQUNBLE1BQU0sS0FBSyxVQUFVO0FBQUEsUUFDbkIsT0FBTztBQUFBLFFBQ1AsVUFBVSxDQUFD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
