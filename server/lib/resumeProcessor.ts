import { parsePdf } from './parsePdf';
import { parseDocx } from './parseDocx';
import { extractResume } from './extractWithLLM';
import { hashFile } from './hashFile';
import { getCached, setCache } from './cache';
import { serverLogger } from './logger';
import { hashResume, checkDuplicate, registerResult } from './dedup';
import type { ServerFileInput } from './types';
import type { Resume, CacheData } from '@shared/types';
import type { StageName } from '@shared/processTracer';

// 直接复用同构模块
import { classifyResume } from '@shared/classifiers';
import { getStrategy } from '@shared/parsingStrategy';
import { classifyContent } from '@shared/classifiers/contentClassifier';
import { validateWithZod } from '@shared/validation/engine';
import { runWithLimit } from '@shared/concurrency';

export interface ServerProcessOptions {
  enableCache?: boolean;
  enableClassification?: boolean;
  enableValidation?: boolean;
  onStageComplete?: (stage: StageName, data?: any) => void;
}

export interface ServerProcessResult {
  resume: Resume;
  classification?: any;
  difficultyClass?: string;
  fromCache: boolean;
  hash: string;
  validation?: any;
  attempts?: number;
  finalStrategy?: string;
  duplicate?: boolean;
  existingId?: string;
}

/**
 * 服务端简历处理管线 — 9 阶段编排器
 * 替代前端 resumeProcessor，使用 Buffer 输入
 */
export async function processResume(
  file: ServerFileInput,
  options: ServerProcessOptions = {}
): Promise<ServerProcessResult> {
  const { enableCache = true, enableClassification = true, enableValidation = true, onStageComplete } = options;

  const startTime = Date.now();
  onStageComplete?.('file_upload');

  // Stage 1: Hash
  const hash = hashFile(file.buffer);
  serverLogger.debug('File hash computed', { hash, fileName: file.name, size: file.size });

  // Stage 2: Cache check
  if (enableCache) {
    const cacheStart = Date.now();
    const cached = await getCached(hash);
    const cacheTime = Date.now() - cacheStart;

    if (cached) {
      serverLogger.debug('Cache lookup', { result: 'HIT', hash, time: cacheTime });
      onStageComplete?.('file_parse');
      onStageComplete?.('difficulty_classify');
      onStageComplete?.('strategy_select');
      onStageComplete?.('llm_extract');
      onStageComplete?.('content_classify');
      onStageComplete?.('validation');
      onStageComplete?.('cache_store');
      return {
        resume: cached.resume,
        classification: cached.contentClass,
        fromCache: true,
        hash,
      };
    }
    serverLogger.debug('Cache lookup', { result: 'MISS', hash, time: cacheTime });
  }

  // Stage 3: Parse file
  onStageComplete?.('file_parse');
  const text = file.name.endsWith('.pdf')
    ? await parsePdf(file.buffer)
    : await parseDocx(file.buffer);

  // Stage 4: Classify difficulty
  onStageComplete?.('difficulty_classify');
  const difficultyClass = classifyResume(text);

  // Stage 5: Select strategy
  onStageComplete?.('strategy_select');
  const strategy = getStrategy(difficultyClass);

  // Stage 6: Extract with LLM
  onStageComplete?.('llm_extract');
  const resume = await runWithLimit(() => extractResume(text, strategy));

  // Dedup check
  const resumeHash = hashResume(resume);
  const existingId = checkDuplicate(resumeHash);
  if (existingId) {
    return { resume, fromCache: false, hash, duplicate: true, existingId };
  }
  registerResult(resumeHash, hash);

  // Stage 7: Classify content
  let classification;
  if (enableClassification) {
    onStageComplete?.('content_classify');
    classification = classifyContent(resume, text);
  }

  // Stage 8: Validate
  let validation;
  if (enableValidation) {
    onStageComplete?.('validation');
    validation = validateWithZod(resume, strategy.validationLevel);
  }

  // Stage 9: Cache store
  if (enableCache && (!enableValidation || validation?.isValid)) {
    onStageComplete?.('cache_store');
    const cacheData: CacheData = { resume, contentClass: classification, timestamp: Date.now() };
    await setCache(hash, cacheData);
  }

  serverLogger.info('Resume processed', {
    fileName: file.name,
    hash,
    difficulty: difficultyClass.difficulty,
    time: Date.now() - startTime,
  });

  return {
    resume,
    classification,
    difficultyClass: difficultyClass.difficulty,
    fromCache: false,
    hash,
    validation,
  };
}

/**
 * 多策略回退处理
 */
export async function processResumeWithFeedback(
  file: ServerFileInput
): Promise<ServerProcessResult> {
  const hash = hashFile(file.buffer);
  const text = file.name.endsWith('.pdf')
    ? await parsePdf(file.buffer)
    : await parseDocx(file.buffer);
  const difficultyClass = classifyResume(text);

  const strategies = [
    { promptType: 'comprehensive' as const, temperature: 0.3, timeout: 30000, maxRetries: 2, validationLevel: 'strict' as const },
    { promptType: 'standard' as const, temperature: 0.4, timeout: 20000, maxRetries: 2, validationLevel: 'standard' as const },
    { promptType: 'basic' as const, temperature: 0.3, timeout: 15000, maxRetries: 1, validationLevel: 'basic' as const },
  ];

  const promises = strategies.map(async (strategy, index) => {
    try {
      const resume = await runWithLimit(() => extractResume(text, strategy));
      const validation = validateWithZod(resume, strategy.validationLevel);
      if (validation.isValid) {
        return { resume, strategy: strategy.promptType, index, validation };
      }
      return null;
    } catch {
      return null;
    }
  });

  const results = await Promise.all(promises);
  const valid = results.find((r) => r !== null);

  if (valid) {
    const classification = classifyContent(valid.resume, text);
    await setCache(hash, { resume: valid.resume, contentClass: classification, timestamp: Date.now() });
    return {
      resume: valid.resume,
      classification,
      difficultyClass: difficultyClass.difficulty,
      fromCache: false,
      hash,
      validation: valid.validation,
      attempts: valid.index + 1,
      finalStrategy: valid.strategy,
    };
  }

  throw new Error('All strategies failed');
}
