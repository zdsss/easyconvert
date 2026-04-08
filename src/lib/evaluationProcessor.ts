import { processResume } from '@lib/core/resumeProcessor';
import { ProcessTracer } from '@lib/processTracer';
import { calculateMetrics } from '@lib/metricsCalculator';
import { evaluationApi } from '@lib/api/evaluationApi';
import { logger } from '@lib/logger';
import type { Resume } from '@lib/types';

export interface EvaluationConfig {
  taskId: string;
  enableFieldLevel: boolean;
  enableClassification: boolean;
  enableProcessTrace: boolean;
  accuracyMethod: 'exact' | 'partial' | 'semantic';
  annotations?: Map<string, Resume>;
}

export async function processWithEvaluation(
  files: File[],
  config: EvaluationConfig,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const tracer = new ProcessTracer();
    const startTime = Date.now();

    try {
      const result = await processResume(file, {
        enableCache: true,
        enableClassification: config.enableClassification,
        onStageComplete: (stage, data) => {
          if (config.enableProcessTrace && stage) {
            tracer.startStage(stage);
            tracer.completeStage(stage, data as Record<string, unknown> | undefined);
          }
        }
      });

      const annotation = config.annotations?.get(file.name);
      const method = config.accuracyMethod === 'semantic' ? 'partial' : config.accuracyMethod;
      const metricsData = annotation
        ? calculateMetrics(annotation, result.resume, method)
        : { overall: { accuracy: 0, precision: 0, recall: 0, f1Score: 0 }, completeness: { score: 0, missingFields: [], extraFields: [] } };

      await evaluationApi.saveResult(config.taskId, {
        id: crypto.randomUUID(),
        taskId: config.taskId,
        fileName: file.name,
        fileHash: result.hash,
        parsedResume: result.resume,
        annotation,
        classification: result.classification,
        processTrace: tracer.getTrace(),
        metrics: {
          accuracy: metricsData.overall.accuracy,
          completeness: metricsData.completeness.score,
          structureScore: metricsData.overall.f1Score
        },
        processingTime: Date.now() - startTime,
        fromCache: result.fromCache,
        createdAt: new Date().toISOString()
      });

      onProgress?.(i + 1, files.length);
    } catch (error: unknown) {
      logger.error(`Failed to process ${file.name}`, error instanceof Error ? error : new Error(String(error)));
    }
  }
}
