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

4. **Start Redis (Required):**
   ```bash
   # Using Docker (recommended)
   docker run -d -p 6379:6379 --name redis redis:alpine
   
   # Or install locally (see TESTING_GUIDE.md for details)
   ```

5. **Configure Redis URL in `.env`:**
   ```bash
   REDIS_URL=redis://localhost:6379
   ```

6. **Start the server:**
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```
   
   **Expected output:**
   ```
   ✅ Redis connected successfully
   [NewsScan Backend] Server running on port 3000
   ```

## API Endpoints

### `GET /api/health`
Health check endpoint. Returns server status, API keys, Redis connection, and memory usage.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600,
  "environment": "development",
  "version": "1.0.0",
  "checks": {
    "apiKeys": {
      "openai": true,
      "gemini": true,
      "google": true,
      "googleSearchEngineId": true
    },
    "cache": {
      "status": "connected",
      "redis": true
    },
    "memory": {
      "used": 45,
      "total": 128,
      "unit": "MB"
    }
  }
}
```

**Status Codes:**
- `200`: All systems healthy
- `503`: Degraded or unhealthy

**Testing:**
```bash
curl http://localhost:3000/api/health
```

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

## Security Features

### Rate Limiting
- **Analysis endpoint**: 100 requests/hour per IP
- **Web search endpoint**: 50 requests/hour per IP
- **General API**: 200 requests/15 minutes per IP

### Authentication (Optional)
- Token-based authentication via `Authorization: Bearer <token>` header
- Set `ACCESS_TOKEN_SECRET` in `.env` to enable
- If not set, authentication is disabled (development mode)

### Input Validation
- Prompt length limits (50,000 chars max)
- Provider validation (only OpenAI/Gemini allowed)
- URL format validation
- Request size limits

### Caching
- **Analysis results**: Cached for 7 days (Redis)
- **Web search results**: Cached for 24 hours (Redis)
- Redis cache required for production scalability
- Cache statistics available via `/api/health`

## Environment Variables

### Required
- `OPENAI_API_KEY` - OpenAI API key (required)
- `GEMINI_API_KEY` - Gemini API key (required)
- `GOOGLE_API_KEY` - Google Custom Search API key (required)
- `GOOGLE_SEARCH_ENGINE_ID` - Google Custom Search Engine ID (required)

### Optional
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins
- `ACCESS_TOKEN_SECRET` - Access token for authentication (optional, enables auth if set)

## Testing

See **[TESTING_GUIDE.md](../TESTING_GUIDE.md)** for complete testing instructions including:
- How to start Redis cache
- How to test health endpoint
- How to verify cache is working
- How to test API endpoints
- Troubleshooting common issues

### Quick Test

```bash
# 1. Start Redis
docker run -d -p 6379:6379 --name redis redis:alpine

# 2. Start server
npm start

# 3. Test health endpoint
curl http://localhost:3000/api/health
```

## Token Generation

To generate an access token for production:

```bash
curl http://localhost:3000/api/token
```

Add the generated token to:
- `backend/.env`: `ACCESS_TOKEN_SECRET=<generated-token>`
- Extension `.env`: `VITE_ACCESS_TOKEN=<generated-token>`

