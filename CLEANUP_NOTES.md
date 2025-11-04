# Code Cleanup - Backend Migration

## Files Removed

### Deleted Files
- ✅ `src/utils/aiHandling.ts` - Direct OpenAI/Gemini API calls (moved to backend)
- ✅ `src/utils/webSearch.ts` - Direct Google Custom Search API calls (moved to backend)

These files contained direct API calls with API keys that are now handled server-side.

## Code Changes

### Updated Files
- ✅ `src/utils/analysisHelpers.ts` - Updated default providers from `["Cohere"]` to `["OpenAI","Gemini"]`
- ✅ `src/utils/messageHandlers.ts` - Now uses `backendClient` instead of direct API calls
- ✅ `src/utils/analysisOperations.ts` - Now uses `backendClient` for web search

## Environment Variables

### ⚠️ IMPORTANT: Remove from `.env`
These environment variables should be **REMOVED** from your extension `.env` file:
- ❌ `VITE_OPENAI_API_KEY` - No longer needed (moved to backend)
- ❌ `VITE_GEMINI_API_KEY` - No longer needed (moved to backend)
- ❌ `VITE_GOOGLE_API_KEY` - No longer needed (moved to backend)
- ❌ `VITE_GOOGLE_SEARCH_ENGINE_ID` - No longer needed (moved to backend)

### ✅ Required in Extension `.env`
These should remain/be added:
- ✅ `VITE_BACKEND_URL` - Backend API URL (e.g., `http://localhost:3000`)
- ✅ `VITE_AI_ROUTERS` - Provider configuration (e.g., `["OpenAI","Gemini"]`)

### ✅ Required in Backend `.env`
Add these to `backend/.env`:
- ✅ `OPENAI_API_KEY` - Your OpenAI API key
- ✅ `GEMINI_API_KEY` - Your Gemini API key
- ✅ `GOOGLE_API_KEY` - Your Google Custom Search API key
- ✅ `GOOGLE_SEARCH_ENGINE_ID` - Your Google Search Engine ID
- ✅ `ALLOWED_ORIGINS` - Extension IDs allowed to access the backend
- ✅ `PORT` - Backend server port (default: 3000)

## Verification

To verify the cleanup:
1. ✅ Search for `VITE_OPENAI_API_KEY` in `src/` - should find nothing
2. ✅ Search for `VITE_GEMINI_API_KEY` in `src/` - should find nothing
3. ✅ Search for `VITE_GOOGLE_API_KEY` in `src/` - should find nothing
4. ✅ Check that `src/utils/aiHandling.ts` is deleted
5. ✅ Check that `src/utils/webSearch.ts` is deleted
6. ✅ Verify all imports in `messageHandlers.ts` use `backendClient`

## Old Files (Reference Only)

These files are kept for reference but are not used:
- `src/entrypoints/sidepanel/App-old.tsx` - Old implementation (can be removed if desired)

