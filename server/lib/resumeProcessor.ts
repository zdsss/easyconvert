import { parsePdf } from './parsePdf';
import { parseDocx } from './parseDocx';
import { extractResume } from './extractWithLLM';
import { hashFile } from './hashFile';
import { getCached, setCache } from './cache';
import { serverLogger } from './logger';
import { createLogFn } from '@shared/logger';
import { hashResume, checkDuplicate, registerResult } from './dedup';
import type { ServerFileInput } from './types';
import type { Resume, CacheData, ContentClassification, ValidationResult } from '@shared/types';
import type { StageName } from '@shared/types';

import { classifyResume } from '@shared/classifiers';
import { getStrategy } from '@shared/parsingStrategy';
import { classifyContent } from '@shared/classifiers/contentClassifier';
import { validateWithZod } from '@shared/validation/engine';
import { runWithLimit } from '@shared/concurrency';

import { runPipeline } from '@shared/resumeProcessor';
import type { PipelineAdapter } from '@shared/resumeProcessor';

export interface ServerProcessOptions {
  enableCache?: boolean;
  enableClassification?: boolean;
  enableValidation?: boolean;
  onStageComplete?: (stage: StageName, data?: unknown) => void;
}

export interface ServerProcessResult {
  resume: Resume;
  classification?: ContentClassification;
  difficultyClass?: string;
  fromCache: boolean;
  hash: string;
  validation?: ValidationResult;
  attempts?: number;
  finalStrategy?: string;
  duplicate?: boolean;
  existingId?: string;
}

function createServerAdapter(file: ServerFileInput): PipelineAdapter {
  return {
    hashFile: () => hashFile(file.buffer),
    getCached: (hash) => getCached(hash),
    setCache: (hash, data) => setCache(hash, data as CacheData),
    parseText: (fileName) => fileName.endsWith('.pdf') ? parsePdf(file.buffer) : parseDocx(file.buffer),
    extractResume: (text, strategy) => extractResume(text, strategy),
    classifyResume: (text) => classifyResume(text),
    getStrategy: (classification) => getStrategy(classification),
    classifyContent: (resume, text) => classifyContent(resume, text),
    validateWithZod: (resume, level) => validateWithZod(resume, level),
    runWithLimit: (fn) => runWithLimit(fn),
    onResumeExtracted: (resume) => {
      const rHash = hashResume(resume);
      const existingId = checkDuplicate(rHash);
      if (existingId) return { duplicate: true, existingId };
      registerResult(rHash, hashFile(file.buffer));
      return null;
    },
    log: createLogFn(serverLogger),
  };
}

/**
 * 服务端简历处理管线 — 9 阶段编排器
 * 替代前端 resumeProcessor，使用 Buffer 输入
 */
export async function processResume(
  file: ServerFileInput,
  options: ServerProcessOptions = {}
): Promise<ServerProcessResult> {
  const adapter = createServerAdapter(file);
  const result = await runPipeline(adapter, file.name, options);
  return result;
}
