import { useBatchStore } from '@lib/store/batchStore';
import { StageName } from '@lib/processTracer';

const stageOrder: StageName[] = [
  'file_upload',
  'file_parse',
  'difficulty_classify',
  'strategy_select',
  'llm_extract',
  'content_classify',
  'validation',
  'cache_store',
];

export default function BatchProgress() {
  const { files, overall, concurrency } = useBatchStore();
  const fileArray = Array.from(files.values());

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            总进度: {overall.current}/{overall.total}
          </span>
          <span className="text-xs text-gray-600">
            并发: {concurrency.active} 处理中 / {concurrency.queued} 等待中
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(overall.current / overall.total) * 100}%` }}
          />
        </div>
      </div>

      {/* File List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {fileArray.map((fileState) => {
          const currentStageIndex = fileState.currentStage
            ? stageOrder.indexOf(fileState.currentStage)
            : -1;

          return (
            <div
              key={fileState.file.name}
              className={`p-3 rounded-lg border ${
                fileState.status === 'completed'
                  ? 'bg-green-50 border-green-200'
                  : fileState.status === 'failed'
                    ? 'bg-red-50 border-red-200'
                    : fileState.status === 'processing'
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 truncate flex-1">
                  {fileState.file.name}
                </span>
                <span className="text-xs ml-2">
                  {fileState.status === 'completed' && (fileState.fromCache ? '💾 缓存' : '✓ 完成')}
                  {fileState.status === 'failed' && '✗ 失败'}
                  {fileState.status === 'processing' && '⏳ 处理中'}
                  {fileState.status === 'pending' && '⏸ 等待'}
                </span>
              </div>

              {/* Mini Progress Bar */}
              {fileState.status === 'processing' && (
                <div className="flex gap-1">
                  {stageOrder.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1 flex-1 rounded ${
                        idx <= currentStageIndex ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              )}

              {fileState.error && (
                <p className="text-xs text-red-600 mt-1">{fileState.error}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
