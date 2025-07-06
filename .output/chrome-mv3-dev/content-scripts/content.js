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
    main() {
      console.log("Content script loaded");
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === "GET_PAGE_CONTENT") {
          console.log("Processing content on:", window.location.href);
          try {
            let articleTag = document.querySelector("article");
            if (!articleTag) {
              const selectors = [
                '[role="main"]',
                ".article-content",
                ".story-content",
                ".post-content",
                ".entry-content",
                "main",
                ".content"
              ];
              for (const selector of selectors) {
                articleTag = document.querySelector(selector);
                if (articleTag) {
                  console.log("Found content using selector:", selector);
                  break;
                }
              }
            }
            if (!articleTag) {
              sendResponse({ error: "Not a news article." });
              return true;
            }
            const articleClone = articleTag.cloneNode(true);
            articleClone.querySelectorAll("script, style, noscript").forEach((el) => el.remove());
            const elementsToRemove = [
              "nav",
              "header",
              "footer",
              ".navigation",
              ".nav",
              ".menu",
              ".sidebar",
              ".related",
              ".share",
              ".social",
              ".breadcrumb",
              '[role="navigation"]',
              '[role="banner"]',
              '[role="contentinfo"]',
              ".tags",
              ".categories",
              ".metadata",
              ".byline",
              ".author-info",
              ".related-terms",
              ".details",
              ".share-buttons",
              // Yahoo-specific elements
              ".advertisement",
              ".ad",
              ".ads",
              ".promo",
              ".trending",
              ".more-stories",
              ".recommended",
              ".newsletter",
              ".subscription",
              ".toolbar",
              ".comments",
              ".social-share",
              ".video-player",
              ".caas-carousel",
              ".caas-readmore",
              ".caas-attr-meta",
              // More aggressive cleanup
              "[data-module]",
              ".video-container",
              ".photo-credit",
              ".story-meta",
              ".story-byline",
              ".story-timestamp"
            ];
            elementsToRemove.forEach((selector) => {
              articleClone.querySelectorAll(selector).forEach((el) => el.remove());
            });
            const paragraphs = articleClone.querySelectorAll("p");
            let cleanContent = "";
            if (paragraphs.length > 0) {
              paragraphs.forEach((p, index) => {
                const text = p.innerText.trim();
                if (text.length > 50 && !text.includes("Advertisement") && !text.includes("©")) {
                  cleanContent += text + " ";
                }
              });
            }
            if (cleanContent.length < 200) {
              cleanContent = articleClone.innerText || "";
            }
            const linkCount = articleClone.querySelectorAll("a").length;
            let content2 = cleanContent.replace(/\s+/g, " ").replace(/\n\s*\n/g, "\n").trim();
            console.log("Content after cleaning:", content2.length, "chars");
            console.log("First 200 chars after cleaning:", content2.substring(0, 200));
            const wordCount = content2.split(/\s+/).filter((word) => word.length > 0).length;
            console.log("Word count:", wordCount, "Link count:", linkCount);
            console.log("Content preview (first 300 chars):", content2.substring(0, 300));
            if (wordCount < 100 || linkCount > 35 || wordCount > 1250) {
              sendResponse({ error: "Not a valid article: must have 100-1250 words and no more than 35 content links." });
              return true;
            }
            const pageContent = {
              title: document.title,
              content: content2,
              url: window.location.href,
              wordCount
            };
            sendResponse({ success: true, data: pageContent });
            return true;
          } catch (error) {
            console.error("Content script error:", error);
            sendResponse({ error: "Failed to extract page content." });
            return true;
          }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudC5qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3V0aWxzL2RlZmluZS1jb250ZW50LXNjcmlwdC5tanMiLCIuLi8uLi8uLi9zcmMvZW50cnlwb2ludHMvY29udGVudC50cyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9Ad3h0LWRldi9icm93c2VyL3NyYy9pbmRleC5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvYnJvd3Nlci5tanMiLCIuLi8uLi8uLi9ub2RlX21vZHVsZXMvd3h0L2Rpc3QvdXRpbHMvaW50ZXJuYWwvbG9nZ2VyLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9pbnRlcm5hbC9jdXN0b20tZXZlbnRzLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9pbnRlcm5hbC9sb2NhdGlvbi13YXRjaGVyLm1qcyIsIi4uLy4uLy4uL25vZGVfbW9kdWxlcy93eHQvZGlzdC91dGlscy9jb250ZW50LXNjcmlwdC1jb250ZXh0Lm1qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZnVuY3Rpb24gZGVmaW5lQ29udGVudFNjcmlwdChkZWZpbml0aW9uKSB7XG4gIHJldHVybiBkZWZpbml0aW9uO1xufVxuIiwiaW1wb3J0IHsgZGVmaW5lQ29udGVudFNjcmlwdCB9IGZyb20gJyNpbXBvcnRzJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29udGVudFNjcmlwdCh7XG4gIG1hdGNoZXM6IFsnPGFsbF91cmxzPiddLFxuICBtYWluKCkge1xuICAgIC8vIENvbnRlbnQgc2NyaXB0IC0gcnVucyBvbiB3ZWIgcGFnZXNcbiAgICBjb25zb2xlLmxvZygnQ29udGVudCBzY3JpcHQgbG9hZGVkJylcblxuICAgIC8vY29udGVudCBzY3JpcHQgbG9naWNcbiAgICBjaHJvbWUucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoKG1lc3NhZ2UsIHNlbmRlciwgc2VuZFJlc3BvbnNlKSA9PiB7XG4gICAgICBpZiAobWVzc2FnZS50eXBlID09PSAnR0VUX1BBR0VfQ09OVEVOVCcpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1Byb2Nlc3NpbmcgY29udGVudCBvbjonLCB3aW5kb3cubG9jYXRpb24uaHJlZilcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAvLyBUcnkgbXVsdGlwbGUgc2VsZWN0b3JzIGZvciBkaWZmZXJlbnQgbmV3cyBzaXRlc1xuICAgICAgICAgIGxldCBhcnRpY2xlVGFnID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignYXJ0aWNsZScpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIElmIG5vIGFydGljbGUgdGFnLCB0cnkgb3RoZXIgY29tbW9uIHNlbGVjdG9yc1xuICAgICAgICAgIGlmICghYXJ0aWNsZVRhZykge1xuICAgICAgICAgICAgY29uc3Qgc2VsZWN0b3JzID0gW1xuICAgICAgICAgICAgICAnW3JvbGU9XCJtYWluXCJdJyxcbiAgICAgICAgICAgICAgJy5hcnRpY2xlLWNvbnRlbnQnLFxuICAgICAgICAgICAgICAnLnN0b3J5LWNvbnRlbnQnLCBcbiAgICAgICAgICAgICAgJy5wb3N0LWNvbnRlbnQnLFxuICAgICAgICAgICAgICAnLmVudHJ5LWNvbnRlbnQnLFxuICAgICAgICAgICAgICAnbWFpbicsXG4gICAgICAgICAgICAgICcuY29udGVudCdcbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGZvciAoY29uc3Qgc2VsZWN0b3Igb2Ygc2VsZWN0b3JzKSB7XG4gICAgICAgICAgICAgIGFydGljbGVUYWcgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICAgICAgICAgICAgaWYgKGFydGljbGVUYWcpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRm91bmQgY29udGVudCB1c2luZyBzZWxlY3RvcjonLCBzZWxlY3Rvcik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgaWYgKCFhcnRpY2xlVGFnKSB7XG4gICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBlcnJvcjogXCJOb3QgYSBuZXdzIGFydGljbGUuXCIgfSk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyAyLiBFeHRyYWN0IGNvbnRlbnQgYW5kIGNvdW50IHdvcmRzL2xpbmtzXG4gICAgICAgICAgY29uc3QgYXJ0aWNsZUNsb25lID0gYXJ0aWNsZVRhZy5jbG9uZU5vZGUodHJ1ZSkgYXMgSFRNTEVsZW1lbnQ7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gUmVtb3ZlIHNjcmlwdHMsIHN0eWxlcywgYW5kIHN0cnVjdHVyZWQgZGF0YSBmaXJzdFxuICAgICAgICAgIGFydGljbGVDbG9uZS5xdWVyeVNlbGVjdG9yQWxsKCdzY3JpcHQsIHN0eWxlLCBub3NjcmlwdCcpLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIFJlbW92ZSBuYXZpZ2F0aW9uLCBmb290ZXIsIGFuZCBvdGhlciBub24tY29udGVudCBlbGVtZW50cyAobW9yZSBhZ2dyZXNzaXZlIGZvciBZYWhvbylcbiAgICAgICAgICBjb25zdCBlbGVtZW50c1RvUmVtb3ZlID0gW1xuICAgICAgICAgICAgJ25hdicsICdoZWFkZXInLCAnZm9vdGVyJywgJy5uYXZpZ2F0aW9uJywgJy5uYXYnLCAnLm1lbnUnLFxuICAgICAgICAgICAgJy5zaWRlYmFyJywgJy5yZWxhdGVkJywgJy5zaGFyZScsICcuc29jaWFsJywgJy5icmVhZGNydW1iJyxcbiAgICAgICAgICAgICdbcm9sZT1cIm5hdmlnYXRpb25cIl0nLCAnW3JvbGU9XCJiYW5uZXJcIl0nLCAnW3JvbGU9XCJjb250ZW50aW5mb1wiXScsXG4gICAgICAgICAgICAnLnRhZ3MnLCAnLmNhdGVnb3JpZXMnLCAnLm1ldGFkYXRhJywgJy5ieWxpbmUnLCAnLmF1dGhvci1pbmZvJyxcbiAgICAgICAgICAgICcucmVsYXRlZC10ZXJtcycsICcuZGV0YWlscycsICcuc2hhcmUtYnV0dG9ucycsXG4gICAgICAgICAgICAvLyBZYWhvby1zcGVjaWZpYyBlbGVtZW50c1xuICAgICAgICAgICAgJy5hZHZlcnRpc2VtZW50JywgJy5hZCcsICcuYWRzJywgJy5wcm9tbycsICcudHJlbmRpbmcnLFxuICAgICAgICAgICAgJy5tb3JlLXN0b3JpZXMnLCAnLnJlY29tbWVuZGVkJywgJy5uZXdzbGV0dGVyJywgJy5zdWJzY3JpcHRpb24nLFxuICAgICAgICAgICAgJy50b29sYmFyJywgJy5jb21tZW50cycsICcuc29jaWFsLXNoYXJlJywgJy52aWRlby1wbGF5ZXInLFxuICAgICAgICAgICAgJy5jYWFzLWNhcm91c2VsJywgJy5jYWFzLXJlYWRtb3JlJywgJy5jYWFzLWF0dHItbWV0YScsXG4gICAgICAgICAgICAvLyBNb3JlIGFnZ3Jlc3NpdmUgY2xlYW51cFxuICAgICAgICAgICAgJ1tkYXRhLW1vZHVsZV0nLCAnLnZpZGVvLWNvbnRhaW5lcicsICcucGhvdG8tY3JlZGl0JyxcbiAgICAgICAgICAgICcuc3RvcnktbWV0YScsICcuc3RvcnktYnlsaW5lJywgJy5zdG9yeS10aW1lc3RhbXAnXG4gICAgICAgICAgXTtcbiAgICAgICAgICBcbiAgICAgICAgICBlbGVtZW50c1RvUmVtb3ZlLmZvckVhY2goc2VsZWN0b3IgPT4ge1xuICAgICAgICAgICAgYXJ0aWNsZUNsb25lLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIFxuICAgICAgICAgIGNvbnN0IHBhcmFncmFwaHMgPSBhcnRpY2xlQ2xvbmUucXVlcnlTZWxlY3RvckFsbCgncCcpO1xuICAgICAgICAgIGxldCBjbGVhbkNvbnRlbnQgPSAnJztcbiAgICAgICAgICBcbiAgICAgICAgICBpZiAocGFyYWdyYXBocy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBFeHRyYWN0IG9ubHkgcGFyYWdyYXBoIHRleHQsIHNraXAgdmVyeSBzaG9ydCBwYXJhZ3JhcGhzIChsaWtlbHkgbWV0YWRhdGEpXG4gICAgICAgICAgICBwYXJhZ3JhcGhzLmZvckVhY2goKHAsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IHRleHQgPSBwLmlubmVyVGV4dC50cmltKCk7XG4gICAgICAgICAgICAgIGlmICh0ZXh0Lmxlbmd0aCA+IDUwICYmICF0ZXh0LmluY2x1ZGVzKCdBZHZlcnRpc2VtZW50JykgJiYgIXRleHQuaW5jbHVkZXMoJ8KpJykpIHtcbiAgICAgICAgICAgICAgICBjbGVhbkNvbnRlbnQgKz0gdGV4dCArICcgJztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuXG4gICAgICAgICAgaWYgKGNsZWFuQ29udGVudC5sZW5ndGggPCAyMDApIHtcbiAgICAgICAgICAgIGNsZWFuQ29udGVudCA9IGFydGljbGVDbG9uZS5pbm5lclRleHQgfHwgJyc7XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIC8vIENvdW50IGxpbmtzIG9ubHkgaW4gdGhlIG1haW4gY29udGVudCBhcmVhIChhZnRlciByZW1vdmluZyBuYXYvZm9vdGVyKVxuICAgICAgICAgIGNvbnN0IGxpbmtDb3VudCA9IGFydGljbGVDbG9uZS5xdWVyeVNlbGVjdG9yQWxsKCdhJykubGVuZ3RoO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIENsZWFuIHVwIGV4Y2Vzc2l2ZSB3aGl0ZXNwYWNlIGFuZCBsaW5lIGJyZWFrc1xuICAgICAgICAgIGxldCBjb250ZW50ID0gY2xlYW5Db250ZW50XG4gICAgICAgICAgICAucmVwbGFjZSgvXFxzKy9nLCAnICcpICAgICAgICAgICBcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cXG5cXHMqXFxuL2csICdcXG4nKSAgICAgIFxuICAgICAgICAgICAgLnRyaW0oKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0NvbnRlbnQgYWZ0ZXIgY2xlYW5pbmc6JywgY29udGVudC5sZW5ndGgsICdjaGFycycpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0ZpcnN0IDIwMCBjaGFycyBhZnRlciBjbGVhbmluZzonLCBjb250ZW50LnN1YnN0cmluZygwLCAyMDApKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3Qgd29yZENvdW50ID0gY29udGVudC5zcGxpdCgvXFxzKy8pLmZpbHRlcih3b3JkID0+IHdvcmQubGVuZ3RoID4gMCkubGVuZ3RoO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnV29yZCBjb3VudDonLCB3b3JkQ291bnQsICdMaW5rIGNvdW50OicsIGxpbmtDb3VudCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnQ29udGVudCBwcmV2aWV3IChmaXJzdCAzMDAgY2hhcnMpOicsIGNvbnRlbnQuc3Vic3RyaW5nKDAsIDMwMCkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyAzLiBDaGVjayB3b3JkIGFuZCBsaW5rIGNvdW50IGNvbnN0cmFpbnRzIC0gcmVsYXhlZCBsaW5rIGxpbWl0XG4gICAgICAgICAgICBpZiAod29yZENvdW50IDwgMTAwIHx8IGxpbmtDb3VudCA+IDM1IHx8IHdvcmRDb3VudCA+IDEyNTApIHtcbiAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHtlcnJvcjogXCJOb3QgYSB2YWxpZCBhcnRpY2xlOiBtdXN0IGhhdmUgMTAwLTEyNTAgd29yZHMgYW5kIG5vIG1vcmUgdGhhbiAzNSBjb250ZW50IGxpbmtzLlwifSk7XG4gICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyA0LiBJZiBhbGwgY2hlY2tzIHBhc3MsIHNlbmQgdGhlIGFydGljbGUgaW5mb1xuICAgICAgICAgICAgY29uc3QgcGFnZUNvbnRlbnQgPSB7XG4gICAgICAgICAgICAgIHRpdGxlOiBkb2N1bWVudC50aXRsZSxcbiAgICAgICAgICAgICAgY29udGVudDogY29udGVudCxcbiAgICAgICAgICAgICAgdXJsOiB3aW5kb3cubG9jYXRpb24uaHJlZixcbiAgICAgICAgICAgICAgd29yZENvdW50OiB3b3JkQ291bnRcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBwYWdlQ29udGVudCB9KTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0NvbnRlbnQgc2NyaXB0IGVycm9yOicsIGVycm9yKTtcbiAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBlcnJvcjogXCJGYWlsZWQgdG8gZXh0cmFjdCBwYWdlIGNvbnRlbnQuXCIgfSk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufSk7IiwiLy8gI3JlZ2lvbiBzbmlwcGV0XG5leHBvcnQgY29uc3QgYnJvd3NlciA9IGdsb2JhbFRoaXMuYnJvd3Nlcj8ucnVudGltZT8uaWRcbiAgPyBnbG9iYWxUaGlzLmJyb3dzZXJcbiAgOiBnbG9iYWxUaGlzLmNocm9tZTtcbi8vICNlbmRyZWdpb24gc25pcHBldFxuIiwiaW1wb3J0IHsgYnJvd3NlciBhcyBfYnJvd3NlciB9IGZyb20gXCJAd3h0LWRldi9icm93c2VyXCI7XG5leHBvcnQgY29uc3QgYnJvd3NlciA9IF9icm93c2VyO1xuZXhwb3J0IHt9O1xuIiwiZnVuY3Rpb24gcHJpbnQobWV0aG9kLCAuLi5hcmdzKSB7XG4gIGlmIChpbXBvcnQubWV0YS5lbnYuTU9ERSA9PT0gXCJwcm9kdWN0aW9uXCIpIHJldHVybjtcbiAgaWYgKHR5cGVvZiBhcmdzWzBdID09PSBcInN0cmluZ1wiKSB7XG4gICAgY29uc3QgbWVzc2FnZSA9IGFyZ3Muc2hpZnQoKTtcbiAgICBtZXRob2QoYFt3eHRdICR7bWVzc2FnZX1gLCAuLi5hcmdzKTtcbiAgfSBlbHNlIHtcbiAgICBtZXRob2QoXCJbd3h0XVwiLCAuLi5hcmdzKTtcbiAgfVxufVxuZXhwb3J0IGNvbnN0IGxvZ2dlciA9IHtcbiAgZGVidWc6ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLmRlYnVnLCAuLi5hcmdzKSxcbiAgbG9nOiAoLi4uYXJncykgPT4gcHJpbnQoY29uc29sZS5sb2csIC4uLmFyZ3MpLFxuICB3YXJuOiAoLi4uYXJncykgPT4gcHJpbnQoY29uc29sZS53YXJuLCAuLi5hcmdzKSxcbiAgZXJyb3I6ICguLi5hcmdzKSA9PiBwcmludChjb25zb2xlLmVycm9yLCAuLi5hcmdzKVxufTtcbiIsImltcG9ydCB7IGJyb3dzZXIgfSBmcm9tIFwid3h0L2Jyb3dzZXJcIjtcbmV4cG9ydCBjbGFzcyBXeHRMb2NhdGlvbkNoYW5nZUV2ZW50IGV4dGVuZHMgRXZlbnQge1xuICBjb25zdHJ1Y3RvcihuZXdVcmwsIG9sZFVybCkge1xuICAgIHN1cGVyKFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQuRVZFTlRfTkFNRSwge30pO1xuICAgIHRoaXMubmV3VXJsID0gbmV3VXJsO1xuICAgIHRoaXMub2xkVXJsID0gb2xkVXJsO1xuICB9XG4gIHN0YXRpYyBFVkVOVF9OQU1FID0gZ2V0VW5pcXVlRXZlbnROYW1lKFwid3h0OmxvY2F0aW9uY2hhbmdlXCIpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGdldFVuaXF1ZUV2ZW50TmFtZShldmVudE5hbWUpIHtcbiAgcmV0dXJuIGAke2Jyb3dzZXI/LnJ1bnRpbWU/LmlkfToke2ltcG9ydC5tZXRhLmVudi5FTlRSWVBPSU5UfToke2V2ZW50TmFtZX1gO1xufVxuIiwiaW1wb3J0IHsgV3h0TG9jYXRpb25DaGFuZ2VFdmVudCB9IGZyb20gXCIuL2N1c3RvbS1ldmVudHMubWpzXCI7XG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTG9jYXRpb25XYXRjaGVyKGN0eCkge1xuICBsZXQgaW50ZXJ2YWw7XG4gIGxldCBvbGRVcmw7XG4gIHJldHVybiB7XG4gICAgLyoqXG4gICAgICogRW5zdXJlIHRoZSBsb2NhdGlvbiB3YXRjaGVyIGlzIGFjdGl2ZWx5IGxvb2tpbmcgZm9yIFVSTCBjaGFuZ2VzLiBJZiBpdCdzIGFscmVhZHkgd2F0Y2hpbmcsXG4gICAgICogdGhpcyBpcyBhIG5vb3AuXG4gICAgICovXG4gICAgcnVuKCkge1xuICAgICAgaWYgKGludGVydmFsICE9IG51bGwpIHJldHVybjtcbiAgICAgIG9sZFVybCA9IG5ldyBVUkwobG9jYXRpb24uaHJlZik7XG4gICAgICBpbnRlcnZhbCA9IGN0eC5zZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgIGxldCBuZXdVcmwgPSBuZXcgVVJMKGxvY2F0aW9uLmhyZWYpO1xuICAgICAgICBpZiAobmV3VXJsLmhyZWYgIT09IG9sZFVybC5ocmVmKSB7XG4gICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQobmV3IFd4dExvY2F0aW9uQ2hhbmdlRXZlbnQobmV3VXJsLCBvbGRVcmwpKTtcbiAgICAgICAgICBvbGRVcmwgPSBuZXdVcmw7XG4gICAgICAgIH1cbiAgICAgIH0sIDFlMyk7XG4gICAgfVxuICB9O1xufVxuIiwiaW1wb3J0IHsgYnJvd3NlciB9IGZyb20gXCJ3eHQvYnJvd3NlclwiO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSBcIi4uL3V0aWxzL2ludGVybmFsL2xvZ2dlci5tanNcIjtcbmltcG9ydCB7XG4gIGdldFVuaXF1ZUV2ZW50TmFtZVxufSBmcm9tIFwiLi9pbnRlcm5hbC9jdXN0b20tZXZlbnRzLm1qc1wiO1xuaW1wb3J0IHsgY3JlYXRlTG9jYXRpb25XYXRjaGVyIH0gZnJvbSBcIi4vaW50ZXJuYWwvbG9jYXRpb24td2F0Y2hlci5tanNcIjtcbmV4cG9ydCBjbGFzcyBDb250ZW50U2NyaXB0Q29udGV4dCB7XG4gIGNvbnN0cnVjdG9yKGNvbnRlbnRTY3JpcHROYW1lLCBvcHRpb25zKSB7XG4gICAgdGhpcy5jb250ZW50U2NyaXB0TmFtZSA9IGNvbnRlbnRTY3JpcHROYW1lO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5hYm9ydENvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG4gICAgaWYgKHRoaXMuaXNUb3BGcmFtZSkge1xuICAgICAgdGhpcy5saXN0ZW5Gb3JOZXdlclNjcmlwdHMoeyBpZ25vcmVGaXJzdEV2ZW50OiB0cnVlIH0pO1xuICAgICAgdGhpcy5zdG9wT2xkU2NyaXB0cygpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmxpc3RlbkZvck5ld2VyU2NyaXB0cygpO1xuICAgIH1cbiAgfVxuICBzdGF0aWMgU0NSSVBUX1NUQVJURURfTUVTU0FHRV9UWVBFID0gZ2V0VW5pcXVlRXZlbnROYW1lKFxuICAgIFwid3h0OmNvbnRlbnQtc2NyaXB0LXN0YXJ0ZWRcIlxuICApO1xuICBpc1RvcEZyYW1lID0gd2luZG93LnNlbGYgPT09IHdpbmRvdy50b3A7XG4gIGFib3J0Q29udHJvbGxlcjtcbiAgbG9jYXRpb25XYXRjaGVyID0gY3JlYXRlTG9jYXRpb25XYXRjaGVyKHRoaXMpO1xuICByZWNlaXZlZE1lc3NhZ2VJZHMgPSAvKiBAX19QVVJFX18gKi8gbmV3IFNldCgpO1xuICBnZXQgc2lnbmFsKCkge1xuICAgIHJldHVybiB0aGlzLmFib3J0Q29udHJvbGxlci5zaWduYWw7XG4gIH1cbiAgYWJvcnQocmVhc29uKSB7XG4gICAgcmV0dXJuIHRoaXMuYWJvcnRDb250cm9sbGVyLmFib3J0KHJlYXNvbik7XG4gIH1cbiAgZ2V0IGlzSW52YWxpZCgpIHtcbiAgICBpZiAoYnJvd3Nlci5ydW50aW1lLmlkID09IG51bGwpIHtcbiAgICAgIHRoaXMubm90aWZ5SW52YWxpZGF0ZWQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuc2lnbmFsLmFib3J0ZWQ7XG4gIH1cbiAgZ2V0IGlzVmFsaWQoKSB7XG4gICAgcmV0dXJuICF0aGlzLmlzSW52YWxpZDtcbiAgfVxuICAvKipcbiAgICogQWRkIGEgbGlzdGVuZXIgdGhhdCBpcyBjYWxsZWQgd2hlbiB0aGUgY29udGVudCBzY3JpcHQncyBjb250ZXh0IGlzIGludmFsaWRhdGVkLlxuICAgKlxuICAgKiBAcmV0dXJucyBBIGZ1bmN0aW9uIHRvIHJlbW92ZSB0aGUgbGlzdGVuZXIuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIGJyb3dzZXIucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoY2IpO1xuICAgKiBjb25zdCByZW1vdmVJbnZhbGlkYXRlZExpc3RlbmVyID0gY3R4Lm9uSW52YWxpZGF0ZWQoKCkgPT4ge1xuICAgKiAgIGJyb3dzZXIucnVudGltZS5vbk1lc3NhZ2UucmVtb3ZlTGlzdGVuZXIoY2IpO1xuICAgKiB9KVxuICAgKiAvLyAuLi5cbiAgICogcmVtb3ZlSW52YWxpZGF0ZWRMaXN0ZW5lcigpO1xuICAgKi9cbiAgb25JbnZhbGlkYXRlZChjYikge1xuICAgIHRoaXMuc2lnbmFsLmFkZEV2ZW50TGlzdGVuZXIoXCJhYm9ydFwiLCBjYik7XG4gICAgcmV0dXJuICgpID0+IHRoaXMuc2lnbmFsLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJhYm9ydFwiLCBjYik7XG4gIH1cbiAgLyoqXG4gICAqIFJldHVybiBhIHByb21pc2UgdGhhdCBuZXZlciByZXNvbHZlcy4gVXNlZnVsIGlmIHlvdSBoYXZlIGFuIGFzeW5jIGZ1bmN0aW9uIHRoYXQgc2hvdWxkbid0IHJ1blxuICAgKiBhZnRlciB0aGUgY29udGV4dCBpcyBleHBpcmVkLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBjb25zdCBnZXRWYWx1ZUZyb21TdG9yYWdlID0gYXN5bmMgKCkgPT4ge1xuICAgKiAgIGlmIChjdHguaXNJbnZhbGlkKSByZXR1cm4gY3R4LmJsb2NrKCk7XG4gICAqXG4gICAqICAgLy8gLi4uXG4gICAqIH1cbiAgICovXG4gIGJsb2NrKCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgoKSA9PiB7XG4gICAgfSk7XG4gIH1cbiAgLyoqXG4gICAqIFdyYXBwZXIgYXJvdW5kIGB3aW5kb3cuc2V0SW50ZXJ2YWxgIHRoYXQgYXV0b21hdGljYWxseSBjbGVhcnMgdGhlIGludGVydmFsIHdoZW4gaW52YWxpZGF0ZWQuXG4gICAqL1xuICBzZXRJbnRlcnZhbChoYW5kbGVyLCB0aW1lb3V0KSB7XG4gICAgY29uc3QgaWQgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICBpZiAodGhpcy5pc1ZhbGlkKSBoYW5kbGVyKCk7XG4gICAgfSwgdGltZW91dCk7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNsZWFySW50ZXJ2YWwoaWQpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgLyoqXG4gICAqIFdyYXBwZXIgYXJvdW5kIGB3aW5kb3cuc2V0VGltZW91dGAgdGhhdCBhdXRvbWF0aWNhbGx5IGNsZWFycyB0aGUgaW50ZXJ2YWwgd2hlbiBpbnZhbGlkYXRlZC5cbiAgICovXG4gIHNldFRpbWVvdXQoaGFuZGxlciwgdGltZW91dCkge1xuICAgIGNvbnN0IGlkID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBpZiAodGhpcy5pc1ZhbGlkKSBoYW5kbGVyKCk7XG4gICAgfSwgdGltZW91dCk7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNsZWFyVGltZW91dChpZCkpO1xuICAgIHJldHVybiBpZDtcbiAgfVxuICAvKipcbiAgICogV3JhcHBlciBhcm91bmQgYHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWVgIHRoYXQgYXV0b21hdGljYWxseSBjYW5jZWxzIHRoZSByZXF1ZXN0IHdoZW5cbiAgICogaW52YWxpZGF0ZWQuXG4gICAqL1xuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoY2FsbGJhY2spIHtcbiAgICBjb25zdCBpZCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSgoLi4uYXJncykgPT4ge1xuICAgICAgaWYgKHRoaXMuaXNWYWxpZCkgY2FsbGJhY2soLi4uYXJncyk7XG4gICAgfSk7XG4gICAgdGhpcy5vbkludmFsaWRhdGVkKCgpID0+IGNhbmNlbEFuaW1hdGlvbkZyYW1lKGlkKSk7XG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIC8qKlxuICAgKiBXcmFwcGVyIGFyb3VuZCBgd2luZG93LnJlcXVlc3RJZGxlQ2FsbGJhY2tgIHRoYXQgYXV0b21hdGljYWxseSBjYW5jZWxzIHRoZSByZXF1ZXN0IHdoZW5cbiAgICogaW52YWxpZGF0ZWQuXG4gICAqL1xuICByZXF1ZXN0SWRsZUNhbGxiYWNrKGNhbGxiYWNrLCBvcHRpb25zKSB7XG4gICAgY29uc3QgaWQgPSByZXF1ZXN0SWRsZUNhbGxiYWNrKCguLi5hcmdzKSA9PiB7XG4gICAgICBpZiAoIXRoaXMuc2lnbmFsLmFib3J0ZWQpIGNhbGxiYWNrKC4uLmFyZ3MpO1xuICAgIH0sIG9wdGlvbnMpO1xuICAgIHRoaXMub25JbnZhbGlkYXRlZCgoKSA9PiBjYW5jZWxJZGxlQ2FsbGJhY2soaWQpKTtcbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgYWRkRXZlbnRMaXN0ZW5lcih0YXJnZXQsIHR5cGUsIGhhbmRsZXIsIG9wdGlvbnMpIHtcbiAgICBpZiAodHlwZSA9PT0gXCJ3eHQ6bG9jYXRpb25jaGFuZ2VcIikge1xuICAgICAgaWYgKHRoaXMuaXNWYWxpZCkgdGhpcy5sb2NhdGlvbldhdGNoZXIucnVuKCk7XG4gICAgfVxuICAgIHRhcmdldC5hZGRFdmVudExpc3RlbmVyPy4oXG4gICAgICB0eXBlLnN0YXJ0c1dpdGgoXCJ3eHQ6XCIpID8gZ2V0VW5pcXVlRXZlbnROYW1lKHR5cGUpIDogdHlwZSxcbiAgICAgIGhhbmRsZXIsXG4gICAgICB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIHNpZ25hbDogdGhpcy5zaWduYWxcbiAgICAgIH1cbiAgICApO1xuICB9XG4gIC8qKlxuICAgKiBAaW50ZXJuYWxcbiAgICogQWJvcnQgdGhlIGFib3J0IGNvbnRyb2xsZXIgYW5kIGV4ZWN1dGUgYWxsIGBvbkludmFsaWRhdGVkYCBsaXN0ZW5lcnMuXG4gICAqL1xuICBub3RpZnlJbnZhbGlkYXRlZCgpIHtcbiAgICB0aGlzLmFib3J0KFwiQ29udGVudCBzY3JpcHQgY29udGV4dCBpbnZhbGlkYXRlZFwiKTtcbiAgICBsb2dnZXIuZGVidWcoXG4gICAgICBgQ29udGVudCBzY3JpcHQgXCIke3RoaXMuY29udGVudFNjcmlwdE5hbWV9XCIgY29udGV4dCBpbnZhbGlkYXRlZGBcbiAgICApO1xuICB9XG4gIHN0b3BPbGRTY3JpcHRzKCkge1xuICAgIHdpbmRvdy5wb3N0TWVzc2FnZShcbiAgICAgIHtcbiAgICAgICAgdHlwZTogQ29udGVudFNjcmlwdENvbnRleHQuU0NSSVBUX1NUQVJURURfTUVTU0FHRV9UWVBFLFxuICAgICAgICBjb250ZW50U2NyaXB0TmFtZTogdGhpcy5jb250ZW50U2NyaXB0TmFtZSxcbiAgICAgICAgbWVzc2FnZUlkOiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zbGljZSgyKVxuICAgICAgfSxcbiAgICAgIFwiKlwiXG4gICAgKTtcbiAgfVxuICB2ZXJpZnlTY3JpcHRTdGFydGVkRXZlbnQoZXZlbnQpIHtcbiAgICBjb25zdCBpc1NjcmlwdFN0YXJ0ZWRFdmVudCA9IGV2ZW50LmRhdGE/LnR5cGUgPT09IENvbnRlbnRTY3JpcHRDb250ZXh0LlNDUklQVF9TVEFSVEVEX01FU1NBR0VfVFlQRTtcbiAgICBjb25zdCBpc1NhbWVDb250ZW50U2NyaXB0ID0gZXZlbnQuZGF0YT8uY29udGVudFNjcmlwdE5hbWUgPT09IHRoaXMuY29udGVudFNjcmlwdE5hbWU7XG4gICAgY29uc3QgaXNOb3REdXBsaWNhdGUgPSAhdGhpcy5yZWNlaXZlZE1lc3NhZ2VJZHMuaGFzKGV2ZW50LmRhdGE/Lm1lc3NhZ2VJZCk7XG4gICAgcmV0dXJuIGlzU2NyaXB0U3RhcnRlZEV2ZW50ICYmIGlzU2FtZUNvbnRlbnRTY3JpcHQgJiYgaXNOb3REdXBsaWNhdGU7XG4gIH1cbiAgbGlzdGVuRm9yTmV3ZXJTY3JpcHRzKG9wdGlvbnMpIHtcbiAgICBsZXQgaXNGaXJzdCA9IHRydWU7XG4gICAgY29uc3QgY2IgPSAoZXZlbnQpID0+IHtcbiAgICAgIGlmICh0aGlzLnZlcmlmeVNjcmlwdFN0YXJ0ZWRFdmVudChldmVudCkpIHtcbiAgICAgICAgdGhpcy5yZWNlaXZlZE1lc3NhZ2VJZHMuYWRkKGV2ZW50LmRhdGEubWVzc2FnZUlkKTtcbiAgICAgICAgY29uc3Qgd2FzRmlyc3QgPSBpc0ZpcnN0O1xuICAgICAgICBpc0ZpcnN0ID0gZmFsc2U7XG4gICAgICAgIGlmICh3YXNGaXJzdCAmJiBvcHRpb25zPy5pZ25vcmVGaXJzdEV2ZW50KSByZXR1cm47XG4gICAgICAgIHRoaXMubm90aWZ5SW52YWxpZGF0ZWQoKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGNiKTtcbiAgICB0aGlzLm9uSW52YWxpZGF0ZWQoKCkgPT4gcmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgY2IpKTtcbiAgfVxufVxuIl0sIm5hbWVzIjpbImRlZmluaXRpb24iLCJjb250ZW50IiwiYnJvd3NlciIsIl9icm93c2VyIiwicHJpbnQiLCJsb2dnZXIiLCJfYSIsIl9iIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBTyxXQUFTLG9CQUFvQkEsYUFBWTtBQUM5QyxXQUFPQTtBQUFBLEVBQ1Q7QUNBQSxRQUFBLGFBQUEsb0JBQUE7QUFBQSxJQUFtQyxTQUFBLENBQUEsWUFBQTtBQUFBLElBQ1gsT0FBQTtBQUdwQixjQUFBLElBQUEsdUJBQUE7QUFHQSxhQUFBLFFBQUEsVUFBQSxZQUFBLENBQUEsU0FBQSxRQUFBLGlCQUFBO0FBQ0UsWUFBQSxRQUFBLFNBQUEsb0JBQUE7QUFDRSxrQkFBQSxJQUFBLDBCQUFBLE9BQUEsU0FBQSxJQUFBO0FBQ0EsY0FBQTtBQUVFLGdCQUFBLGFBQUEsU0FBQSxjQUFBLFNBQUE7QUFHQSxnQkFBQSxDQUFBLFlBQUE7QUFDRSxvQkFBQSxZQUFBO0FB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
