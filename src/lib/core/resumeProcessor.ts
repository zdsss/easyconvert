import { parsePdf } from '@lib/parsers/parsePdf';
import { parseDocx } from '@lib/parsers/parseDocx';
import { extractResume } from '@lib/extractWithLLM';
import { classifyContent } from '@lib/classifiers/contentClassifier';
import { classifyResume } from '@lib/classifiers';
import { getStrategy } from '@lib/parsingStrategy';
import { hashFile, getCached, setCache } from '@lib/cache';
import { runWithLimit } from '@lib/concurrency';
import { recordSuccess } from '@lib/metrics';
import { validateWithZod } from '@lib/validation/engine';
import { logger } from '@lib/logger';
import { cacheAnalyzer } from '@lib/cacheAnalyzer';
import type { Resume } from '@lib/types';
import type { StageName } from '@lib/processTracer';

export interface ProcessOptions {
  enableCache?: boolean;
  enableClassification?: boolean;
  enableValidation?: boolean;
  onStageComplete?: (stage: StageName, data?: any) => void;
}

export interface ProcessResult {
  resume: Resume;
  classification?: any;
  difficultyClass?: string;
  fromCache: boolean;
  hash: string;
  validation?: any;
  attempts?: number;
  finalStrategy?: string;
}

/**
 * 处理简历文件的完整流程
 * @param file - PDF 或 DOCX 简历文件
 * @param options - 处理选项
 * @param options.enableCache - 是否启用缓存（默认 true）
 * @param options.enableClassification - 是否启用内容分类（默认 true）
 * @param options.enableValidation - 是否启用验证（默认 true）
 * @param options.onStageComplete - 阶段完成回调函数
 * @returns 处理结果，包含简历数据、分类、验证结果
 * @throws {ValidationError} 文件格式或大小不符合要求
 * @throws {TimeoutError} 处理超时
 */
export async function processResume(
  file: File,
  options: ProcessOptions = {}
): Promise<ProcessResult> {
  const { enableCache = true, enableClassification = true, enableValidation = true, onStageComplete } = options;

  const startTime = Date.now();
  onStageComplete?.('file_upload');
  const hash = await hashFile(file);
  logger.debug('File hash computed', { hash, fileName: file.name, size: file.size });

  // Check cache
  if (enableCache) {
    const cacheStart = Date.now();
    const cached = await getCached(hash);
    const cacheTime = Date.now() - cacheStart;

    if (cached) {
      cacheAnalyzer.recordHit(cacheTime);
      logger.debug('Cache lookup', { result: 'HIT', hash, time: cacheTime });
      onStageComplete?.('file_parse');
      onStageComplete?.('difficulty_classify');
      onStageComplete?.('strategy_select');
      onStageComplete?.('llm_extract');
      onStageComplete?.('content_classify');
      onStageComplete?.('validation');
      onStageComplete?.('cache_store');
      recordSuccess(Date.now() - startTime, true);
      return {
        resume: cached.resume,
        classification: cached.contentClass,
        fromCache: true,
        hash
      };
    }
    cacheAnalyzer.recordMiss(cacheTime);
    logger.debug('Cache lookup', { result: 'MISS', hash, time: cacheTime });
  }

  // Parse file
  onStageComplete?.('file_parse');
  const text = file.name.endsWith('.pdf') ? await parsePdf(file) : await parseDocx(file);

  // Classify difficulty
  onStageComplete?.('difficulty_classify');
  const difficultyClass = classifyResume(text);

  // Select strategy
  onStageComplete?.('strategy_select');
  const strategy = getStrategy(difficultyClass);

  // Extract with LLM
  onStageComplete?.('llm_extract');
  const resume = await runWithLimit(() => extractResume(text, strategy));

  // Classify content
  let classification;
  if (enableClassification) {
    onStageComplete?.('content_classify');
    classification = classifyContent(resume, text);
  }

  // Validate
  let validation;
  if (enableValidation) {
    onStageComplete?.('validation');
    validation = validateWithZod(resume, strategy.validationLevel);
  }

  // Cache if valid
  if (enableCache && (!enableValidation || validation?.isValid)) {
    onStageComplete?.('cache_store');
    await setCache(hash, { resume, contentClass: classification, timestamp: Date.now() });
  }

  recordSuccess(Date.now() - startTime, false);

  return {
    resume,
    classification,
    difficultyClass: difficultyClass.difficulty,
    fromCache: false,
    hash,
    validation
  };
}
