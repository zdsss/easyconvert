import { getPrompt } from '@shared/prompts';
import type { PromptType, Scenario } from '@shared/prompts';
import { deduplicateRequest } from '@shared/llmCache';
import { circuitBreaker } from '@shared/circuitBreaker';
import { serverLogger } from './logger';
import { createLogFn } from '@shared/logger';
import { TimeoutError } from '@shared/types';
import type { Resume } from '@shared/types';
import type { ParsingStrategy } from '@shared/parsingStrategy';
import { CostTracker } from '@shared/costTracker';
import {
  extractResume as coreExtractResume,
} from '@shared/extractWithLLM';
import type { ExtractEnvConfig } from '@shared/extractWithLLM';

/** Server-side cost tracker — tracks actual token usage from LLM responses */
export const serverCostTracker = new CostTracker();

const envConfig: ExtractEnvConfig = {
  getProvider: () => process.env.SERVER_LLM_PROVIDER || 'qwen',
  getApiKey: (provider) =>
    process.env[`SERVER_${provider.toUpperCase()}_API_KEY`],
  getPrompt: (promptType, scenario) => getPrompt(promptType as PromptType, (scenario || 'general') as Scenario),
  log: createLogFn(serverLogger),
  deduplicateRequest: (key, fn) => deduplicateRequest(key, fn),
  circuitBreakerExecute: (fn) => circuitBreaker.execute(fn),
  createTimeoutError: (message) => new TimeoutError(message),
  onResponse: (_parsed, data, model) => {
    const usage = (data as Record<string, unknown>).usage as
      | { prompt_tokens?: number; completion_tokens?: number }
      | undefined;
    if (usage) {
      serverCostTracker.record(model, usage.prompt_tokens || 0, usage.completion_tokens || 0);
    }
  },
};

export async function extractResume(
  text: string,
  strategy?: ParsingStrategy,
  pdfBase64?: string,
): Promise<Resume> {
  return coreExtractResume(text, strategy, envConfig, pdfBase64);
}
