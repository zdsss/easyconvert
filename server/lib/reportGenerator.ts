import db from '../db';
import { calculateCost, DEFAULT_MODEL } from '@shared/pricing';
import { serverCostTracker } from './extractWithLLM';

interface EvaluationResultRow {
  id: string;
  task_id: string;
  file_name: string;
  metrics: string | Record<string, number> | null;
  classification: string | Record<string, string> | null;
  parsed_resume: string | Record<string, unknown> | null;
  processing_time: number;
  from_cache: boolean;
  error: string | null;
  created_at: string;
}

interface TaskRow {
  id: string;
  config: string | Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface ReportData {
  task: TaskRow;
  summary: {
    totalFiles: number;
    successCount: number;
    failureCount: number;
    avgAccuracy: number;
    avgCompleteness: number;
    avgStructureScore: number;
    avgProcessingTime: number;
    cacheHitRate: number;
  };
  trends?: Array<{
    date: string;
    accuracy: number;
    completeness: number;
    count: number;
  }>;
  distribution?: {
    difficulty: Record<string, number>;
    completeness: Record<string, number>;
    scenario: Record<string, number>;
  };
  errors?: Array<{
    pattern: string;
    count: number;
    examples: string[];
  }>;
  cost?: {
    totalTokens: number;
    estimatedCost: number;
    avgTokensPerFile: number;
  };
}

/**
 * 生成完整报告
 */
export async function generateServerReport(taskId: string): Promise<ReportData> {
  const taskResult = await db.query('SELECT * FROM evaluation_tasks WHERE id = $1', [taskId]);
  const resultsResult = await db.query('SELECT * FROM evaluation_results WHERE task_id = $1', [taskId]);

  const task = taskResult.rows[0] as TaskRow | undefined;
  const results = resultsResult.rows as unknown as EvaluationResultRow[];

  if (!task) throw new Error('Task not found');

  const successResults = results.filter((r) => !r.error);
  const failedResults = results.filter((r) => r.error);

  // 基础汇总
  const summary = {
    totalFiles: results.length,
    successCount: successResults.length,
    failureCount: failedResults.length,
    avgAccuracy: avg(successResults, (r) => parseMetric(r.metrics, 'accuracy')),
    avgCompleteness: avg(successResults, (r) => parseMetric(r.metrics, 'completeness')),
    avgStructureScore: avg(successResults, (r) => parseMetric(r.metrics, 'structureScore')),
    avgProcessingTime: avg(successResults, (r) => r.processing_time),
    cacheHitRate: results.length > 0
      ? (results.filter((r) => r.from_cache).length / results.length) * 100
      : 0,
  };

  // 分类分布
  const distribution = buildDistribution(successResults);

  // 错误模式
  const errors = buildErrorPatterns(failedResults);

  return { task, summary, distribution, errors };
}

/**
 * 跨任务准确率趋势
 */
export async function getAccuracyTrends(): Promise<Array<{ date: string; accuracy: number; count: number }>> {
  const results = await db.query(
    `SELECT DATE(created_at) as date, metrics, created_at FROM evaluation_results ORDER BY created_at`
  );

  const byDate = new Map<string, { total: number; sum: number }>();
  for (const r of results.rows) {
    const date = new Date(r.created_at as string).toISOString().split('T')[0];
    const entry = byDate.get(date) || { total: 0, sum: 0 };
    entry.total++;
    entry.sum += parseMetric(r.metrics as string | Record<string, number> | null, 'accuracy');
    byDate.set(date, entry);
  }

  return [...byDate.entries()].map(([date, { total, sum }]) => ({
    date,
    accuracy: total > 0 ? sum / total : 0,
    count: total,
  }));
}

/**
 * 单任务分类分布
 */
export async function getDistribution(taskId: string) {
  const results = await db.query('SELECT classification FROM evaluation_results WHERE task_id = $1', [taskId]);
  return buildDistribution(results.rows as unknown as EvaluationResultRow[]);
}

/**
 * 错误模式分析
 */
export async function getErrorPatterns(taskId: string) {
  const results = await db.query(
    'SELECT file_name, metrics, parsed_resume FROM evaluation_results WHERE task_id = $1',
    [taskId]
  );
  return analyzeErrors(results.rows as unknown as EvaluationResultRow[]);
}

/**
 * 成本追踪
 */
export async function getCostReport(taskId: string) {
  // Fetch task config (may contain model) + results in parallel
  const [taskResult, resultsResult] = await Promise.all([
    db.query('SELECT config FROM evaluation_tasks WHERE id = $1', [taskId]),
    db.query(
      'SELECT processing_time, from_cache FROM evaluation_results WHERE task_id = $1',
      [taskId]
    ),
  ]);

  const taskConfig = taskResult.rows[0]?.config;
  const model = (typeof taskConfig === 'string' ? JSON.parse(taskConfig) : taskConfig)?.model || DEFAULT_MODEL;

  const rows = resultsResult.rows as unknown as EvaluationResultRow[];
  const nonCached = rows.filter((r) => !r.from_cache);
  const avgTime = nonCached.length > 0
    ? nonCached.reduce((sum, r) => sum + r.processing_time, 0) / nonCached.length
    : 0;

  // Use actual token data from cost tracker when available, fall back to estimation
  const trackerAvg = serverCostTracker.getAvgTokensPerCall();
  const estimatedTokensPerFile = trackerAvg > 0 ? trackerAvg : 2000;
  const totalTokens = nonCached.length * estimatedTokensPerFile;
  const estimatedInput = Math.round(totalTokens * 0.75);
  const estimatedOutput = totalTokens - estimatedInput;
  const { totalCost } = calculateCost(model, estimatedInput, estimatedOutput);

  return {
    totalFiles: rows.length,
    cachedFiles: rows.filter((r) => r.from_cache).length,
    totalTokens,
    estimatedCost: totalCost,
    avgTokensPerFile: estimatedTokensPerFile,
    avgProcessingTime: avgTime,
    model,
  };
}

// --- Helpers ---

function parseMetric(metrics: string | Record<string, number> | null, field: string): number {
  if (!metrics) return 0;
  const m = typeof metrics === 'string' ? JSON.parse(metrics) : metrics;
  return m[field] || 0;
}

function avg<T>(arr: T[], fn: (item: T) => number): number {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, item) => sum + fn(item), 0) / arr.length;
}

