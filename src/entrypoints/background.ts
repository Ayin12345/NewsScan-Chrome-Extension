import { fetchOpenAI } from '../utils/aiHandling'
import { fetchGemini } from '../utils/aiHandling'
import { fetchCohere } from '../utils/aiHandling'
import { fetchMistral7B } from '../utils/aiHandling'
import { fetchMixtral8x7B } from '../utils/aiHandling'
import { fetchLlama } from '../utils/aiHandling'
import { defineBackground } from 'wxt/utils/define-background'

export default defineBackground({
  main() {
    chrome.runtime.onInstalled.addListener(() => {
      console.log('Extension installed')
    })

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'GET_PAGE_INFO') {
        (async () => {
          try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
            if (!tab?.id) {
              sendResponse({ success: false, error: 'No active tab found' });
              return;
            }

            const pageInfo = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_CONTENT'})
            if (pageInfo && pageInfo.error) {
              sendResponse({ success: false, error: pageInfo.error })
              return
            }

            // Make sure we're sending the correct data structure
            if (pageInfo.success && pageInfo.data) {
              sendResponse({ success: true, data: pageInfo.data })
            } else {
              sendResponse({ success: false, error: 'Invalid page info format' })
            }
          } catch (error) {
            sendResponse({ success: false, error: 'Failed to fetch page info' })
          }
        })()
      } else if (message.type === 'ANALYZE_ARTICLE') {
        (async () => {
          try {
            const providers = message.providers || []
            const results = await Promise.allSettled(
              providers.map(async (provider: string) => {
                switch (provider) {
                  case 'OpenAI':
                    return await fetchOpenAI(message.content, import.meta.env.VITE_OPENAI_API_KEY || '')
                  case 'Gemini':
                    return await fetchGemini(message.content, import.meta.env.VITE_GEMINI_API_KEY || '')
                  case 'Cohere':
                    return await fetchCohere(message.content, import.meta.env.VITE_COHERE_API_KEY || '')
                  case 'Mistral7B':
                    return await fetchMistral7B(message.content, import.meta.env.VITE_HUGGINGFACE_API_KEY || '')
                  case 'Mixtral8x7B':
                    return await fetchMixtral8x7B(message.content, import.meta.env.VITE_HUGGINGFACE_API_KEY || '')
                  case 'Llama':
                    return await fetchLlama(message.content, import.meta.env.VITE_HUGGINGFACE_API_KEY || '')
                  default:
                    throw new Error(`Unknown provider: ${provider}`)
                }
              })
            )
            
            sendResponse({
              success: true,
              data: results,
              providers: providers
            })
          } catch (error) {
            sendResponse({ success: false, error: 'Failed to analyze article' })
          }
        })()
      }
      return true
    })
  }
});