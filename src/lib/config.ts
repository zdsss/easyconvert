const VALID_PROVIDERS = ['qwen', 'deepseek'] as const;

function validateEnv() {
  const provider = import.meta.env.VITE_LLM_PROVIDER;
  if (!provider) {
    throw new Error('VITE_LLM_PROVIDER is not set');
  }

  if (!VALID_PROVIDERS.includes(provider as any)) {
    throw new Error(`Invalid provider: ${provider}. Must be one of: ${VALID_PROVIDERS.join(', ')}`);
  }

  const apiKey = import.meta.env[`VITE_${provider.toUpperCase()}_API_KEY`];
  if (!apiKey || apiKey.length < 10) {
    throw new Error(`Invalid or missing API key for provider: ${provider}`);
  }

  return { provider, apiKey };
}

export const config = validateEnv();
