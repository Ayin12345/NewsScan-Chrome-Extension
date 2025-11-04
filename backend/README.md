# NewsScan Backend API

Backend server for the NewsScan browser extension. Handles all API calls to OpenAI, Gemini, and Google Custom Search to protect API keys.

## Setup

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env`
   - Add your API keys:
     ```
     OPENAI_API_KEY=sk-...
     GEMINI_API_KEY=AIzaSy...
     GOOGLE_API_KEY=AIzaSy...
     GOOGLE_SEARCH_ENGINE_ID=c424f03b2cfd34523
     ```

3. **Set CORS allowed origins:**
   - Add your extension ID to `ALLOWED_ORIGINS` in `.env`
   - Format: `chrome-extension://your-extension-id-here`
   - For development, you can use `chrome-extension://*` to allow all extensions

4. **Start the server:**
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

## API Endpoints

### `GET /api/health`
Health check endpoint. Returns server status and configured providers.

### `POST /api/analyze`
Analyzes an article using AI providers.

**Request:**
```json
{
  "prompt": "Analyze this article...",
  "providers": ["OpenAI", "Gemini"],
  "requestId": 1234567890
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "successfulResults": [
      {
        "provider": "OpenAI",
        "result": {
          "credibility_score": 75,
          "credibility_summary": "...",
          "reasoning": "...",
          "evidence_sentences": [...],
          "supporting_links": [...]
        }
      }
    ],
    "failedProviders": []
  },
  "requestId": 1234567890
}
```

### `POST /api/web-search`
Performs web search for related articles and fact-checking sources.

**Request:**
```json
{
  "title": "Article title",
  "url": "https://example.com/article",
  "limit": 5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "url": "https://source.com/article",
        "title": "Related article title",
        "snippet": "Article preview..."
      }
    ],
    "searchMethod": "ai-generated",
    "queryUsed": "search query",
    "aiQueryGenerated": "AI generated query"
  }
}
```

## Configuration

### Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `OPENAI_API_KEY` - OpenAI API key (required)
- `GEMINI_API_KEY` - Gemini API key (required)
- `GOOGLE_API_KEY` - Google Custom Search API key (required)
- `GOOGLE_SEARCH_ENGINE_ID` - Google Custom Search Engine ID (required)
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins

## Extension Configuration

In the extension's `.env` file, add:
```
VITE_BACKEND_URL=http://localhost:3000
```

For production, update this to your deployed backend URL.

## Security Notes

- Never commit `.env` file with real API keys
- Configure CORS properly for production
- Consider adding authentication tokens for additional security
- Rate limiting should be implemented for production use

