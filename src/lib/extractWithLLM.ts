import { TimeoutError } from '@lib/types';
import type { Resume } from '@lib/types';
import type { ParsingStrategy } from '@shared/parsingStrategy';
import { getPrompt } from '@shared/prompts';
import type { PromptType, Scenario } from '@shared/prompts';
import { detectLanguage } from './detectLanguage';
import { deduplicateRequest } from '@shared/llmCache';
import { logger } from '@lib/logger';
import { createLogFn } from '@shared/logger';
import { costTracker } from '@lib/monitoring/cost';
import { circuitBreaker } from '@shared/circuitBreaker';
import {
  extractResume as coreExtractResume,
  isRetryableError,
  getRetryDelay,
  resumeSchema,
} from '@shared/extractWithLLM';
import type { ExtractEnvConfig } from '@shared/extractWithLLM';

export { TimeoutError, isRetryableError, getRetryDelay, resumeSchema };

function extractConfidence(obj: Record<string, unknown>, prefix = ''): Record<string, number> {
  const map: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.endsWith('_confidence') && typeof v === 'number') {
      map[prefix + k.replace('_confidence', '')] = v;
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(map, extractConfidence(v as Record<string, unknown>, `${prefix}${k}.`));
    }
  }
  return map;
}

const envConfig: ExtractEnvConfig = {
  getProvider: () => import.meta.env.VITE_LLM_PROVIDER || 'qwen',
  getApiKey: (provider) => import.meta.env[`VITE_${provider.toUpperCase()}_API_KEY`],
  getPrompt: (promptType, scenario, _template, lang) =>
    getPrompt(promptType as PromptType, scenario as Scenario || 'general', undefined, (lang || 'zh') as 'zh' | 'en' | 'ja'),
  log: createLogFn(logger),
  deduplicateRequest: (key, fn) => deduplicateRequest(key, fn),
  circuitBreakerExecute: (fn) => circuitBreaker.execute(fn),
  createTimeoutError: (message) => new TimeoutError(message),
  detectLanguage: (text) => detectLanguage(text),
  onResponse: (parsed, data, model, lang) => {
    // Cost tracking
    if (data.usage) {
      costTracker.record(model, data.usage.prompt_tokens || 0, data.usage.completion_tokens || 0);
    }
    // Confidence extraction
    const confidenceMap = extractConfidence(parsed as Record<string, unknown>);
    if (Object.keys(confidenceMap).length > 0) {
      parsed.additional = { ...parsed.additional, _confidence: confidenceMap };
    }
    // Language tag
    parsed.additional = { ...parsed.additional, language: lang || 'zh' };
  },
};

export async function extractResume(
  text: string,
  strategy?: ParsingStrategy,
  pdfBase64?: string,
): Promise<Resume> {
  return coreExtractResume(text, strategy, envConfig, pdfBase64);
}
