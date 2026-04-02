import type { EvaluationTask } from './store/evaluationStore';
import type { EvaluationResult } from './types';

export interface Report {
  taskName: string;
  createdAt: string;
  summary: {
    totalFiles: number;
    successCount: number;
    failureCount: number;
    avgAccuracy: number;
    avgCompleteness: number;
  };
  details: Array<{
    fileName: string;
    accuracy: number;
    completeness: number;
    processingTime: number;
    fromCache: boolean;
  }>;
}

export function generateReport(task: EvaluationTask, results: EvaluationResult[]): Report {
  const successResults = results.filter(r => !r.error);
  const avgAccuracy = successResults.length > 0
    ? successResults.reduce((sum, r) => sum + r.metrics.accuracy, 0) / successResults.length
    : 0;
  const avgCompleteness = successResults.length > 0
    ? successResults.reduce((sum, r) => sum + r.metrics.completeness, 0) / successResults.length
    : 0;

  return {
    taskName: task.name,
    createdAt: task.createdAt.toISOString(),
    summary: {
      totalFiles: results.length,
      successCount: successResults.length,
      failureCount: results.filter(r => r.error).length,
      avgAccuracy,
      avgCompleteness
    },
    details: results.map(r => ({
      fileName: r.fileName,
      accuracy: r.metrics.accuracy,
      completeness: r.metrics.completeness,
      processingTime: r.processingTime,
      fromCache: r.fromCache
    }))
  };
}

export function exportToCSV(report: Report): string {
  const headers = ['文件名', '准确率', '完整度', '处理时间(ms)', '缓存'];
  const rows = report.details.map(d => [
    d.fileName,
    d.accuracy.toFixed(2),
    d.completeness.toFixed(2),
    d.processingTime.toString(),
    d.fromCache ? '是' : '否'
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}
