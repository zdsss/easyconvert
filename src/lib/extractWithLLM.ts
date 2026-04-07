import { TimeoutError } from '@lib/types';
import type { Resume } from '@lib/types';
import type { ParsingStrategy } from '@lib/parsingStrategy';
import { getPrompt } from '@lib/prompts';
import { detectLanguage } from './detectLanguage';
import { deduplicateRequest } from '@lib/llmCache';
import { logger } from '@lib/logger';
import { costTracker } from '@lib/monitoring/cost';
import { circuitBreaker } from '@lib/circuitBreaker';
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
    getPrompt(promptType as any, (scenario as any) || 'general', undefined, (lang as any) || 'zh'),
  log: (level, msg, meta) => (logger as any)[level](msg, meta),
  deduplicateRequest: (key, fn) => deduplicateRequest(key, fn),
  circuitBreakerExecute: (fn) => circuitBreaker.execute(fn),
  createTimeoutError: (message) => new TimeoutError(message),
  detectLanguage: (text) => detectLanguage(text),
  onResponse: (parsed, data, model, lang) => {
    // Cost tracking
    if (data.usage) {
      costTracker.setModel(model);
      costTracker.record(data.usage.prompt_tokens || 0, data.usage.completion_tokens || 0);
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