function buildDistribution(results: EvaluationResultRow[]) {
  const difficulty: Record<string, number> = {};
  const completeness: Record<string, number> = {};
  const scenario: Record<string, number> = {};

  for (const r of results) {
    const cls = typeof r.classification === 'string' ? JSON.parse(r.classification) : r.classification;
    if (!cls) continue;

    difficulty[cls.difficulty] = (difficulty[cls.difficulty] || 0) + 1;
    completeness[cls.completeness] = (completeness[cls.completeness] || 0) + 1;
    scenario[cls.scenario] = (scenario[cls.scenario] || 0) + 1;
  }

  return { difficulty, completeness, scenario };
}

function buildErrorPatterns(failedResults: EvaluationResultRow[]) {
  const patterns = new Map<string, { count: number; examples: string[] }>();

  for (const r of failedResults) {
    const errorMsg = r.error || 'Unknown error';
    // 归类错误模式
    const pattern = errorMsg.includes('timeout') ? 'Timeout'
      : errorMsg.includes('429') ? 'Rate Limited'
      : errorMsg.includes('API error') ? 'API Error'
      : errorMsg.includes('格式错误') ? 'Format Error'
      : 'Other';

    const entry = patterns.get(pattern) || { count: 0, examples: [] };
    entry.count++;
    if (entry.examples.length < 3) entry.examples.push(r.file_name);
    patterns.set(pattern, entry);
  }

  return [...patterns.entries()].map(([pattern, data]) => ({
    pattern,
    count: data.count,
    examples: data.examples,
  }));
}

function analyzeErrors(results: EvaluationResultRow[]) {
  const issues: Array<{ field: string; count: number; type: string }> = [];
  const fieldMissing = new Map<string, number>();

  for (const r of results) {
    const resume = typeof r.parsed_resume === 'string' ? JSON.parse(r.parsed_resume) : r.parsed_resume;
    if (!resume) continue;

    // 检查常见缺失字段
    if (!resume.basics?.name) increment(fieldMissing, 'basics.name');
    if (!resume.basics?.email) increment(fieldMissing, 'basics.email');
    if (!resume.basics?.phone) increment(fieldMissing, 'basics.phone');
    if (!resume.work?.length) increment(fieldMissing, 'work');
    if (!resume.education?.length) increment(fieldMissing, 'education');
  }

  for (const [field, count] of fieldMissing) {
    if (count > 0) {
      issues.push({ field, count, type: 'missing' });
    }
  }

  return issues.sort((a, b) => b.count - a.count);
}

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) || 0) + 1);
}
