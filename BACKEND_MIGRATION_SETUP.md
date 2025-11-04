# Backend Migration Setup Guide

## Overview

The extension has been migrated to use a backend server for all API calls (OpenAI, Gemini, Google Custom Search). This protects your API keys by keeping them server-side instead of in the extension bundle.

## What Was Changed

### Phase 1: Backend Infrastructure ✅
- Created `backend/` directory with Node.js/Express server
- Set up package.json with dependencies (express, cors, dotenv)
- Created server.js with CORS configuration
- Added health check endpoint

### Phase 2: Analysis Endpoint ✅
- Implemented `/api/analyze` endpoint that handles OpenAI and Gemini calls
- Updated `src/utils/messageHandlers.ts` to call backend instead of direct APIs
- Created `src/utils/backendClient.ts` for backend communication

### Phase 3: Web Search Endpoint ✅
- Implemented `/api/web-search` endpoint for Google Custom Search
- Updated `src/utils/analysisOperations.ts` to use backend web search
- Maintained same response format for compatibility

### Cleanup ✅
- **REMOVED** `src/utils/aiHandling.ts` - Direct API calls (now on backend)
- **REMOVED** `src/utils/webSearch.ts` - Direct API calls (now on backend)
- Updated default providers in `analysisHelpers.ts` from `["Cohere"]` to `["OpenAI","Gemini"]`
- All API keys removed from extension code

## Setup Instructions

### 1. Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` and add your API keys:
     ```
     OPENAI_API_KEY=sk-your-key-here
     GEMINI_API_KEY=AIzaSy-your-key-here
     GOOGLE_API_KEY=AIzaSy-your-key-here
     GOOGLE_SEARCH_ENGINE_ID=c424f03b2cfd34523
     
     PORT=3000
     NODE_ENV=development
     ALLOWED_ORIGINS=chrome-extension://your-extension-id-here
     ```

4. **Start the backend server:**
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

   The server should start on `http://localhost:3000`

### 2. Extension Setup

1. **Update extension environment:**
   - Create/update `.env` file in the root directory:
     ```
     VITE_BACKEND_URL=http://localhost:3000
     VITE_AI_ROUTERS=["OpenAI","Gemini"]
     ```
   - **IMPORTANT:** Remove any of these from your `.env` file (they are no longer needed):
     - ❌ `VITE_OPENAI_API_KEY`
     - ❌ `VITE_GEMINI_API_KEY`
     - ❌ `VITE_GOOGLE_API_KEY`
     - ❌ `VITE_GOOGLE_SEARCH_ENGINE_ID`
   
   These should NOT be in the extension - they're now on the backend only!

2. **Get your extension ID:**
   - Load the extension in Chrome
   - Go to `chrome://extensions/`
   - Find your extension and copy the ID
   - Add it to `backend/.env` in `ALLOWED_ORIGINS`:
     ```
     ALLOWED_ORIGINS=chrome-extension://your-actual-extension-id-here
     ```

3. **Rebuild the extension:**
   ```bash
   npm run build
   ```

4. **Reload the extension:**
   - Go to `chrome://extensions/`
   - Click the reload button on your extension

## Testing

1. **Test backend health:**
   ```bash
   curl http://localhost:3000/api/health
   ```
   Should return status and provider configuration.

2. **Test the extension:**
   - Open any news article
   - Click the extension icon
   - The analysis should work exactly as before, but now calls go through the backend

## File Changes Summary

### New Files
- `backend/server.js` - Main server file
- `backend/routes/analyze.js` - Analysis endpoint
- `backend/routes/webSearch.js` - Web search endpoint
- `backend/routes/health.js` - Health check endpoint
- `backend/services/aiHandling.js` - AI service functions (moved from extension)
- `backend/services/webSearch.js` - Web search service (moved from extension)
- `backend/services/analysisProcessor.js` - Result processing utilities
- `backend/package.json` - Backend dependencies
- `backend/.gitignore` - Backend git ignore rules
- `backend/.env.example` - Backend environment template
- `backend/README.md` - Backend documentation
- `src/utils/backendClient.ts` - Extension backend client

### Modified Files
- `src/utils/messageHandlers.ts` - Now calls backend instead of direct APIs
- `src/utils/analysisOperations.ts` - Uses backend web search
- `.env.example` - Updated with backend URL (no API keys)

### Files No Longer Used (but kept for reference)
- `src/utils/aiHandling.ts` - Still exists but not imported in production code
- `src/utils/webSearch.ts` - Still exists but not used for direct API calls

## Production Deployment

### Backend Deployment
Deploy the backend to a hosting service:
- **Vercel/Netlify:** Use serverless functions
- **Railway/Render:** Deploy as Node.js app
- **Cloudflare Workers:** Convert to Workers format
- **VPS:** Run as a Node.js service with PM2

Update `ALLOWED_ORIGINS` in production to match your production extension ID.

### Extension Update
Update the extension's `.env`:
```
VITE_BACKEND_URL=https://your-production-backend-url.com
```

Rebuild and publish the extension.

## Troubleshooting

### "CORS blocked" error
- Check that your extension ID is in `ALLOWED_ORIGINS` in `backend/.env`
- Restart the backend server after changing `.env`

### "Backend request failed" error
- Verify backend is running: `curl http://localhost:3000/api/health`
- Check `VITE_BACKEND_URL` in extension `.env` matches backend URL
- Check browser console for detailed error messages

### API key errors
- Verify all API keys are set in `backend/.env`
- Check backend logs for specific provider errors
- Ensure no API keys remain in extension `.env` file

## Security Notes

✅ **API keys are now secure** - They're only on the backend server  
✅ **CORS protection** - Only your extension can call the backend  
⚠️ **For production:** Consider adding authentication tokens for additional security  
⚠️ **Never commit** `.env` files with real API keys

## Next Steps (Future Phases)

- Phase 4: Add rate limiting and access control
- Phase 5: Implement caching layer
- Phase 6: Add monitoring and logging
- Phase 7: Error handling improvements
- Phase 8: Add authentication tokens

