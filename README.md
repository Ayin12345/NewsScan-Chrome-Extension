# NewsScan

AI-powered news credibility analysis and fake news detection Chrome extension. Built with React, TypeScript, and WXT.
NewsScan 1.1.0 is available on Chrome Extensions under the name "NewsScan"

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start development:
```bash
npm run dev
```

3. Load extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

4. Build for production:
```bash
npm run build
```

## About NewsScan

NewsScan uses advanced AI technology to analyze news articles for credibility and detect potential fake news. The extension provides:

- **Multi-provider AI Analysis**: Uses OpenAI and Gemini for comprehensive credibility scoring
- **Real-time Analysis**: Instantly analyzes articles as you browse
- **Evidence-based Results**: Provides reasoning and supporting evidence for credibility scores
- **Web Search Integration**: Cross-references claims with trusted sources
- **Sidebar Integration**: Works seamlessly with your browsing experience

## Project Structure

- `src/entrypoints/sidepanel/` - Main extension UI
- `src/entrypoints/background.ts` - Background script (service worker)
- `src/entrypoints/content.ts` - Content script (runs on web pages)
- `src/utils/` - AI analysis and web search utilities

## Development:

After running `npm run dev`, the extension will automatically reload when you make changes.

## API Keys:

NewsScan uses AI API keys kept hidden to the public to analyze the articles themselves. 
The API keys needed are:
- Gemini API key
- Open AI API key
- Render API key
- Google API key for additional source verification
- Google Search Engine ID
- Redis URL

Quick test checklist:
- ✅ Start Redis cache (required for backend)
- ✅ Test health endpoint: `curl http://localhost:3000/api/health`
- ✅ Verify cache is working
- ✅ Test API endpoints

Happy coding! 🚀 
