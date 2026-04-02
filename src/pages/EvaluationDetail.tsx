import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEvaluationStore, type EvaluationTask } from '@lib/store/evaluationStore';
import { evaluationApi } from '@lib/api/evaluationApi';
import { logger } from '@lib/logger';
import { processWithEvaluation } from '@lib/evaluationProcessor';
import { generateReport, exportToCSV } from '@lib/reportGenerator';
import AnnotationEditor from '@components/AnnotationEditor';
import type { TaskResponse, EvaluationResult, Resume } from '@lib/types';

function ResultDetail({ result }: { result: EvaluationResult }) {
  const r = result.parsedResume;
  if (!r) return <div className="p-3 text-red-500 text-sm">解析失败：{result.error}</div>;

  return (
    <div className="p-4 bg-gray-50 border-t text-sm space-y-3">
      {/* 基本信息 */}
      <div>
        <div className="font-semibold text-gray-700 mb-1">基本信息</div>
        <div className="grid grid-cols-3 gap-2 text-gray-600">
          <span>姓名：{r.basics?.name || '-'}</span>
          <span>电话：{r.basics?.phone || '-'}</span>
          <span>邮箱：{r.basics?.email || '-'}</span>
          {r.basics?.title && <span>职位：{r.basics.title}</span>}
          {r.basics?.location && <span>地点：{r.basics.location}</span>}
        </div>
      </div>

      {/* 工作经历 */}
      {r.work?.length > 0 && (
        <div>
          <div className="font-semibold text-gray-700 mb-1">工作经历（{r.work.length} 段）</div>
          <div className="space-y-1">
            {r.work.map((w: any, i: number) => (
              <div key={i} className="text-gray-600">
                {w.company} · {w.position} · {w.startDate} ~ {w.endDate || '至今'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 教育背景 */}
      {r.education?.length > 0 && (
        <div>
          <div className="font-semibold text-gray-700 mb-1">教育背景（{r.education.length} 段）</div>
          <div className="space-y-1">
            {r.education.map((e: any, i: number) => (
              <div key={i} className="text-gray-600">
                {e.institution || e.school} · {e.degree} · {e.major || '-'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 技能 */}
      {(r.skills?.length ?? 0) > 0 && (
        <div>
          <div className="font-semibold text-gray-700 mb-1">技能（{r.skills!.length} 项）</div>
          <div className="flex flex-wrap gap-1">
            {r.skills!.map((s: string, i: number) => (
              <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* 元信息 */}
      <div className="pt-2 border-t text-xs text-gray-400 flex gap-4">
        <span>分类：{result.classification?.difficulty} / {result.classification?.completeness} / {result.classification?.scenario}</span>
        <span>缓存：{result.fromCache ? '命中' : '未命中'}</span>
        <span>耗时：{result.processingTime}ms</span>
      </div>
    </div>
  );
}

function adaptTaskResponse(task: TaskResponse): EvaluationTask {
  return {
    ...task,
    type: (task.type as 'single' | 'batch') || 'single',
    config: task.config as any || { enableFieldLevel: false, enableClassification: false, enableProcessTrace: false, accuracyMethod: 'exact' },
    stats: task.stats || { totalFiles: 0, processedFiles: 0, successCount: 0, failureCount: 0 },
    createdAt: new Date(task.createdAt),
    updatedAt: new Date(task.updatedAt || task.createdAt)
  };
}

export default function EvaluationDetail() {
  const { id } = useParams<{ id: string }>();
  const { currentTask, results, setCurrentTask, setResults, isLoading, setLoading } = useEvaluationStore();
  const [files, setFiles] = useState<FileList | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [running, setRunning] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingResult, setEditingResult] = useState<EvaluationResult | null>(null);

  useEffect(() => {
    if (id) loadTaskAndResults(id);
  }, [id]);

  const loadTaskAndResults = async (taskId: string) => {
    setLoading(true);
    try {
      const [task, taskResults] = await Promise.all([
        evaluationApi.getTask(taskId),
        evaluationApi.getResults(taskId)
      ]);
      setCurrentTask(adaptTaskResponse(task));
      setResults(taskResults as any);
    } catch (error) {
      logger.error('Failed to load data', error as Error);
      // 后端不可用时创建本地任务占位
      setCurrentTask({
        id: id!,
        name: '评测任务',
        type: 'batch',
        status: 'pending',
        config: { enableFieldLevel: true, enableClassification: true, enableProcessTrace: false, accuracyMethod: 'partial' },
        stats: { totalFiles: 0, processedFiles: 0, successCount: 0, failureCount: 0 },
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartEvaluation = async () => {
    if (!files || !currentTask) return;
    setRunning(true);
    setResults([]);
    const fileArray = Array.from(files);
    setProgress({ current: 0, total: fileArray.length });

    try {
      // Load ground truth annotations if available
      const annotations = await loadGroundTruth();

      await processWithEvaluation(
        fileArray,
        {
          taskId: currentTask.id,
          enableFieldLevel: currentTask.config.enableFieldLevel,
          enableClassification: currentTask.config.enableClassification,
          enableProcessTrace: currentTask.config.enableProcessTrace,
          accuracyMethod: currentTask.config.accuracyMethod,
          annotations
        },
        (current, total) => setProgress({ current, total })
      );

      // Reload results from backend
      const updatedResults = await evaluationApi.getResults(currentTask.id);
      setResults(updatedResults as any);
      setCurrentTask({ ...currentTask, status: 'completed' });
    } catch (error) {
      logger.error('Evaluation failed', error as Error);
    } finally {
      setRunning(false);
    }
  };

  async function loadGroundTruth(): Promise<Map<string, Resume> | undefined> {
    try {
      const response = await fetch('/test-resumes/ground-truth.json');
      if (!response.ok) return undefined;
      const data = await response.json();
      return new Map(Object.entries(data));
    } catch {
      return undefined;
    }
  }

  const handleSaveAnnotation = async (annotation: any) => {
    if (!editingResult || !currentTask) return;
    try {
      await evaluationApi.saveAnnotation(currentTask.id, editingResult.id, annotation);
      const updatedResults = await evaluationApi.getResults(currentTask.id);
      setResults(updatedResults as any);
      setEditingResult(null);
    } catch (error) {
      logger.error('Failed to save annotation', error as Error);
    }
  };

  const handleExportReport = (format: 'json' | 'csv') => {
    if (!currentTask || results.length === 0) return;
    const report = generateReport(currentTask, results);

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${currentTask.id}.json`;
      a.click();
    } else {
      const csv = exportToCSV(report);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${currentTask.id}.csv`;
      a.click();
    }
  };

  if (isLoading) return <div className="p-6">加载中...</div>;
  if (!currentTask) return <div className="p-6">任务不存在</div>;

  const overallMetrics = results.length > 0 ? {
    accuracy: results.reduce((sum, r) => sum + r.metrics.accuracy, 0) / results.length,
    completeness: results.reduce((sum, r) => sum + r.metrics.completeness, 0) / results.length,
    structureScore: results.reduce((sum, r) => sum + r.metrics.structureScore, 0) / results.length,
  } : null;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">{currentTask.name}</h1>
      <span className={`text-sm px-2 py-1 rounded ${currentTask.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
        {currentTask.status === 'completed' ? '已完成' : '待评测'}
      </span>

      {/* 上传区 */}
      <div className="mt-6 mb-6 p-4 border rounded bg-blue-50">
        <h3 className="font-semibold mb-3">上传简历文件</h3>
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx"
          onChange={(e) => setFiles(e.target.files)}
          className="mb-3 block"
          disabled={running}
        />
        {files && <p className="text-sm text-gray-500 mb-3">已选择 {files.length} 个文件</p>}
        <button
          onClick={handleStartEvaluation}
          disabled={!files || running}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
        >
          {running ? `处理中 ${progress.current}/${progress.total}...` : '开始评测'}
        </button>
        {results.length > 0 && (
          <div className="mt-3 flex gap-2">
            <button onClick={() => handleExportReport('json')}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200">
              导出JSON
            </button>
            <button onClick={() => handleExportReport('csv')}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200">
              导出CSV
            </button>
          </div>
        )}
      </div>

      {/* 进度条 */}
      {running && (
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* 汇总指标 */}
      {overallMetrics && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 border rounded text-center">
            <div className="text-sm text-gray-500">平均准确率</div>
            <div className="text-2xl font-bold text-blue-600">{overallMetrics.accuracy.toFixed(1)}%</div>
          </div>
          <div className="p-4 border rounded text-center">
            <div className="text-sm text-gray-500">平均完整度</div>
            <div className="text-2xl font-bold text-green-600">{overallMetrics.completeness.toFixed(1)}%</div>
          </div>
          <div className="p-4 border rounded text-center">
            <div className="text-sm text-gray-500">平均结构分</div>
            <div className="text-2xl font-bold text-purple-600">{overallMetrics.structureScore.toFixed(1)}%</div>
          </div>
        </div>
      )}

      {/* 结果列表 */}
      {results.length > 0 && (
        <div className="border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">文件名</th>
                <th className="px-4 py-2 text-left">准确率</th>
                <th className="px-4 py-2 text-left">完整度</th>
                <th className="px-4 py-2 text-left">处理时间</th>
                <th className="px-4 py-2 text-left">状态</th>
                <th className="px-4 py-2 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {results.map(result => (
                <>
                  <tr
                    key={result.id}
                    className="border-t hover:bg-blue-50 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === result.id ? null : result.id)}
                  >
                    <td className="px-4 py-2 font-medium flex items-center gap-1">
                      <span className="text-gray-400 text-xs">{expandedId === result.id ? '▼' : '▶'}</span>
                      {result.fileName}
                    </td>
                    <td className="px-4 py-2">{result.error ? '-' : `${result.metrics.accuracy.toFixed(1)}%`}</td>
                    <td className="px-4 py-2">{result.error ? '-' : `${result.metrics.completeness.toFixed(1)}%`}</td>
                    <td className="px-4 py-2">{result.processingTime}ms</td>
                    <td className="px-4 py-2">
                      {result.error
                        ? <span className="text-red-500">失败: {result.error}</span>
                        : result.fromCache
                          ? <span className="text-gray-500">缓存命中</span>
                          : <span className="text-green-600">✓ 完成</span>
                      }
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingResult(result); }}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        标注
                      </button>
                    </td>
                  </tr>
                  {expandedId === result.id && (
                    <tr key={`${result.id}-detail`} className="bg-gray-50">
                      <td colSpan={6} className="p-0">
                        <ResultDetail result={result} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Annotation Editor Modal */}
      {editingResult && (
        <AnnotationEditor
          result={editingResult}
          onSave={handleSaveAnnotation}
          onCancel={() => setEditingResult(null)}
        />
      )}
    </div>
  );
}
