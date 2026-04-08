import { getPrompt } from '@shared/prompts';
import { deduplicateRequest } from '@shared/llmCache';
import { circuitBreaker } from '@shared/circuitBreaker';
import { serverLogger } from './logger';
import { createLogFn } from '@shared/logger';
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


const envConfig: ExtractEnvConfig = {
  getProvider: () => process.env.SERVER_LLM_PROVIDER || 'qwen',
  getApiKey: (provider) =>
    process.env[`SERVER_${provider.toUpperCase()}_API_KEY`],
  getPrompt: (promptType, scenario) => getPrompt(promptType, scenario || 'general'),
  log: createLogFn(serverLogger),
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
