var content = function() {
  "use strict";var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  var _a, _b;
  function defineContentScript(definition2) {
    return definition2;
  }
  const definition = defineContentScript({
    matches: ["<all_urls>"],
    exclude_matches: [
      "chrome://*",
      "chrome-extension://*",
      "moz-extension://*",
      "edge://*",
      "about:*",
      "chrome-devtools://*",
      "devtools://*",
      "*://console.cloud.google.com/*",
      "*://developers.google.com/*",
      "*://apis.google.com/*",
      "*://www.googleapis.com/*"
    ],
    main() {
      if (location.protocol === "chrome:" || location.protocol === "chrome-extension:" || location.protocol === "moz-extension:" || location.protocol === "edge:" || location.protocol === "about:" || location.href.includes("chrome-devtools://") || location.href.includes("devtools://") || location.href.includes("console.cloud.google.com") || location.href.includes("developers.google.com") || location.href.includes("apis.google.com") || location.href.includes("www.googleapis.com")) {
        console.log("[FNR] Extension disabled on restricted page:", location.href);
        return;
      }
      console.log("[FNR] Content script starting on", location.href);
      const DEFAULT_WIDTH_PX = 440;
      const EXPANDED_WIDTH_PX = 720;
      let currentWidthPx = DEFAULT_WIDTH_PX;
      window.fnrOpenSidebar = () => ensureInjected();
      window.fnrDebug = () => {
        var _a2;
        const el = document.getElementById("fake-news-reader-injected-sidebar");
        console.log("[FNR] debug", {
          exists: !!el,
          widthStyle: el == null ? void 0 : el.style.width,
          display: el == null ? void 0 : el.style.display,
          rect: (_a2 = el == null ? void 0 : el.getBoundingClientRect) == null ? void 0 : _a2.call(el),
          bodyMarginRight: getComputedStyle(document.body).marginRight
        });
      };
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if ((message == null ? void 0 : message.type) === "FNR_PING") {
          sendResponse({ ok: true });
          return true;
        }
      });
      chrome.runtime.onMessage.addListener((message) => {
        if ((message == null ? void 0 : message.type) === "TOGGLE_INJECTED_SIDEBAR") {
          const exists = !!document.getElementById("fake-news-reader-injected-sidebar");
          if (exists) {
            if (message.keepOpen) {
              console.log("🔥🔥🔥 SIDEBAR OPENER #5: CONTENT SCRIPT - KEEPING SIDEBAR OPEN 🔥🔥🔥");
              console.log("[FNR] Sidebar exists, keeping it open for analysis");
              ensureInjected();
              if (message.preloadedAnalysis) {
                setTimeout(() => {
                  const iframe = document.querySelector("#fake-news-reader-injected-sidebar iframe");
                  if (iframe == null ? void 0 : iframe.contentWindow) {
                    iframe.contentWindow.postMessage({
                      type: "PRELOADED_ANALYSIS",
                      data: message.preloadedAnalysis
                    }, "*");
                  }
                }, 50);
              }
            } else {
              console.log("[FNR] Sidebar exists, toggling it closed");
              removeInjected();
            }
          } else {
            console.log("🔥🔥🔥 SIDEBAR OPENER #6: CONTENT SCRIPT - CREATING NEW SIDEBAR 🔥🔥🔥");
            console.log("[FNR] Sidebar does not exist, creating it");
            ensureInjected();
            if (message.preloadedAnalysis) {
              setTimeout(() => {
                const iframe = document.querySelector("#fake-news-reader-injected-sidebar iframe");
                if (iframe == null ? void 0 : iframe.contentWindow) {
                  iframe.contentWindow.postMessage({
                    type: "PRELOADED_ANALYSIS",
                    data: message.preloadedAnalysis
                  }, "*");
                }
              }, 100);
            } else {
              setTimeout(() => {
                const iframe = document.querySelector("#fake-news-reader-injected-sidebar iframe");
                if (iframe == null ? void 0 : iframe.contentWindow) {
                  iframe.contentWindow.postMessage({
                    type: "TRIGGER_NEW_ANALYSIS"
                  }, "*");
                }
              }, 50);
            }
          }
        }
        if ((message == null ? void 0 : message.type) === "EXPAND_FOR_ANALYSIS") {
          const shouldExpand = message.expanded;
          currentWidthPx = shouldExpand ? EXPANDED_WIDTH_PX : DEFAULT_WIDTH_PX;
          if (shouldExpand && !document.getElementById("fake-news-reader-injected-sidebar")) {
            console.log("🔥🔥🔥 SIDEBAR OPENER #7: CONTENT SCRIPT - EXPAND_FOR_ANALYSIS CREATING SIDEBAR 🔥🔥🔥");
            ensureInjected();
          } else if (document.getElementById("fake-news-reader-injected-sidebar")) {
            applyLayout();
          }
        }
      });
      console.log("[FNR] Content script loaded");
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === "GET_PAGE_CONTENT") {
          const run = () => setTimeout(() => processPageContent(sendResponse), 300);
          if (document.readyState !== "complete") {
            window.addEventListener("load", run, { once: true });
          } else {
            run();
          }
          return true;
        }
      });
      function processPageContent(sendResponse) {
        try {
          let container = null;
          container = document.querySelector("article");
          if (!container) container = document.querySelector('main, [role="main" ]');
          if (!container) container = document.querySelector(".article, .story, .post, .entry, .content-body");
          if (!container) container = document.body;
          const clone = container.cloneNode(true);
          clone.querySelectorAll('script, style, noscript, iframe, nav, header, footer, aside, .ads, [role="complementary"]').forEach((n) => n.remove());
          const paragraphs = Array.from(clone.querySelectorAll("p")).map((p) => {
            var _a2;
            return ((_a2 = p.textContent) == null ? void 0 : _a2.trim()) || "";
          });
          let content2 = paragraphs.filter(Boolean).join(" ");
          if (content2.length < 200) content2 = (clone.innerText || "").trim();
          content2 = content2.replace(/\s+/g, " ").trim();
          const wordCount = content2.split(/\s+/).filter(Boolean).length;
          sendResponse({ success: true, data: { title: document.title, content: content2, url: location.href, wordCount } });
        } catch (err) {
          try {
            sendResponse({ error: "Failed to extract page content." });
          } catch {
          }
        }
      }
      let injectedRoot = null;
      const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
      const transitionMs = mql.matches ? 0 : 160;
      function ensureInjected(forceShow) {
        if (!injectedRoot) {
          createInjected();
        }
        {
          injectedRoot.style.opacity = "1";
        }
        applyLayout();
      }
      function createInjected() {
        if (injectedRoot || document.getElementById("fake-news-reader-injected-sidebar")) return;
        injectedRoot = document.createElement("div");
        injectedRoot.id = "fake-news-reader-injected-sidebar";
        injectedRoot.setAttribute("aria-label", "Fake News Reader Sidebar");
        injectedRoot.style.position = "fixed";
        injectedRoot.style.top = "0";
        injectedRoot.style.right = "0";
        injectedRoot.style.height = "100vh";
        injectedRoot.style.zIndex = "2147483647";
        injectedRoot.style.background = "#fff";
        injectedRoot.style.borderLeft = "1px solid rgba(0,0,0,0.12)";
        injectedRoot.style.boxShadow = "0 0 0 1px rgba(0,0,0,0.06), -2px 0 8px rgba(0,0,0,0.06)";
        injectedRoot.style.overflow = "hidden";
        injectedRoot.style.transition = `width ${transitionMs}ms ease, opacity ${transitionMs}ms ease`;
        injectedRoot.style.display = "block";
        const inner = document.createElement("div");
        inner.style.height = "100%";
        inner.style.display = "flex";
        inner.style.flexDirection = "column";
        const header = document.createElement("div");
        header.style.cssText = [
          "all: initial",
          "display: flex",
          "align-items: center",
          "justify-content: space-between",
          "padding: 12px 16px",
          "border-bottom: 1px solid rgba(0,0,0,0.12)",
          "box-sizing: border-box",
          "width: 100%",
          "background: #ffffff",
          "box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08)"
        ].join(";");
        const title = document.createElement("span");
        title.textContent = "NewsScan";
        title.style.cssText = [
          "all: initial",
          "font: 600 15px system-ui, -apple-system, Segoe UI, Roboto",
          "color: #202124",
          "letter-spacing: -0.01em"
        ].join(";");
        const closeBtn = document.createElement("button");
        closeBtn.setAttribute("aria-label", "Close");
        closeBtn.textContent = "×";
        closeBtn.style.cssText = [
          "all: initial",
          "display:inline-flex",
          "align-items:center",
          "justify-content:center",
          "width:28px",
          "height:28px",
          "cursor:pointer",
          "font: 600 16px/1 system-ui, -apple-system, Segoe UI, Roboto",
          "color:#6b7280",
          "background:transparent",
          "border-radius: 4px"
        ].join(";");
        header.appendChild(title);
        header.appendChild(closeBtn);
        const body = document.createElement("div");
        body.style.flex = "1";
        body.style.overflow = "hidden";
        const iframe = document.createElement("iframe");
        iframe.title = "NewsScan";
        iframe.style.border = "0";
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.src = chrome.runtime.getURL("sidepanel.html");
        body.appendChild(iframe);
        closeBtn.onclick = () => {
          var _a2;
          try {
            (_a2 = iframe.contentWindow) == null ? void 0 : _a2.postMessage({ type: "TRIGGER_RESET" }, "*");
          } catch {
          }
          setTimeout(() => {
            removeInjected();
          }, 50);
        };
        inner.appendChild(header);
        inner.appendChild(body);
        injectedRoot.appendChild(inner);
        document.documentElement.appendChild(injectedRoot);
        applyLayout();
      }
      function removeInjected() {
        if (!injectedRoot) return;
        injectedRoot.remove();
        injectedRoot = null;
        resetBodyPadding();
      }
      function applyBodyPadding() {
        document.documentElement.style.scrollBehavior = "auto";
        document.body.style.transition = mql.matches ? "" : `margin-right ${transitionMs}ms ease`;
        document.body.style.marginRight = `${currentWidthPx}px`;
      }
      function resetBodyPadding() {
        document.body.style.marginRight = "";
        document.body.style.transition = "";
      }
      function applyLayout() {
        if (!injectedRoot) return;
        injectedRoot.style.width = `${currentWidthPx}px`;
        injectedRoot.style.opacity = "1";
        applyBodyPadding();
      }
    }
  });
  content;
  const browser$1 = ((_b = (_a = globalThis.browser) == null ? void 0 : _a.runtime) == null ? void 0 : _b.id) ? globalThis.browser : globalThis.chrome;
  const browser = browser$1;
  function print$1(method, ...args) {
    if (typeof args[0] === "string") {
      const message = args.shift();
      method(`[wxt] ${message}`, ...args);
    } else {
      method("[wxt]", ...args);
    }
  }
  const logger$1 = {
    debug: (...args) => print$1(console.debug, ...args),
    log: (...args) => print$1(console.log, ...args),
    warn: (...args) => print$1(console.warn, ...args),
    error: (...args) => print$1(console.error, ...args)
  };
  const _WxtLocationChangeEvent = class _WxtLocationChangeEvent extends Event {
    constructor(newUrl, oldUrl) {
      super(_WxtLocationChangeEvent.EVENT_NAME, {});
      this.newUrl = newUrl;
      this.oldUrl = oldUrl;
    }
  };
  __publicField(_WxtLocationChangeEvent, "EVENT_NAME", getUniqueEventName("wxt:locationchange"));
  let WxtLocationChangeEvent = _WxtLocationChangeEvent;
  function getUniqueEventName(eventName) {
    var _a2;
    return `${(_a2 = browser == null ? void 0 : browser.runtime) == null ? void 0 : _a2.id}:${"content"}:${eventName}`;
  }
  function createLocationWatcher(ctx) {
    let interval;
    let oldUrl;
    return {
      /**
       * Ensure the location watcher is actively looking for URL changes. If it's already watching,
       * this is a noop.
       */
      run() {
        if (interval != null) return;
        oldUrl = new URL(location.href);
        interval = ctx.setInterval(() => {
          let newUrl = new URL(location.href);
          if (newUrl.href !== oldUrl.href) {
            window.dispatchEvent(new WxtLocationChangeEvent(newUrl, oldUrl));
            oldUrl = newUrl;
          }
        }, 1e3);
      }
    };
  }
  const _ContentScriptContext = class _ContentScriptContext {
    constructor(contentScriptName, options) {
      __publicField(this, "isTopFrame", window.self === window.top);
      __publicField(this, "abortController");
      __publicField(this, "locationWatcher", createLocationWatcher(this));
      __publicField(this, "receivedMessageIds", /* @__PURE__ */ new Set());
      this.contentScriptName = contentScriptName;
      this.options = options;
      this.abortController = new AbortController();
      if (this.isTopFrame) {
        this.listenForNewerScripts({ ignoreFirstEvent: true });
        this.stopOldScripts();
      } else {
        this.listenForNewerScripts();
      }
    }
    get signal() {
      return this.abortController.signal;
    }
    abort(reason) {
      return this.abortController.abort(reason);
    }
    get isInvalid() {
      if (browser.runtime.id == null) {
        this.notifyInvalidated();
      }
      return this.signal.aborted;
    }
    get isValid() {
      return !this.isInvalid;
    }
    /**
     * Add a listener that is called when the content script's context is invalidated.
     *
     * @returns A function to remove the listener.
     *
     * @example
     * browser.runtime.onMessage.addListener(cb);
     * const removeInvalidatedListener = ctx.onInvalidated(() => {
     *   browser.runtime.onMessage.removeListener(cb);
     * })
     * // ...
     * removeInvalidatedListener();
     */
    onInvalidated(cb) {
      this.signal.addEventListener("abort", cb);
      return () => this.signal.removeEventListener("abort", cb);
    }
    /**
     * Return a promise that never resolves. Useful if you have an async function that shouldn't run
     * after the context is expired.
     *
     * @example
     * const getValueFromStorage = async () => {
     *   if (ctx.isInvalid) return ctx.block();
     *
     *   // ...
     * }
     */
    block() {
      return new Promise(() => {
      });
    }
    /**
     * Wrapper around `window.setInterval` that automatically clears the interval when invalidated.
     */
    setInterval(handler, timeout) {
      const id = setInterval(() => {
        if (this.isValid) handler();
      }, timeout);
      this.onInvalidated(() => clearInterval(id));
      return id;
    }
    /**
     * Wrapper around `window.setTimeout` that automatically clears the interval when invalidated.
     */
    setTimeout(handler, timeout) {
      const id = setTimeout(() => {
        if (this.isValid) handler();
      }, timeout);
      this.onInvalidated(() => clearTimeout(id));
      return id;
    }
    /**
     * Wrapper around `window.requestAnimationFrame` that automatically cancels the request when
     * invalidated.
     */
    requestAnimationFrame(callback) {
      const id = requestAnimationFrame((...args) => {
        if (this.isValid) callback(...args);
      });
      this.onInvalidated(() => cancelAnimationFrame(id));
      return id;
    }
    /**
     * Wrapper around `window.requestIdleCallback` that automatically cancels the request when
     * invalidated.
     */
    requestIdleCallback(callback, options) {
      const id = requestIdleCallback((...args) => {
        if (!this.signal.aborted) callback(...args);
      }, options);
      this.onInvalidated(() => cancelIdleCallback(id));
      return id;
    }
    addEventListener(target, type, handler, options) {
      var _a2;
      if (type === "wxt:locationchange") {
        if (this.isValid) this.locationWatcher.run();
      }
      (_a2 = target.addEventListener) == null ? void 0 : _a2.call(
        target,
        type.startsWith("wxt:") ? getUniqueEventName(type) : type,
        handler,
        {
          ...options,
          signal: this.signal
        }
      );
    }
    /**
     * @internal
     * Abort the abort controller and execute all `onInvalidated` listeners.
     */
    notifyInvalidated() {
      this.abort("Content script context invalidated");
      logger$1.debug(
        `Content script "${this.contentScriptName}" context invalidated`
      );
    }
    stopOldScripts() {
      window.postMessage(
        {
          type: _ContentScriptContext.SCRIPT_STARTED_MESSAGE_TYPE,
          contentScriptName: this.contentScriptName,
          messageId: Math.random().toString(36).slice(2)
        },
        "*"
      );
    }
    verifyScriptStartedEvent(event) {
      var _a2, _b2, _c;
      const isScriptStartedEvent = ((_a2 = event.data) == null ? void 0 : _a2.type) === _ContentScriptContext.SCRIPT_STARTED_MESSAGE_TYPE;
      const isSameContentScript = ((_b2 = event.data) == null ? void 0 : _b2.contentScriptName) === this.contentScriptName;
      const isNotDuplicate = !this.receivedMessageIds.has((_c = event.data) == null ? void 0 : _c.messageId);
      return isScriptStartedEvent && isSameContentScript && isNotDuplicate;
    }
    listenForNewerScripts(options) {
      let isFirst = true;
      const cb = (event) => {
        if (this.verifyScriptStartedEvent(event)) {
          this.receivedMessageIds.add(event.data.messageId);
          const wasFirst = isFirst;
          isFirst = false;
          if (wasFirst && (options == null ? void 0 : options.ignoreFirstEvent)) return;
          this.notifyInvalidated();
        }
      };
      addEventListener("message", cb);
      this.onInvalidated(() => removeEventListener("message", cb));
    }
  };
  __publicField(_ContentScriptContext, "SCRIPT_STARTED_MESSAGE_TYPE", getUniqueEventName(
    "wxt:content-script-started"
  ));
  let ContentScriptContext = _ContentScriptContext;
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
      const { main, ...options } = definition;
      const ctx = new ContentScriptContext("content", options);
      return await main(ctx);
    } catch (err) {
      logger.error(
        `The content script "${"content"}" crashed on startup!`,
        err
      );
      throw err;
    }
  })();
  return result;
}();
content;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2RlZmluZS1jb250ZW50LXNjcmlwdC5tanMiLCIuLi8uLi8uLi9zcmMvZW50cnlwb2ludHMvY29udGVudC50cyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9Ad3h0LWRldi9icm93c2VyL3NyYy9pbmRleC5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvYnJvd3Nlci5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvaW50ZXJuYWwvbG9nZ2VyLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9pbnRlcm5hbC9jdXN0b20tZXZlbnRzLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9pbnRlcm5hbC9sb2NhdGlvbi13YXRjaGVyLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9jb250ZW50LXNjcmlwdC1jb250ZXh0Lm1qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZnVuY3Rpb24gZGVmaW5lQ29udGVudFNjcmlwdChkZWZpbml0aW9uKSB7XG4gIHJldHVybiBkZWZpbml0aW9uO1xufVxuIiwiaW1wb3J0IHsgZGVmaW5lQ29udGVudFNjcmlwdCB9IGZyb20gJyNpbXBvcnRzJztcbmltcG9ydCB7IGdldE11bHRpLCBzZXRTdG9yYWdlIH0gZnJvbSAnLi4vdXRpbHMvc3RvcmFnZSc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbnRlbnRTY3JpcHQoe1xuICBtYXRjaGVzOiBbJzxhbGxfdXJscz4nXSxcbiAgZXhjbHVkZV9tYXRjaGVzOiBbXG4gICAgJ2Nocm9tZTovLyonLFxuICAgICdjaHJvbWUtZXh0ZW5zaW9uOi8vKicsXG4gICAgJ21vei1leHRlbnNpb246Ly8qJyxcbiAgICAnZWRnZTovLyonLFxuICAgICdhYm91dDoqJyxcbiAgICAnY2hyb21lLWRldnRvb2xzOi8vKicsXG4gICAgJ2RldnRvb2xzOi8vKicsXG4gICAgJyo6Ly9jb25zb2xlLmNsb3VkLmdvb2dsZS5jb20vKicsXG4gICAgJyo6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20vKicsXG4gICAgJyo6Ly9hcGlzLmdvb2dsZS5jb20vKicsXG4gICAgJyo6Ly93d3cuZ29vZ2xlYXBpcy5jb20vKidcbiAgXSxcbiAgbWFpbigpIHtcbiAgICAvLyBEb24ndCBydW4gb24gY2VydGFpbiBwYWdlcyB3aGVyZSB0aGUgZXh0ZW5zaW9uIHNob3VsZG4ndCBiZSBhY3RpdmVcbiAgICBpZiAobG9jYXRpb24ucHJvdG9jb2wgPT09ICdjaHJvbWU6JyB8fCBcbiAgICAgICAgbG9jYXRpb24ucHJvdG9jb2wgPT09ICdjaHJvbWUtZXh0ZW5zaW9uOicgfHwgXG4gICAgICAgIGxvY2F0aW9uLnByb3RvY29sID09PSAnbW96LWV4dGVuc2lvbjonIHx8XG4gICAgICAgIGxvY2F0aW9uLnByb3RvY29sID09PSAnZWRnZTonIHx8XG4gICAgICAgIGxvY2F0aW9uLnByb3RvY29sID09PSAnYWJvdXQ6JyB8fFxuICAgICAgICBsb2NhdGlvbi5ocmVmLmluY2x1ZGVzKCdjaHJvbWUtZGV2dG9vbHM6Ly8nKSB8fFxuICAgICAgICBsb2NhdGlvbi5ocmVmLmluY2x1ZGVzKCdkZXZ0b29sczovLycpIHx8XG4gICAgICAgIGxvY2F0aW9uLmhyZWYuaW5jbHVkZXMoJ2NvbnNvbGUuY2xvdWQuZ29vZ2xlLmNvbScpIHx8XG4gICAgICAgIGxvY2F0aW9uLmhyZWYuaW5jbHVkZXMoJ2RldmVsb3BlcnMuZ29vZ2xlLmNvbScpIHx8XG4gICAgICAgIGxvY2F0aW9uLmhyZWYuaW5jbHVkZXMoJ2FwaXMuZ29vZ2xlLmNvbScpIHx8XG4gICAgICAgIGxvY2F0aW9uLmhyZWYuaW5jbHVkZXMoJ3d3dy5nb29nbGVhcGlzLmNvbScpKSB7XG4gICAgICBjb25zb2xlLmxvZygnW0ZOUl0gRXh0ZW5zaW9uIGRpc2FibGVkIG9uIHJlc3RyaWN0ZWQgcGFnZTonLCBsb2NhdGlvbi5ocmVmKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgXG4gICAgY29uc29sZS5sb2coJ1tGTlJdIENvbnRlbnQgc2NyaXB0IHN0YXJ0aW5nIG9uJywgbG9jYXRpb24uaHJlZik7XG5cbiAgICBjb25zdCBERUZBVUxUX1dJRFRIX1BYID0gNDQwO1xuICAgIGNvbnN0IEVYUEFOREVEX1dJRFRIX1BYID0gNzIwOyAvLyBXaWRlciB3aWR0aCBmb3IgYW5hbHlzaXMgcmVzdWx0c1xuICAgIGxldCBjdXJyZW50V2lkdGhQeCA9IERFRkFVTFRfV0lEVEhfUFg7XG5cbiAgICAvLyBEZWJ1ZyBoZWxwZXJzXG4gICAgKHdpbmRvdyBhcyBhbnkpLmZuck9wZW5TaWRlYmFyID0gKCkgPT4gZW5zdXJlSW5qZWN0ZWQodHJ1ZSk7XG4gICAgKHdpbmRvdyBhcyBhbnkpLmZuckRlYnVnID0gKCkgPT4ge1xuICAgICAgY29uc3QgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZmFrZS1uZXdzLXJlYWRlci1pbmplY3RlZC1zaWRlYmFyJykgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xuICAgICAgY29uc29sZS5sb2coJ1tGTlJdIGRlYnVnJywge1xuICAgICAgICBleGlzdHM6ICEhZWwsXG4gICAgICAgIHdpZHRoU3R5bGU6IGVsPy5zdHlsZS53aWR0aCxcbiAgICAgICAgZGlzcGxheTogZWw/LnN0eWxlLmRpc3BsYXksXG4gICAgICAgIHJlY3Q6IGVsPy5nZXRCb3VuZGluZ0NsaWVudFJlY3Q/LigpLFxuICAgICAgICBib2R5TWFyZ2luUmlnaHQ6IGdldENvbXB1dGVkU3R5bGUoZG9jdW1lbnQuYm9keSkubWFyZ2luUmlnaHQsXG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgLy8gUmVwbHkgdG8gcGluZyBmcm9tIGJhY2tncm91bmQgZm9yIHJlYWRpbmVzcyBjaGVja1xuICAgIGNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcbiAgICAgIGlmIChtZXNzYWdlPy50eXBlID09PSAnRk5SX1BJTkcnKSB7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IG9rOiB0cnVlIH0pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIFRvZ2dsZSBmcm9tIHRvb2xiYXI6IG9wZW4gaWYgbm90IHByZXNlbnQsIGVsc2UgY2xvc2VcbiAgICBjaHJvbWUucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoKG1lc3NhZ2UpID0+IHtcbiAgICAgIGlmIChtZXNzYWdlPy50eXBlID09PSAnVE9HR0xFX0lOSkVDVEVEX1NJREVCQVInKSB7XG4gICAgICAgIGNvbnN0IGV4aXN0cyA9ICEhZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Zha2UtbmV3cy1yZWFkZXItaW5qZWN0ZWQtc2lkZWJhcicpO1xuICAgICAgICBpZiAoZXhpc3RzKSB7XG4gICAgICAgICAgLy8gSWYgc2lkZWJhciBleGlzdHMsIGNoZWNrIGlmIHdlIHNob3VsZCBrZWVwIGl0IG9wZW4gb3IgY2xvc2UgaXRcbiAgICAgICAgICAvLyBGb3IgYW5hbHlzaXMgbG9hZGluZywgd2Ugd2FudCB0byBrZWVwIGl0IG9wZW5cbiAgICAgICAgICBpZiAobWVzc2FnZS5rZWVwT3Blbikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/CflKXwn5Sl8J+UpSBTSURFQkFSIE9QRU5FUiAjNTogQ09OVEVOVCBTQ1JJUFQgLSBLRUVQSU5HIFNJREVCQVIgT1BFTiDwn5Sl8J+UpfCflKUnKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbRk5SXSBTaWRlYmFyIGV4aXN0cywga2VlcGluZyBpdCBvcGVuIGZvciBhbmFseXNpcycpO1xuICAgICAgICAgICAgZW5zdXJlSW5qZWN0ZWQodHJ1ZSk7XG4gICAgICAgICAgICAvLyBJZiB3ZSBoYXZlIHByZWxvYWRlZCBhbmFseXNpcywgc2VuZCBpdCB0byB0aGUgaWZyYW1lXG4gICAgICAgICAgICBpZiAobWVzc2FnZS5wcmVsb2FkZWRBbmFseXNpcykge1xuICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBpZnJhbWUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZmFrZS1uZXdzLXJlYWRlci1pbmplY3RlZC1zaWRlYmFyIGlmcmFtZScpIGFzIEhUTUxJRnJhbWVFbGVtZW50O1xuICAgICAgICAgICAgICAgIGlmIChpZnJhbWU/LmNvbnRlbnRXaW5kb3cpIHtcbiAgICAgICAgICAgICAgICAgIGlmcmFtZS5jb250ZW50V2luZG93LnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ1BSRUxPQURFRF9BTkFMWVNJUycsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IG1lc3NhZ2UucHJlbG9hZGVkQW5hbHlzaXNcbiAgICAgICAgICAgICAgICAgIH0sICcqJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9LCA1MCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbRk5SXSBTaWRlYmFyIGV4aXN0cywgdG9nZ2xpbmcgaXQgY2xvc2VkJyk7XG4gICAgICAgICAgICByZW1vdmVJbmplY3RlZCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygn8J+UpfCflKXwn5SlIFNJREVCQVIgT1BFTkVSICM2OiBDT05URU5UIFNDUklQVCAtIENSRUFUSU5HIE5FVyBTSURFQkFSIPCflKXwn5Sl8J+UpScpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdbRk5SXSBTaWRlYmFyIGRvZXMgbm90IGV4aXN0LCBjcmVhdGluZyBpdCcpO1xuICAgICAgICAgIGVuc3VyZUluamVjdGVkKHRydWUpO1xuICAgICAgICAgIC8vIElmIHdlIGhhdmUgcHJlbG9hZGVkIGFuYWx5c2lzLCBzZW5kIGl0IHRvIHRoZSBpZnJhbWUgYWZ0ZXIgY3JlYXRpb25cbiAgICAgICAgICBpZiAobWVzc2FnZS5wcmVsb2FkZWRBbmFseXNpcykge1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IGlmcmFtZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNmYWtlLW5ld3MtcmVhZGVyLWluamVjdGVkLXNpZGViYXIgaWZyYW1lJykgYXMgSFRNTElGcmFtZUVsZW1lbnQ7XG4gICAgICAgICAgICAgIGlmIChpZnJhbWU/LmNvbnRlbnRXaW5kb3cpIHtcbiAgICAgICAgICAgICAgICBpZnJhbWUuY29udGVudFdpbmRvdy5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAnUFJFTE9BREVEX0FOQUxZU0lTJyxcbiAgICAgICAgICAgICAgICAgIGRhdGE6IG1lc3NhZ2UucHJlbG9hZGVkQW5hbHlzaXNcbiAgICAgICAgICAgICAgICB9LCAnKicpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBJZiBubyBwcmVsb2FkZWQgYW5hbHlzaXMsIHRyaWdnZXIgbWFudWFsIGFuYWx5c2lzIHdoZW4gb3BlbmVkIHZpYSBleHRlbnNpb24gaWNvblxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IGlmcmFtZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNmYWtlLW5ld3MtcmVhZGVyLWluamVjdGVkLXNpZGViYXIgaWZyYW1lJykgYXMgSFRNTElGcmFtZUVsZW1lbnQ7XG4gICAgICAgICAgICAgIGlmIChpZnJhbWU/LmNvbnRlbnRXaW5kb3cpIHtcbiAgICAgICAgICAgICAgICBpZnJhbWUuY29udGVudFdpbmRvdy5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAnVFJJR0dFUl9ORVdfQU5BTFlTSVMnXG4gICAgICAgICAgICAgICAgfSwgJyonKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgNTApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBIYW5kbGUgZXhwYW5zaW9uIGZvciBhbmFseXNpcyByZXN1bHRzXG4gICAgICBpZiAobWVzc2FnZT8udHlwZSA9PT0gJ0VYUEFORF9GT1JfQU5BTFlTSVMnKSB7XG4gICAgICAgIGNvbnN0IHNob3VsZEV4cGFuZCA9IG1lc3NhZ2UuZXhwYW5kZWQ7XG4gICAgICAgIGN1cnJlbnRXaWR0aFB4ID0gc2hvdWxkRXhwYW5kID8gRVhQQU5ERURfV0lEVEhfUFggOiBERUZBVUxUX1dJRFRIX1BYO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5zdXJlIHNpZGViYXIgZXhpc3RzIGFuZCBhcHBseSBuZXcgbGF5b3V0XG4gICAgICAgIGlmIChzaG91bGRFeHBhbmQgJiYgIWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmYWtlLW5ld3MtcmVhZGVyLWluamVjdGVkLXNpZGViYXInKSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5Sl8J+UpfCflKUgU0lERUJBUiBPUEVORVIgIzc6IENPTlRFTlQgU0NSSVBUIC0gRVhQQU5EX0ZPUl9BTkFMWVNJUyBDUkVBVElORyBTSURFQkFSIPCflKXwn5Sl8J+UpScpO1xuICAgICAgICAgIGVuc3VyZUluamVjdGVkKHRydWUpO1xuICAgICAgICB9IGVsc2UgaWYgKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmYWtlLW5ld3MtcmVhZGVyLWluamVjdGVkLXNpZGViYXInKSkge1xuICAgICAgICAgIGFwcGx5TGF5b3V0KCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnNvbGUubG9nKCdbRk5SXSBDb250ZW50IHNjcmlwdCBsb2FkZWQnKTtcblxuICAgIC8vIEhhbmRsZSBwYWdlIGNvbnRlbnQgcmVxdWVzdCBmcm9tIGJhY2tncm91bmRcbiAgICBjaHJvbWUucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoKG1lc3NhZ2UsIHNlbmRlciwgc2VuZFJlc3BvbnNlKSA9PiB7XG4gICAgICBpZiAobWVzc2FnZS50eXBlID09PSAnR0VUX1BBR0VfQ09OVEVOVCcpIHtcbiAgICAgICAgY29uc3QgcnVuID0gKCkgPT4gc2V0VGltZW91dCgoKSA9PiBwcm9jZXNzUGFnZUNvbnRlbnQoc2VuZFJlc3BvbnNlKSwgMzAwKTtcbiAgICAgICAgaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgIT09ICdjb21wbGV0ZScpIHtcbiAgICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIHJ1biwgeyBvbmNlOiB0cnVlIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJ1bigpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBrZWVwIHRoZSBjaGFubmVsIG9wZW4gZm9yIGFzeW5jIHNlbmRSZXNwb25zZVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gcHJvY2Vzc1BhZ2VDb250ZW50KHNlbmRSZXNwb25zZTogKHJlc3BvbnNlOiBhbnkpID0+IHZvaWQpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGxldCBjb250YWluZXI6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gICAgICAgIGNvbnRhaW5lciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2FydGljbGUnKTtcbiAgICAgICAgaWYgKCFjb250YWluZXIpIGNvbnRhaW5lciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ21haW4sIFtyb2xlPVwibWFpblwiIF0nKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XG4gICAgICAgIGlmICghY29udGFpbmVyKSBjb250YWluZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYXJ0aWNsZSwgLnN0b3J5LCAucG9zdCwgLmVudHJ5LCAuY29udGVudC1ib2R5JykgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xuICAgICAgICBpZiAoIWNvbnRhaW5lcikgY29udGFpbmVyID0gZG9jdW1lbnQuYm9keTtcblxuICAgICAgICBjb25zdCBjbG9uZSA9IGNvbnRhaW5lci5jbG9uZU5vZGUodHJ1ZSkgYXMgSFRNTEVsZW1lbnQ7XG4gICAgICAgIGNsb25lLnF1ZXJ5U2VsZWN0b3JBbGwoJ3NjcmlwdCwgc3R5bGUsIG5vc2NyaXB0LCBpZnJhbWUsIG5hdiwgaGVhZGVyLCBmb290ZXIsIGFzaWRlLCAuYWRzLCBbcm9sZT1cImNvbXBsZW1lbnRhcnlcIl0nKS5mb3JFYWNoKChuKSA9PiBuLnJlbW92ZSgpKTtcblxuICAgICAgICBjb25zdCBwYXJhZ3JhcGhzID0gQXJyYXkuZnJvbShjbG9uZS5xdWVyeVNlbGVjdG9yQWxsKCdwJykpLm1hcCgocCkgPT4gcC50ZXh0Q29udGVudD8udHJpbSgpIHx8ICcnKTtcbiAgICAgICAgbGV0IGNvbnRlbnQgPSBwYXJhZ3JhcGhzLmZpbHRlcihCb29sZWFuKS5qb2luKCcgJyk7XG4gICAgICAgIGlmIChjb250ZW50Lmxlbmd0aCA8IDIwMCkgY29udGVudCA9IChjbG9uZS5pbm5lclRleHQgfHwgJycpLnRyaW0oKTtcblxuICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKC9cXHMrL2csICcgJykudHJpbSgpO1xuICAgICAgICBjb25zdCB3b3JkQ291bnQgPSBjb250ZW50LnNwbGl0KC9cXHMrLykuZmlsdGVyKEJvb2xlYW4pLmxlbmd0aDtcbiAgICAgICAgLy8gUmVtb3ZlIG1pbmltdW0gd29yZCBjb3VudCByZXF1aXJlbWVudCAtIGxldCBBSSBoYW5kbGUgY29udGVudCBhbmFseXNpc1xuXG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgdGl0bGU6IGRvY3VtZW50LnRpdGxlLCBjb250ZW50LCB1cmw6IGxvY2F0aW9uLmhyZWYsIHdvcmRDb3VudCB9IH0pO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHRyeSB7IHNlbmRSZXNwb25zZSh7IGVycm9yOiAnRmFpbGVkIHRvIGV4dHJhY3QgcGFnZSBjb250ZW50LicgfSk7IH0gY2F0Y2gge31cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJbmplY3RlZCBTaWRlYmFyIGxvZ2ljIChmaXhlZCB3aWR0aCwgbm8gcGVyc2lzdGVuY2UpXG4gICAgbGV0IGluamVjdGVkUm9vdDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgICBjb25zdCBtcWwgPSB3aW5kb3cubWF0Y2hNZWRpYSgnKHByZWZlcnMtcmVkdWNlZC1tb3Rpb246IHJlZHVjZSknKTtcbiAgICBjb25zdCB0cmFuc2l0aW9uTXMgPSBtcWwubWF0Y2hlcyA/IDAgOiAxNjA7XG5cbiAgICBmdW5jdGlvbiBlbnN1cmVJbmplY3RlZChmb3JjZVNob3c6IGJvb2xlYW4pIHtcbiAgICAgIGlmICghaW5qZWN0ZWRSb290KSB7XG4gICAgICAgIGNyZWF0ZUluamVjdGVkKCk7XG4gICAgICB9XG4gICAgICBpZiAoZm9yY2VTaG93KSB7XG4gICAgICAgIGluamVjdGVkUm9vdCEuc3R5bGUub3BhY2l0eSA9ICcxJztcbiAgICAgIH1cbiAgICAgIGFwcGx5TGF5b3V0KCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlSW5qZWN0ZWQoKSB7XG4gICAgICBpZiAoaW5qZWN0ZWRSb290IHx8IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmYWtlLW5ld3MtcmVhZGVyLWluamVjdGVkLXNpZGViYXInKSkgcmV0dXJuO1xuICAgICAgaW5qZWN0ZWRSb290ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICBpbmplY3RlZFJvb3QuaWQgPSAnZmFrZS1uZXdzLXJlYWRlci1pbmplY3RlZC1zaWRlYmFyJztcbiAgICAgIGluamVjdGVkUm9vdC5zZXRBdHRyaWJ1dGUoJ2FyaWEtbGFiZWwnLCAnRmFrZSBOZXdzIFJlYWRlciBTaWRlYmFyJyk7XG4gICAgICBpbmplY3RlZFJvb3Quc3R5bGUucG9zaXRpb24gPSAnZml4ZWQnO1xuICAgICAgaW5qZWN0ZWRSb290LnN0eWxlLnRvcCA9ICcwJztcbiAgICAgIGluamVjdGVkUm9vdC5zdHlsZS5yaWdodCA9ICcwJztcbiAgICAgIGluamVjdGVkUm9vdC5zdHlsZS5oZWlnaHQgPSAnMTAwdmgnO1xuICAgICAgaW5qZWN0ZWRSb290LnN0eWxlLnpJbmRleCA9ICcyMTQ3NDgzNjQ3JztcbiAgICAgIGluamVjdGVkUm9vdC5zdHlsZS5iYWNrZ3JvdW5kID0gJyNmZmYnO1xuICAgICAgaW5qZWN0ZWRSb290LnN0eWxlLmJvcmRlckxlZnQgPSAnMXB4IHNvbGlkIHJnYmEoMCwwLDAsMC4xMiknO1xuICAgICAgaW5qZWN0ZWRSb290LnN0eWxlLmJveFNoYWRvdyA9ICcwIDAgMCAxcHggcmdiYSgwLDAsMCwwLjA2KSwgLTJweCAwIDhweCByZ2JhKDAsMCwwLDAuMDYpJztcbiAgICAgIGluamVjdGVkUm9vdC5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nO1xuICAgICAgaW5qZWN0ZWRSb290LnN0eWxlLnRyYW5zaXRpb24gPSBgd2lkdGggJHt0cmFuc2l0aW9uTXN9bXMgZWFzZSwgb3BhY2l0eSAke3RyYW5zaXRpb25Nc31tcyBlYXNlYDtcbiAgICAgIGluamVjdGVkUm9vdC5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcblxuICAgICAgY29uc3QgaW5uZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIGlubmVyLnN0eWxlLmhlaWdodCA9ICcxMDAlJztcbiAgICAgIGlubmVyLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XG4gICAgICBpbm5lci5zdHlsZS5mbGV4RGlyZWN0aW9uID0gJ2NvbHVtbic7XG5cbiAgICAgIGNvbnN0IGhlYWRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgaGVhZGVyLnN0eWxlLmNzc1RleHQgPSBbXG4gICAgICAgICdhbGw6IGluaXRpYWwnLFxuICAgICAgICAnZGlzcGxheTogZmxleCcsXG4gICAgICAgICdhbGlnbi1pdGVtczogY2VudGVyJyxcbiAgICAgICAgJ2p1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbicsXG4gICAgICAgICdwYWRkaW5nOiAxMnB4IDE2cHgnLFxuICAgICAgICAnYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkIHJnYmEoMCwwLDAsMC4xMiknLFxuICAgICAgICAnYm94LXNpemluZzogYm9yZGVyLWJveCcsXG4gICAgICAgICd3aWR0aDogMTAwJScsXG4gICAgICAgICdiYWNrZ3JvdW5kOiAjZmZmZmZmJyxcbiAgICAgICAgJ2JveC1zaGFkb3c6IDAgMXB4IDNweCByZ2JhKDAsIDAsIDAsIDAuMDgpJ1xuICAgICAgXS5qb2luKCc7Jyk7XG5cbiAgICAgIGNvbnN0IHRpdGxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgdGl0bGUudGV4dENvbnRlbnQgPSAnTmV3c1NjYW4nO1xuICAgICAgdGl0bGUuc3R5bGUuY3NzVGV4dCA9IFtcbiAgICAgICAgJ2FsbDogaW5pdGlhbCcsXG4gICAgICAgICdmb250OiA2MDAgMTVweCBzeXN0ZW0tdWksIC1hcHBsZS1zeXN0ZW0sIFNlZ29lIFVJLCBSb2JvdG8nLFxuICAgICAgICAnY29sb3I6ICMyMDIxMjQnLFxuICAgICAgICAnbGV0dGVyLXNwYWNpbmc6IC0wLjAxZW0nXG4gICAgICBdLmpvaW4oJzsnKTtcblxuICAgICAgY29uc3QgY2xvc2VCdG4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcbiAgICAgIGNsb3NlQnRuLnNldEF0dHJpYnV0ZSgnYXJpYS1sYWJlbCcsICdDbG9zZScpO1xuICAgICAgY2xvc2VCdG4udGV4dENvbnRlbnQgPSAnw5cnO1xuICAgICAgY2xvc2VCdG4uc3R5bGUuY3NzVGV4dCA9IFtcbiAgICAgICAgJ2FsbDogaW5pdGlhbCcsXG4gICAgICAgICdkaXNwbGF5OmlubGluZS1mbGV4JyxcbiAgICAgICAgJ2FsaWduLWl0ZW1zOmNlbnRlcicsXG4gICAgICAgICdqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyJyxcbiAgICAgICAgJ3dpZHRoOjI4cHgnLFxuICAgICAgICAnaGVpZ2h0OjI4cHgnLFxuICAgICAgICAnY3Vyc29yOnBvaW50ZXInLFxuICAgICAgICAnZm9udDogNjAwIDE2cHgvMSBzeXN0ZW0tdWksIC1hcHBsZS1zeXN0ZW0sIFNlZ29lIFVJLCBSb2JvdG8nLFxuICAgICAgICAnY29sb3I6IzZiNzI4MCcsXG4gICAgICAgICdiYWNrZ3JvdW5kOnRyYW5zcGFyZW50JyxcbiAgICAgICAgJ2JvcmRlci1yYWRpdXM6IDRweCdcbiAgICAgIF0uam9pbignOycpO1xuICAgICAgLy8gVGhlIGNsb3NlIGJ1dHRvbiBzaG91bGQgbmF2aWdhdGUgdGhlIGFwcCBiYWNrIHRvIGl0cyBob21lIHNjcmVlblxuICAgICAgLy8gcmF0aGVyIHRoYW4gY2xvc2luZyB0aGUgc2lkZWJhciBlbnRpcmVseS5cblxuICAgICAgaGVhZGVyLmFwcGVuZENoaWxkKHRpdGxlKTtcbiAgICAgIGhlYWRlci5hcHBlbmRDaGlsZChjbG9zZUJ0bik7XG5cbiAgICAgIGNvbnN0IGJvZHkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIGJvZHkuc3R5bGUuZmxleCA9ICcxJztcbiAgICAgIGJvZHkuc3R5bGUub3ZlcmZsb3cgPSAnaGlkZGVuJztcblxuICAgICAgY29uc3QgaWZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaWZyYW1lJyk7XG4gICAgICBpZnJhbWUudGl0bGUgPSAnTmV3c1NjYW4nO1xuICAgICAgaWZyYW1lLnN0eWxlLmJvcmRlciA9ICcwJztcbiAgICAgIGlmcmFtZS5zdHlsZS53aWR0aCA9ICcxMDAlJztcbiAgICAgIGlmcmFtZS5zdHlsZS5oZWlnaHQgPSAnMTAwJSc7XG4gICAgICBpZnJhbWUuc3JjID0gY2hyb21lLnJ1bnRpbWUuZ2V0VVJMKCdzaWRlcGFuZWwuaHRtbCcpO1xuICAgICAgYm9keS5hcHBlbmRDaGlsZChpZnJhbWUpO1xuXG4gICAgICAvLyBXaXJlIGNsb3NlIGFjdGlvbiB0byBjbG9zZSBzaWRlYmFyXG4gICAgICBjbG9zZUJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAvLyBSZXNldCBzdGF0ZSBmaXJzdCwgdGhlbiBjbG9zZSBhZnRlciBhIGJyaWVmIG1vbWVudFxuICAgICAgICB0cnkge1xuICAgICAgICAgIGlmcmFtZS5jb250ZW50V2luZG93Py5wb3N0TWVzc2FnZSh7IHR5cGU6ICdUUklHR0VSX1JFU0VUJyB9LCAnKicpO1xuICAgICAgICB9IGNhdGNoIHt9XG4gICAgICAgIC8vIENsb3NlIHNpZGViYXIgYWZ0ZXIgcmVzZXQgaGFzIHRpbWUgdG8gcHJvY2Vzc1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICByZW1vdmVJbmplY3RlZCgpO1xuICAgICAgICB9LCA1MCk7XG4gICAgICB9O1xuXG4gICAgICBpbm5lci5hcHBlbmRDaGlsZChoZWFkZXIpO1xuICAgICAgaW5uZXIuYXBwZW5kQ2hpbGQoYm9keSk7XG4gICAgICBpbmplY3RlZFJvb3QuYXBwZW5kQ2hpbGQoaW5uZXIpO1xuICAgICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmFwcGVuZENoaWxkKGluamVjdGVkUm9vdCk7XG4gICAgICBhcHBseUxheW91dCgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlbW92ZUluamVjdGVkKCkge1xuICAgICAgaWYgKCFpbmplY3RlZFJvb3QpIHJldHVybjtcbiAgICAgIGluamVjdGVkUm9vdC5yZW1vdmUoKTtcbiAgICAgIGluamVjdGVkUm9vdCA9IG51bGw7XG4gICAgICByZXNldEJvZHlQYWRkaW5nKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYXBwbHlCb2R5UGFkZGluZygpIHtcbiAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZS5zY3JvbGxCZWhhdmlvciA9ICdhdXRvJztcbiAgICAgIGRvY3VtZW50LmJvZHkuc3R5bGUudHJhbnNpdGlvbiA9IG1xbC5tYXRjaGVzID8gJycgOiBgbWFyZ2luLXJpZ2h0ICR7dHJhbnNpdGlvbk1zfW1zIGVhc2VgO1xuICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS5tYXJnaW5SaWdodCA9IGAke2N1cnJlbnRXaWR0aFB4fXB4YDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXNldEJvZHlQYWRkaW5nKCkge1xuICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS5tYXJnaW5SaWdodCA9ICcnO1xuICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS50cmFuc2l0aW9uID0gJyc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYXBwbHlMYXlvdXQoKSB7XG4gICAgICBpZiAoIWluamVjdGVkUm9vdCkgcmV0dXJuO1xuICAgICAgaW5qZWN0ZWRSb290LnN0eWxlLndpZHRoID0gYCR7Y3VycmVudFdpZHRoUHh9cHhgO1xuICAgICAgaW5qZWN0ZWRSb290LnN0eWxlLm9wYWNpdHkgPSAnMSc7XG4gICAgICBhcHBseUJvZHlQYWRkaW5nKCk7XG4gICAgfVxuICB9LFxufSk7IiwiLy8gI3JlZ2lvbiBzbmlwcGV0XG5leHBvcnQgY29uc3QgYnJvd3NlciA9IGdsb2JhbFRoaXMuYnJvd3Nlcj8ucnVudGltZT8uaWRcbiAgPyBnbG9iYWxUaGlzLmJyb3dzZXJcbiAgOiBnbG9iYWxUaGlzLmNocm9tZTtcbi8vICNlbmRyZWdpb24gc25pcHBldFxuIiwiaW1wb3J0IHsgYnJvd3NlciBhcyBfYnJvd3NlciB9IGZyb20gXCJAd3h0LWRldi9icm93c2VyXCI7XG5leHBvcnQgY29uc3QgYnJvd3NlciA9IF9icm93c2VyO1xuZXhwb3J0IHt9O1xuIiwiZnVuY3Rpb24gcHJpbnQobWV0aG9kLCAuLi5hcmdzKSB7XG4gIGlmIChpbXBvcnQubWV0YS5lbnYuTU9ERSA9PT0gXCJwcm9kdWN0aW9uXCIpIHJldHVybjtcbiAgaWYgKHR5cGVvZiBhcmdzWzBdID09PSBcInN0cmluZ1wiKSB7XG4gICAgY29uc3QgbWVzc2FnZSA9IGFyZ3Muc2hpZnQoKTtcbiAgICBtZXRob2QoYFt3eHRdICR7bWVzc2FnZX1gLCAuLi5hcmdzKTtcbiAgfSBlbHNlIHtcbiAgICBtZXRob2QoXCJbd3h0XVwiLCAuLi5hcmdzKTtcbiAgfVxufVxuZXhwb3J0IGNvbnN0IGxvZ2dlciA9IHtcbiAgZGVidWc6ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLmRlYnVnLCAuLi5hcmdzKSxcbiAgbG9nOiAoLi4uYXJncykgPT4gcHJpbnQoY29uc29sZS5sb2csIC4uLmFyZ3MpLFxuICB3YXJuOiAoLi4uYXJncykgPT4gcHJpbnQoY29uc29sZS53YXJuLCAuLi5hcmdzKSxcbiAgZXJyb3I6ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLmVycm9yLCAuLi5hcmdzKVxufTtcbiIsImltcG9ydCB7IGJyb3dzZXIgfSBmcm9tIFwid3h0L2Jyb3dzZXJcIjtcbmV4cG9ydCBjbGFzcyBXeHRMb2NhdGlvbkNoYW5nZUV2ZW50IGV4dGVuZHMgRXZlbnQge1xuICBjb25zdHJ1Y3RvcihuZXdVcmwsIG9sZFVybCkge1xuICAgIHN1cGVyKFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQuRVZFTlRfTkFNRSwge30pO1xuICAgIHRoaXMubmV3VXJsID0gbmV3VXJsO1xuICAgIHRoaXMub2xkVXJsID0gb2xkVXJsO1xuICB9XG4gIHN0YXRpYyBFVkVOVF9OQU1FID0gZ2V0VW5pcXVlRXZlbnROYW1lKFwid3h0OmxvY2F0aW9uY2hhbmdlXCIpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGdldFVuaXF1ZUV2ZW50TmFtZShldmVudE5hbWUpIHtcbiAgcmV0dXJuIGAke2Jyb3dzZXI/LnJ1bnRpbWU/LmlkfToke2ltcG9ydC5tZXRhLmVudi5FTlRSWVBPSU5UfToke2V2ZW50TmFtZX1gO1xufVxuIiwiaW1wb3J0IHsgV3h0TG9jYXRpb25DaGFuZ2VFdmVudCB9IGZyb20gXCIuL2N1c3RvbS1ldmVudHMubWpzXCI7XG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTG9jYXRpb25XYXRjaGVyKGN0eCkge1xuICBsZXQgaW50ZXJ2YWw7XG4gIGxldCBvbGRVcmw7XG4gIHJldHVybiB7XG4gICAgLyoqXG4gICAgICogRW5zdXJlIHRoZSBsb2NhdGlvbiB3YXRjaGVyIGlzIGFjdGl2ZWx5IGxvb2tpbmcgZm9yIFVSTCBjaGFuZ2VzLiBJZiBpdCdzIGFscmVhZHkgd2F0Y2hpbmcsXG4gICAgICogdGhpcyBpcyBhIG5vb3AuXG4gICAgICovXG4gICAgcnVuKCkge1xuICAgICAgaWYgKGludGVydmFsICE9IG51bGwpIHJldHVybjtcbiAgICAgIG9sZFVybCA9IG5ldyBVUkwobG9jYXRpb24uaHJlZik7XG4gICAgICBpbnRlcnZhbCA9IGN0eC5zZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgIGxldCBuZXdVcmwgPSBuZXcgVVJMKGxvY2F0aW9uLmhyZWYpO1xuICAgICAgICBpZiAobmV3VXJsLmhyZWYgIT09IG9sZFVybC5ocmVmKSB7XG4gICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQobmV3IFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQobmV3VXJsLCBvbGRVcmwpKTtcbiAgICAgICAgICBvbGRVcmwgPSBuZXdVcmw7XG4gICAgICAgIH1cbiAgICAgIH0sIDFlMyk7XG4gICAgfVxuICB9O1xufVxuIiwiaW1wb3J0IHsgYnJvd3NlciB9IGZyb20gXCJ3eHQvYnJvd3NlclwiO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSBcIi4uL3V0aWxzL2ludGVybmFsL2xvZ2dlci5tanNcIjtcbmltcG9ydCB7XG4gIGdldFVuaXF1ZUV2ZW50TmFtZVxufSBmcm9tIFwiLi9pbnRlcm5hbC9jdXN0b20tZXZlbnRzLm1qc1wiO1xuaW1wb3J0IHsgY3JlYXRlTG9jYXRpb25XYXRjaGVyIH0gZnJvbSBcIi4vaW50ZXJuYWwvbG9jYXRpb24td2F0Y2hlci5tanNcIjtcbmV4cG9ydCBjbGFzcyBDb250ZW50U2NyaXB0Q29udGV4dCB7XG4gIGNvbnN0cnVjdG9yKGNvbnRlbnRTY3JpcHROYW1lLCBvcHRpb25zKSB7XG4gICAgdGhpcy5jb250ZW50U2NyaXB0TmFtZSA9IGNvbnRlbnRTY3JpcHROYW1lO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5hYm9ydENvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG4gICAgaWYgKHRoaXMuaXNUb3BGcmFtZSkge1xuICAgICAgdGhpcy5saXN0ZW5Gb3JOZXdlclNjcmlwdHMoeyBpZ25vcmVGaXJzdEV2ZW50OiB0cnVlIH0pO1xuICAgICAgdGhpcy5zdG9wT2xkU2NyaXB0cygpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmxpc3RlbkZvck5ld2VyU2NyaXB0cygpO1xuICAgIH1cbiAgfVxuICBzdGF0aWMgU0NSSVBUX1NUQVJURURfTUVTU0FHRV9UWVBFID0gZ2V0VW5pcXVlRXZlbnROYW1lKFxuICAgIFwid3h0OmNvbnRlbnQtc2NyaXB0LXN0YXJ0ZWRcIlxuICApO1xuICBpc1RvcEZyYW1lID0gd2luZG93LnNlbGYgPT09IHdpbmRvdy50b3A7XG4gIGFib3J0Q29udHJvbGxlcjtcbiAgbG9jYXRpb25XYXRjaGVyID0gY3JlYXRlTG9jYXRpb25XYXRjaGVyKHRoaXMpO1xuICByZWNlaXZlZE1lc3NhZ2VJZHMgPSAvKiBAX19QVVJFX18gKi8gbmV3IFNldCgpO1xuICBnZXQgc2lnbmFsKCkge1xuICAgIHJldHVybiB0aGlzLmFib3J0Q29udHJvbGxlci5zaWduYWw7XG4gIH1cbiAgYWJvcnQocmVhc29uKSB7XG4gICAgcmV0dXJuIHRoaXMuYWJvcnRDb250cm9sbGVyLmFib3J0KHJlYXNvbik7XG4gIH1cbiAgZ2V0IGlzSW52YWxpZCgpIHtcbiAgICBpZiAoYnJvd3Nlci5ydW50aW1lLmlkID09IG51bGwpIHtcbiAgICAgIHRoaXMubm90aWZ5SW52YWxpZGF0ZWQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuc2lnbmFsLmFib3J0ZWQ7XG4gIH1cbiAgZ2V0IGlzVmFsaWQoKSB7XG4gICAgcmV0dXJuICF0aGlzLmlzSW52YWxpZDtcbiAgfVxuICAvKipcbiAgICogQWRkIGEgbGlzdGVuZXIgdGhhdCBpcyBjYWxsZWQgd2hlbiB0aGUgY29udGVudCBzY3JpcHQncyBjb250ZXh0IGlzIGludmFsaWRhdGVkLlxuICAgKlxuICAgKiBAcmV0dXJucyBBIGZ1bmN0aW9uIHRvIHJlbW92ZSB0aGUgbGlzdGVuZXIuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIGJyb3dzZXIucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoY2IpO1xuICAgKiBjb25zdCByZW1vdmVJbnZhbGlkYXRlZExpc3RlbmVyID0gY3R4Lm9uSW52YWxpZGF0ZWQoKCkgPT4ge1xuICAgKiAgIGJyb3dzZXIucnVudGltZS5vbk1lc3NhZ2UucmVtb3ZlTGlzdGVuZXIoY2IpO1xuICAgKiB9KVxuICAgKiAvLyAuLi5cbiAgICogcmVtb3ZlSW52YWxpZGF0ZWRMaXN0ZW5lcigpO1xuICAgKi9cbiAgb25JbnZhbGlkYXRlZChjYikge1xuICAgIHRoaXMuc2lnbmFsLmFkZEV2ZW50TGlzdGVuZXIoXCJhYm9ydFwiLCBjYik7XG4gICAgcmV0dXJuICgpID0+IHRoaXMuc2lnbmFsLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJhYm9ydFwiLCBjYik7XG4gIH1cbiAgLyoqXG4gICAqIFJldHVybiBhIHByb21pc2UgdGhhdCBuZXZlciByZXNvbHZlcy4gVXNlZnVsIGlmIHlvdSBoYXZlIGFuIGFzeW5jIGZ1bmN0aW9uIHRoYXQgc2hvdWxkbid0IHJ1blxuICAgKiBhZnRlciB0aGUgY29udGV4dCBpcyBleHBpcmVkLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBjb25zdCBnZXRWYWx1ZUZyb21TdG9yYWdlID0gYXN5bmMgKCkgPT4ge1xuICAgKiAgIGlmIChjdHguaXNJbnZhbGlkKSByZXR1cm4gY3R4LmJsb2NrKCk7XG4gICAqXG4gICAqICAgLy8gLi4uXG4gICAqIH1cbiAgICovXG4gIGJsb2NrKCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgoKSA9PiB7XG4gICAgfSk7XG4gIH1cbiAgLyoqXG4gICAqIFdyYXBwZXIgYXJvdW5kIGB3aW5kb3cuc2V0SW50ZXJ2YWxgIHRoYXQgYXV0b21hdGljYWxseSBjbGVhcnMgdGhlIGludGVydmFsIHdoZW4gaW52YWxpZGF0ZWQuXG4gICAqL1xuICBzZXRJbnRlcnZhbChoYW5kbGVyLCB0aW1lb3V0KSB7XG4gICAgY29uc3QgaWQgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICBpZiAodGhpcy5pc1ZhbGlkKSBoYW5kbGVyKCk7XG4gICAgfSwgdGltZW91dCk7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNsZWFySW50ZXJ2YWwoaWQpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgLyoqXG4gICAqIFdyYXBwZXIgYXJvdW5kIGB3aW5kb3cuc2V0VGltZW91dGAgdGhhdCBhdXRvbWF0aWNhbGx5IGNsZWFycyB0aGUgaW50ZXJ2YWwgd2hlbiBpbnZhbGlkYXRlZC5cbiAgICovXG4gIHNldFRpbWVvdXQoaGFuZGxlciwgdGltZW91dCkge1xuICAgIGNvbnN0IGlkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBpZiAodGhpcy5pc1ZhbGlkKSBoYW5kbGVyKCk7XG4gICAgfSwgdGltZW91dCk7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNsZWFyVGltZW91dChpZCkpO1xuICAgIHJldHVybiBpZDtcbiAgfVxuICAvKipcbiAgICogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWVgIHRoYXQgYXV0b21hdGljYWxseSBjYW5jZWxzIHRoZSByZXF1ZXN0IHdoZW5cbiAgICogaW52YWxpZGF0ZWQuXG4gICAqL1xuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoY2FsbGJhY2spIHtcbiAgICBjb25zdCBpZCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSgoLi4uYXJncykgPT4ge1xuICAgICAgaWYgKHRoaXMuaXNWYWxpZCkgY2FsbGJhY2soLi4uYXJncyk7XG4gICAgfSk7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNhbmNlbEFuaW1hdGlvbkZyYW1lKGlkKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIC8qKlxuICAgKiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnJlcXVlc3RJZGxlQ2FsbGJhY2tgIHRoYXQgYXV0b21hdGljYWxseSBjYW5jZWxzIHRoZSByZXF1ZXN0IHdoZW5cbiAgICogaW52YWxpZGF0ZWQuXG4gICAqL1xuICByZXF1ZXN0SWRsZUNhbGxiYWNrKGNhbGxiYWNrLCBvcHRpb25zKSB7XG4gICAgY29uc3QgaWQgPSByZXF1ZXN0SWRsZUNhbGxiYWNrKCguLi5hcmdzKSA9PiB7XG4gICAgICBpZiAoIXRoaXMuc2lnbmFsLmFib3J0ZWQpIGNhbGxiYWNrKC4uLmFyZ3MpO1xuICAgIH0sIG9wdGlvbnMpO1xuICAgIHRoaXMub25JbnZhbGlkYXRlZCgoKSA9PiBjYW5jZWxJZGxlQ2FsbGJhY2soaWQpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgYWRkRXZlbnRMaXN0ZW5lcih0YXJnZXQsIHR5cGUsIGhhbmRsZXIsIG9wdGlvbnMpIHtcbiAgICBpZiAodHlwZSA9PT0gXCJ3eHQ6bG9jYXRpb25jaGFuZ2VcIikge1xuICAgICAgaWYgKHRoaXMuaXNWYWxpZCkgdGhpcy5sb2NhdGlvbldhdGNoZXIucnVuKCk7XG4gICAgfVxuICAgIHRhcmdldC5hZGRFdmVudExpc3RlbmVyPy4oXG4gICAgICB0eXBlLnN0YXJ0c1dpdGgoXCJ3eHQ6XCIpID8gZ2V0VW5pcXVlRXZlbnROYW1lKHR5cGUpIDogdHlwZSxcbiAgICAgIGhhbmRsZXIsXG4gICAgICB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIHNpZ25hbDogdGhpcy5zaWduYWxcbiAgICAgIH1cbiAgICApO1xuICB9XG4gIC8qKlxuICAgKiBAaW50ZXJuYWxcbiAgICogQWJvcnQgdGhlIGFib3J0IGNvbnRyb2xsZXIgYW5kIGV4ZWN1dGUgYWxsIGBvbkludmFsaWRhdGVkYCBsaXN0ZW5lcnMuXG4gICAqL1xuICBub3RpZnlJbnZhbGlkYXRlZCgpIHtcbiAgICB0aGlzLmFib3J0KFwiQ29udGVudCBzY3JpcHQgY29udGV4dCBpbnZhbGlkYXRlZFwiKTtcbiAgICBsb2dnZXIuZGVidWcoXG4gICAgICBgQ29udGVudCBzY3JpcHQgXCIke3RoaXMuY29udGVudFNjcmlwdE5hbWV9XCIgY29udGV4dCBpbnZhbGlkYXRlZGBcbiAgICApO1xuICB9XG4gIHN0b3BPbGRTY3JpcHRzKCkge1xuICAgIHdpbmRvdy5wb3N0TWVzc2FnZShcbiAgICAgIHtcbiAgICAgICAgdHlwZTogQ29udGVudFNjcmlwdENvbnRleHQuU0NSSVBUX1NUQVJURURfTUVTU0FHRV9UWVBFLFxuICAgICAgICBjb250ZW50U2NyaXB0TmFtZTogdGhpcy5jb250ZW50U2NyaXB0TmFtZSxcbiAgICAgICAgbWVzc2FnZUlkOiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zbGljZSgyKVxuICAgICAgfSxcbiAgICAgIFwiKlwiXG4gICAgKTtcbiAgfVxuICB2ZXJpZnlTY3JpcHRTdGFydGVkRXZlbnQoZXZlbnQpIHtcbiAgICBjb25zdCBpc1NjcmlwdFN0YXJ0ZWRFdmVudCA9IGV2ZW50LmRhdGE/LnR5cGUgPT09IENvbnRlbnRTY3JpcHRDb250ZXh0LlNDUklQVF9TVEFSVEVEX01FU1NBR0VfVFlQRTtcbiAgICBjb25zdCBpc1NhbWVDb250ZW50U2NyaXB0ID0gZXZlbnQuZGF0YT8uY29udGVudFNjcmlwdE5hbWUgPT09IHRoaXMuY29udGVudFNjcmlwdE5hbWU7XG4gICAgY29uc3QgaXNOb3REdXBsaWNhdGUgPSAhdGhpcy5yZWNlaXZlZE1lc3NhZ2VJZHMuaGFzKGV2ZW50LmRhdGE/Lm1lc3NhZ2VJZCk7XG4gICAgcmV0dXJuIGlzU2NyaXB0U3RhcnRlZEV2ZW50ICYmIGlzU2FtZUNvbnRlbnRTY3JpcHQgJiYgaXNOb3REdXBsaWNhdGU7XG4gIH1cbiAgbGlzdGVuRm9yTmV3ZXJTY3JpcHRzKG9wdGlvbnMpIHtcbiAgICBsZXQgaXNGaXJzdCA9IHRydWU7XG4gICAgY29uc3QgY2IgPSAoZXZlbnQpID0+IHtcbiAgICAgIGlmICh0aGlzLnZlcmlmeVNjcmlwdFN0YXJ0ZWRFdmVudChldmVudCkpIHtcbiAgICAgICAgdGhpcy5yZWNlaXZlZE1lc3NhZ2VJZHMuYWRkKGV2ZW50LmRhdGEubWVzc2FnZUlkKTtcbiAgICAgICAgY29uc3Qgd2FzRmlyc3QgPSBpc0ZpcnN0O1xuICAgICAgICBpc0ZpcnN0ID0gZmFsc2U7XG4gICAgICAgIGlmICh3YXNGaXJzdCAmJiBvcHRpb25zPy5pZ25vcmVGaXJzdEV2ZW50KSByZXR1cm47XG4gICAgICAgIHRoaXMubm90aWZ5SW52YWxpZGF0ZWQoKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGNiKTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gcmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgY2IpKTtcbiAgfVxufVxuIl0sIm5hbWVzIjpbImRlZmluaXRpb24iLCJfYSIsImNvbnRlbnQiLCJicm93c2VyIiwiX2Jyb3dzZXIiLCJwcmludCIsImxvZ2dlciIsIl9iIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBTyxXQUFTLG9CQUFvQkEsYUFBWTtBQUM5QyxXQUFPQTtBQUFBLEVBQ1Q7QUNDQSxRQUFBLGFBQUEsb0JBQUE7QUFBQSxJQUFtQyxTQUFBLENBQUEsWUFBQTtBQUFBLElBQ1gsaUJBQUE7QUFBQSxNQUNMO0FBQUEsTUFDZjtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNGLE9BQUE7QUFHRSxVQUFBLFNBQUEsYUFBQSxhQUFBLFNBQUEsYUFBQSx1QkFBQSxTQUFBLGFBQUEsb0JBQUEsU0FBQSxhQUFBLFdBQUEsU0FBQSxhQUFBLFlBQUEsU0FBQSxLQUFBLFNBQUEsb0JBQUEsS0FBQSxTQUFBLEtBQUEsU0FBQSxhQUFBLEtBQUEsU0FBQSxLQUFBLFNBQUEsMEJBQUEsS0FBQSxTQUFBLEtBQUEsU0FBQSx1QkFBQSxLQUFBLFNBQUEsS0FBQSxTQUFBLGlCQUFBLEtBQUEsU0FBQSxLQUFBLFNBQUEsb0JBQUEsR0FBQTtBQVdFLGdCQUFBLElBQUEsZ0RBQUEsU0FBQSxJQUFBO0FBQ0E7QUFBQSxNQUFBO0FBR0YsY0FBQSxJQUFBLG9DQUFBLFNBQUEsSUFBQTtBQUVBLFlBQUEsbUJBQUE7QUFDQSxZQUFBLG9CQUFBO0FBQ0EsVUFBQSxpQkFBQTtBQUdBLGFBQUEsaUJBQUEsTUFBQSxlQUFBO0FBQ0EsYUFBQSxXQUFBLE1BQUE7O0FBQ0UsY0FBQSxLQUFBLFNBQUEsZUFBQSxtQ0FBQTtBQUNBLGdCQUFBLElBQUEsZUFBQTtBQUFBLFVBQTJCLFFBQUEsQ0FBQSxDQUFBO0FBQUEsVUFDZixZQUFBLHlCQUFBLE1BQUE7QUFBQSxVQUNZLFNBQUEseUJBQUEsTUFBQTtBQUFBLFVBQ0gsT0FBQUMsTUFBQSx5QkFBQSwwQkFBQSxnQkFBQUEsSUFBQTtBQUFBLFVBQ2UsaUJBQUEsaUJBQUEsU0FBQSxJQUFBLEVBQUE7QUFBQSxRQUNlLENBQUE7QUFBQSxNQUNsRDtBQUlILGFBQUEsUUFBQSxVQUFBLFlBQUEsQ0FBQSxTQUFBLFFBQUEsaUJBQUE7QUFDRSxhQUFBLG1DQUFBLFVBQUEsWUFBQTtBQUNFLHVCQUFBLEVBQUEsSUFBQSxNQUFBO0FBQ0EsaUJBQUE7QUFBQSxRQUFPO0FBQUEsTUFDVCxDQUFBO0FBSUYsYUFBQSxRQUFBLFVBQUEsWUFBQSxDQUFBLFlBQUE7QUFDRSxhQUFBLG1DQUFBLFVBQUEsMkJBQUE7QUFDRSxnQkFBQSxTQUFBLENBQUEsQ0FBQSxTQUFBLGVBQUEsbUNBQUE7QUFDQSxjQUFBLFFBQUE7QUFHRSxnQkFBQSxRQUFBLFVBQUE7QUFDRSxzQkFBQSxJQUFBLHdFQUFBO0FBQ0Esc0JBQUEsSUFBQSxvREFBQTtBQUNBLDZCQUFBO0FBRUEsa0JBQUEsUUFBQSxtQkFBQTtBQUNFLDJCQUFBLE1BQUE7QUFDRSx3QkFBQSxTQUFBLFNBQUEsY0FBQSwyQ0FBQTtBQUNBLHNCQUFBLGlDQUFBLGVBQUE7QUFDRSwyQkFBQSxjQUFBLFlBQUE7QUFBQSxzQkFBaUMsTUFBQTtBQUFBLHNCQUN6QixNQUFBLFFBQUE7QUFBQSxvQkFDUSxHQUFBLEdBQUE7QUFBQSxrQkFDVjtBQUFBLGdCQUNSLEdBQUEsRUFBQTtBQUFBLGNBQ0c7QUFBQSxZQUNQLE9BQUE7QUFFQSxzQkFBQSxJQUFBLDBDQUFBO0FBQ0EsNkJBQUE7QUFBQSxZQUFlO0FBQUEsVUFDakIsT0FBQTtBQUVBLG9CQUFBLElBQUEsd0VBQUE7QUFDQSxvQkFBQSxJQUFBLDJDQUFBO0FBQ0EsMkJBQUE7QUFFQSxnQkFBQSxRQUFBLG1CQUFBO0FBQ0UseUJBQUEsTUFBQTtBQUNFLHNCQUFBLFNBQUEsU0FBQSxjQUFBLDJDQUFBO0FBQ0Esb0JBQUEsaUNBQUEsZUFBQTtBQUNFLHlCQUFBLGNBQUEsWUFBQTtBQUFBLG9CQUFpQyxNQUFBO0FBQUEsb0JBQ3pCLE1BQUEsUUFBQTtBQUFBLGtCQUNRLEdBQUEsR0FBQTtBQUFBLGdCQUNWO0FBQUEsY0FDUixHQUFBLEdBQUE7QUFBQSxZQUNJLE9BQUE7QUFHTix5QkFBQSxNQUFBO0FBQ0Usc0JBQUEsU0FBQSxTQUFBLGNBQUEsMkNBQUE7QUFDQSxvQkFBQSxpQ0FBQSxlQUFBO0FBQ0UseUJBQUEsY0FBQSxZQUFBO0FBQUEsb0JBQWlDLE1BQUE7QUFBQSxrQkFDekIsR0FBQSxHQUFBO0FBQUEsZ0JBQ0Y7QUFBQSxjQUNSLEdBQUEsRUFBQTtBQUFBLFlBQ0c7QUFBQSxVQUNQO0FBQUEsUUFDRjtBQUlGLGFBQUEsbUNBQUEsVUFBQSx1QkFBQTtBQUNFLGdCQUFBLGVBQUEsUUFBQTtBQUNBLDJCQUFBLGVBQUEsb0JBQUE7QUFHQSxjQUFBLGdCQUFBLENBQUEsU0FBQSxlQUFBLG1DQUFBLEdBQUE7QUFDRSxvQkFBQSxJQUFBLHdGQUFBO0FBQ0EsMkJBQUE7QUFBQSxVQUFtQixXQUFBLFNBQUEsZUFBQSxtQ0FBQSxHQUFBO0FBRW5CLHdCQUFBO0FBQUEsVUFBWTtBQUFBLFFBQ2Q7QUFBQSxNQUNGLENBQUE7QUFHRixjQUFBLElBQUEsNkJBQUE7QUFHQSxhQUFBLFFBQUEsVUFBQSxZQUFBLENBQUEsU0FBQSxRQUFBLGlCQUFBO0FBQ0UsWUFBQSxRQUFBLFNBQUEsb0JBQUE7QUFDRSxnQkFBQSxNQUFBLE1BQUEsV0FBQSxNQUFBLG1CQUFBLFlBQUEsR0FBQSxHQUFBO0FBQ0EsY0FBQSxTQUFBLGVBQUEsWUFBQTtBQUNFLG1CQUFBLGlCQUFBLFFBQUEsS0FBQSxFQUFBLE1BQUEsTUFBQTtBQUFBLFVBQW1ELE9BQUE7QUFFbkQsZ0JBQUE7QUFBQSxVQUFJO0FBRU4saUJBQUE7QUFBQSxRQUFPO0FBQUEsTUFDVCxDQUFBO0FBR0YsZUFBQSxtQkFBQSxjQUFBO0FBQ0UsWUFBQTtBQUNFLGNBQUEsWUFBQTtBQUNBLHNCQUFBLFNBQUEsY0FBQSxTQUFBO0FBQ0EsY0FBQSxDQUFBLFVBQUEsYUFBQSxTQUFBLGNBQUEsc0JBQUE7QUFDQSxjQUFBLENBQUEsVUFBQSxhQUFBLFNBQUEsY0FBQSxnREFBQTtBQUNBLGNBQUEsQ0FBQSxVQUFBLGFBQUEsU0FBQTtBQUVBLGdCQUFBLFFBQUEsVUFBQSxVQUFBLElBQUE7QUFDQSxnQkFBQSxpQkFBQSwyRkFBQSxFQUFBLFFBQUEsQ0FBQSxNQUFBLEVBQUEsUUFBQTtBQUVBLGdCQUFBLGFBQUEsTUFBQSxLQUFBLE1BQUEsaUJBQUEsR0FBQSxDQUFBLEVBQUEsSUFBQSxDQUFBLE1BQUE7O0FBQUEscUJBQUFBLE1BQUEsRUFBQSxnQkFBQSxnQkFBQUEsSUFBQSxXQUFBO0FBQUEsV0FBQTtBQUNBLGNBQUFDLFdBQUEsV0FBQSxPQUFBLE9BQUEsRUFBQSxLQUFBLEdBQUE7QUFDQSxjQUFBQSxTQUFBLFNBQUEsSUFBQSxDQUFBQSxZQUFBLE1BQUEsYUFBQSxJQUFBLEtBQUE7QUFFQSxVQUFBQSxXQUFBQSxTQUFBLFFBQUEsUUFBQSxHQUFBLEVBQUEsS0FBQTtBQUNBLGdCQUFBLFlBQUFBLFNBQUEsTUFBQSxLQUFBLEVBQUEsT0FBQSxPQUFBLEVBQUE7QUFHQSx1QkFBQSxFQUFBLFNBQUEsTUFBQSxNQUFBLEVBQUEsT0FBQSxTQUFBLE9BQUEsU0FBQUEsVUFBQSxLQUFBLFNBQUEsTUFBQSxVQUFBLEVBQUEsQ0FBQTtBQUFBLFFBQXVHLFNBQUEsS0FBQTtBQUV2RyxjQUFBO0FBQU0seUJBQUEsRUFBQSxPQUFBLG1DQUFBO0FBQUEsVUFBeUQsUUFBQTtBQUFBLFVBQVc7QUFBQSxRQUFDO0FBQUEsTUFDN0U7QUFJRixVQUFBLGVBQUE7QUFDQSxZQUFBLE1BQUEsT0FBQSxXQUFBLGtDQUFBO0FBQ0EsWUFBQSxlQUFBLElBQUEsVUFBQSxJQUFBO0FBRUEsZUFBQSxlQUFBLFdBQUE7QUFDRSxZQUFBLENBQUEsY0FBQTtBQUNFLHlCQUFBO0FBQUEsUUFBZTtBQUVqQjtBQUNFLHVCQUFBLE1BQUEsVUFBQTtBQUFBLFFBQThCO0FBRWhDLG9CQUFBO0FBQUEsTUFBWTtBQUdkLGVBQUEsaUJBQUE7QUFDRSxZQUFBLGdCQUFBLFNBQUEsZUFBQSxtQ0FBQSxFQUFBO0FBQ0EsdUJBQUEsU0FBQSxjQUFBLEtBQUE7QUFDQSxxQkFBQSxLQUFBO0FBQ0EscUJBQUEsYUFBQSxjQUFBLDBCQUFBO0FBQ0EscUJBQUEsTUFBQSxXQUFBO0FBQ0EscUJBQUEsTUFBQSxNQUFBO0FBQ0EscUJBQUEsTUFBQSxRQUFBO0FBQ0EscUJBQUEsTUFBQSxTQUFBO0FBQ0EscUJBQUEsTUFBQSxTQUFBO0FBQ0EscUJBQUEsTUFBQSxhQUFBO0FBQ0EscUJBQUEsTUFBQSxhQUFBO0FBQ0EscUJBQUEsTUFBQSxZQUFBO0FBQ0EscUJBQUEsTUFBQSxXQUFBO0FBQ0EscUJBQUEsTUFBQSxhQUFBLFNBQUEsWUFBQSxvQkFBQSxZQUFBO0FBQ0EscUJBQUEsTUFBQSxVQUFBO0FBRUEsY0FBQSxRQUFBLFNBQUEsY0FBQSxLQUFBO0FBQ0EsY0FBQSxNQUFBLFNBQUE7QUFDQSxjQUFBLE1BQUEsVUFBQTtBQUNBLGNBQUEsTUFBQSxnQkFBQTtBQUVBLGNBQUEsU0FBQSxTQUFBLGNBQUEsS0FBQTtBQUNBLGVBQUEsTUFBQSxVQUFBO0FBQUEsVUFBdUI7QUFBQSxVQUNyQjtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsUUFDQSxFQUFBLEtBQUEsR0FBQTtBQUdGLGNBQUEsUUFBQSxTQUFBLGNBQUEsTUFBQTtBQUNBLGNBQUEsY0FBQTtBQUNBLGNBQUEsTUFBQSxVQUFBO0FBQUEsVUFBc0I7QUFBQSxVQUNwQjtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsUUFDQSxFQUFBLEtBQUEsR0FBQTtBQUdGLGNBQUEsV0FBQSxTQUFBLGNBQUEsUUFBQTtBQUNBLGlCQUFBLGFBQUEsY0FBQSxPQUFBO0FBQ0EsaUJBQUEsY0FBQTtBQUNBLGlCQUFBLE1BQUEsVUFBQTtBQUFBLFVBQXlCO0FBQUEsVUFDdkI7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxRQUNBLEVBQUEsS0FBQSxHQUFBO0FBS0YsZUFBQSxZQUFBLEtBQUE7QUFDQSxlQUFBLFlBQUEsUUFBQTtBQUVBLGNBQUEsT0FBQSxTQUFBLGNBQUEsS0FBQTtBQUNBLGFBQUEsTUFBQSxPQUFBO0FBQ0EsYUFBQSxNQUFBLFdBQUE7QUFFQSxjQUFBLFNBQUEsU0FBQSxjQUFBLFFBQUE7QUFDQSxlQUFBLFFBQUE7QUFDQSxlQUFBLE1BQUEsU0FBQTtBQUNBLGVBQUEsTUFBQSxRQUFBO0FBQ0EsZUFBQSxNQUFBLFNBQUE7QUFDQSxlQUFBLE1BQUEsT0FBQSxRQUFBLE9BQUEsZ0JBQUE7QUFDQSxhQUFBLFlBQUEsTUFBQTtBQUdBLGlCQUFBLFVBQUEsTUFBQTs7QUFFRSxjQUFBO0FBQ0UsYUFBQUQsTUFBQSxPQUFBLGtCQUFBLGdCQUFBQSxJQUFBLFlBQUEsRUFBQSxNQUFBLGdCQUFBLEdBQUE7QUFBQSxVQUFnRSxRQUFBO0FB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QUFJLElBQUk7QUFBQSxRQUNyRDtBQUFBLFFBQ0E7QUFBQSxVQUNFLEdBQUc7QUFBQSxVQUNILFFBQVEsS0FBSztBQUFBLFFBQ3JCO0FBQUE7QUFBQSxJQUVBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQUtFLG9CQUFvQjtBQUNsQixXQUFLLE1BQU0sb0NBQW9DO0FBQy9DSyxlQUFPO0FBQUEsUUFDTCxtQkFBbUIsS0FBSyxpQkFBaUI7QUFBQSxNQUMxQztBQUFBLElBQ0w7QUFBQSxJQUNFLGlCQUFpQjtBQUNmLGFBQU87QUFBQSxRQUNMO0FBQUEsVUFDRSxNQUFNLHNCQUFxQjtBQUFBLFVBQzNCLG1CQUFtQixLQUFLO0FBQUEsVUFDeEIsV0FBVyxLQUFLLE9BQVEsRUFBQyxTQUFTLEVBQUUsRUFBRSxNQUFNLENBQUM7QUFBQSxRQUM5QztBQUFBLFFBQ0Q7QUFBQSxNQUNEO0FBQUEsSUFDTDtBQUFBLElBQ0UseUJBQXlCLE9BQU87O0FBQzlCLFlBQU0seUJBQXVCTCxNQUFBLE1BQU0sU0FBTixnQkFBQUEsSUFBWSxVQUFTLHNCQUFxQjtBQUN2RSxZQUFNLHdCQUFzQk0sTUFBQSxNQUFNLFNBQU4sZ0JBQUFBLElBQVksdUJBQXNCLEtBQUs7QUFDbkUsWUFBTSxpQkFBaUIsQ0FBQyxLQUFLLG1CQUFtQixLQUFJLFdBQU0sU0FBTixtQkFBWSxTQUFTO0FBQ3pFLGFBQU8sd0JBQXdCLHVCQUF1QjtBQUFBLElBQzFEO0FBQUEsSUFDRSxzQkFBc0IsU0FBUztBQUM3QixVQUFJLFVBQVU7QUFDZCxZQUFNLEtBQUssQ0FBQyxVQUFVO0FBQ3BCLFlBQUksS0FBSyx5QkFBeUIsS0FBSyxHQUFHO0FBQ3hDLGVBQUssbUJBQW1CLElBQUksTUFBTSxLQUFLLFNBQVM7QUFDaEQsZ0JBQU0sV0FBVztBQUNqQixvQkFBVTtBQUNWLGNBQUksYUFBWSxtQ0FBUyxrQkFBa0I7QUFDM0MsZUFBSyxrQkFBbUI7QUFBQSxRQUNoQztBQUFBLE1BQ0s7QUFDRCx1QkFBaUIsV0FBVyxFQUFFO0FBQzlCLFdBQUssY0FBYyxNQUFNLG9CQUFvQixXQUFXLEVBQUUsQ0FBQztBQUFBLElBQy9EO0FBQUEsRUFDQTtBQXJKRSxnQkFaVyx1QkFZSiwrQkFBOEI7QUFBQSxJQUNuQztBQUFBLEVBQ0Q7QUFkSSxNQUFNLHVCQUFOOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzAsMiwzLDQsNSw2LDddfQ==
