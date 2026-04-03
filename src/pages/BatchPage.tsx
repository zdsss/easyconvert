import { useState } from 'react';
import { processBatch, BatchResult, exportErrors } from '@lib/batchProcessor';
import { useBatchStore } from '@lib/store/batchStore';
import { parseHistoryApi } from '@lib/api/parseHistoryApi';
import { hashFile } from '@lib/cache';
import BatchProgress from '@components/BatchProgress';
import Icon from '@components/ui/Icon';

export default function BatchPage() {
  const [results, setResults] = useState<BatchResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const { setFiles, updateFileStage, setFileStatus, updateConcurrency, overall } = useBatchStore();

  const handleBatch = async (fileList: FileList) => {
    setProcessing(true);
    setResults([]);
    const fileArray = Array.from(fileList);
    setFiles(fileArray);

    const batchResults = await processBatch(fileArray, {
      onFileStage: (fileName, stage) => updateFileStage(fileName, stage, 'processing'),
      onFileComplete: (fileName, success, fromCache, error) => {
        setFileStatus(fileName, success ? 'completed' : 'failed', fromCache, error);
      },
      onConcurrency: (active, queued) => updateConcurrency(active, queued),
    });

    setResults(batchResults);
    setProcessing(false);

    // Fire-and-forget: save each result to history
    for (const r of batchResults) {
      parseHistoryApi.save({
        fileName: r.file.name,
        fileSize: r.file.size,
        mimeType: r.file.type || 'application/octet-stream',
        status: r.success ? 'completed' : 'failed',
        result: r.success ? r.resume : undefined,
        error: r.error,
        processingTime: r.time,
      }).catch(() => {});
    }

    // Fire-and-forget: prefetch cache warming
    Promise.all(fileArray.map((f) => hashFile(f)))
      .then((hashes) =>
        fetch('/api/parse/prefetch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hashes }),
        })
      )
      .catch(() => {});
  };

  const handleExportErrors = () => {
    const json = exportErrors(results);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `errors-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAll = () => {
    const data = results.filter(r => r.success).map(r => ({ file: r.file.name, result: r.resume }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const failedCount = results.filter(r => !r.success).length;
  const successCount = results.length - failedCount;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">批量处理</h1>
          <p className="text-sm text-text-secondary mt-1">批量上传简历文件，并行解析提取</p>
        </div>
        {results.length > 0 && (
          <div className="flex gap-2">
            <button onClick={handleExportAll} className="btn-secondary flex items-center gap-2">
              <Icon name="download" size={16} />
              导出结果
            </button>
            {failedCount > 0 && (
              <button onClick={handleExportErrors} className="btn-ghost text-status-error flex items-center gap-2">
                <Icon name="download" size={16} />
                导出错误
              </button>
            )}
          </div>
        )}
      </div>

      {/* Upload zone */}
      {!processing && results.length === 0 && (
        <div
          onDrop={(e) => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files.length > 0) handleBatch(e.dataTransfer.files); }}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          className={`card-hover relative rounded-xl p-12 text-center cursor-pointer border-2 border-dashed transition-all duration-200 mb-6 ${
            isDragOver
              ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20 shadow-md'
              : 'border-border hover:border-brand-300 hover:bg-brand-50/30 dark:hover:bg-brand-900/10'
          }`}
        >
          <input
            type="file"
            multiple
            accept=".pdf,.docx"
            onChange={(e) => e.target.files && handleBatch(e.target.files)}
            className="hidden"
            id="batch-file-input"
          />
          <label htmlFor="batch-file-input" className="cursor-pointer">
            <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-200 ${
              isDragOver ? 'bg-brand-100 dark:bg-brand-800 scale-110' : 'bg-surface-tertiary'
            }`}>
              <Icon name="layers" size={24} className={isDragOver ? 'text-brand-600' : 'text-text-tertiary'} />
            </div>
            <p className="text-base font-medium text-text-primary mb-1">拖拽多个文件到此处或点击上传</p>
            <p className="text-sm text-text-tertiary">最多 50 个文件，总计 200MB，支持 PDF、DOCX</p>
          </label>
        </div>
      )}

      {/* Progress overview */}
      {processing && (
        <div className="space-y-4 mb-6">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="section-title">处理进度</h3>
              <span className="text-sm text-text-secondary">
                {overall.current}/{overall.total} ({overall.total > 0 ? Math.round((overall.current / overall.total) * 100) : 0}%)
              </span>
            </div>
            <div className="w-full bg-surface-tertiary rounded-full h-2">
              <div
                className="bg-brand-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${overall.total > 0 ? (overall.current / overall.total) * 100 : 0}%` }}
              />
            </div>
          </div>
          <BatchProgress />
        </div>
      )}

      {/* Results table */}
      {results.length > 0 && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-4 text-center">
              <p className="text-xs text-text-secondary">总文件</p>
              <p className="text-2xl font-bold font-mono text-text-primary">{results.length}</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-xs text-text-secondary">成功</p>
              <p className="text-2xl font-bold font-mono text-status-success">{successCount}</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-xs text-text-secondary">失败</p>
              <p className="text-2xl font-bold font-mono text-status-error">{failedCount}</p>
            </div>
          </div>

          {/* File list */}
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-secondary">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">文件名</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">状态</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">耗时</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">缓存</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-t border-border-light">
                    <td className="px-4 py-3 font-medium text-text-primary">{r.file.name}</td>
                    <td className="px-4 py-3">
                      {r.success ? <span className="badge-success">成功</span> : <span className="badge-error">失败</span>}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{(r.time / 1000).toFixed(1)}s</td>
                    <td className="px-4 py-3">
                      {r.fromCache ? <span className="badge-info">命中</span> : <span className="badge-neutral">未命中</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={() => { setResults([]); }}
            className="btn-secondary"
          >
            重新上传
          </button>
        </div>
      )}
    </div>
  );
}
