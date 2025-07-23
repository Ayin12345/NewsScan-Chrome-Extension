import { defineContentScript } from '#imports';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    // Content script - runs on web pages
    console.log('Content script loaded')

    //content script logic
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'GET_PAGE_CONTENT') {
        console.log('Processing content on:', window.location.href)
        try {
          // Try multiple selectors for different news sites
          let articleTag = document.querySelector('article');
          
          // If no article tag, try other common selectors
          if (!articleTag) {
            const selectors = [
              '[role="main"]',
              '.article-content',
              '.story-content', 
              '.post-content',
              '.entry-content',
              'main',
              '.content'
            ];
            
            for (const selector of selectors) {
              articleTag = document.querySelector(selector);
              if (articleTag) {
                console.log('Found content using selector:', selector);
                break;
              }
            }
          }
          
          if (!articleTag) {
            sendResponse({ error: "Not a news article." });
            return true;
          }

          // 2. Extract content and count words/links
          const articleClone = articleTag.cloneNode(true) as HTMLElement;
          
          // Remove scripts, styles, and structured data first
          articleClone.querySelectorAll('script, style, noscript').forEach(el => el.remove());
          
          // Remove navigation, footer, and other non-content elements (more aggressive for Yahoo)
          const elementsToRemove = [
            'nav', 'header', 'footer', '.navigation', '.nav', '.menu',
            '.sidebar', '.related', '.share', '.social', '.breadcrumb',
            '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
            '.tags', '.categories', '.metadata', '.byline', '.author-info',
            '.related-terms', '.details', '.share-buttons',
            // Yahoo-specific elements
            '.advertisement', '.ad', '.ads', '.promo', '.trending',
            '.more-stories', '.recommended', '.newsletter', '.subscription',
            '.toolbar', '.comments', '.social-share', '.video-player',
            '.caas-carousel', '.caas-readmore', '.caas-attr-meta',
            // More aggressive cleanup
            '[data-module]', '.video-container', '.photo-credit',
            '.story-meta', '.story-byline', '.story-timestamp'
          ];
          
          elementsToRemove.forEach(selector => {
            articleClone.querySelectorAll(selector).forEach(el => el.remove());
          });
          
          const paragraphs = articleClone.querySelectorAll('p');
          let cleanContent = '';
          
          if (paragraphs.length > 0) {
            // Extract only paragraph text, skip very short paragraphs (likely metadata)
            paragraphs.forEach((p, index) => {
              const text = p.innerText.trim();
              if (text.length > 50 && !text.includes('Advertisement') && !text.includes('©')) {
                cleanContent += text + ' ';
              }
            });
          }
          

          if (cleanContent.length < 200) {
            cleanContent = articleClone.innerText || '';
          }
          
          // Count links only in the main content area (after removing nav/footer)
          const linkCount = articleClone.querySelectorAll('a').length;
          
          // Clean up excessive whitespace and line breaks
          let content = cleanContent
            .replace(/\s+/g, ' ')           
            .replace(/\n\s*\n/g, '\n')      
            .trim();
            
            
            const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
            
            console.log('Word count:', wordCount, 'Link count:', linkCount);
            console.log('Content:', content);
            
            // 3. Check word and link count constraints - relaxed link limit
            if (wordCount < 100 || linkCount > 35 || wordCount > 1250) {
              sendResponse({error: "Not a valid article: must have 100-1250 words and no more than 35 content links. This article has " + wordCount + " words and " + linkCount + " links."});
              return true;
            }

            // 4. If all checks pass, send the article info
            const pageContent = {
              title: document.title,
              content: content,
              url: window.location.href,
              wordCount: wordCount
            };
            sendResponse({ success: true, data: pageContent });
            return true;
        } catch (error) {
          console.error('Content script error:', error);
          sendResponse({ error: "Failed to extract page content." });
          return true;
        }
      }
    });
  }
});