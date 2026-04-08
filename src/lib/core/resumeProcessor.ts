import { parsePdf } from '@lib/parsers/parsePdf';
import { parseDocx } from '@lib/parsers/parseDocx';
import { extractResume } from '@lib/extractWithLLM';
import { classifyContent } from '@shared/classifiers/contentClassifier';
import { classifyResume } from '@lib/classifiers';
import { getStrategy } from '@shared/parsingStrategy';
import { hashFile, getCached, setCache } from '@lib/cache';
import { runWithLimit } from '@shared/concurrency';
import { recordSuccess } from '@lib/metrics';
import { validateWithZod } from '@lib/validation/engine';
import { logger } from '@lib/logger';
import { createLogFn } from '@shared/logger';
import { cacheAnalyzer } from '@lib/cacheAnalyzer';
import type { StageName } from '@lib/processTracer';
import { runPipeline } from '@shared/resumeProcessor';
import type { PipelineAdapter, PipelineResult } from '@shared/resumeProcessor';

export interface ProcessOptions {
  enableCache?: boolean;
  enableClassification?: boolean;
  enableValidation?: boolean;
  onStageComplete?: (stage: StageName, data?: unknown) => void;
}

export interface ProcessResult {
  resume: PipelineResult['resume'];
  classification?: PipelineResult['classification'];
  difficultyClass?: string;
  fromCache: boolean;
  hash: string;
  validation?: PipelineResult['validation'];
  attempts?: number;
  finalStrategy?: string;
}

function createFrontendAdapter(file: File): PipelineAdapter {
  return {
    hashFile: () => hashFile(file),
    getCached: (hash) => getCached(hash),
    setCache: (hash, data) => setCache(hash, data),
    parseText: (fileName) => fileName.endsWith('.pdf') ? parsePdf(file) : parseDocx(file),
    extractResume: (text, strategy) => extractResume(text, strategy),
    classifyResume: (text) => classifyResume(text),
    getStrategy: (classification) => getStrategy(classification),
    classifyContent: (resume, text) => classifyContent(resume, text),
    validateWithZod: (resume, level) => validateWithZod(resume, level),
    runWithLimit: (fn) => runWithLimit(fn),
    onCacheHit: (cacheTime) => cacheAnalyzer.recordHit(cacheTime),
    onCacheMiss: (cacheTime) => cacheAnalyzer.recordMiss(cacheTime),
    onComplete: (time, fromCache) => recordSuccess(time, fromCache),
    log: createLogFn(logger),
  };
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
  const adapter = createFrontendAdapter(file);
  const result = await runPipeline(adapter, file.name, options);
  return result;
}
