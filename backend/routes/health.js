export async function healthRoute(req, res) {
  try {
    // Check if API keys are configured (without exposing them)
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasGemini = !!process.env.GEMINI_API_KEY;
    const hasGoogle = !!process.env.GOOGLE_API_KEY && !!process.env.GOOGLE_SEARCH_ENGINE_ID;

    const providers = {
      OpenAI: hasOpenAI ? 'configured' : 'missing',
      Gemini: hasGemini ? 'configured' : 'missing',
      GoogleSearch: hasGoogle ? 'configured' : 'missing'
    };

    const allConfigured = hasOpenAI && hasGemini && hasGoogle;

    res.json({
      status: allConfigured ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      providers,
      message: allConfigured 
        ? 'All services configured' 
        : 'Some API keys are missing'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
}

