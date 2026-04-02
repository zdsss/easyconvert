import { processResume } from '@lib/core/resumeProcessor';
import { ValidationError, Resume } from '@lib/types';
import { BATCH_CONFIG } from '@lib/constants';
import { logger } from '@lib/logger';
import { adaptiveConcurrency } from '@lib/adaptiveConcurrency';
import { runWithLimit } from '@lib/concurrency';
import { StageName } from '@lib/processTracer';

export type ErrorCategory = 'timeout' | 'validation' | 'parse' | 'llm' | 'unknown';

export interface BatchResult {
  file: File;
  success: boolean;
  resume?: Resume;
  error?: string;
  errorCategory?: ErrorCategory;
  fromCache: boolean;
  time: number;
}

export interface BatchProgressCallback {
  onProgress?: (current: number, total: number) => void;
  onFileStage?: (fileName: string, stage: StageName) => void;
  onFileComplete?: (fileName: string, success: boolean, fromCache: boolean, error?: string) => void;
  onConcurrency?: (active: number, queued: number) => void;
}

function categorizeError(error: Error): ErrorCategory {
  const msg = error.message.toLowerCase();
  if (msg.includes('timeout') || msg.includes('timed out')) return 'timeout';
  if (error instanceof ValidationError || msg.includes('validation')) return 'validation';
  if (msg.includes('parse') || msg.includes('extract')) return 'parse';
  if (msg.includes('llm') || msg.includes('api')) return 'llm';
  return 'unknown';
}

/**
 * 批量处理多个简历文件
 * @param files - 简历文件数组
 * @param callbacks - 进度回调函数
 * @returns 批量处理结果数组
 * @throws {ValidationError} 文件数组为空或包含无效文件
 */
export async function processBatch(
  files: File[],
  callbacks?: BatchProgressCallback
): Promise<BatchResult[]> {
  const { onProgress, onFileStage, onFileComplete, onConcurrency } = callbacks || {};

  if (!files || files.length === 0) {
    throw new ValidationError('Files array cannot be empty');
  }

  const invalidFiles = files.filter((f) => !f.name.match(/\.(pdf|docx)$/i));
  if (invalidFiles.length > 0) {
    throw new ValidationError(`Invalid file types: ${invalidFiles.map((f) => f.name).join(', ')}`);
  }

  const oversizedFiles = files.filter((f) => f.size > BATCH_CONFIG.MAX_FILE_SIZE);
  if (oversizedFiles.length > 0) {
    throw new ValidationError(`Files exceed size limit: ${oversizedFiles.map((f) => f.name).join(', ')}`);
  }

  const results: BatchResult[] = [];
  const BATCH_SIZE = 5;

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const queued = files.length - (i + batch.length);
    onConcurrency?.(batch.length, queued);

    const batchResults = await Promise.all(
      batch.map(async (file, idx) => {
        const startTime = Date.now();
        try {
          const result = await runWithLimit(() => processResume(file, {
            enableCache: true,
            onStageComplete: (stage) => onFileStage?.(file.name, stage)
          }));
          const time = Date.now() - startTime;
          adaptiveConcurrency.recordLatency(time);
          adaptiveConcurrency.recordSuccess();
          logger.debug(`Processed ${file.name} in ${time}ms`);
          onFileComplete?.(file.name, true, result.fromCache);
          return { file, success: true as const, resume: result.resume, fromCache: result.fromCache, time, idx };
        } catch (error) {
          const err = error as Error;
          const errorCategory = categorizeError(err);
          const time = Date.now() - startTime;
          adaptiveConcurrency.recordError();
          logger.warn(`Failed to process ${file.name}`, { error: err.message, category: errorCategory });
          onFileComplete?.(file.name, false, false, err.message);
          return { file, success: false as const, error: err.message, errorCategory, fromCache: false, time, idx };
        }
      })
    );

    results.push(...batchResults.sort((a, b) => a.idx - b.idx).map(({ idx, ...rest }) => rest));
    adaptiveConcurrency.adjust();
    onProgress?.(Math.min(i + BATCH_SIZE, files.length), files.length);

    if (i + BATCH_SIZE < files.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_CONFIG.DELAY_MS));
    }
  }

  return results;
}

export function exportErrors(results: BatchResult[]): string {
  const errors = results.filter(r => !r.success);
  const summary = {
    total: results.length,
    failed: errors.length,
    byCategory: errors.reduce((acc, r) => {
      const cat = r.errorCategory || 'unknown';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<ErrorCategory, number>),
    errors: errors.map(r => ({
      fileName: r.file.name,
      error: r.error,
      category: r.errorCategory,
      time: r.time
    }))
  };
  return JSON.stringify(summary, null, 2);
}
