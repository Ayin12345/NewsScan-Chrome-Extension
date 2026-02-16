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
      {
        console.log("[FNR] Content script starting on", location.href);
      }
      const DEFAULT_WIDTH_PX = 440;
      const EXPANDED_WIDTH_PX = 720;
      let currentWidthPx = DEFAULT_WIDTH_PX;
      {
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
      }
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if ((message == null ? void 0 : message.type) === "FNR_PING") {
          sendResponse({ ok: true });
          return true;
        }
      });
      chrome.runtime.onMessage.addListener((message) => {
        if ((message == null ? void 0 : message.type) === "TOGGLE_INJECTED_SIDEBAR") {
          {
            console.log("[FNR] Toggle message received:", message);
          }
          const exists = !!document.getElementById("fake-news-reader-injected-sidebar");
          if (document.hidden && !exists) {
            return;
          }
          if (exists) {
            if (message.keepOpen) {
              ensureInjected();
              if (message.preloadedAnalysis || message.hasPreloadedAnalysis) {
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
              removeInjected();
            }
          } else {
            ensureInjected();
            if (message.preloadedAnalysis || message.hasPreloadedAnalysis) {
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
              const sendTrigger = (attempt = 1) => {
                const iframe = document.querySelector("#fake-news-reader-injected-sidebar iframe");
                if (iframe == null ? void 0 : iframe.contentWindow) {
                  iframe.contentWindow.postMessage({
                    type: "TRIGGER_NEW_ANALYSIS"
                  }, "*");
                } else if (attempt < 3) {
                  setTimeout(() => sendTrigger(attempt + 1), 100);
                }
              };
              setTimeout(() => sendTrigger(1), 150);
            }
          }
        }
        if ((message == null ? void 0 : message.type) === "EXPAND_FOR_ANALYSIS") {
          if (document.hidden) {
            return;
          }
          const shouldExpand = message.expanded;
          currentWidthPx = shouldExpand ? EXPANDED_WIDTH_PX : DEFAULT_WIDTH_PX;
          if (shouldExpand && !document.getElementById("fake-news-reader-injected-sidebar")) {
            ensureInjected();
          } else if (document.getElementById("fake-news-reader-injected-sidebar")) {
            applyLayout();
          }
        }
      });
      {
        console.log("[FNR] Content script loaded");
      }
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
        if (document.hidden && !injectedRoot) {
          return;
        }
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
        const logoContainer = document.createElement("div");
        logoContainer.style.cssText = [
          "all: initial",
          "display: flex",
          "align-items: center",
          "gap: 8px"
        ].join(";");
        const logo = document.createElement("img");
        const logoUrl = chrome.runtime.getURL("logo.png");
        logo.src = logoUrl;
        logo.alt = "NewsScan Logo";
        logo.style.cssText = [
          "all: initial",
          "width: 35px",
          "height: 35px",
          "object-fit: contain"
        ].join(";");
        logo.onerror = (error) => {
          {
            console.error("NewsScan: Logo failed to load:", error);
          }
          logo.style.display = "none";
        };
        const title = document.createElement("span");
        title.textContent = "NewsScan";
        title.style.cssText = [
          "all: initial",
          "font: 600 15px system-ui, -apple-system, Segoe UI, Roboto",
          "color: #202124",
          "letter-spacing: -0.01em"
        ].join(";");
        logoContainer.appendChild(logo);
        logoContainer.appendChild(title);
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
        header.appendChild(logoContainer);
        header.appendChild(closeBtn);
        const body = document.createElement("div");
        body.style.flex = "1";
        body.style.overflow = "hidden";
        const iframe = document.createElement("iframe");
        iframe.title = "NewsScan";
        iframe.style.border = "0";
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.src = chrome.runtime.getURL("sidebar.html");
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
      document.addEventListener("visibilitychange", () => {
        if (document.hidden && injectedRoot) {
          injectedRoot.style.opacity = "0";
          resetBodyPadding();
        } else if (!document.hidden && injectedRoot) {
          injectedRoot.style.opacity = "1";
          applyLayout();
        }
      });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2RlZmluZS1jb250ZW50LXNjcmlwdC5tanMiLCIuLi8uLi8uLi9zcmMvZW50cnlwb2ludHMvY29udGVudC50cyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9Ad3h0LWRldi9icm93c2VyL3NyYy9pbmRleC5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvYnJvd3Nlci5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvaW50ZXJuYWwvbG9nZ2VyLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9pbnRlcm5hbC9jdXN0b20tZXZlbnRzLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9pbnRlcm5hbC9sb2NhdGlvbi13YXRjaGVyLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9jb250ZW50LXNjcmlwdC1jb250ZXh0Lm1qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZnVuY3Rpb24gZGVmaW5lQ29udGVudFNjcmlwdChkZWZpbml0aW9uKSB7XG4gIHJldHVybiBkZWZpbml0aW9uO1xufVxuIiwiaW1wb3J0IHsgZGVmaW5lQ29udGVudFNjcmlwdCB9IGZyb20gJyNpbXBvcnRzJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29udGVudFNjcmlwdCh7XG4gIG1hdGNoZXM6IFsnPGFsbF91cmxzPiddLFxuICBleGNsdWRlX21hdGNoZXM6IFtcbiAgICAnY2hyb21lOi8vKicsXG4gICAgJ2Nocm9tZS1leHRlbnNpb246Ly8qJyxcbiAgICAnbW96LWV4dGVuc2lvbjovLyonLFxuICAgICdlZGdlOi8vKicsXG4gICAgJ2Fib3V0OionLFxuICAgICdjaHJvbWUtZGV2dG9vbHM6Ly8qJyxcbiAgICAnZGV2dG9vbHM6Ly8qJyxcbiAgICAnKjovL2NvbnNvbGUuY2xvdWQuZ29vZ2xlLmNvbS8qJyxcbiAgICAnKjovL2RldmVsb3BlcnMuZ29vZ2xlLmNvbS8qJyxcbiAgICAnKjovL2FwaXMuZ29vZ2xlLmNvbS8qJyxcbiAgICAnKjovL3d3dy5nb29nbGVhcGlzLmNvbS8qJ1xuICBdLFxuICBtYWluKCkge1xuICAgIC8vIE5vdGU6IFJlc3RyaWN0ZWQgcGFnZXMgYXJlIGFscmVhZHkgZXhjbHVkZWQgdmlhIGV4Y2x1ZGVfbWF0Y2hlcyBhYm92ZVxuICAgIGNvbnN0IGlzRGV2ID0gaW1wb3J0Lm1ldGEuZW52LkRFViB8fCBpbXBvcnQubWV0YS5lbnYuTU9ERSA9PT0gJ2RldmVsb3BtZW50JztcbiAgICBcbiAgICBpZiAoaXNEZXYpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdbRk5SXSBDb250ZW50IHNjcmlwdCBzdGFydGluZyBvbicsIGxvY2F0aW9uLmhyZWYpO1xuICAgIH1cblxuICAgIGNvbnN0IERFRkFVTFRfV0lEVEhfUFggPSA0NDA7XG4gICAgY29uc3QgRVhQQU5ERURfV0lEVEhfUFggPSA3MjA7IC8vIFdpZGVyIHdpZHRoIGZvciBhbmFseXNpcyByZXN1bHRzXG4gICAgbGV0IGN1cnJlbnRXaWR0aFB4ID0gREVGQVVMVF9XSURUSF9QWDtcblxuICAgIC8vIERlYnVnIGhlbHBlcnMgKGRldmVsb3BtZW50IG9ubHkpXG4gICAgaWYgKGlzRGV2KSB7XG4gICAgICAod2luZG93IGFzIGFueSkuZm5yT3BlblNpZGViYXIgPSAoKSA9PiBlbnN1cmVJbmplY3RlZCh0cnVlKTtcbiAgICAgICh3aW5kb3cgYXMgYW55KS5mbnJEZWJ1ZyA9ICgpID0+IHtcbiAgICAgICAgY29uc3QgZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZmFrZS1uZXdzLXJlYWRlci1pbmplY3RlZC1zaWRlYmFyJykgYXMgSFRNTEVsZW1lbnQgfCBudWxsO1xuICAgICAgICBjb25zb2xlLmxvZygnW0ZOUl0gZGVidWcnLCB7XG4gICAgICAgICAgZXhpc3RzOiAhIWVsLFxuICAgICAgICAgIHdpZHRoU3R5bGU6IGVsPy5zdHlsZS53aWR0aCxcbiAgICAgICAgICBkaXNwbGF5OiBlbD8uc3R5bGUuZGlzcGxheSxcbiAgICAgICAgICByZWN0OiBlbD8uZ2V0Qm91bmRpbmdDbGllbnRSZWN0Py4oKSxcbiAgICAgICAgICBib2R5TWFyZ2luUmlnaHQ6IGdldENvbXB1dGVkU3R5bGUoZG9jdW1lbnQuYm9keSkubWFyZ2luUmlnaHQsXG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBSZXBseSB0byBwaW5nIGZyb20gYmFja2dyb3VuZCBmb3IgcmVhZGluZXNzIGNoZWNrXG4gICAgY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKChtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSkgPT4ge1xuICAgICAgaWYgKG1lc3NhZ2U/LnR5cGUgPT09ICdGTlJfUElORycpIHtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgb2s6IHRydWUgfSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gVG9nZ2xlIGZyb20gdG9vbGJhcjogb3BlbiBpZiBub3QgcHJlc2VudCwgZWxzZSBjbG9zZVxuICAgIGNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigobWVzc2FnZSkgPT4ge1xuICAgICAgaWYgKG1lc3NhZ2U/LnR5cGUgPT09ICdUT0dHTEVfSU5KRUNURURfU0lERUJBUicpIHtcbiAgICAgICAgaWYgKGlzRGV2KSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ1tGTlJdIFRvZ2dsZSBtZXNzYWdlIHJlY2VpdmVkOicsIG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBEb24ndCBwcm9jZXNzIHNpZGViYXIgdG9nZ2xlIGlmIGRvY3VtZW50IGlzIGhpZGRlbiAodXNlciBzd2l0Y2hlZCB0byBhbm90aGVyIHRhYilcbiAgICAgICAgLy8gRXhjZXB0aW9uOiBhbGxvdyBpZiBzaWRlYmFyIGFscmVhZHkgZXhpc3RzICh1c2VyIG1pZ2h0IGJlIHN3aXRjaGluZyBiYWNrKVxuICAgICAgICBjb25zdCBleGlzdHMgPSAhIWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmYWtlLW5ld3MtcmVhZGVyLWluamVjdGVkLXNpZGViYXInKTtcbiAgICAgICAgaWYgKGRvY3VtZW50LmhpZGRlbiAmJiAhZXhpc3RzKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoZXhpc3RzKSB7XG4gICAgICAgICAgLy8gSWYgc2lkZWJhciBleGlzdHMsIGNoZWNrIGlmIHdlIHNob3VsZCBrZWVwIGl0IG9wZW4gb3IgY2xvc2UgaXRcbiAgICAgICAgICAvLyBGb3IgYW5hbHlzaXMgbG9hZGluZywgd2Ugd2FudCB0byBrZWVwIGl0IG9wZW5cbiAgICAgICAgICBpZiAobWVzc2FnZS5rZWVwT3Blbikge1xuICAgICAgICAgICAgZW5zdXJlSW5qZWN0ZWQodHJ1ZSk7XG4gICAgICAgICAgLy8gSWYgd2UgaGF2ZSBwcmVsb2FkZWQgYW5hbHlzaXMsIHNlbmQgaXQgdG8gdGhlIGlmcmFtZVxuICAgICAgICAgIGlmIChtZXNzYWdlLnByZWxvYWRlZEFuYWx5c2lzIHx8IG1lc3NhZ2UuaGFzUHJlbG9hZGVkQW5hbHlzaXMpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICBjb25zdCBpZnJhbWUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZmFrZS1uZXdzLXJlYWRlci1pbmplY3RlZC1zaWRlYmFyIGlmcmFtZScpIGFzIEhUTUxJRnJhbWVFbGVtZW50O1xuICAgICAgICAgICAgICBpZiAoaWZyYW1lPy5jb250ZW50V2luZG93KSB7XG4gICAgICAgICAgICAgICAgaWZyYW1lLmNvbnRlbnRXaW5kb3cucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ1BSRUxPQURFRF9BTkFMWVNJUycsXG4gICAgICAgICAgICAgICAgICBkYXRhOiBtZXNzYWdlLnByZWxvYWRlZEFuYWx5c2lzXG4gICAgICAgICAgICAgICAgfSwgJyonKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgNTApO1xuICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVtb3ZlSW5qZWN0ZWQoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZW5zdXJlSW5qZWN0ZWQodHJ1ZSk7XG4gICAgICAgICAgLy8gSWYgd2UgaGF2ZSBwcmVsb2FkZWQgYW5hbHlzaXMsIHNlbmQgaXQgdG8gdGhlIGlmcmFtZSBhZnRlciBjcmVhdGlvblxuICAgICAgICAgIGlmIChtZXNzYWdlLnByZWxvYWRlZEFuYWx5c2lzIHx8IG1lc3NhZ2UuaGFzUHJlbG9hZGVkQW5hbHlzaXMpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICBjb25zdCBpZnJhbWUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZmFrZS1uZXdzLXJlYWRlci1pbmplY3RlZC1zaWRlYmFyIGlmcmFtZScpIGFzIEhUTUxJRnJhbWVFbGVtZW50O1xuICAgICAgICAgICAgICBpZiAoaWZyYW1lPy5jb250ZW50V2luZG93KSB7XG4gICAgICAgICAgICAgICAgaWZyYW1lLmNvbnRlbnRXaW5kb3cucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ1BSRUxPQURFRF9BTkFMWVNJUycsXG4gICAgICAgICAgICAgICAgICBkYXRhOiBtZXNzYWdlLnByZWxvYWRlZEFuYWx5c2lzXG4gICAgICAgICAgICAgICAgfSwgJyonKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSWYgbm8gcHJlbG9hZGVkIGFuYWx5c2lzLCB0cmlnZ2VyIG1hbnVhbCBhbmFseXNpcyB3aGVuIG9wZW5lZCB2aWEgZXh0ZW5zaW9uIGljb25cbiAgICAgICAgICAgIC8vIFVzZSBhIGxvbmdlciBkZWxheSBhbmQgcmV0cnkgbWVjaGFuaXNtIHRvIGVuc3VyZSBSZWFjdCBhcHAgaXMgcmVhZHlcbiAgICAgICAgICAgIGNvbnN0IHNlbmRUcmlnZ2VyID0gKGF0dGVtcHQgPSAxKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IGlmcmFtZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNmYWtlLW5ld3MtcmVhZGVyLWluamVjdGVkLXNpZGViYXIgaWZyYW1lJykgYXMgSFRNTElGcmFtZUVsZW1lbnQ7XG4gICAgICAgICAgICAgIGlmIChpZnJhbWU/LmNvbnRlbnRXaW5kb3cpIHtcbiAgICAgICAgICAgICAgICBpZnJhbWUuY29udGVudFdpbmRvdy5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAnVFJJR0dFUl9ORVdfQU5BTFlTSVMnXG4gICAgICAgICAgICAgICAgfSwgJyonKTtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChhdHRlbXB0IDwgMykge1xuICAgICAgICAgICAgICAgIC8vIFJldHJ5IGlmIGlmcmFtZSBub3QgcmVhZHlcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHNlbmRUcmlnZ2VyKGF0dGVtcHQgKyAxKSwgMTAwKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIC8vIEluaXRpYWwgZGVsYXkgdG8gbGV0IGlmcmFtZSBsb2FkLCB0aGVuIHJldHJ5IGlmIG5lZWRlZFxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBzZW5kVHJpZ2dlcigxKSwgMTUwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gSGFuZGxlIGV4cGFuc2lvbiBmb3IgYW5hbHlzaXMgcmVzdWx0c1xuICAgICAgaWYgKG1lc3NhZ2U/LnR5cGUgPT09ICdFWFBBTkRfRk9SX0FOQUxZU0lTJykge1xuICAgICAgICAvLyBPbmx5IHByb2Nlc3MgZXhwYW5zaW9uIGlmIGRvY3VtZW50IGlzIHZpc2libGUgKHVzZXIgaXMgdmlld2luZyB0aGlzIHRhYilcbiAgICAgICAgaWYgKGRvY3VtZW50LmhpZGRlbikge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3Qgc2hvdWxkRXhwYW5kID0gbWVzc2FnZS5leHBhbmRlZDtcbiAgICAgICAgY3VycmVudFdpZHRoUHggPSBzaG91bGRFeHBhbmQgPyBFWFBBTkRFRF9XSURUSF9QWCA6IERFRkFVTFRfV0lEVEhfUFg7XG4gICAgICAgIFxuICAgICAgICAvLyBFbnN1cmUgc2lkZWJhciBleGlzdHMgYW5kIGFwcGx5IG5ldyBsYXlvdXRcbiAgICAgICAgaWYgKHNob3VsZEV4cGFuZCAmJiAhZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Zha2UtbmV3cy1yZWFkZXItaW5qZWN0ZWQtc2lkZWJhcicpKSB7XG4gICAgICAgICAgZW5zdXJlSW5qZWN0ZWQodHJ1ZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Zha2UtbmV3cy1yZWFkZXItaW5qZWN0ZWQtc2lkZWJhcicpKSB7XG4gICAgICAgICAgYXBwbHlMYXlvdXQoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKGlzRGV2KSB7XG4gICAgICBjb25zb2xlLmxvZygnW0ZOUl0gQ29udGVudCBzY3JpcHQgbG9hZGVkJyk7XG4gICAgfVxuXG4gICAgLy8gSGFuZGxlIHBhZ2UgY29udGVudCByZXF1ZXN0IGZyb20gYmFja2dyb3VuZFxuICAgIGNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigobWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcbiAgICAgIGlmIChtZXNzYWdlLnR5cGUgPT09ICdHRVRfUEFHRV9DT05URU5UJykge1xuICAgICAgICBjb25zdCBydW4gPSAoKSA9PiBzZXRUaW1lb3V0KCgpID0+IHByb2Nlc3NQYWdlQ29udGVudChzZW5kUmVzcG9uc2UpLCAzMDApO1xuICAgICAgICBpZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSAhPT0gJ2NvbXBsZXRlJykge1xuICAgICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgcnVuLCB7IG9uY2U6IHRydWUgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcnVuKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7IC8vIGtlZXAgdGhlIGNoYW5uZWwgb3BlbiBmb3IgYXN5bmMgc2VuZFJlc3BvbnNlXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBwcm9jZXNzUGFnZUNvbnRlbnQoc2VuZFJlc3BvbnNlOiAocmVzcG9uc2U6IGFueSkgPT4gdm9pZCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgbGV0IGNvbnRhaW5lcjogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgICAgICAgY29udGFpbmVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignYXJ0aWNsZScpO1xuICAgICAgICBpZiAoIWNvbnRhaW5lcikgY29udGFpbmVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignbWFpbiwgW3JvbGU9XCJtYWluXCIgXScpIGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcbiAgICAgICAgaWYgKCFjb250YWluZXIpIGNvbnRhaW5lciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hcnRpY2xlLCAuc3RvcnksIC5wb3N0LCAuZW50cnksIC5jb250ZW50LWJvZHknKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XG4gICAgICAgIGlmICghY29udGFpbmVyKSBjb250YWluZXIgPSBkb2N1bWVudC5ib2R5O1xuXG4gICAgICAgIGNvbnN0IGNsb25lID0gY29udGFpbmVyLmNsb25lTm9kZSh0cnVlKSBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgY2xvbmUucXVlcnlTZWxlY3RvckFsbCgnc2NyaXB0LCBzdHlsZSwgbm9zY3JpcHQsIGlmcmFtZSwgbmF2LCBoZWFkZXIsIGZvb3RlciwgYXNpZGUsIC5hZHMsIFtyb2xlPVwiY29tcGxlbWVudGFyeVwiXScpLmZvckVhY2goKG4pID0+IG4ucmVtb3ZlKCkpO1xuXG4gICAgICAgIGNvbnN0IHBhcmFncmFwaHMgPSBBcnJheS5mcm9tKGNsb25lLnF1ZXJ5U2VsZWN0b3JBbGwoJ3AnKSkubWFwKChwKSA9PiBwLnRleHRDb250ZW50Py50cmltKCkgfHwgJycpO1xuICAgICAgICBsZXQgY29udGVudCA9IHBhcmFncmFwaHMuZmlsdGVyKEJvb2xlYW4pLmpvaW4oJyAnKTtcbiAgICAgICAgaWYgKGNvbnRlbnQubGVuZ3RoIDwgMjAwKSBjb250ZW50ID0gKGNsb25lLmlubmVyVGV4dCB8fCAnJykudHJpbSgpO1xuXG4gICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoL1xccysvZywgJyAnKS50cmltKCk7XG4gICAgICAgIGNvbnN0IHdvcmRDb3VudCA9IGNvbnRlbnQuc3BsaXQoL1xccysvKS5maWx0ZXIoQm9vbGVhbikubGVuZ3RoO1xuICAgICAgICAvLyBSZW1vdmUgbWluaW11bSB3b3JkIGNvdW50IHJlcXVpcmVtZW50IC0gbGV0IEFJIGhhbmRsZSBjb250ZW50IGFuYWx5c2lzXG5cbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyB0aXRsZTogZG9jdW1lbnQudGl0bGUsIGNvbnRlbnQsIHVybDogbG9jYXRpb24uaHJlZiwgd29yZENvdW50IH0gfSk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgdHJ5IHsgc2VuZFJlc3BvbnNlKHsgZXJyb3I6ICdGYWlsZWQgdG8gZXh0cmFjdCBwYWdlIGNvbnRlbnQuJyB9KTsgfSBjYXRjaCB7fVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEluamVjdGVkIFNpZGViYXIgbG9naWMgKGZpeGVkIHdpZHRoLCBubyBwZXJzaXN0ZW5jZSlcbiAgICBsZXQgaW5qZWN0ZWRSb290OiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xuICAgIGNvbnN0IG1xbCA9IHdpbmRvdy5tYXRjaE1lZGlhKCcocHJlZmVycy1yZWR1Y2VkLW1vdGlvbjogcmVkdWNlKScpO1xuICAgIGNvbnN0IHRyYW5zaXRpb25NcyA9IG1xbC5tYXRjaGVzID8gMCA6IDE2MDtcblxuICAgIGZ1bmN0aW9uIGVuc3VyZUluamVjdGVkKGZvcmNlU2hvdzogYm9vbGVhbikge1xuICAgICAgLy8gRG9uJ3Qgc2hvdyBzaWRlYmFyIGlmIGRvY3VtZW50IGlzIGhpZGRlbiAodXNlciBzd2l0Y2hlZCB0byBhbm90aGVyIHRhYilcbiAgICAgIGlmIChkb2N1bWVudC5oaWRkZW4gJiYgIWluamVjdGVkUm9vdCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBcbiAgICAgIGlmICghaW5qZWN0ZWRSb290KSB7XG4gICAgICAgIGNyZWF0ZUluamVjdGVkKCk7XG4gICAgICB9XG4gICAgICBpZiAoZm9yY2VTaG93KSB7XG4gICAgICAgIGluamVjdGVkUm9vdCEuc3R5bGUub3BhY2l0eSA9ICcxJztcbiAgICAgIH1cbiAgICAgIGFwcGx5TGF5b3V0KCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlSW5qZWN0ZWQoKSB7XG4gICAgICBpZiAoaW5qZWN0ZWRSb290IHx8IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmYWtlLW5ld3MtcmVhZGVyLWluamVjdGVkLXNpZGViYXInKSkgcmV0dXJuO1xuICAgICAgaW5qZWN0ZWRSb290ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICBpbmplY3RlZFJvb3QuaWQgPSAnZmFrZS1uZXdzLXJlYWRlci1pbmplY3RlZC1zaWRlYmFyJztcbiAgICAgIGluamVjdGVkUm9vdC5zZXRBdHRyaWJ1dGUoJ2FyaWEtbGFiZWwnLCAnRmFrZSBOZXdzIFJlYWRlciBTaWRlYmFyJyk7XG4gICAgICBpbmplY3RlZFJvb3Quc3R5bGUucG9zaXRpb24gPSAnZml4ZWQnO1xuICAgICAgaW5qZWN0ZWRSb290LnN0eWxlLnRvcCA9ICcwJztcbiAgICAgIGluamVjdGVkUm9vdC5zdHlsZS5yaWdodCA9ICcwJztcbiAgICAgIGluamVjdGVkUm9vdC5zdHlsZS5oZWlnaHQgPSAnMTAwdmgnO1xuICAgICAgaW5qZWN0ZWRSb290LnN0eWxlLnpJbmRleCA9ICcyMTQ3NDgzNjQ3JztcbiAgICAgIGluamVjdGVkUm9vdC5zdHlsZS5iYWNrZ3JvdW5kID0gJyNmZmYnO1xuICAgICAgaW5qZWN0ZWRSb290LnN0eWxlLmJvcmRlckxlZnQgPSAnMXB4IHNvbGlkIHJnYmEoMCwwLDAsMC4xMiknO1xuICAgICAgaW5qZWN0ZWRSb290LnN0eWxlLmJveFNoYWRvdyA9ICcwIDAgMCAxcHggcmdiYSgwLDAsMCwwLjA2KSwgLTJweCAwIDhweCByZ2JhKDAsMCwwLDAuMDYpJztcbiAgICAgIGluamVjdGVkUm9vdC5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nO1xuICAgICAgaW5qZWN0ZWRSb290LnN0eWxlLnRyYW5zaXRpb24gPSBgd2lkdGggJHt0cmFuc2l0aW9uTXN9bXMgZWFzZSwgb3BhY2l0eSAke3RyYW5zaXRpb25Nc31tcyBlYXNlYDtcbiAgICAgIGluamVjdGVkUm9vdC5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcblxuICAgICAgY29uc3QgaW5uZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIGlubmVyLnN0eWxlLmhlaWdodCA9ICcxMDAlJztcbiAgICAgIGlubmVyLnN0eWxlLmRpc3BsYXkgPSAnZmxleCc7XG4gICAgICBpbm5lci5zdHlsZS5mbGV4RGlyZWN0aW9uID0gJ2NvbHVtbic7XG5cbiAgICAgIGNvbnN0IGhlYWRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgaGVhZGVyLnN0eWxlLmNzc1RleHQgPSBbXG4gICAgICAgICdhbGw6IGluaXRpYWwnLFxuICAgICAgICAnZGlzcGxheTogZmxleCcsXG4gICAgICAgICdhbGlnbi1pdGVtczogY2VudGVyJyxcbiAgICAgICAgJ2p1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbicsXG4gICAgICAgICdwYWRkaW5nOiAxMnB4IDE2cHgnLFxuICAgICAgICAnYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkIHJnYmEoMCwwLDAsMC4xMiknLFxuICAgICAgICAnYm94LXNpemluZzogYm9yZGVyLWJveCcsXG4gICAgICAgICd3aWR0aDogMTAwJScsXG4gICAgICAgICdiYWNrZ3JvdW5kOiAjZmZmZmZmJyxcbiAgICAgICAgJ2JveC1zaGFkb3c6IDAgMXB4IDNweCByZ2JhKDAsIDAsIDAsIDAuMDgpJ1xuICAgICAgXS5qb2luKCc7Jyk7XG5cbiAgICAgIC8vIENyZWF0ZSBsb2dvIGNvbnRhaW5lclxuICAgICAgY29uc3QgbG9nb0NvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgbG9nb0NvbnRhaW5lci5zdHlsZS5jc3NUZXh0ID0gW1xuICAgICAgICAnYWxsOiBpbml0aWFsJyxcbiAgICAgICAgJ2Rpc3BsYXk6IGZsZXgnLFxuICAgICAgICAnYWxpZ24taXRlbXM6IGNlbnRlcicsXG4gICAgICAgICdnYXA6IDhweCdcbiAgICAgIF0uam9pbignOycpO1xuXG4gICAgICAvLyBDcmVhdGUgbG9nbyBlbGVtZW50XG4gICAgICBjb25zdCBsb2dvID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG4gICAgICBjb25zdCBsb2dvVXJsID0gY2hyb21lLnJ1bnRpbWUuZ2V0VVJMKCdsb2dvLnBuZycpO1xuICAgICAgbG9nby5zcmMgPSBsb2dvVXJsO1xuICAgICAgbG9nby5hbHQgPSAnTmV3c1NjYW4gTG9nbyc7XG4gICAgICBsb2dvLnN0eWxlLmNzc1RleHQgPSBbXG4gICAgICAgICdhbGw6IGluaXRpYWwnLFxuICAgICAgICAnd2lkdGg6IDM1cHgnLFxuICAgICAgICAnaGVpZ2h0OiAzNXB4JyxcbiAgICAgICAgJ29iamVjdC1maXQ6IGNvbnRhaW4nXG4gICAgICBdLmpvaW4oJzsnKTtcbiAgICAgIFxuICAgICAgLy8gSGFuZGxlIGxvZ28gbG9hZCBlcnJvciAtIGhpZGUgbG9nbyBpZiBpdCBmYWlscyB0byBsb2FkXG4gICAgICBsb2dvLm9uZXJyb3IgPSAoZXJyb3IpID0+IHtcbiAgICAgICAgaWYgKGlzRGV2KSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcignTmV3c1NjYW46IExvZ28gZmFpbGVkIHRvIGxvYWQ6JywgZXJyb3IpO1xuICAgICAgICB9XG4gICAgICAgIGxvZ28uc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgIH07XG5cbiAgICAgIC8vIENyZWF0ZSB0aXRsZSBlbGVtZW50XG4gICAgICBjb25zdCB0aXRsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgIHRpdGxlLnRleHRDb250ZW50ID0gJ05ld3NTY2FuJztcbiAgICAgIHRpdGxlLnN0eWxlLmNzc1RleHQgPSBbXG4gICAgICAgICdhbGw6IGluaXRpYWwnLFxuICAgICAgICAnZm9udDogNjAwIDE1cHggc3lzdGVtLXVpLCAtYXBwbGUtc3lzdGVtLCBTZWdvZSBVSSwgUm9ib3RvJyxcbiAgICAgICAgJ2NvbG9yOiAjMjAyMTI0JyxcbiAgICAgICAgJ2xldHRlci1zcGFjaW5nOiAtMC4wMWVtJ1xuICAgICAgXS5qb2luKCc7Jyk7XG5cbiAgICAgIC8vIEFkZCBsb2dvIGFuZCB0aXRsZSB0byBjb250YWluZXJcbiAgICAgIGxvZ29Db250YWluZXIuYXBwZW5kQ2hpbGQobG9nbyk7XG4gICAgICBsb2dvQ29udGFpbmVyLmFwcGVuZENoaWxkKHRpdGxlKTtcblxuICAgICAgY29uc3QgY2xvc2VCdG4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcbiAgICAgIGNsb3NlQnRuLnNldEF0dHJpYnV0ZSgnYXJpYS1sYWJlbCcsICdDbG9zZScpO1xuICAgICAgY2xvc2VCdG4udGV4dENvbnRlbnQgPSAnw5cnO1xuICAgICAgY2xvc2VCdG4uc3R5bGUuY3NzVGV4dCA9IFtcbiAgICAgICAgJ2FsbDogaW5pdGlhbCcsXG4gICAgICAgICdkaXNwbGF5OmlubGluZS1mbGV4JyxcbiAgICAgICAgJ2FsaWduLWl0ZW1zOmNlbnRlcicsXG4gICAgICAgICdqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyJyxcbiAgICAgICAgJ3dpZHRoOjI4cHgnLFxuICAgICAgICAnaGVpZ2h0OjI4cHgnLFxuICAgICAgICAnY3Vyc29yOnBvaW50ZXInLFxuICAgICAgICAnZm9udDogNjAwIDE2cHgvMSBzeXN0ZW0tdWksIC1hcHBsZS1zeXN0ZW0sIFNlZ29lIFVJLCBSb2JvdG8nLFxuICAgICAgICAnY29sb3I6IzZiNzI4MCcsXG4gICAgICAgICdiYWNrZ3JvdW5kOnRyYW5zcGFyZW50JyxcbiAgICAgICAgJ2JvcmRlci1yYWRpdXM6IDRweCdcbiAgICAgIF0uam9pbignOycpO1xuICAgICAgLy8gVGhlIGNsb3NlIGJ1dHRvbiBzaG91bGQgbmF2aWdhdGUgdGhlIGFwcCBiYWNrIHRvIGl0cyBob21lIHNjcmVlblxuICAgICAgLy8gcmF0aGVyIHRoYW4gY2xvc2luZyB0aGUgc2lkZWJhciBlbnRpcmVseS5cblxuICAgICAgaGVhZGVyLmFwcGVuZENoaWxkKGxvZ29Db250YWluZXIpO1xuICAgICAgaGVhZGVyLmFwcGVuZENoaWxkKGNsb3NlQnRuKTtcblxuICAgICAgY29uc3QgYm9keSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgYm9keS5zdHlsZS5mbGV4ID0gJzEnO1xuICAgICAgYm9keS5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nO1xuXG4gICAgICBjb25zdCBpZnJhbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpZnJhbWUnKTtcbiAgICAgIGlmcmFtZS50aXRsZSA9ICdOZXdzU2Nhbic7XG4gICAgICBpZnJhbWUuc3R5bGUuYm9yZGVyID0gJzAnO1xuICAgICAgaWZyYW1lLnN0eWxlLndpZHRoID0gJzEwMCUnO1xuICAgICAgaWZyYW1lLnN0eWxlLmhlaWdodCA9ICcxMDAlJztcbiAgICAgIGlmcmFtZS5zcmMgPSBjaHJvbWUucnVudGltZS5nZXRVUkwoJ3NpZGViYXIuaHRtbCcpO1xuICAgICAgYm9keS5hcHBlbmRDaGlsZChpZnJhbWUpO1xuXG4gICAgICAvLyBXaXJlIGNsb3NlIGFjdGlvbiB0byBjbG9zZSBzaWRlYmFyXG4gICAgICBjbG9zZUJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAvLyBSZXNldCBzdGF0ZSBmaXJzdCwgdGhlbiBjbG9zZSBhZnRlciBhIGJyaWVmIG1vbWVudFxuICAgICAgICB0cnkge1xuICAgICAgICAgIGlmcmFtZS5jb250ZW50V2luZG93Py5wb3N0TWVzc2FnZSh7IHR5cGU6ICdUUklHR0VSX1JFU0VUJyB9LCAnKicpO1xuICAgICAgICB9IGNhdGNoIHt9XG4gICAgICAgIC8vIENsb3NlIHNpZGViYXIgYWZ0ZXIgcmVzZXQgaGFzIHRpbWUgdG8gcHJvY2Vzc1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICByZW1vdmVJbmplY3RlZCgpO1xuICAgICAgICB9LCA1MCk7XG4gICAgICB9O1xuXG4gICAgICBpbm5lci5hcHBlbmRDaGlsZChoZWFkZXIpO1xuICAgICAgaW5uZXIuYXBwZW5kQ2hpbGQoYm9keSk7XG4gICAgICBpbmplY3RlZFJvb3QuYXBwZW5kQ2hpbGQoaW5uZXIpO1xuICAgICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmFwcGVuZENoaWxkKGluamVjdGVkUm9vdCk7XG4gICAgICBhcHBseUxheW91dCgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlbW92ZUluamVjdGVkKCkge1xuICAgICAgaWYgKCFpbmplY3RlZFJvb3QpIHJldHVybjtcbiAgICAgIGluamVjdGVkUm9vdC5yZW1vdmUoKTtcbiAgICAgIGluamVjdGVkUm9vdCA9IG51bGw7XG4gICAgICByZXNldEJvZHlQYWRkaW5nKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYXBwbHlCb2R5UGFkZGluZygpIHtcbiAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZS5zY3JvbGxCZWhhdmlvciA9ICdhdXRvJztcbiAgICAgIGRvY3VtZW50LmJvZHkuc3R5bGUudHJhbnNpdGlvbiA9IG1xbC5tYXRjaGVzID8gJycgOiBgbWFyZ2luLXJpZ2h0ICR7dHJhbnNpdGlvbk1zfW1zIGVhc2VgO1xuICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS5tYXJnaW5SaWdodCA9IGAke2N1cnJlbnRXaWR0aFB4fXB4YDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXNldEJvZHlQYWRkaW5nKCkge1xuICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS5tYXJnaW5SaWdodCA9ICcnO1xuICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS50cmFuc2l0aW9uID0gJyc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYXBwbHlMYXlvdXQoKSB7XG4gICAgICBpZiAoIWluamVjdGVkUm9vdCkgcmV0dXJuO1xuICAgICAgaW5qZWN0ZWRSb290LnN0eWxlLndpZHRoID0gYCR7Y3VycmVudFdpZHRoUHh9cHhgO1xuICAgICAgaW5qZWN0ZWRSb290LnN0eWxlLm9wYWNpdHkgPSAnMSc7XG4gICAgICBhcHBseUJvZHlQYWRkaW5nKCk7XG4gICAgfVxuICAgIFxuICAgIC8vIEhhbmRsZSB2aXNpYmlsaXR5IGNoYW5nZXMgLSBoaWRlIHNpZGViYXIgd2hlbiB0YWIgYmVjb21lcyBoaWRkZW5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCd2aXNpYmlsaXR5Y2hhbmdlJywgKCkgPT4ge1xuICAgICAgaWYgKGRvY3VtZW50LmhpZGRlbiAmJiBpbmplY3RlZFJvb3QpIHtcbiAgICAgICAgLy8gRG9uJ3QgcmVtb3ZlIHNpZGViYXIsIGp1c3QgaGlkZSBpdCB2aXN1YWxseSB0byBwcmV2ZW50IGxheW91dCBpc3N1ZXNcbiAgICAgICAgLy8gVGhlIHNpZGViYXIgd2lsbCBiZSBwcm9wZXJseSBoYW5kbGVkIHdoZW4gdGFiIGJlY29tZXMgdmlzaWJsZSBhZ2FpblxuICAgICAgICBpbmplY3RlZFJvb3Quc3R5bGUub3BhY2l0eSA9ICcwJztcbiAgICAgICAgcmVzZXRCb2R5UGFkZGluZygpO1xuICAgICAgfSBlbHNlIGlmICghZG9jdW1lbnQuaGlkZGVuICYmIGluamVjdGVkUm9vdCkge1xuICAgICAgICAvLyBSZXN0b3JlIHNpZGViYXIgdmlzaWJpbGl0eSB3aGVuIHRhYiBiZWNvbWVzIHZpc2libGVcbiAgICAgICAgaW5qZWN0ZWRSb290LnN0eWxlLm9wYWNpdHkgPSAnMSc7XG4gICAgICAgIGFwcGx5TGF5b3V0KCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG59KTsiLCIvLyAjcmVnaW9uIHNuaXBwZXRcbmV4cG9ydCBjb25zdCBicm93c2VyID0gZ2xvYmFsVGhpcy5icm93c2VyPy5ydW50aW1lPy5pZFxuICA/IGdsb2JhbFRoaXMuYnJvd3NlclxuICA6IGdsb2JhbFRoaXMuY2hyb21lO1xuLy8gI2VuZHJlZ2lvbiBzbmlwcGV0XG4iLCJpbXBvcnQgeyBicm93c2VyIGFzIF9icm93c2VyIH0gZnJvbSBcIkB3eHQtZGV2L2Jyb3dzZXJcIjtcbmV4cG9ydCBjb25zdCBicm93c2VyID0gX2Jyb3dzZXI7XG5leHBvcnQge307XG4iLCJmdW5jdGlvbiBwcmludChtZXRob2QsIC4uLmFyZ3MpIHtcbiAgaWYgKGltcG9ydC5tZXRhLmVudi5NT0RFID09PSBcInByb2R1Y3Rpb25cIikgcmV0dXJuO1xuICBpZiAodHlwZW9mIGFyZ3NbMF0gPT09IFwic3RyaW5nXCIpIHtcbiAgICBjb25zdCBtZXNzYWdlID0gYXJncy5zaGlmdCgpO1xuICAgIG1ldGhvZChgW3d4dF0gJHttZXNzYWdlfWAsIC4uLmFyZ3MpO1xuICB9IGVsc2Uge1xuICAgIG1ldGhvZChcIlt3eHRdXCIsIC4uLmFyZ3MpO1xuICB9XG59XG5leHBvcnQgY29uc3QgbG9nZ2VyID0ge1xuICBkZWJ1ZzogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUuZGVidWcsIC4uLmFyZ3MpLFxuICBsb2c6ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLmxvZywgLi4uYXJncyksXG4gIHdhcm46ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLndhcm4sIC4uLmFyZ3MpLFxuICBlcnJvcjogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUuZXJyb3IsIC4uLmFyZ3MpXG59O1xuIiwiaW1wb3J0IHsgYnJvd3NlciB9IGZyb20gXCJ3eHQvYnJvd3NlclwiO1xuZXhwb3J0IGNsYXNzIFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQgZXh0ZW5kcyBFdmVudCB7XG4gIGNvbnN0cnVjdG9yKG5ld1VybCwgb2xkVXJsKSB7XG4gICAgc3VwZXIoV3h0TG9jYXRpb25DaGFuZ2VFdmVudC5FVkVOVF9OQU1FLCB7fSk7XG4gICAgdGhpcy5uZXdVcmwgPSBuZXdVcmw7XG4gICAgdGhpcy5vbGRVcmwgPSBvbGRVcmw7XG4gIH1cbiAgc3RhdGljIEVWRU5UX05BTUUgPSBnZXRVbmlxdWVFdmVudE5hbWUoXCJ3eHQ6bG9jYXRpb25jaGFuZ2VcIik7XG59XG5leHBvcnQgZnVuY3Rpb24gZ2V0VW5pcXVlRXZlbnROYW1lKGV2ZW50TmFtZSkge1xuICByZXR1cm4gYCR7YnJvd3Nlcj8ucnVudGltZT8uaWR9OiR7aW1wb3J0Lm1ldGEuZW52LkVOVFJZUE9JTlR9OiR7ZXZlbnROYW1lfWA7XG59XG4iLCJpbXBvcnQgeyBXeHRMb2NhdGlvbkNoYW5nZUV2ZW50IH0gZnJvbSBcIi4vY3VzdG9tLWV2ZW50cy5tanNcIjtcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVMb2NhdGlvbldhdGNoZXIoY3R4KSB7XG4gIGxldCBpbnRlcnZhbDtcbiAgbGV0IG9sZFVybDtcbiAgcmV0dXJuIHtcbiAgICAvKipcbiAgICAgKiBFbnN1cmUgdGhlIGxvY2F0aW9uIHdhdGNoZXIgaXMgYWN0aXZlbHkgbG9va2luZyBmb3IgVVJMIGNoYW5nZXMuIElmIGl0J3MgYWxyZWFkeSB3YXRjaGluZyxcbiAgICAgKiB0aGlzIGlzIGEgbm9vcC5cbiAgICAgKi9cbiAgICBydW4oKSB7XG4gICAgICBpZiAoaW50ZXJ2YWwgIT0gbnVsbCkgcmV0dXJuO1xuICAgICAgb2xkVXJsID0gbmV3IFVSTChsb2NhdGlvbi5ocmVmKTtcbiAgICAgIGludGVydmFsID0gY3R4LnNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgbGV0IG5ld1VybCA9IG5ldyBVUkwobG9jYXRpb24uaHJlZik7XG4gICAgICAgIGlmIChuZXdVcmwuaHJlZiAhPT0gb2xkVXJsLmhyZWYpIHtcbiAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgV3h0TG9jYXRpb25DaGFuZ2VFdmVudChuZXdVcmwsIG9sZFVybCkpO1xuICAgICAgICAgIG9sZFVybCA9IG5ld1VybDtcbiAgICAgICAgfVxuICAgICAgfSwgMWUzKTtcbiAgICB9XG4gIH07XG59XG4iLCJpbXBvcnQgeyBicm93c2VyIH0gZnJvbSBcInd4dC9icm93c2VyXCI7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tIFwiLi4vdXRpbHMvaW50ZXJuYWwvbG9nZ2VyLm1qc1wiO1xuaW1wb3J0IHtcbiAgZ2V0VW5pcXVlRXZlbnROYW1lXG59IGZyb20gXCIuL2ludGVybmFsL2N1c3RvbS1ldmVudHMubWpzXCI7XG5pbXBvcnQgeyBjcmVhdGVMb2NhdGlvbldhdGNoZXIgfSBmcm9tIFwiLi9pbnRlcm5hbC9sb2NhdGlvbi13YXRjaGVyLm1qc1wiO1xuZXhwb3J0IGNsYXNzIENvbnRlbnRTY3JpcHRDb250ZXh0IHtcbiAgY29uc3RydWN0b3IoY29udGVudFNjcmlwdE5hbWUsIG9wdGlvbnMpIHtcbiAgICB0aGlzLmNvbnRlbnRTY3JpcHROYW1lID0gY29udGVudFNjcmlwdE5hbWU7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLmFib3J0Q29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcbiAgICBpZiAodGhpcy5pc1RvcEZyYW1lKSB7XG4gICAgICB0aGlzLmxpc3RlbkZvck5ld2VyU2NyaXB0cyh7IGlnbm9yZUZpcnN0RXZlbnQ6IHRydWUgfSk7XG4gICAgICB0aGlzLnN0b3BPbGRTY3JpcHRzKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubGlzdGVuRm9yTmV3ZXJTY3JpcHRzKCk7XG4gICAgfVxuICB9XG4gIHN0YXRpYyBTQ1JJUFRfU1RBUlRFRF9NRVNTQUdFX1RZUEUgPSBnZXRVbmlxdWVFdmVudE5hbWUoXG4gICAgXCJ3eHQ6Y29udGVudC1zY3JpcHQtc3RhcnRlZFwiXG4gICk7XG4gIGlzVG9wRnJhbWUgPSB3aW5kb3cuc2VsZiA9PT0gd2luZG93LnRvcDtcbiAgYWJvcnRDb250cm9sbGVyO1xuICBsb2NhdGlvbldhdGNoZXIgPSBjcmVhdGVMb2NhdGlvbldhdGNoZXIodGhpcyk7XG4gIHJlY2VpdmVkTWVzc2FnZUlkcyA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgU2V0KCk7XG4gIGdldCBzaWduYWwoKSB7XG4gICAgcmV0dXJuIHRoaXMuYWJvcnRDb250cm9sbGVyLnNpZ25hbDtcbiAgfVxuICBhYm9ydChyZWFzb24pIHtcbiAgICByZXR1cm4gdGhpcy5hYm9ydENvbnRyb2xsZXIuYWJvcnQocmVhc29uKTtcbiAgfVxuICBnZXQgaXNJbnZhbGlkKCkge1xuICAgIGlmIChicm93c2VyLnJ1bnRpbWUuaWQgPT0gbnVsbCkge1xuICAgICAgdGhpcy5ub3RpZnlJbnZhbGlkYXRlZCgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5zaWduYWwuYWJvcnRlZDtcbiAgfVxuICBnZXQgaXNWYWxpZCgpIHtcbiAgICByZXR1cm4gIXRoaXMuaXNJbnZhbGlkO1xuICB9XG4gIC8qKlxuICAgKiBBZGQgYSBsaXN0ZW5lciB0aGF0IGlzIGNhbGxlZCB3aGVuIHRoZSBjb250ZW50IHNjcmlwdCdzIGNvbnRleHQgaXMgaW52YWxpZGF0ZWQuXG4gICAqXG4gICAqIEByZXR1cm5zIEEgZnVuY3Rpb24gdG8gcmVtb3ZlIHRoZSBsaXN0ZW5lci5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogYnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcihjYik7XG4gICAqIGNvbnN0IHJlbW92ZUludmFsaWRhdGVkTGlzdGVuZXIgPSBjdHgub25JbnZhbGlkYXRlZCgoKSA9PiB7XG4gICAqICAgYnJvd3Nlci5ydW50aW1lLm9uTWVzc2FnZS5yZW1vdmVMaXN0ZW5lcihjYik7XG4gICAqIH0pXG4gICAqIC8vIC4uLlxuICAgKiByZW1vdmVJbnZhbGlkYXRlZExpc3RlbmVyKCk7XG4gICAqL1xuICBvbkludmFsaWRhdGVkKGNiKSB7XG4gICAgdGhpcy5zaWduYWwuYWRkRXZlbnRMaXN0ZW5lcihcImFib3J0XCIsIGNiKTtcbiAgICByZXR1cm4gKCkgPT4gdGhpcy5zaWduYWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImFib3J0XCIsIGNiKTtcbiAgfVxuICAvKipcbiAgICogUmV0dXJuIGEgcHJvbWlzZSB0aGF0IG5ldmVyIHJlc29sdmVzLiBVc2VmdWwgaWYgeW91IGhhdmUgYW4gYXN5bmMgZnVuY3Rpb24gdGhhdCBzaG91bGRuJ3QgcnVuXG4gICAqIGFmdGVyIHRoZSBjb250ZXh0IGlzIGV4cGlyZWQuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIGNvbnN0IGdldFZhbHVlRnJvbVN0b3JhZ2UgPSBhc3luYyAoKSA9PiB7XG4gICAqICAgaWYgKGN0eC5pc0ludmFsaWQpIHJldHVybiBjdHguYmxvY2soKTtcbiAgICpcbiAgICogICAvLyAuLi5cbiAgICogfVxuICAgKi9cbiAgYmxvY2soKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKCgpID0+IHtcbiAgICB9KTtcbiAgfVxuICAvKipcbiAgICogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5zZXRJbnRlcnZhbGAgdGhhdCBhdXRvbWF0aWNhbGx5IGNsZWFycyB0aGUgaW50ZXJ2YWwgd2hlbiBpbnZhbGlkYXRlZC5cbiAgICovXG4gIHNldEludGVydmFsKGhhbmRsZXIsIHRpbWVvdXQpIHtcbiAgICBjb25zdCBpZCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWQpIGhhbmRsZXIoKTtcbiAgICB9LCB0aW1lb3V0KTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2xlYXJJbnRlcnZhbChpZCkpO1xuICAgIHJldHVybiBpZDtcbiAgfVxuICAvKipcbiAgICogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5zZXRUaW1lb3V0YCB0aGF0IGF1dG9tYXRpY2FsbHkgY2xlYXJzIHRoZSBpbnRlcnZhbCB3aGVuIGludmFsaWRhdGVkLlxuICAgKi9cbiAgc2V0VGltZW91dChoYW5kbGVyLCB0aW1lb3V0KSB7XG4gICAgY29uc3QgaWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWQpIGhhbmRsZXIoKTtcbiAgICB9LCB0aW1lb3V0KTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2xlYXJUaW1lb3V0KGlkKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIC8qKlxuICAgKiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZWAgdGhhdCBhdXRvbWF0aWNhbGx5IGNhbmNlbHMgdGhlIHJlcXVlc3Qgd2hlblxuICAgKiBpbnZhbGlkYXRlZC5cbiAgICovXG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZShjYWxsYmFjaykge1xuICAgIGNvbnN0IGlkID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCguLi5hcmdzKSA9PiB7XG4gICAgICBpZiAodGhpcy5pc1ZhbGlkKSBjYWxsYmFjayguLi5hcmdzKTtcbiAgICB9KTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gY2FuY2VsQW5pbWF0aW9uRnJhbWUoaWQpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgLyoqXG4gICAqIFdyYXBwZXIgYXJvdW5kIGB3aW5kb3cucmVxdWVzdElkbGVDYWxsYmFja2AgdGhhdCBhdXRvbWF0aWNhbGx5IGNhbmNlbHMgdGhlIHJlcXVlc3Qgd2hlblxuICAgKiBpbnZhbGlkYXRlZC5cbiAgICovXG4gIHJlcXVlc3RJZGxlQ2FsbGJhY2soY2FsbGJhY2ssIG9wdGlvbnMpIHtcbiAgICBjb25zdCBpZCA9IHJlcXVlc3RJZGxlQ2FsbGJhY2soKC4uLmFyZ3MpID0+IHtcbiAgICAgIGlmICghdGhpcy5zaWduYWwuYWJvcnRlZCkgY2FsbGJhY2soLi4uYXJncyk7XG4gICAgfSwgb3B0aW9ucyk7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNhbmNlbElkbGVDYWxsYmFjayhpZCkpO1xuICAgIHJldHVybiBpZDtcbiAgfVxuICBhZGRFdmVudExpc3RlbmVyKHRhcmdldCwgdHlwZSwgaGFuZGxlciwgb3B0aW9ucykge1xuICAgIGlmICh0eXBlID09PSBcInd4dDpsb2NhdGlvbmNoYW5nZVwiKSB7XG4gICAgICBpZiAodGhpcy5pc1ZhbGlkKSB0aGlzLmxvY2F0aW9uV2F0Y2hlci5ydW4oKTtcbiAgICB9XG4gICAgdGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXI/LihcbiAgICAgIHR5cGUuc3RhcnRzV2l0aChcInd4dDpcIikgPyBnZXRVbmlxdWVFdmVudE5hbWUodHlwZSkgOiB0eXBlLFxuICAgICAgaGFuZGxlcixcbiAgICAgIHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgc2lnbmFsOiB0aGlzLnNpZ25hbFxuICAgICAgfVxuICAgICk7XG4gIH1cbiAgLyoqXG4gICAqIEBpbnRlcm5hbFxuICAgKiBBYm9ydCB0aGUgYWJvcnQgY29udHJvbGxlciBhbmQgZXhlY3V0ZSBhbGwgYG9uSW52YWxpZGF0ZWRgIGxpc3RlbmVycy5cbiAgICovXG4gIG5vdGlmeUludmFsaWRhdGVkKCkge1xuICAgIHRoaXMuYWJvcnQoXCJDb250ZW50IHNjcmlwdCBjb250ZXh0IGludmFsaWRhdGVkXCIpO1xuICAgIGxvZ2dlci5kZWJ1ZyhcbiAgICAgIGBDb250ZW50IHNjcmlwdCBcIiR7dGhpcy5jb250ZW50U2NyaXB0TmFtZX1cIiBjb250ZXh0IGludmFsaWRhdGVkYFxuICAgICk7XG4gIH1cbiAgc3RvcE9sZFNjcmlwdHMoKSB7XG4gICAgd2luZG93LnBvc3RNZXNzYWdlKFxuICAgICAge1xuICAgICAgICB0eXBlOiBDb250ZW50U2NyaXB0Q29udGV4dC5TQ1JJUFRfU1RBUlRFRF9NRVNTQUdFX1RZUEUsXG4gICAgICAgIGNvbnRlbnRTY3JpcHROYW1lOiB0aGlzLmNvbnRlbnRTY3JpcHROYW1lLFxuICAgICAgICBtZXNzYWdlSWQ6IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnNsaWNlKDIpXG4gICAgICB9LFxuICAgICAgXCIqXCJcbiAgICApO1xuICB9XG4gIHZlcmlmeVNjcmlwdFN0YXJ0ZWRFdmVudChldmVudCkge1xuICAgIGNvbnN0IGlzU2NyaXB0U3RhcnRlZEV2ZW50ID0gZXZlbnQuZGF0YT8udHlwZSA9PT0gQ29udGVudFNjcmlwdENvbnRleHQuU0NSSVBUX1NUQVJURURfTUVTU0FHRV9UWVBFO1xuICAgIGNvbnN0IGlzU2FtZUNvbnRlbnRTY3JpcHQgPSBldmVudC5kYXRhPy5jb250ZW50U2NyaXB0TmFtZSA9PT0gdGhpcy5jb250ZW50U2NyaXB0TmFtZTtcbiAgICBjb25zdCBpc05vdER1cGxpY2F0ZSA9ICF0aGlzLnJlY2VpdmVkTWVzc2FnZUlkcy5oYXMoZXZlbnQuZGF0YT8ubWVzc2FnZUlkKTtcbiAgICByZXR1cm4gaXNTY3JpcHRTdGFydGVkRXZlbnQgJiYgaXNTYW1lQ29udGVudFNjcmlwdCAmJiBpc05vdER1cGxpY2F0ZTtcbiAgfVxuICBsaXN0ZW5Gb3JOZXdlclNjcmlwdHMob3B0aW9ucykge1xuICAgIGxldCBpc0ZpcnN0ID0gdHJ1ZTtcbiAgICBjb25zdCBjYiA9IChldmVudCkgPT4ge1xuICAgICAgaWYgKHRoaXMudmVyaWZ5U2NyaXB0U3RhcnRlZEV2ZW50KGV2ZW50KSkge1xuICAgICAgICB0aGlzLnJlY2VpdmVkTWVzc2FnZUlkcy5hZGQoZXZlbnQuZGF0YS5tZXNzYWdlSWQpO1xuICAgICAgICBjb25zdCB3YXNGaXJzdCA9IGlzRmlyc3Q7XG4gICAgICAgIGlzRmlyc3QgPSBmYWxzZTtcbiAgICAgICAgaWYgKHdhc0ZpcnN0ICYmIG9wdGlvbnM/Lmlnbm9yZUZpcnN0RXZlbnQpIHJldHVybjtcbiAgICAgICAgdGhpcy5ub3RpZnlJbnZhbGlkYXRlZCgpO1xuICAgICAgfVxuICAgIH07XG4gICAgYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgY2IpO1xuICAgIHRoaXMub25JbnZhbGlkYXRlZCgoKSA9PiByZW1vdmVFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBjYikpO1xuICB9XG59XG4iXSwibmFtZXMiOlsiZGVmaW5pdGlvbiIsIl9hIiwiYnJvd3NlciIsIl9icm93c2VyIiwicHJpbnQiLCJsb2dnZXIiLCJfYiJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQU8sV0FBUyxvQkFBb0JBLGFBQVk7QUFDOUMsV0FBT0E7QUFBQSxFQUNUO0FDQUEsUUFBQSxhQUFBLG9CQUFBO0FBQUEsSUFBbUMsU0FBQSxDQUFBLFlBQUE7QUFBQSxJQUNYLGlCQUFBO0FBQUEsTUFDTDtBQUFBLE1BQ2Y7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNBO0FBQUEsSUFDRixPQUFBO0FBS0U7QUFDVSxnQkFBQSxJQUFBLG9DQUFBLFNBQUEsSUFBQTtBQUFBLE1BQXFEO0FBRy9ELFlBQUEsbUJBQUE7QUFDQSxZQUFBLG9CQUFBO0FBQ0EsVUFBQSxpQkFBQTtBQUdBO0FBQ0csZUFBQSxpQkFBQSxNQUFBLGVBQUE7QUFDQSxlQUFBLFdBQUEsTUFBQTs7QUFDTyxnQkFBQSxLQUFBLFNBQUEsZUFBQSxtQ0FBQTtBQUNOLGtCQUFBLElBQUEsZUFBQTtBQUFBLFlBQTJCLFFBQUEsQ0FBQSxDQUFBO0FBQUEsWUFDZixZQUFBLHlCQUFBLE1BQUE7QUFBQSxZQUNZLFNBQUEseUJBQUEsTUFBQTtBQUFBLFlBQ0gsT0FBQUMsTUFBQSx5QkFBQSwwQkFBQSxnQkFBQUEsSUFBQTtBQUFBLFlBQ2UsaUJBQUEsaUJBQUEsU0FBQSxJQUFBLEVBQUE7QUFBQSxVQUNlLENBQUE7QUFBQSxRQUNsRDtBQUFBLE1BQ0g7QUFJRixhQUFBLFFBQUEsVUFBQSxZQUFBLENBQUEsU0FBQSxRQUFBLGlCQUFBO0FBQ00sYUFBQSxtQ0FBQSxVQUFBLFlBQUE7QUFDVyx1QkFBQSxFQUFBLElBQUEsTUFBQTtBQUNOLGlCQUFBO0FBQUEsUUFBQTtBQUFBLE1BQ1QsQ0FBQTtBQUlGLGFBQUEsUUFBQSxVQUFBLFlBQUEsQ0FBQSxZQUFBO0FBQ00sYUFBQSxtQ0FBQSxVQUFBLDJCQUFBO0FBQ0Y7QUFDVSxvQkFBQSxJQUFBLGtDQUFBLE9BQUE7QUFBQSxVQUE2QztBQUt2RCxnQkFBQSxTQUFBLENBQUEsQ0FBQSxTQUFBLGVBQUEsbUNBQUE7QUFDSSxjQUFBLFNBQUEsVUFBQSxDQUFBLFFBQUE7QUFDRjtBQUFBLFVBQUE7QUFHRixjQUFBLFFBQUE7QUFHRSxnQkFBQSxRQUFBLFVBQUE7QUFDRSw2QkFBQTtBQUVFLGtCQUFBLFFBQUEscUJBQUEsUUFBQSxzQkFBQTtBQUNGLDJCQUFBLE1BQUE7QUFDUSx3QkFBQSxTQUFBLFNBQUEsY0FBQSwyQ0FBQTtBQUNOLHNCQUFBLGlDQUFBLGVBQUE7QUFDRSwyQkFBQSxjQUFBLFlBQUE7QUFBQSxzQkFBaUMsTUFBQTtBQUFBLHNCQUN6QixNQUFBLFFBQUE7QUFBQSxvQkFDUSxHQUFBLEdBQUE7QUFBQSxrQkFDVjtBQUFBLGdCQUNSLEdBQUEsRUFBQTtBQUFBLGNBQ0c7QUFBQSxZQUNQLE9BQUE7QUFFaUIsNkJBQUE7QUFBQSxZQUFBO0FBQUEsVUFDakIsT0FBQTtBQUVBLDJCQUFBO0FBRUksZ0JBQUEsUUFBQSxxQkFBQSxRQUFBLHNCQUFBO0FBQ0YseUJBQUEsTUFBQTtBQUNRLHNCQUFBLFNBQUEsU0FBQSxjQUFBLDJDQUFBO0FBQ04sb0JBQUEsaUNBQUEsZUFBQTtBQUNFLHlCQUFBLGNBQUEsWUFBQTtBQUFBLG9CQUFpQyxNQUFBO0FBQUEsb0JBQ3pCLE1BQUEsUUFBQTtBQUFBLGtCQUNRLEdBQUEsR0FBQTtBQUFBLGdCQUNWO0FBQUEsY0FDUixHQUFBLEdBQUE7QUFBQSxZQUNJLE9BQUE7QUFJQSxvQkFBQSxjQUFBLENBQUEsVUFBQSxNQUFBO0FBQ0Usc0JBQUEsU0FBQSxTQUFBLGNBQUEsMkNBQUE7QUFDTixvQkFBQSxpQ0FBQSxlQUFBO0FBQ0UseUJBQUEsY0FBQSxZQUFBO0FBQUEsb0JBQWlDLE1BQUE7QUFBQSxrQkFDekIsR0FBQSxHQUFBO0FBQUEsZ0JBQ0YsV0FBQSxVQUFBLEdBQUE7QUFHTiw2QkFBQSxNQUFBLFlBQUEsVUFBQSxDQUFBLEdBQUEsR0FBQTtBQUFBLGdCQUE4QztBQUFBLGNBQ2hEO0FBR0YseUJBQUEsTUFBQSxZQUFBLENBQUEsR0FBQSxHQUFBO0FBQUEsWUFBb0M7QUFBQSxVQUN0QztBQUFBLFFBQ0Y7QUFJRSxhQUFBLG1DQUFBLFVBQUEsdUJBQUE7QUFFRixjQUFBLFNBQUEsUUFBQTtBQUNFO0FBQUEsVUFBQTtBQUdGLGdCQUFBLGVBQUEsUUFBQTtBQUNBLDJCQUFBLGVBQUEsb0JBQUE7QUFHQSxjQUFBLGdCQUFBLENBQUEsU0FBQSxlQUFBLG1DQUFBLEdBQUE7QUFDRSwyQkFBQTtBQUFBLFVBQW1CLFdBQUEsU0FBQSxlQUFBLG1DQUFBLEdBQUE7QUFFUCx3QkFBQTtBQUFBLFVBQUE7QUFBQSxRQUNkO0FBQUEsTUFDRixDQUFBO0FBR0Y7QUFDRSxnQkFBQSxJQUFBLDZCQUFBO0FBQUEsTUFBeUM7QUFJM0MsYUFBQSxRQUFBLFVBQUEsWUFBQSxDQUFBLFNBQUEsUUFBQSxpQkFBQTtBQUNNLFlBQUEsUUFBQSxTQUFBLG9CQUFBO0FBQ0YsZ0JBQUEsTUFBQSxNQUFBLFdBQUEsTUFBQSxtQkFBQSxZQUFBLEdBQUEsR0FBQTtBQUNJLGNBQUEsU0FBQSxlQUFBLFlBQUE7QUFDRixtQkFBQSxpQkFBQSxRQUFBLEtBQUEsRUFBQSxNQUFBLE1BQUE7QUFBQSxVQUFtRCxPQUFBO0FBRS9DLGdCQUFBO0FBQUEsVUFBQTtBQUVDLGlCQUFBO0FBQUEsUUFBQTtBQUFBLE1BQ1QsQ0FBQTtBQUdGLGVBQUEsbUJBQUEsY0FBQTtBQUNNLFlBQUE7QUFDRixjQUFBLFlBQUE7QUFDWSxzQkFBQSxTQUFBLGNBQUEsU0FBQTtBQUNaLGNBQUEsQ0FBQSxVQUFBLGFBQUEsU0FBQSxjQUFBLHNCQUFBO0FBQ0EsY0FBQSxDQUFBLFVBQUEsYUFBQSxTQUFBLGNBQUEsZ0RBQUE7QUFDSSxjQUFBLENBQUEsVUFBQSxhQUFBLFNBQUE7QUFFRSxnQkFBQSxRQUFBLFVBQUEsVUFBQSxJQUFBO0FBQ0EsZ0JBQUEsaUJBQUEsMkZBQUEsRUFBQSxRQUFBLENBQUEsTUFBQSxFQUFBLFFBQUE7QUFFTixnQkFBQSxhQUFBLE1BQUEsS0FBQSxNQUFBLGlCQUFBLEdBQUEsQ0FBQSxFQUFBLElBQUEsQ0FBQSxNQUFBOztBQUFBLHFCQUFBQSxNQUFBLEVBQUEsZ0JBQUEsZ0JBQUFBLElBQUEsV0FBQTtBQUFBLFdBQUE7QUFDQSxjQUFBLFdBQUEsV0FBQSxPQUFBLE9BQUEsRUFBQSxLQUFBLEdBQUE7QUFDQSxjQUFBLFNBQUEsU0FBQSxJQUFBLGFBQUEsTUFBQSxhQUFBLElBQUEsS0FBQTtBQUVBLHFCQUFBLFNBQUEsUUFBQSxRQUFBLEdBQUEsRUFBQSxLQUFBO0FBQ0EsZ0JBQUEsWUFBQSxTQUFBLE1BQUEsS0FBQSxFQUFBLE9BQUEsT0FBQSxFQUFBO0FBR0EsdUJBQUEsRUFBQSxTQUFBLE1BQUEsTUFBQSxFQUFBLE9BQUEsU0FBQSxPQUFBLFNBQUEsVUFBQSxLQUFBLFNBQUEsTUFBQSxVQUFBLEdBQUE7QUFBQSxRQUF1RyxTQUFBLEtBQUE7QUFFbkcsY0FBQTtBQUFlLHlCQUFBLEVBQUEsT0FBQSxtQ0FBQTtBQUFBLFVBQTRDLFFBQUE7QUFBQSxVQUFXO0FBQUEsUUFBQztBQUFBLE1BQzdFO0FBSUYsVUFBQSxlQUFBO0FBQ00sWUFBQSxNQUFBLE9BQUEsV0FBQSxrQ0FBQTtBQUNBLFlBQUEsZUFBQSxJQUFBLFVBQUEsSUFBQTtBQUVOLGVBQUEsZUFBQSxXQUFBO0FBRU0sWUFBQSxTQUFBLFVBQUEsQ0FBQSxjQUFBO0FBQ0Y7QUFBQSxRQUFBO0FBR0YsWUFBQSxDQUFBLGNBQUE7QUFDaUIseUJBQUE7QUFBQSxRQUFBO0FBRWpCO0FBQ0UsdUJBQUEsTUFBQSxVQUFBO0FBQUEsUUFBOEI7QUFFcEIsb0JBQUE7QUFBQSxNQUFBO0FBR2QsZUFBQSxpQkFBQTtBQUNFLFlBQUEsZ0JBQUEsU0FBQSxlQUFBLG1DQUFBLEVBQUE7QUFDZSx1QkFBQSxTQUFBLGNBQUEsS0FBQTtBQUNmLHFCQUFBLEtBQUE7QUFDYSxxQkFBQSxhQUFBLGNBQUEsMEJBQUE7QUFDYixxQkFBQSxNQUFBLFdBQUE7QUFDQSxxQkFBQSxNQUFBLE1BQUE7QUFDQSxxQkFBQSxNQUFBLFFBQUE7QUFDQSxxQkFBQSxNQUFBLFNBQUE7QUFDQSxxQkFBQSxNQUFBLFNBQUE7QUFDQSxxQkFBQSxNQUFBLGFBQUE7QUFDQSxxQkFBQSxNQUFBLGFBQUE7QUFDQSxxQkFBQSxNQUFBLFlBQUE7QUFDQSxxQkFBQSxNQUFBLFdBQUE7QUFDQSxxQkFBQSxNQUFBLGFBQUEsU0FBQSxZQUFBLG9CQUFBLFlBQUE7QUFDQSxxQkFBQSxNQUFBLFVBQUE7QUFFTSxjQUFBLFFBQUEsU0FBQSxjQUFBLEtBQUE7QUFDTixjQUFBLE1BQUEsU0FBQTtBQUNBLGNBQUEsTUFBQSxVQUFBO0FBQ0EsY0FBQSxNQUFBLGdCQUFBO0FBRU0sY0FBQSxTQUFBLFNBQUEsY0FBQSxLQUFBO0FBQ04sZUFBQSxNQUFBLFVBQUE7QUFBQSxVQUF1QjtBQUFBLFVBQ3JCO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxRQUNBLEVBQUEsS0FBQSxHQUFBO0FBSUksY0FBQSxnQkFBQSxTQUFBLGNBQUEsS0FBQTtBQUNOLHNCQUFBLE1BQUEsVUFBQTtBQUFBLFVBQThCO0FBQUEsVUFDNUI7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFFBQ0EsRUFBQSxLQUFBLEdBQUE7QUFJSSxjQUFBLE9BQUEsU0FBQSxjQUFBLEtBQUE7QUFDTixjQUFBLFVBQUEsT0FBQSxRQUFBLE9BQUEsVUFBQTtBQUNBLGFBQUEsTUFBQTtBQUNBLGFBQUEsTUFBQTtBQUNBLGFBQUEsTUFBQSxVQUFBO0FBQUEsVUFBcUI7QUFBQSxVQUNuQjtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsUUFDQSxFQUFBLEtBQUEsR0FBQTtBQUlHLGFBQUEsVUFBQSxDQUFBLFVBQUE7QUFDSDtBQUNVLG9CQUFBLE1BQUEsa0NBQUEsS0FBQTtBQUFBLFVBQTZDO0FBRXZELGVBQUEsTUFBQSxVQUFBO0FBQUEsUUFBcUI7QUFJakIsY0FBQSxRQUFBLFNBQUEsY0FBQSxNQUFBO0FBQ04sY0FBQSxjQUFBO0FBQ0EsY0FBQSxNQUFBLFVBQUE7QUFBQSxVQUFzQjtBQUFBLFVBQ3BCO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxRQUNBLEVBQUEsS0FBQSxHQUFBO0FBSUYsc0JBQUEsWUFBQSxJQUFBO0FBQ0Esc0JBQUEsWUFBQSxLQUFBO0FBRU0sY0FBQSxXQUFBLFNBQUEsY0FBQSxRQUFBO0FBQ0csaUJBQUEsYUFBQSxjQUFBLE9BQUE7QUFDVCxpQkFBQSxjQUFBO0FBQ0EsaUJBQUEsTUFBQSxVQUFBO0FBQUEsVUFBeUI7QUFBQSxVQUN2QjtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFFBQ0EsRUFBQSxLQUFBLEdBQUE7QUFLRixlQUFBLFlBQUEsYUFBQTtBQUNBLGVBQUEsWUFBQSxRQUFBO0FBRU0sY0FBQSxPQUFBLFNBQUEsY0FBQSxLQUFBO0FBQ04sYUFBQSxNQUFBLE9BQUE7QUFDQSxhQUFBLE1BQUEsV0FBQTtBQUVNLGNBQUEsU0FBQSxTQUFBLGNBQUEsUUFBQTtBQUNOLGVBQUEsUUFBQTtBQUNBLGVBQUEsTUFBQSxTQUFBO0FBQ0EsZUFBQSxNQUFBLFFBQUE7QUFDQSxlQUFBLE1BQUEsU0FBQTtBQUNBLGVBQUEsTUFBQSxPQUFBLFFBQUEsT0FBQSxjQUFBO0FBQ0EsYUFBQSxZQUFBLE1BQUE7QUFHQSxpQkFBQSxVQUFBLE1BQUE7O0FBRU0sY0FBQTtBQUNGLGFBQUFBLE1BQUEsT0FBQSxrQkFBQSxnQkFBQUEsSUFBQSxZQUFBLEVBQUEsTUFBQSxnQkFBQSxHQUFBO0FBQUEsVUFBZ0UsUUFBQTtBQUFBLFVBQzFEO0FBRVIscUJBQUEsTUFBQTtBQUNpQiwyQkFBQTtBQUFBLFVBQUEsR0FBQSxFQUFBO0FBQUEsUUFDWjtBQUdQLGNBQUEsWUFBQSxNQUFBO0FBQ0EsY0FBQSxZQUFBLElBQUE7QUFDQSxxQkFBQSxZQUFBLEtBQUE7QUFDUyxpQkFBQSxnQkFBQSxZQUFBLFlBQUE7QUFDRyxvQkFBQTtBQUFBLE1BQUE7QUFHZCxlQUFBLGlCQUFBO0FBQ0UsWUFBQSxDQUFBLGFBQUE7QUFDQSxxQkFBQSxPQUFBO0FBQ2UsdUJBQUE7QUFDRSx5QkFBQTtBQUFBLE1BQUE7QUFHbkIsZUFBQSxtQkFBQTtBQUNXLGlCQUFBLGdCQUFBLE1BQUEsaUJBQUE7QUFDVCxpQkFBQSxLQUFBLE1BQUEsYUFBQSxJQUFBLFVBQUEsS0FBQSxnQkFBQSxZQUFBO0FBQ0EsaUJBQUEsS0FBQSxNQUFBLGNBQUEsR0FBQSxjQUFBO0FBQUEsTUFBbUQ7QUFHckQsZUFBQSxtQkFBQTtBQUNXLGlCQUFBLEtBQUEsTUFBQSxjQUFBO0FBQ0EsaUJBQUEsS0FBQSxNQUFBLGFBQUE7QUFBQSxNQUF3QjtBQUduQyxlQUFBLGNBQUE7QUFDRSxZQUFBLENBQUEsYUFBQTtBQUNhLHFCQUFBLE1BQUEsUUFBQSxHQUFBLGNBQUE7QUFDYixxQkFBQSxNQUFBLFVBQUE7QUFDaUIseUJBQUE7QUFBQSxNQUFBO0FBSVYsZUFBQSxpQkFBQSxvQkFBQSxNQUFBO0FBQ0gsWUFBQSxTQUFBLFVBQUEsY0FBQTtBQUdGLHVCQUFBLE1BQUEsVUFBQTtBQUNpQiwyQkFBQTtBQUFBLFFBQUEsV0FBQSxDQUFBLFNBQUEsVUFBQSxjQUFBO0FBR2pCLHVCQUFBLE1BQUEsVUFBQTtBQUNZLHNCQUFBO0FBQUEsUUFBQTtBQUFBLE1BQ2QsQ0FBQTtBQUFBLElBQ0Q7QUFBQSxFQUVMLENBQUE7O0FDbFhPLFFBQU1DLGNBQVUsc0JBQVcsWUFBWCxtQkFBb0IsWUFBcEIsbUJBQTZCLE1BQ2hELFdBQVcsVUFDWCxXQUFXO0FDRlIsUUFBTSxVQUFVQztBQ0R2QixXQUFTQyxRQUFNLFdBQVcsTUFBTTtBQUU5QixRQUFJLE9BQU8sS0FBSyxDQUFDLE1BQU0sVUFBVTtBQUN6QixZQUFBLFVBQVUsS0FBSyxNQUFNO0FBQzNCLGFBQU8sU0FBUyxPQUFPLElBQUksR0FBRyxJQUFJO0FBQUEsSUFBQSxPQUM3QjtBQUNFLGFBQUEsU0FBUyxHQUFHLElBQUk7QUFBQSxJQUFBO0FBQUEsRUFFM0I7QUFDTyxRQUFNQyxXQUFTO0FBQUEsSUFDcEIsT0FBTyxJQUFJLFNBQVNELFFBQU0sUUFBUSxPQUFPLEdBQUcsSUFBSTtBQUFBLElBQ2hELEtBQUssSUFBSSxTQUFTQSxRQUFNLFFBQVEsS0FBSyxHQUFHLElBQUk7QUFBQSxJQUM1QyxNQUFNLElBQUksU0FBU0EsUUFBTSxRQUFRLE1BQU0sR0FBRyxJQUFJO0FBQUEsSUFDOUMsT0FBTyxJQUFJLFNBQVNBLFFBQU0sUUFBUSxPQUFPLEdBQUcsSUFBSTtBQUFBLEVBQ2xEO0FDYk8sUUFBTSwwQkFBTixNQUFNLGdDQUErQixNQUFNO0FBQUEsSUFDaEQsWUFBWSxRQUFRLFFBQVE7QUFDcEIsWUFBQSx3QkFBdUIsWUFBWSxFQUFFO0FBQzNDLFdBQUssU0FBUztBQUNkLFdBQUssU0FBUztBQUFBLElBQUE7QUFBQSxFQUdsQjtBQURFLGdCQU5XLHlCQU1KLGNBQWEsbUJBQW1CLG9CQUFvQjtBQU50RCxNQUFNLHlCQUFOO0FBUUEsV0FBUyxtQkFBbUIsV0FBVzs7QUFDNUMsV0FBTyxJQUFHSCxNQUFBLG1DQUFTLFlBQVQsZ0JBQUFBLElBQWtCLEVBQUUsSUFBSSxTQUEwQixJQUFJLFNBQVM7QUFBQSxFQUMzRTtBQ1ZPLFdBQVMsc0JBQXNCLEtBQUs7QUFDekMsUUFBSTtBQUNKLFFBQUk7QUFDSixXQUFPO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxNQUtMLE1BQU07QUFDSixZQUFJLFlBQVksS0FBTTtBQUN0QixpQkFBUyxJQUFJLElBQUksU0FBUyxJQUFJO0FBQzlCLG1CQUFXLElBQUksWUFBWSxNQUFNO0FBQy9CLGNBQUksU0FBUyxJQUFJLElBQUksU0FBUyxJQUFJO0FBQ2xDLGNBQUksT0FBTyxTQUFTLE9BQU8sTUFBTTtBQUMvQixtQkFBTyxjQUFjLElBQUksdUJBQXVCLFFBQVEsTUFBTSxDQUFDO0FBQy9ELHFCQUFTO0FBQUEsVUFDbkI7QUFBQSxRQUNPLEdBQUUsR0FBRztBQUFBLE1BQ1o7QUFBQSxJQUNHO0FBQUEsRUFDSDtBQ2ZPLFFBQU0sd0JBQU4sTUFBTSxzQkFBcUI7QUFBQSxJQUNoQyxZQUFZLG1CQUFtQixTQUFTO0FBY3hDLHdDQUFhLE9BQU8sU0FBUyxPQUFPO0FBQ3BDO0FBQ0EsNkNBQWtCLHNCQUFzQixJQUFJO0FBQzVDLGdEQUFxQyxvQkFBSSxJQUFLO0FBaEI1QyxXQUFLLG9CQUFvQjtBQUN6QixXQUFLLFVBQVU7QUFDZixXQUFLLGtCQUFrQixJQUFJLGdCQUFpQjtBQUM1QyxVQUFJLEtBQUssWUFBWTtBQUNuQixhQUFLLHNCQUFzQixFQUFFLGtCQUFrQixLQUFJLENBQUU7QUFDckQsYUFBSyxlQUFnQjtBQUFBLE1BQzNCLE9BQVc7QUFDTCxhQUFLLHNCQUF1QjtBQUFBLE1BQ2xDO0FBQUEsSUFDQTtBQUFBLElBUUUsSUFBSSxTQUFTO0FBQ1gsYUFBTyxLQUFLLGdCQUFnQjtBQUFBLElBQ2hDO0FBQUEsSUFDRSxNQUFNLFFBQVE7QUFDWixhQUFPLEtBQUssZ0JBQWdCLE1BQU0sTUFBTTtBQUFBLElBQzVDO0FBQUEsSUFDRSxJQUFJLFlBQVk7QUFDZCxVQUFJLFFBQVEsUUFBUSxNQUFNLE1BQU07QUFDOUIsYUFBSyxrQkFBbUI7QUFBQSxNQUM5QjtBQUNJLGFBQU8sS0FBSyxPQUFPO0FBQUEsSUFDdkI7QUFBQSxJQUNFLElBQUksVUFBVTtBQUNaLGFBQU8sQ0FBQyxLQUFLO0FBQUEsSUFDakI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBY0UsY0FBYyxJQUFJO0FBQ2hCLFdBQUssT0FBTyxpQkFBaUIsU0FBUyxFQUFFO0FBQ3hDLGFBQU8sTUFBTSxLQUFLLE9BQU8sb0JBQW9CLFNBQVMsRUFBRTtBQUFBLElBQzVEO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBWUUsUUFBUTtBQUNOLGFBQU8sSUFBSSxRQUFRLE1BQU07QUFBQSxNQUM3QixDQUFLO0FBQUEsSUFDTDtBQUFBO0FBQUE7QUFBQTtBQUFBLElBSUUsWUFBWSxTQUFTLFNBQVM7QUFDNUIsWUFBTSxLQUFLLFlBQVksTUFBTTtBQUMzQixZQUFJLEtBQUssUUFBUyxTQUFTO0FBQUEsTUFDNUIsR0FBRSxPQUFPO0FBQ1YsV0FBSyxjQUFjLE1BQU0sY0FBYyxFQUFFLENBQUM7QUFDMUMsYUFBTztBQUFBLElBQ1g7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQUlFLFdBQVcsU0FBUyxTQUFTO0FBQzNCLFlBQU0sS0FBSyxXQUFXLE1BQU07QUFDMUIsWUFBSSxLQUFLLFFBQVMsU0FBUztBQUFBLE1BQzVCLEdBQUUsT0FBTztBQUNWLFdBQUssY0FBYyxNQUFNLGFBQWEsRUFBRSxDQUFDO0FBQ3pDLGFBQU87QUFBQSxJQUNYO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQUtFLHNCQUFzQixVQUFVO0FBQzlCLFlBQU0sS0FBSyxzQkFBc0IsSUFBSSxTQUFTO0FBQzVDLFlBQUksS0FBSyxRQUFTLFVBQVMsR0FBRyxJQUFJO0FBQUEsTUFDeEMsQ0FBSztBQUNELFdBQUssY0FBYyxNQUFNLHFCQUFxQixFQUFFLENBQUM7QUFDakQsYUFBTztBQUFBLElBQ1g7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBS0Usb0JBQW9CLFVBQVUsU0FBUztBQUNyQyxZQUFNLEtBQUssb0JBQW9CLElBQUksU0FBUztBQUMxQyxZQUFJLENBQUMsS0FBSyxPQUFPLFFBQVMsVUFBUyxHQUFHLElBQUk7QUFBQSxNQUMzQyxHQUFFLE9BQU87QUFDVixXQUFLLGNBQWMsTUFBTSxtQkFBbUIsRUFBRSxDQUFDO0FBQy9DLGFBQU87QUFBQSxJQUNYO0FBQUEsSUFDRSxpQkFBaUIsUUFBUSxNQUFNLFNBQVMsU0FBUzs7QUFDL0MsVUFBSSxTQUFTLHNCQUFzQjtBQUNqQyxZQUFJLEtBQUssUUFBUyxNQUFLLGdCQUFnQixJQUFLO0FBQUEsTUFDbEQ7QUFDSSxPQUFBQSxNQUFBLE9BQU8scUJBQVAsZ0JBQUFBLElBQUE7QUFBQTtBQUFBLFFBQ0UsS0FBSyxXQUFXLE1BQU0sSUFBSSxtQkFBbUIsSUFBSSxJQUFJO0FBQUEsUUFDckQ7QUFBQSxRQUNBO0FBQUEsVUFDRSxHQUFHO0FBQUEsVUFDSCxRQUFRLEtBQUs7QUFBQSxRQUNyQjtBQUFBO0FBQUEsSUFFQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFLRSxvQkFBb0I7QUFDbEIsV0FBSyxNQUFNLG9DQUFvQztBQUMvQ0ksZUFBTztBQUFBLFFBQ0wsbUJBQW1CLEtBQUssaUJBQWlCO0FBQUEsTUFDMUM7QUFBQSxJQUNMO0FBQUEsSUFDRSxpQkFBaUI7QUFDZixhQUFPO0FBQUEsUUFDTDtBQUFBLFVBQ0UsTUFBTSxzQkFBcUI7QUFBQSxVQUMzQixtQkFBbUIsS0FBSztBQUFBLFVBQ3hCLFdBQVcsS0FBSyxPQUFRLEVBQUMsU0FBUyxFQUFFLEVBQUUsTUFBTSxDQUFDO0FBQUEsUUFDOUM7QUFBQSxRQUNEO0FBQUEsTUFDRDtBQUFBLElBQ0w7QUFBQSxJQUNFLHlCQUF5QixPQUFPOztBQUM5QixZQUFNLHlCQUF1QkosTUFBQSxNQUFNLFNBQU4sZ0JBQUFBLElBQVksVUFBUyxzQkFBcUI7QUFDdkUsWUFBTSx3QkFBc0JLLE1BQUEsTUFBTSxTQUFOLGdCQUFBQSxJQUFZLHVCQUFzQixLQUFLO0FBQ25FLFlBQU0saUJBQWlCLENBQUMsS0FBSyxtQkFBbUIsS0FBSSxXQUFNLFNBQU4sbUJBQVksU0FBUztBQUN6RSxhQUFPLHdCQUF3Qix1QkFBdUI7QUFBQSxJQUMxRDtBQUFBLElBQ0Usc0JBQXNCLFNBQVM7QUFDN0IsVUFBSSxVQUFVO0FBQ2QsWUFBTSxLQUFLLENBQUMsVUFBVTtBQUNwQixZQUFJLEtBQUsseUJBQXlCLEtBQUssR0FBRztBQUN4QyxlQUFLLG1CQUFtQixJQUFJLE1BQU0sS0FBSyxTQUFTO0FBQ2hELGdCQUFNLFdBQVc7QUFDakIsb0JBQVU7QUFDVixjQUFJLGFBQVksbUNBQVMsa0JBQWtCO0FBQzNDLGVBQUssa0JBQW1CO0FBQUEsUUFDaEM7QUFBQSxNQUNLO0FBQ0QsdUJBQWlCLFdBQVcsRUFBRTtBQUM5QixXQUFLLGNBQWMsTUFBTSxvQkFBb0IsV0FBVyxFQUFFLENBQUM7QUFBQSxJQUMvRDtBQUFBLEVBQ0E7QUFySkUsZ0JBWlcsdUJBWUosK0JBQThCO0FBQUEsSUFDbkM7QUFBQSxFQUNEO0FBZEksTUFBTSx1QkFBTjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OyIsInhfZ29vZ2xlX2lnbm9yZUxpc3QiOlswLDIsMyw0LDUsNiw3XX0=
