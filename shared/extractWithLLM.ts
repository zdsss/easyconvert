import { z } from 'zod';
import type { Resume, ParsingStrategy } from './types';
import { resumeSchema as zodResumeSchema } from './validation/schemas';

export type { Resume, ParsingStrategy };

// ---------------------------------------------------------------------------
// Adapter interface — each environment (frontend / server) provides its own
// ---------------------------------------------------------------------------
export interface ExtractEnvConfig {
  getProvider(): string;
  getApiKey(provider: string): string | undefined;
  getPrompt(promptType: string, scenario?: string, template?: string, lang?: string): string;
  log(level: 'debug' | 'info' | 'warn' | 'error', msg: string, meta?: Record<string, unknown>): void;
  deduplicateRequest<T>(key: string, fn: () => Promise<T>): Promise<T>;
  circuitBreakerExecute<T>(fn: () => Promise<T>): Promise<T>;
  createTimeoutError(message: string): Error;
  /** Called after a successful LLM response — cost tracking, confidence, etc. */
  onResponse?(parsed: Record<string, unknown>, data: Record<string, unknown>, model: string, lang?: string): void;
  /** Optional language detection (frontend only) */
  detectLanguage?(text: string): string;
}

// ---------------------------------------------------------------------------
// Pure helper functions
// ---------------------------------------------------------------------------
export function isRetryableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : '';
  const name = error instanceof Error ? error.name : '';
  if (name === 'TimeoutError') return true;
  if (name === 'AbortError') return true;
  if (msg.includes('network') || msg.includes('ECONNREFUSED')) return true;
  if (msg.includes('429')) return true;
  if (msg.includes('401') || msg.includes('403')) return false;
  if (msg.includes('API error')) return true;
  return false;
}

export function getRetryDelay(error: unknown): number {
  const msg = error instanceof Error ? error.message : '';
  if (msg.includes('429')) return 5000;
  return 0;
}

// ---------------------------------------------------------------------------
// Resume JSON Schema — derived from the Zod schema (single source of truth)
// ---------------------------------------------------------------------------
export const resumeSchema = z.toJSONSchema(zodResumeSchema);

// ---------------------------------------------------------------------------
// Provider configs
// ---------------------------------------------------------------------------
const PROVIDER_CONFIGS: Record<string, { url: string; model: string }> = {
  qwen: {
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-plus',
  },
  deepseek: {
    url: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
  },
};

// ---------------------------------------------------------------------------
// Core extraction — called by both frontend and server adapters
// ---------------------------------------------------------------------------
export async function extractResume(
  text: string,
  strategy: ParsingStrategy | undefined,
  config: ExtractEnvConfig,
  pdfBase64?: string,
): Promise<Resume> {
  const strat = strategy || {
    timeout: 10000,
    temperature: 0.05,
    maxRetries: 2,
    promptType: 'standard' as const,
    validationLevel: 'standard' as const,
  };

  const source = pdfBase64 || text;
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = ((hash << 5) - hash + source.charCodeAt(i)) | 0;
  }
  const cacheKey = `${hash.toString(36)}-${source.length}-${strat.promptType}`;
  return config.deduplicateRequest(cacheKey, async () => {
    for (let attempt = 0; attempt <= strat.maxRetries; attempt++) {
      try {
        return await config.circuitBreakerExecute(() =>
          extractWithTimeout(text, strat, config, pdfBase64),
        );
      } catch (error) {
        if (attempt === strat.maxRetries || !isRetryableError(error)) throw error;
        const delay = getRetryDelay(error);
        if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
        config.log('debug', 'Retrying LLM request', {
          attempt,
          error: error instanceof Error ? error.message : 'Unknown error',
          delay,
        });
      }
    }
    throw new Error('Max retries exceeded');
  });
}

// ---------------------------------------------------------------------------
// Internal: single LLM call with timeout
// ---------------------------------------------------------------------------
async function extractWithTimeout(
  text: string,
  strategy: ParsingStrategy,
  config: ExtractEnvConfig,
  pdfBase64?: string,
): Promise<Resume> {
  const provider = config.getProvider();
  const apiKey = config.getApiKey(provider);

  const providerConfig = PROVIDER_CONFIGS[provider];
  if (!providerConfig) throw new Error(`Unsupported provider: ${provider}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), strategy.timeout);

  try {
    // Language detection (frontend provides this, server skips)
    let lang: string | undefined;
    if (config.detectLanguage) {
      const detected = pdfBase64 ? 'zh' : config.detectLanguage(text);
      lang = detected === 'unknown' ? 'zh' : detected;
    }

    const prompt = config.getPrompt(strategy.promptType, strategy.scenario, undefined, lang);

    const userContent = `${prompt}\n\n简历文本：\n${text}`;

    const response = await fetch(providerConfig.url, {
      signal: controller.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: providerConfig.model,
        messages: [{ role: 'user', content: userContent }],
        response_format:
          provider === 'qwen'
            ? {
                type: 'json_schema',
                json_schema: { name: 'resume_extraction', strict: true, schema: resumeSchema },
              }
            : { type: 'json_object' },
        temperature: strategy.temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);

    // Let the adapter do post-processing (cost tracking, confidence, language tag, etc.)
    config.onResponse?.(parsed, data, providerConfig.model, lang);

    return parsed;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw config.createTimeoutError(`Request timeout after ${strategy.timeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
