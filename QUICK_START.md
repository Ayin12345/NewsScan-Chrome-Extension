# Quick Start Guide

## Steps to Get Running

### 1. Create Backend `.env` File
Create `backend/.env` with your API keys (see setup instructions)

### 2. Install Backend Dependencies ⚠️ REQUIRED
```bash
cd backend
npm install
```

This installs:
- `express` - Web server
- `cors` - CORS handling  
- `dotenv` - Environment variables

### 3. Start Backend Server
```bash
# From the backend directory:
npm start

# OR for development (auto-reload on changes):
npm run dev
```

You should see:
```
[NewsScan Backend] Server running on port 3000
[NewsScan Backend] Environment: development
[NewsScan Backend] Allowed origins: chrome-extension://*
```

### 4. Update Extension `.env`
Make sure your root `.env` has:
```env
VITE_BACKEND_URL=http://localhost:3000
VITE_AI_ROUTERS=["OpenAI","Gemini"]
```

### 5. Rebuild Extension (if needed)
```bash
# From root directory:
npm run build
```

Then reload the extension in Chrome.

## Summary

✅ Create `backend/.env`  
✅ Run `npm install` in `backend/` folder  
✅ Run `npm start` in `backend/` folder  
✅ Update root `.env`  
✅ Test!


