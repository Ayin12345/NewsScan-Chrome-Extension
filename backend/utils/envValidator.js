export function validateEnvironment() {
  const required = [
    'OPENAI_API_KEY',
    'GEMINI_API_KEY',
    'GOOGLE_API_KEY',
    'GOOGLE_SEARCH_ENGINE_ID',
    'REDIS_URL'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  console.log('All required environment variables are set');
}

export function getOptionalEnv(key, defaultValue) {
  return process.env[key] || defaultValue;
}