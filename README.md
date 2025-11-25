# NewsScan

AI-powered news credibility analysis and fake news detection Chrome extension. Built with React, TypeScript, and WXT.

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

## Development

After running `npm run dev`, the extension will automatically reload when you make changes.

## Testing

For complete testing instructions, see **[TESTING_GUIDE.md](./TESTING_GUIDE.md)**.

Quick test checklist:
- ✅ Start Redis cache (required for backend)
- ✅ Test health endpoint: `curl http://localhost:3000/api/health`
- ✅ Verify cache is working
- ✅ Test API endpoints

Happy coding! 🚀 



THINGS TO DO:
Add code for view button to view the actual analyses pages
X button not workibng

## Sidebar surfaces

- **Default (Side Panel)**: Opens via the extension icon or keyboard shortcuts. Runs in Chrome’s Side Panel surface. It cannot push/collapse the host page due to platform limitations.
- **Optional (Injected Sidebar)**: When enabled in Side Panel → Settings, a docked panel is injected into pages. It is resizable and collapsible, and it pushes page content by adjusting body margin. State is stored per‑domain.

### Enable/disable Injected Sidebar
- Open the Side Panel → Settings.
- Toggle “Enable Injected Sidebar”.
- Optional: Set a default injected width (240–640px).

### Known limitations
- Side Panel cannot affect host page layout.
- Injected Sidebar may conflict with sites that heavily mutate layout or reset margins. Disable it on those sites via the Settings toggle.

### Dev/build
- Start: `npm run dev` (WXT dev server)
- Build: `npm run build`
- Load in Chrome: `chrome://extensions` → “Load unpacked” → select `.output/chrome-mv3`