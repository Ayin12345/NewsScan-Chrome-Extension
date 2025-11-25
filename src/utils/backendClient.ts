// Backend client utility for extension
// Handles communication with the backend API

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

interface AnalyzeRequest {
  prompt: string;
  providers: string[];
  requestId?: number;
  supportingLinks?: string[];
}

interface FailedProvider {
  provider: string;
  error: string;
  errorCode?: string;
  details?: Record<string, any>;
}

interface AnalyzeResponse {
  success: boolean;
  data?: {
    successfulResults: any[];
    failedProviders: FailedProvider[] | string[]; // Support both formats for backward compatibility
  };
  error?: string;
  requestId?: number;
}

interface WebSearchRequest {
  title: string;
  url?: string;
  limit?: number;
}

interface WebSearchResponse {
  success: boolean;
  data?: {
    results: Array<{
      url: string;
      title: string;
      snippet: string;
    }>;
    searchMethod: 'ai-generated' | 'fallback';
    queryUsed: string;
    aiQueryGenerated?: string;
    fallbackQueryUsed?: string;
  };
  error?: string;
}

export async function callBackendAnalyze(request: AnalyzeRequest): Promise<AnalyzeResponse> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    const response = await fetch(`${BACKEND_URL}/api/analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[BackendClient] Analyze error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to call backend'
    };
  }
}

export async function callBackendWebSearch(request: WebSearchRequest): Promise<WebSearchResponse> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    const response = await fetch(`${BACKEND_URL}/api/web-search`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || `HTTP ${response.status}` };
      }
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[BackendClient] Web search error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to call backend'
    };
  }
}


