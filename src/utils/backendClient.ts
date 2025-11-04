// Backend client utility for extension
// Handles communication with the backend API

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

interface AnalyzeRequest {
  prompt: string;
  providers: string[];
  requestId?: number;
  supportingLinks?: string[];
}

interface AnalyzeResponse {
  success: boolean;
  data?: {
    successfulResults: any[];
    failedProviders: string[];
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
    const response = await fetch(`${BACKEND_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
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
    console.log('[BackendClient] Sending web search request:', {
      url: `${BACKEND_URL}/api/web-search`,
      request: request
    });

    const response = await fetch(`${BACKEND_URL}/api/web-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    console.log('[BackendClient] Web search response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[BackendClient] Web search error response:', errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || `HTTP ${response.status}` };
      }
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const jsonResponse = await response.json();
    console.log('[BackendClient] Web search success:', {
      success: jsonResponse.success,
      hasData: !!jsonResponse.data,
      resultsCount: jsonResponse.data?.results?.length || 0
    });
    return jsonResponse;
  } catch (error) {
    console.error('[BackendClient] Web search error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to call backend'
    };
  }
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.status === 'healthy' || data.status === 'degraded';
  } catch (error) {
    console.error('[BackendClient] Health check failed:', error);
    return false;
  }
}

