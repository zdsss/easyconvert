import { getPrompt } from '@shared/prompts';
import { deduplicateRequest } from '@shared/llmCache';
import { circuitBreaker } from '@shared/circuitBreaker';
import { serverLogger } from './logger';
import { TimeoutError } from '@shared/types';
import type { Resume } from '@shared/types';
import type { ParsingStrategy } from '@shared/parsingStrategy';
import {
  extractResume as coreExtractResume,
  isRetryableError,
  getRetryDelay,
  resumeSchema,
} from '@shared/extractWithLLM';
import type { ExtractEnvConfig } from '@shared/extractWithLLM';

export { TimeoutError };
export { isRetryableError, getRetryDelay, resumeSchema };

const envConfig: ExtractEnvConfig = {
  getProvider: () => process.env.SERVER_LLM_PROVIDER || process.env.VITE_LLM_PROVIDER || 'qwen',
  getApiKey: (provider) =>
    process.env[`SERVER_${provider.toUpperCase()}_API_KEY`] ||
    process.env[`VITE_${provider.toUpperCase()}_API_KEY`],
  getPrompt: (promptType, scenario) => getPrompt(promptType as any, (scenario as any) || 'general'),
  log: (level, msg, meta) => (serverLogger as any)[level](msg, meta),
  deduplicateRequest: (key, fn) => deduplicateRequest(key, fn),
  circuitBreakerExecute: (fn) => circuitBreaker.execute(fn),
  createTimeoutError: (message) => new TimeoutError(message),
};

export async function extractResume(
  text: string,
  strategy?: ParsingStrategy,
  pdfBase64?: string,
): Promise<Resume> {
  return coreExtractResume(text, strategy, envConfig, pdfBase64);
}
