import { defineContentScript } from '#imports';
import { getMulti, setStorage } from '../utils/storage';

export default defineContentScript({
  matches: ['<all_urls>'],
  exclude_matches: [
    'chrome://*',
    'chrome-extension://*',
    'moz-extension://*',
    'edge://*',
    'about:*',
    'chrome-devtools://*',
    'devtools://*',
    '*://console.cloud.google.com/*',
    '*://developers.google.com/*',
    '*://apis.google.com/*',
    '*://www.googleapis.com/*'
  ],
  main() {
    // Note: Restricted pages are already excluded via exclude_matches above
    const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
    
    if (isDev) {
      console.log('[FNR] Content script starting on', location.href);
    }

    const DEFAULT_WIDTH_PX = 440;
    const EXPANDED_WIDTH_PX = 720; // Wider width for analysis results
    let currentWidthPx = DEFAULT_WIDTH_PX;

    // Debug helpers (development only)
    if (isDev) {
      (window as any).fnrOpenSidebar = () => ensureInjected(true);
      (window as any).fnrDebug = () => {
        const el = document.getElementById('fake-news-reader-injected-sidebar') as HTMLElement | null;
        console.log('[FNR] debug', {
          exists: !!el,
          widthStyle: el?.style.width,
          display: el?.style.display,
          rect: el?.getBoundingClientRect?.(),
          bodyMarginRight: getComputedStyle(document.body).marginRight,
        });
      };
    }

    // Reply to ping from background for readiness check
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message?.type === 'FNR_PING') {
        sendResponse({ ok: true });
        return true;
      }
    });

    // Toggle from toolbar: open if not present, else close
    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type === 'TOGGLE_INJECTED_SIDEBAR') {
        if (isDev) {
          console.log('[FNR] Toggle message received:', message);
        }
        
        const exists = !!document.getElementById('fake-news-reader-injected-sidebar');
        if (exists) {
          // If sidebar exists, check if we should keep it open or close it
          // For analysis loading, we want to keep it open
          if (message.keepOpen) {
            ensureInjected(true);
          // If we have preloaded analysis, send it to the iframe
          if (message.preloadedAnalysis || message.hasPreloadedAnalysis) {
            setTimeout(() => {
              const iframe = document.querySelector('#fake-news-reader-injected-sidebar iframe') as HTMLIFrameElement;
              if (iframe?.contentWindow) {
                iframe.contentWindow.postMessage({
                  type: 'PRELOADED_ANALYSIS',
                  data: message.preloadedAnalysis
                }, '*');
              }
            }, 50);
          }
          } else {
            removeInjected();
          }
        } else {
          ensureInjected(true);
          // If we have preloaded analysis, send it to the iframe after creation
          if (message.preloadedAnalysis || message.hasPreloadedAnalysis) {
            setTimeout(() => {
              const iframe = document.querySelector('#fake-news-reader-injected-sidebar iframe') as HTMLIFrameElement;
              if (iframe?.contentWindow) {
                iframe.contentWindow.postMessage({
                  type: 'PRELOADED_ANALYSIS',
                  data: message.preloadedAnalysis
                }, '*');
              }
            }, 100);
          } else {
            // If no preloaded analysis, trigger manual analysis when opened via extension icon
            setTimeout(() => {
              const iframe = document.querySelector('#fake-news-reader-injected-sidebar iframe') as HTMLIFrameElement;
              if (iframe?.contentWindow) {
                iframe.contentWindow.postMessage({
                  type: 'TRIGGER_NEW_ANALYSIS'
                }, '*');
              }
            }, 50);
          }
        }
      }
      
      // Handle expansion for analysis results
      if (message?.type === 'EXPAND_FOR_ANALYSIS') {
        const shouldExpand = message.expanded;
        currentWidthPx = shouldExpand ? EXPANDED_WIDTH_PX : DEFAULT_WIDTH_PX;
        
        // Ensure sidebar exists and apply new layout
        if (shouldExpand && !document.getElementById('fake-news-reader-injected-sidebar')) {
          ensureInjected(true);
        } else if (document.getElementById('fake-news-reader-injected-sidebar')) {
          applyLayout();
        }
      }
    });

    if (isDev) {
      console.log('[FNR] Content script loaded');
    }

    // Handle page content request from background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'GET_PAGE_CONTENT') {
        const run = () => setTimeout(() => processPageContent(sendResponse), 300);
        if (document.readyState !== 'complete') {
          window.addEventListener('load', run, { once: true });
        } else {
          run();
        }
        return true; // keep the channel open for async sendResponse
      }
    });

    function processPageContent(sendResponse: (response: any) => void) {
      try {
        let container: HTMLElement | null = null;
        container = document.querySelector('article');
        if (!container) container = document.querySelector('main, [role="main" ]') as HTMLElement | null;
        if (!container) container = document.querySelector('.article, .story, .post, .entry, .content-body') as HTMLElement | null;
        if (!container) container = document.body;

        const clone = container.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('script, style, noscript, iframe, nav, header, footer, aside, .ads, [role="complementary"]').forEach((n) => n.remove());

        const paragraphs = Array.from(clone.querySelectorAll('p')).map((p) => p.textContent?.trim() || '');
        let content = paragraphs.filter(Boolean).join(' ');
        if (content.length < 200) content = (clone.innerText || '').trim();

        content = content.replace(/\s+/g, ' ').trim();
        const wordCount = content.split(/\s+/).filter(Boolean).length;
        // Remove minimum word count requirement - let AI handle content analysis

        sendResponse({ success: true, data: { title: document.title, content, url: location.href, wordCount } });
      } catch (err) {
        try { sendResponse({ error: 'Failed to extract page content.' }); } catch {}
      }
    }

    // Injected Sidebar logic (fixed width, no persistence)
    let injectedRoot: HTMLElement | null = null;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const transitionMs = mql.matches ? 0 : 160;

    function ensureInjected(forceShow: boolean) {
      if (!injectedRoot) {
        createInjected();
      }
      if (forceShow) {
        injectedRoot!.style.opacity = '1';
      }
      applyLayout();
    }

    function createInjected() {
      if (injectedRoot || document.getElementById('fake-news-reader-injected-sidebar')) return;
      injectedRoot = document.createElement('div');
      injectedRoot.id = 'fake-news-reader-injected-sidebar';
      injectedRoot.setAttribute('aria-label', 'Fake News Reader Sidebar');
      injectedRoot.style.position = 'fixed';
      injectedRoot.style.top = '0';
      injectedRoot.style.right = '0';
      injectedRoot.style.height = '100vh';
      injectedRoot.style.zIndex = '2147483647';
      injectedRoot.style.background = '#fff';
      injectedRoot.style.borderLeft = '1px solid rgba(0,0,0,0.12)';
      injectedRoot.style.boxShadow = '0 0 0 1px rgba(0,0,0,0.06), -2px 0 8px rgba(0,0,0,0.06)';
      injectedRoot.style.overflow = 'hidden';
      injectedRoot.style.transition = `width ${transitionMs}ms ease, opacity ${transitionMs}ms ease`;
      injectedRoot.style.display = 'block';

      const inner = document.createElement('div');
      inner.style.height = '100%';
      inner.style.display = 'flex';
      inner.style.flexDirection = 'column';

      const header = document.createElement('div');
      header.style.cssText = [
        'all: initial',
        'display: flex',
        'align-items: center',
        'justify-content: space-between',
        'padding: 12px 16px',
        'border-bottom: 1px solid rgba(0,0,0,0.12)',
        'box-sizing: border-box',
        'width: 100%',
        'background: #ffffff',
        'box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08)'
      ].join(';');

      // Create logo container
      const logoContainer = document.createElement('div');
      logoContainer.style.cssText = [
        'all: initial',
        'display: flex',
        'align-items: center',
        'gap: 8px'
      ].join(';');

      // Create logo element
      const logo = document.createElement('img');
      const logoUrl = chrome.runtime.getURL('logo.png');
      logo.src = logoUrl;
      logo.alt = 'NewsScan Logo';
      logo.style.cssText = [
        'all: initial',
        'width: 35px',
        'height: 35px',
        'object-fit: contain'
      ].join(';');
      
      // Handle logo load error - hide logo if it fails to load
      logo.onerror = (error) => {
        if (isDev) {
          console.error('NewsScan: Logo failed to load:', error);
        }
        logo.style.display = 'none';
      };

      // Create title element
      const title = document.createElement('span');
      title.textContent = 'NewsScan';
      title.style.cssText = [
        'all: initial',
        'font: 600 15px system-ui, -apple-system, Segoe UI, Roboto',
        'color: #202124',
        'letter-spacing: -0.01em'
      ].join(';');

      // Add logo and title to container
      logoContainer.appendChild(logo);
      logoContainer.appendChild(title);

      const closeBtn = document.createElement('button');
      closeBtn.setAttribute('aria-label', 'Close');
      closeBtn.textContent = '×';
      closeBtn.style.cssText = [
        'all: initial',
        'display:inline-flex',
        'align-items:center',
        'justify-content:center',
        'width:28px',
        'height:28px',
        'cursor:pointer',
        'font: 600 16px/1 system-ui, -apple-system, Segoe UI, Roboto',
        'color:#6b7280',
        'background:transparent',
        'border-radius: 4px'
      ].join(';');
      // The close button should navigate the app back to its home screen
      // rather than closing the sidebar entirely.

      header.appendChild(logoContainer);
      header.appendChild(closeBtn);

      const body = document.createElement('div');
      body.style.flex = '1';
      body.style.overflow = 'hidden';

      const iframe = document.createElement('iframe');
      iframe.title = 'NewsScan';
      iframe.style.border = '0';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.src = chrome.runtime.getURL('sidepanel.html');
      body.appendChild(iframe);

      // Wire close action to close sidebar
      closeBtn.onclick = () => {
        // Reset state first, then close after a brief moment
        try {
          iframe.contentWindow?.postMessage({ type: 'TRIGGER_RESET' }, '*');
        } catch {}
        // Close sidebar after reset has time to process
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
      document.documentElement.style.scrollBehavior = 'auto';
      document.body.style.transition = mql.matches ? '' : `margin-right ${transitionMs}ms ease`;
      document.body.style.marginRight = `${currentWidthPx}px`;
    }

    function resetBodyPadding() {
      document.body.style.marginRight = '';
      document.body.style.transition = '';
    }

    function applyLayout() {
      if (!injectedRoot) return;
      injectedRoot.style.width = `${currentWidthPx}px`;
      injectedRoot.style.opacity = '1';
      applyBodyPadding();
    }
  },
});