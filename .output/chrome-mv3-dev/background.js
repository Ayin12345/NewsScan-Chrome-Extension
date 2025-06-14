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
  const definition = {
    main() {
      chrome.runtime.onInstalled.addListener(() => {
        console.log("Extension installed");
      });
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === "GET_PAGE_INFO") {
          (async () => {
            try {
              const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
              const pageInfo = await chrome.tabs.sendMessage(tab.id, { type: "GET_PAGE_CONTENT" });
              if (pageInfo && pageInfo.error) {
                sendResponse({ success: false, error: pageInfo.error });
                return;
              } else {
                sendResponse({ success: true, data: pageInfo });
                chrome.storage.local.set({ pageInfo });
              }
            } catch (error) {
              console.error("Error fetching page info:", error);
              sendResponse({ success: false, error: "Failed to fetch page info" });
            }
          })();
        }
        return true;
      });
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === "ANALYZE_ARTICLE") {
          const { content, providers } = message;
          const tasks = [];
          for (const provider of providers) {
            if (provider === "Openai") {
              tasks.push(fetchOpenAI(content, "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"));
            } else if (provider === "Gemini") {
              tasks.push(fetchGemini(content, "AIzaSyA82I5_GdxU23af9sklb3mLb8T-tuPP1BE").then((response) => {
                console.log("🔮 Gemini response:", response);
                return response;
              }));
            } else if (provider === "Cohere") {
              tasks.push(fetchCohere(content, "d4rtWmY3HK9su8mrSbxlsrWEJod7TZyGeNH3ZvdG").then((response) => {
                console.log("🧠 Cohere response:", response);
                return response;
              }));
            } else if (provider === "Mistral") {
              tasks.push(fetchMistral7B(content, "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"));
            } else if (provider === "Mixtral") {
              tasks.push(fetchMixtral8x7B(content, "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"));
            } else if (provider === "Llama") {
              tasks.push(fetchLlama(content, "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").then((response) => {
                console.log("🦙 Llama response:", response);
                return response;
              }));
            }
          }
          Promise.allSettled(tasks).then((results) => {
            sendResponse({ success: true, data: results, providers });
          }).catch((error) => {
            console.error("Analysis failed:", error);
            sendResponse({ success: false, error: "Analysis failed" });
          });
          return true;
        }
      });
    }
  };
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2dyb3VuZC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vdXRpbHMvYWlIYW5kbGluZy50cyIsIi4uLy4uL2VudHJ5cG9pbnRzL2JhY2tncm91bmQudHMiLCIuLi8uLi9ub2RlX21vZHVsZXMvQHd4dC1kZXYvYnJvd3Nlci9zcmMvaW5kZXgubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L2Jyb3dzZXIubWpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL0B3ZWJleHQtY29yZS9tYXRjaC1wYXR0ZXJucy9saWIvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZldGNoT3BlbkFJKGNvbnRlbnQ6IHN0cmluZywgYXBpS2V5OiBzdHJpbmcpIHtcclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goJ2h0dHBzOi8vYXBpLm9wZW5haS5jb20vdjEvY2hhdC9jb21wbGV0aW9ucycsIHtcclxuICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQXV0aG9yaXphdGlvbic6IGBCZWFyZXIgJHthcGlLZXl9YCxcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBtb2RlbDogJ2dwdC0zLjUtdHVyYm8nLFxyXG4gICAgICAgIG1lc3NhZ2VzOiBbeyByb2xlOiAndXNlcicsIGNvbnRlbnQgfV1cclxuICAgICAgfSlcclxuICAgIH0pXHJcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xyXG4gICAgaWYgKGRhdGEuY2hvaWNlcyAmJiBkYXRhLmNob2ljZXNbMF0gJiYgZGF0YS5jaG9pY2VzWzBdLm1lc3NhZ2UuY29udGVudCkge1xyXG4gICAgICByZXR1cm4gZGF0YS5jaG9pY2VzWzBdLm1lc3NhZ2UuY29udGVudDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihkYXRhLmVycm9yPy5tZXNzYWdlIHx8ICdObyByZXNwb25zZSBmcm9tIE9wZW5BSScpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmZXRjaEdlbWluaShjb250ZW50OiBzdHJpbmcsIGFwaUtleTogc3RyaW5nKSB7XHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGBodHRwczovL2dlbmVyYXRpdmVsYW5ndWFnZS5nb29nbGVhcGlzLmNvbS92MWJldGEvbW9kZWxzL2dlbWluaS0xLjUtZmxhc2gtbGF0ZXN0OmdlbmVyYXRlQ29udGVudD9rZXk9JHthcGlLZXl9YCwge1xyXG4gICAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICBjb250ZW50czogW3tcclxuICAgICAgICAgICAgICAgIHBhcnRzOiBbe1xyXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGNvbnRlbnRcclxuICAgICAgICAgICAgICAgIH1dXHJcbiAgICAgICAgICAgIH1dLFxyXG4gICAgICAgICAgICBnZW5lcmF0aW9uQ29uZmlnOiB7XHJcbiAgICAgICAgICAgICAgICB0ZW1wZXJhdHVyZTogMC43LFxyXG4gICAgICAgICAgICAgICAgbWF4T3V0cHV0VG9rZW5zOiAxMDAwXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgfSk7XHJcblxyXG4gICAgaWYgKCFyZXNwb25zZS5vaykge1xyXG4gICAgICAgIGNvbnN0IGVycm9yVGV4dCA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEdlbWluaSBBUEkgZXJyb3I6ICR7cmVzcG9uc2Uuc3RhdHVzfSAke3Jlc3BvbnNlLnN0YXR1c1RleHR9IC0gJHtlcnJvclRleHR9YCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcclxuICAgIGlmIChkYXRhLmNhbmRpZGF0ZXMgJiYgZGF0YS5jYW5kaWRhdGVzWzBdICYmIGRhdGEuY2FuZGlkYXRlc1swXS5jb250ZW50ICYmIGRhdGEuY2FuZGlkYXRlc1swXS5jb250ZW50LnBhcnRzICYmIGRhdGEuY2FuZGlkYXRlc1swXS5jb250ZW50LnBhcnRzWzBdKSB7XHJcbiAgICAgICAgcmV0dXJuIGRhdGEuY2FuZGlkYXRlc1swXS5jb250ZW50LnBhcnRzWzBdLnRleHQ7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihkYXRhLmVycm9yPy5tZXNzYWdlIHx8ICdObyByZXNwb25zZSBmcm9tIEdlbWluaScpO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmV0Y2hMbGFtYShjb250ZW50OiBzdHJpbmcsIGFwaUtleTogc3RyaW5nKSB7XHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKCdodHRwczovL2FwaS1pbmZlcmVuY2UuaHVnZ2luZ2ZhY2UuY28vbW9kZWxzL21ldGEtbGxhbWEvTGxhbWEtMy4zLTcwQi1JbnN0cnVjdCcsIHtcclxuICAgICAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAgICdBdXRob3JpemF0aW9uJzogYEJlYXJlciAke2FwaUtleX1gLFxyXG4gICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgIGlucHV0czogY29udGVudCxcclxuICAgICAgICAgICAgcGFyYW1ldGVyczoge1xyXG4gICAgICAgICAgICAgICAgbWF4X25ld190b2tlbnM6IDUwMCxcclxuICAgICAgICAgICAgICAgIHRlbXBlcmF0dXJlOiAwLjcsXHJcbiAgICAgICAgICAgICAgICByZXR1cm5fZnVsbF90ZXh0OiBmYWxzZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgIH0pO1xyXG5cclxuICAgIGlmICghcmVzcG9uc2Uub2spIHtcclxuICAgICAgICBjb25zdCBlcnJvclRleHQgPSBhd2FpdCByZXNwb25zZS50ZXh0KCk7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBMbGFtYSBBUEkgZXJyb3I6ICR7cmVzcG9uc2Uuc3RhdHVzfSAke3Jlc3BvbnNlLnN0YXR1c1RleHR9IC0gJHtlcnJvclRleHR9YCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcclxuXHJcbiAgICAvLyBIdWdnaW5nRmFjZSB0eXBpY2FsbHkgcmV0dXJucyB0aGlzIGZvcm1hdDpcclxuICAgIC8vIFt7IGdlbmVyYXRlZF90ZXh0OiBcIi4uLlwiIH1dXHJcbiAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhKSAmJiBkYXRhWzBdPy5nZW5lcmF0ZWRfdGV4dCkge1xyXG4gICAgICAgIHJldHVybiBkYXRhWzBdLmdlbmVyYXRlZF90ZXh0O1xyXG4gICAgfVxyXG5cclxuICAgIHRocm93IG5ldyBFcnJvcihkYXRhLmVycm9yIHx8ICdObyB2YWxpZCByZXNwb25zZSBmcm9tIExsYW1hJyk7XHJcbn1cclxuXHJcbi8vYWRkIGdlbWluaSBpbiBsYXRlciwgbmVlZCB0byBiZSAxOCsgXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmZXRjaENvaGVyZShjb250ZW50OiBzdHJpbmcsIGFwaUtleTogc3RyaW5nKSB7XHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKCdodHRwczovL2FwaS5jb2hlcmUuYWkvdjEvZ2VuZXJhdGUnLCB7XHJcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAnQXV0aG9yaXphdGlvbic6IGBCZWFyZXIgJHthcGlLZXl9YCxcclxuICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBcclxuICAgICAgICAgICAgbW9kZWw6ICdjb21tYW5kJyxcclxuICAgICAgICAgICAgcHJvbXB0OiBjb250ZW50LFxyXG4gICAgICAgICAgICBtYXhfdG9rZW5zOiAxMjUwLFxyXG4gICAgICAgICB9KVxyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIGlmICghcmVzcG9uc2Uub2spIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENvaGVyZSBBUEkgZXJyb3I6ICR7cmVzcG9uc2Uuc3RhdHVzfSAke3Jlc3BvbnNlLnN0YXR1c1RleHR9YCk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XHJcbiAgICBpZiAoZGF0YS5nZW5lcmF0aW9ucyAmJiBkYXRhLmdlbmVyYXRpb25zWzBdICYmIGRhdGEuZ2VuZXJhdGlvbnNbMF0udGV4dCkge1xyXG4gICAgICAgIHJldHVybiBkYXRhLmdlbmVyYXRpb25zWzBdLnRleHQ7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihkYXRhLm1lc3NhZ2UgfHwgJ05vIHJlc3BvbnNlIGZyb20gQ29oZXJlJyk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmZXRjaE1pc3RyYWw3Qihjb250ZW50OiBzdHJpbmcsIGFwaUtleTogc3RyaW5nKSB7XHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKCdodHRwczovL2FwaS1pbmZlcmVuY2UuaHVnZ2luZ2ZhY2UuY28vbW9kZWxzL21pc3RyYWxhaS9NaXN0cmFsLTdCLUluc3RydWN0LXYwLjMnLCB7XHJcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAnQXV0aG9yaXphdGlvbic6IGBCZWFyZXIgJHthcGlLZXl9YCxcclxuICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICBpbnB1dHM6IGNvbnRlbnQsXHJcbiAgICAgICAgICAgIHBhcmFtZXRlcnM6IHtcclxuICAgICAgICAgICAgICAgIG1heF9uZXdfdG9rZW5zOiA1MDAsXHJcbiAgICAgICAgICAgICAgICB0ZW1wZXJhdHVyZTogMC43LFxyXG4gICAgICAgICAgICAgICAgcmV0dXJuX2Z1bGxfdGV4dDogZmFsc2VcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICB9KTtcclxuXHJcbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XHJcbiAgICAgICAgY29uc3QgZXJyb3JUZXh0ID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTWlzdHJhbCBBUEkgZXJyb3I6ICR7cmVzcG9uc2Uuc3RhdHVzfSAke3Jlc3BvbnNlLnN0YXR1c1RleHR9IC0gJHtlcnJvclRleHR9YCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcclxuXHJcbiAgICAvLyBIdWdnaW5nRmFjZSB0eXBpY2FsbHkgcmV0dXJucyB0aGlzIGZvcm1hdDpcclxuICAgIC8vIFt7IGdlbmVyYXRlZF90ZXh0OiBcIi4uLlwiIH1dXHJcbiAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhKSAmJiBkYXRhWzBdPy5nZW5lcmF0ZWRfdGV4dCkge1xyXG4gICAgICAgIHJldHVybiBkYXRhWzBdLmdlbmVyYXRlZF90ZXh0O1xyXG4gICAgfVxyXG5cclxuICAgIHRocm93IG5ldyBFcnJvcihkYXRhLmVycm9yIHx8ICdObyB2YWxpZCByZXNwb25zZSBmcm9tIE1pc3RyYWwgN0InKTtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZldGNoTWl4dHJhbDh4N0IoY29udGVudDogc3RyaW5nLCBhcGlLZXk6IHN0cmluZykge1xyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCgnaHR0cHM6Ly9hcGktaW5mZXJlbmNlLmh1Z2dpbmdmYWNlLmNvL21vZGVscy9taXN0cmFsYWkvTWl4dHJhbC04eDdCLUluc3RydWN0LXYwLjEnLCB7XHJcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAnQXV0aG9yaXphdGlvbic6IGBCZWFyZXIgJHthcGlLZXl9YCxcclxuICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBcclxuICAgICAgICAgICAgaW5wdXRzOiBjb250ZW50LFxyXG4gICAgICAgICAgICBwYXJhbWV0ZXJzOiB7XHJcbiAgICAgICAgICAgICAgICBtYXhfbmV3X3Rva2VuczogNTAwLFxyXG4gICAgICAgICAgICAgICAgdGVtcGVyYXR1cmU6IDAuNyxcclxuICAgICAgICAgICAgICAgIHJldHVybl9mdWxsX3RleHQ6IGZhbHNlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgfSk7XHJcblxyXG4gICAgaWYgKCFyZXNwb25zZS5vaykge1xyXG4gICAgICAgIGNvbnN0IGVycm9yVGV4dCA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE1peHRyYWwgQVBJIGVycm9yOiAke3Jlc3BvbnNlLnN0YXR1c30gJHtyZXNwb25zZS5zdGF0dXNUZXh0fSAtICR7ZXJyb3JUZXh0fWApO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xyXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkgJiYgZGF0YVswXSAmJiBkYXRhWzBdLmdlbmVyYXRlZF90ZXh0KSB7XHJcbiAgICAgICAgcmV0dXJuIGRhdGFbMF0uZ2VuZXJhdGVkX3RleHQ7ICAgIFxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZGF0YS5lcnJvciB8fCAnTm8gcmVzcG9uc2UgZnJvbSBNaXh0cmFsIDh4N0InKTtcclxuICAgIH1cclxufVxyXG4iLCJpbXBvcnQgeyBmZXRjaE9wZW5BSSB9IGZyb20gJy4uL3V0aWxzL2FpSGFuZGxpbmcnXHJcbmltcG9ydCB7IGZldGNoR2VtaW5pIH0gZnJvbSAnLi4vdXRpbHMvYWlIYW5kbGluZydcclxuaW1wb3J0IHsgZmV0Y2hDb2hlcmUgfSBmcm9tICcuLi91dGlscy9haUhhbmRsaW5nJ1xyXG5pbXBvcnQgeyBmZXRjaE1pc3RyYWw3QiB9IGZyb20gJy4uL3V0aWxzL2FpSGFuZGxpbmcnXHJcbmltcG9ydCB7IGZldGNoTWl4dHJhbDh4N0IgfSBmcm9tICcuLi91dGlscy9haUhhbmRsaW5nJ1xyXG5pbXBvcnQgeyBmZXRjaExsYW1hIH0gZnJvbSAnLi4vdXRpbHMvYWlIYW5kbGluZydcclxuXHJcbmV4cG9ydCBkZWZhdWx0IHtcclxuICBtYWluKCkge1xyXG4gICAgLy8gRXhhbXBsZTogTGlzdGVuIGZvciBleHRlbnNpb24gaW5zdGFsbGF0aW9uXHJcbiAgICBjaHJvbWUucnVudGltZS5vbkluc3RhbGxlZC5hZGRMaXN0ZW5lcigoKSA9PiB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdFeHRlbnNpb24gaW5zdGFsbGVkJylcclxuICAgIH0pXHJcblxyXG4gICAgLy8gRXhhbXBsZTogTGlzdGVuIGZvciBtZXNzYWdlc1xyXG4gICAgY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKChtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSkgPT4ge1xyXG4gICAgICBpZiAobWVzc2FnZS50eXBlID09PSAnR0VUX1BBR0VfSU5GTycpIHtcclxuICAgICAgICAoYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICBjb25zdCBbdGFiXSA9IGF3YWl0IGNocm9tZS50YWJzLnF1ZXJ5KHsgYWN0aXZlOiB0cnVlLCBjdXJyZW50V2luZG93OiB0cnVlIH0pXHJcbiAgICAgICAgICBjb25zdCBwYWdlSW5mbyA9IGF3YWl0IGNocm9tZS50YWJzLnNlbmRNZXNzYWdlKHRhYi5pZCEsIHsgdHlwZTogJ0dFVF9QQUdFX0NPTlRFTlQnfSlcclxuICAgICAgICAgIGlmIChwYWdlSW5mbyAmJiBwYWdlSW5mby5lcnJvcikge1xyXG4gICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IHBhZ2VJbmZvLmVycm9yIH0pXHJcbiAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogcGFnZUluZm8gfSlcclxuICAgICAgICAgICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgcGFnZUluZm86IHBhZ2VJbmZvIH0pXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGZldGNoaW5nIHBhZ2UgaW5mbzonLCBlcnJvcilcclxuICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0ZhaWxlZCB0byBmZXRjaCBwYWdlIGluZm8nIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICB9KSgpXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRydWVcclxuICAgIH0pXHJcblxyXG4gICAgY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKChtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSkgPT4ge1xyXG4gICAgICBpZiAobWVzc2FnZS50eXBlID09PSAnQU5BTFlaRV9BUlRJQ0xFJykge1xyXG4gICAgICAgIGNvbnN0IHsgY29udGVudCwgcHJvdmlkZXJzIH0gPSBtZXNzYWdlXHJcbiAgICAgICAgY29uc3QgdGFza3M6IFByb21pc2U8YW55PltdID0gW11cclxuICAgICAgICBcclxuICAgICAgICBmb3IgKGNvbnN0IHByb3ZpZGVyIG9mIHByb3ZpZGVycykge1xyXG4gICAgICAgICAgaWYgKHByb3ZpZGVyID09PSAnT3BlbmFpJykge1xyXG4gICAgICAgICAgICB0YXNrcy5wdXNoKGZldGNoT3BlbkFJKGNvbnRlbnQsIGltcG9ydC5tZXRhLmVudi5WSVRFX09QRU5BSV9BUElfS0VZIHx8ICcnKSlcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGVsc2UgaWYgKHByb3ZpZGVyID09PSAnR2VtaW5pJykge1xyXG4gICAgICAgICAgICB0YXNrcy5wdXNoKGZldGNoR2VtaW5pKGNvbnRlbnQsIGltcG9ydC5tZXRhLmVudi5WSVRFX0dFTUlOSV9BUElfS0VZIHx8ICcnKS50aGVuKHJlc3BvbnNlID0+IHtcclxuICAgICAgICAgICAgICBjb25zb2xlLmxvZygn8J+UriBHZW1pbmkgcmVzcG9uc2U6JywgcmVzcG9uc2UpO1xyXG4gICAgICAgICAgICAgIHJldHVybiByZXNwb25zZTtcclxuICAgICAgICAgICAgfSkpXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNlIGlmIChwcm92aWRlciA9PT0gJ0NvaGVyZScpIHtcclxuICAgICAgICAgICAgdGFza3MucHVzaChmZXRjaENvaGVyZShjb250ZW50LCBpbXBvcnQubWV0YS5lbnYuVklURV9DT0hFUkVfQVBJX0tFWSB8fCAnJykudGhlbihyZXNwb25zZSA9PiB7XHJcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfp6AgQ29oZXJlIHJlc3BvbnNlOicsIHJlc3BvbnNlKTtcclxuICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2U7XHJcbiAgICAgICAgICAgIH0pKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSBpZiAocHJvdmlkZXIgPT09ICdNaXN0cmFsJyl7XHJcbiAgICAgICAgICAgIHRhc2tzLnB1c2goZmV0Y2hNaXN0cmFsN0IoY29udGVudCwgaW1wb3J0Lm1ldGEuZW52LlZJVEVfSFVHR0lOR0ZBQ0VfQVBJX0tFWSB8fCAnJykpXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBlbHNlIGlmIChwcm92aWRlciA9PT0gJ01peHRyYWwnKXtcclxuICAgICAgICAgICAgdGFza3MucHVzaChmZXRjaE1peHRyYWw4eDdCKGNvbnRlbnQsIGltcG9ydC5tZXRhLmVudi5WSVRFX0hVR0dJTkdGQUNFX0FQSV9LRVkgfHwgJycpKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZWxzZSBpZiAocHJvdmlkZXIgPT09ICdMbGFtYScpIHtcclxuICAgICAgICAgICAgdGFza3MucHVzaChmZXRjaExsYW1hKGNvbnRlbnQsIGltcG9ydC5tZXRhLmVudi5WSVRFX0hVR0dJTkdGQUNFX0FQSV9LRVkgfHwgJycpLnRoZW4ocmVzcG9uc2UgPT4ge1xyXG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn6aZIExsYW1hIHJlc3BvbnNlOicsIHJlc3BvbnNlKTtcclxuICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2U7XHJcbiAgICAgICAgICAgIH0pKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgIFByb21pc2UuYWxsU2V0dGxlZCh0YXNrcylcclxuICAgICAgIC50aGVuKHJlc3VsdHMgPT4ge1xyXG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHJlc3VsdHMsIHByb3ZpZGVycyB9KVxyXG4gICAgICAgfSlcclxuICAgICAgIC5jYXRjaChlcnJvciA9PiB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignQW5hbHlzaXMgZmFpbGVkOicsIGVycm9yKTtcclxuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdBbmFseXNpcyBmYWlsZWQnIH0pXHJcbiAgICAgICB9KVxyXG4gICAgICAgXHJcbiAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICB9IFxyXG4gICAgfSlcclxuICB9XHJcbn07IiwiLy8gI3JlZ2lvbiBzbmlwcGV0XG5leHBvcnQgY29uc3QgYnJvd3NlciA9IGdsb2JhbFRoaXMuYnJvd3Nlcj8ucnVudGltZT8uaWRcbiAgPyBnbG9iYWxUaGlzLmJyb3dzZXJcbiAgOiBnbG9iYWxUaGlzLmNocm9tZTtcbi8vICNlbmRyZWdpb24gc25pcHBldFxuIiwiaW1wb3J0IHsgYnJvd3NlciBhcyBfYnJvd3NlciB9IGZyb20gXCJAd3h0LWRldi9icm93c2VyXCI7XG5leHBvcnQgY29uc3QgYnJvd3NlciA9IF9icm93c2VyO1xuZXhwb3J0IHt9O1xuIiwiLy8gc3JjL2luZGV4LnRzXG52YXIgX01hdGNoUGF0dGVybiA9IGNsYXNzIHtcbiAgY29uc3RydWN0b3IobWF0Y2hQYXR0ZXJuKSB7XG4gICAgaWYgKG1hdGNoUGF0dGVybiA9PT0gXCI8YWxsX3VybHM+XCIpIHtcbiAgICAgIHRoaXMuaXNBbGxVcmxzID0gdHJ1ZTtcbiAgICAgIHRoaXMucHJvdG9jb2xNYXRjaGVzID0gWy4uLl9NYXRjaFBhdHRlcm4uUFJPVE9DT0xTXTtcbiAgICAgIHRoaXMuaG9zdG5hbWVNYXRjaCA9IFwiKlwiO1xuICAgICAgdGhpcy5wYXRobmFtZU1hdGNoID0gXCIqXCI7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGdyb3VwcyA9IC8oLiopOlxcL1xcLyguKj8pKFxcLy4qKS8uZXhlYyhtYXRjaFBhdHRlcm4pO1xuICAgICAgaWYgKGdyb3VwcyA9PSBudWxsKVxuICAgICAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihtYXRjaFBhdHRlcm4sIFwiSW5jb3JyZWN0IGZvcm1hdFwiKTtcbiAgICAgIGNvbnN0IFtfLCBwcm90b2NvbCwgaG9zdG5hbWUsIHBhdGhuYW1lXSA9IGdyb3VwcztcbiAgICAgIHZhbGlkYXRlUHJvdG9jb2wobWF0Y2hQYXR0ZXJuLCBwcm90b2NvbCk7XG4gICAgICB2YWxpZGF0ZUhvc3RuYW1lKG1hdGNoUGF0dGVybiwgaG9zdG5hbWUpO1xuICAgICAgdmFsaWRhdGVQYXRobmFtZShtYXRjaFBhdHRlcm4sIHBhdGhuYW1lKTtcbiAgICAgIHRoaXMucHJvdG9jb2xNYXRjaGVzID0gcHJvdG9jb2wgPT09IFwiKlwiID8gW1wiaHR0cFwiLCBcImh0dHBzXCJdIDogW3Byb3RvY29sXTtcbiAgICAgIHRoaXMuaG9zdG5hbWVNYXRjaCA9IGhvc3RuYW1lO1xuICAgICAgdGhpcy5wYXRobmFtZU1hdGNoID0gcGF0aG5hbWU7XG4gICAgfVxuICB9XG4gIGluY2x1ZGVzKHVybCkge1xuICAgIGlmICh0aGlzLmlzQWxsVXJscylcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIGNvbnN0IHUgPSB0eXBlb2YgdXJsID09PSBcInN0cmluZ1wiID8gbmV3IFVSTCh1cmwpIDogdXJsIGluc3RhbmNlb2YgTG9jYXRpb24gPyBuZXcgVVJMKHVybC5ocmVmKSA6IHVybDtcbiAgICByZXR1cm4gISF0aGlzLnByb3RvY29sTWF0Y2hlcy5maW5kKChwcm90b2NvbCkgPT4ge1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImh0dHBcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNIdHRwTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiaHR0cHNcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNIdHRwc01hdGNoKHUpO1xuICAgICAgaWYgKHByb3RvY29sID09PSBcImZpbGVcIilcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNGaWxlTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwiZnRwXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzRnRwTWF0Y2godSk7XG4gICAgICBpZiAocHJvdG9jb2wgPT09IFwidXJuXCIpXG4gICAgICAgIHJldHVybiB0aGlzLmlzVXJuTWF0Y2godSk7XG4gICAgfSk7XG4gIH1cbiAgaXNIdHRwTWF0Y2godXJsKSB7XG4gICAgcmV0dXJuIHVybC5wcm90b2NvbCA9PT0gXCJodHRwOlwiICYmIHRoaXMuaXNIb3N0UGF0aE1hdGNoKHVybCk7XG4gIH1cbiAgaXNIdHRwc01hdGNoKHVybCkge1xuICAgIHJldHVybiB1cmwucHJvdG9jb2wgPT09IFwiaHR0cHM6XCIgJiYgdGhpcy5pc0hvc3RQYXRoTWF0Y2godXJsKTtcbiAgfVxuICBpc0hvc3RQYXRoTWF0Y2godXJsKSB7XG4gICAgaWYgKCF0aGlzLmhvc3RuYW1lTWF0Y2ggfHwgIXRoaXMucGF0aG5hbWVNYXRjaClcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICBjb25zdCBob3N0bmFtZU1hdGNoUmVnZXhzID0gW1xuICAgICAgdGhpcy5jb252ZXJ0UGF0dGVyblRvUmVnZXgodGhpcy5ob3N0bmFtZU1hdGNoKSxcbiAgICAgIHRoaXMuY29udmVydFBhdHRlcm5Ub1JlZ2V4KHRoaXMuaG9zdG5hbWVNYXRjaC5yZXBsYWNlKC9eXFwqXFwuLywgXCJcIikpXG4gICAgXTtcbiAgICBjb25zdCBwYXRobmFtZU1hdGNoUmVnZXggPSB0aGlzLmNvbnZlcnRQYXR0ZXJuVG9SZWdleCh0aGlzLnBhdGhuYW1lTWF0Y2gpO1xuICAgIHJldHVybiAhIWhvc3RuYW1lTWF0Y2hSZWdleHMuZmluZCgocmVnZXgpID0+IHJlZ2V4LnRlc3QodXJsLmhvc3RuYW1lKSkgJiYgcGF0aG5hbWVNYXRjaFJlZ2V4LnRlc3QodXJsLnBhdGhuYW1lKTtcbiAgfVxuICBpc0ZpbGVNYXRjaCh1cmwpIHtcbiAgICB0aHJvdyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogZmlsZTovLyBwYXR0ZXJuIG1hdGNoaW5nLiBPcGVuIGEgUFIgdG8gYWRkIHN1cHBvcnRcIik7XG4gIH1cbiAgaXNGdHBNYXRjaCh1cmwpIHtcbiAgICB0aHJvdyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZDogZnRwOi8vIHBhdHRlcm4gbWF0Y2hpbmcuIE9wZW4gYSBQUiB0byBhZGQgc3VwcG9ydFwiKTtcbiAgfVxuICBpc1Vybk1hdGNoKHVybCkge1xuICAgIHRocm93IEVycm9yKFwiTm90IGltcGxlbWVudGVkOiB1cm46Ly8gcGF0dGVybiBtYXRjaGluZy4gT3BlbiBhIFBSIHRvIGFkZCBzdXBwb3J0XCIpO1xuICB9XG4gIGNvbnZlcnRQYXR0ZXJuVG9SZWdleChwYXR0ZXJuKSB7XG4gICAgY29uc3QgZXNjYXBlZCA9IHRoaXMuZXNjYXBlRm9yUmVnZXgocGF0dGVybik7XG4gICAgY29uc3Qgc3RhcnNSZXBsYWNlZCA9IGVzY2FwZWQucmVwbGFjZSgvXFxcXFxcKi9nLCBcIi4qXCIpO1xuICAgIHJldHVybiBSZWdFeHAoYF4ke3N0YXJzUmVwbGFjZWR9JGApO1xuICB9XG4gIGVzY2FwZUZvclJlZ2V4KHN0cmluZykge1xuICAgIHJldHVybiBzdHJpbmcucmVwbGFjZSgvWy4qKz9eJHt9KCl8W1xcXVxcXFxdL2csIFwiXFxcXCQmXCIpO1xuICB9XG59O1xudmFyIE1hdGNoUGF0dGVybiA9IF9NYXRjaFBhdHRlcm47XG5NYXRjaFBhdHRlcm4uUFJPVE9DT0xTID0gW1wiaHR0cFwiLCBcImh0dHBzXCIsIFwiZmlsZVwiLCBcImZ0cFwiLCBcInVyblwiXTtcbnZhciBJbnZhbGlkTWF0Y2hQYXR0ZXJuID0gY2xhc3MgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKG1hdGNoUGF0dGVybiwgcmVhc29uKSB7XG4gICAgc3VwZXIoYEludmFsaWQgbWF0Y2ggcGF0dGVybiBcIiR7bWF0Y2hQYXR0ZXJufVwiOiAke3JlYXNvbn1gKTtcbiAgfVxufTtcbmZ1bmN0aW9uIHZhbGlkYXRlUHJvdG9jb2wobWF0Y2hQYXR0ZXJuLCBwcm90b2NvbCkge1xuICBpZiAoIU1hdGNoUGF0dGVybi5QUk9UT0NPTFMuaW5jbHVkZXMocHJvdG9jb2wpICYmIHByb3RvY29sICE9PSBcIipcIilcbiAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihcbiAgICAgIG1hdGNoUGF0dGVybixcbiAgICAgIGAke3Byb3RvY29sfSBub3QgYSB2YWxpZCBwcm90b2NvbCAoJHtNYXRjaFBhdHRlcm4uUFJPVE9DT0xTLmpvaW4oXCIsIFwiKX0pYFxuICAgICk7XG59XG5mdW5jdGlvbiB2YWxpZGF0ZUhvc3RuYW1lKG1hdGNoUGF0dGVybiwgaG9zdG5hbWUpIHtcbiAgaWYgKGhvc3RuYW1lLmluY2x1ZGVzKFwiOlwiKSlcbiAgICB0aHJvdyBuZXcgSW52YWxpZE1hdGNoUGF0dGVybihtYXRjaFBhdHRlcm4sIGBIb3N0bmFtZSBjYW5ub3QgaW5jbHVkZSBhIHBvcnRgKTtcbiAgaWYgKGhvc3RuYW1lLmluY2x1ZGVzKFwiKlwiKSAmJiBob3N0bmFtZS5sZW5ndGggPiAxICYmICFob3N0bmFtZS5zdGFydHNXaXRoKFwiKi5cIikpXG4gICAgdGhyb3cgbmV3IEludmFsaWRNYXRjaFBhdHRlcm4oXG4gICAgICBtYXRjaFBhdHRlcm4sXG4gICAgICBgSWYgdXNpbmcgYSB3aWxkY2FyZCAoKiksIGl0IG11c3QgZ28gYXQgdGhlIHN0YXJ0IG9mIHRoZSBob3N0bmFtZWBcbiAgICApO1xufVxuZnVuY3Rpb24gdmFsaWRhdGVQYXRobmFtZShtYXRjaFBhdHRlcm4sIHBhdGhuYW1lKSB7XG4gIHJldHVybjtcbn1cbmV4cG9ydCB7XG4gIEludmFsaWRNYXRjaFBhdHRlcm4sXG4gIE1hdGNoUGF0dGVyblxufTtcbiJdLCJuYW1lcyI6WyJfYSIsImJyb3dzZXIiLCJfYnJvd3NlciJdLCJtYXBwaW5ncyI6Ijs7O0FBQXNCLGlCQUFBLFlBQVksU0FBaUIsUUFBZ0I7O0FBQ3pELFVBQUEsV0FBVyxNQUFNLE1BQU0sOENBQThDO0FBQUEsTUFDekUsUUFBUTtBQUFBLE1BQ1IsU0FBUztBQUFBLFFBQ1AsaUJBQWlCLFVBQVUsTUFBTTtBQUFBLFFBQ2pDLGdCQUFnQjtBQUFBLE1BQ2xCO0FBQUEs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
