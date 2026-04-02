import { useState } from 'react';
import { processBatch, BatchResult, exportErrors } from '@lib/batchProcessor';
import { useBatchStore } from '@lib/store/batchStore';
import BatchProgress from './BatchProgress';

export default function BatchUpload() {
  const [results, setResults] = useState<BatchResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const { setFiles, updateFileStage, setFileStatus, updateConcurrency } = useBatchStore();

  const handleBatch = async (files: FileList) => {
    setProcessing(true);
    setResults([]);
    const fileArray = Array.from(files);
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

  const failedCount = results.filter(r => !r.success).length;

  return (
    <div className="mt-6 p-4 border rounded-lg">
      <h3 className="font-semibold mb-3">批量上传</h3>

      <input
        type="file"
        multiple
        accept=".pdf,.docx"
        onChange={(e) => e.target.files && handleBatch(e.target.files)}
        className="mb-3"
        disabled={processing}
      />

      {processing && <BatchProgress />}

      {results.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">
              成功: {results.length - failedCount} / 失败: {failedCount}
            </span>
            {failedCount > 0 && (
              <button
                onClick={handleExportErrors}
                className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
              >
                导出错误报告
              </button>
            )}
          </div>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className={`p-2 rounded text-sm ${r.success ? 'bg-green-50' : 'bg-red-50'}`}>
                <span className="font-medium">{r.file.name}</span>
                <span className="ml-2 text-gray-600">
                  {r.success ? `✓ ${r.fromCache ? '(缓存)' : `${(r.time / 1000).toFixed(1)}s`}` : `✗ ${r.error}`}
                </span>
                {!r.success && r.errorCategory && (
                  <span className="ml-2 text-xs text-gray-500">({r.errorCategory})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
