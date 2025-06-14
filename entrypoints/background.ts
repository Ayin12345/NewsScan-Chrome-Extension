import { fetchOpenAI } from '../utils/aiHandling'
import { fetchGemini } from '../utils/aiHandling'
import { fetchCohere } from '../utils/aiHandling'
import { fetchMistral7B } from '../utils/aiHandling'
import { fetchMixtral8x7B } from '../utils/aiHandling'
import { fetchLlama } from '../utils/aiHandling'

export default {
  main() {
    // Example: Listen for extension installation
    chrome.runtime.onInstalled.addListener(() => {
      console.log('Extension installed')
    })

    // Example: Listen for messages
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'GET_PAGE_INFO') {
        (async () => {
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
          const pageInfo = await chrome.tabs.sendMessage(tab.id!, { type: 'GET_PAGE_CONTENT'})
          if (pageInfo && pageInfo.error) {
            sendResponse({ success: false, error: pageInfo.error })
            return
          } else {
            sendResponse({ success: true, data: pageInfo })
            chrome.storage.local.set({ pageInfo: pageInfo })
          }
        } catch (error) {
          console.error('Error fetching page info:', error)
          sendResponse({ success: false, error: 'Failed to fetch page info' })
        }
      })()
      }
      return true
    })

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'ANALYZE_ARTICLE') {
        const { content, providers } = message
        const tasks: Promise<any>[] = []
        
        for (const provider of providers) {
          if (provider === 'Openai') {
            tasks.push(fetchOpenAI(content, import.meta.env.VITE_OPENAI_API_KEY || ''))
          }
          else if (provider === 'Gemini') {
            tasks.push(fetchGemini(content, import.meta.env.VITE_GEMINI_API_KEY || '').then(response => {
              console.log('🔮 Gemini response:', response);
              return response;
            }))
          }
          else if (provider === 'Cohere') {
            tasks.push(fetchCohere(content, import.meta.env.VITE_COHERE_API_KEY || '').then(response => {
              console.log('🧠 Cohere response:', response);
              return response;
            }))
          }
          else if (provider === 'Mistral'){
            tasks.push(fetchMistral7B(content, import.meta.env.VITE_HUGGINGFACE_API_KEY || ''))
          }
          else if (provider === 'Mixtral'){
            tasks.push(fetchMixtral8x7B(content, import.meta.env.VITE_HUGGINGFACE_API_KEY || ''))
          }
          else if (provider === 'Llama') {
            tasks.push(fetchLlama(content, import.meta.env.VITE_HUGGINGFACE_API_KEY || '').then(response => {
              console.log('🦙 Llama response:', response);
              return response;
            }))
          }
        }
        
       Promise.allSettled(tasks)
       .then(results => {
        sendResponse({ success: true, data: results, providers })
       })
       .catch(error => {
        console.error('Analysis failed:', error);
        sendResponse({ success: false, error: 'Analysis failed' })
       })
       
       return true
      } 
    })
  }
};