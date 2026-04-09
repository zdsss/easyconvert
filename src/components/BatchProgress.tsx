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
      <div className="bg-gradient-to-r from-brand-50 to-brand-100 rounded-xl p-4 border border-brand-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text-primary">
            总进度: {overall.current}/{overall.total}
          </span>
          <span className="text-xs text-text-secondary">
            并发: {concurrency.active} 处理中 / {concurrency.queued} 等待中
          </span>
        </div>
        <div className="w-full bg-surface-tertiary rounded-full h-2" role="progressbar" aria-valuenow={Math.round((overall.current / overall.total) * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="bg-brand-600 h-2 rounded-full transition-all duration-300"
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
                  ? 'bg-status-success/5 border-status-success/20'
                  : fileState.status === 'failed'
                    ? 'bg-status-error/5 border-status-error/20'
                    : fileState.status === 'processing'
                      ? 'bg-brand-50 border-brand-200'
                      : 'bg-surface-secondary border-border'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-text-primary truncate flex-1">
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
                        idx <= currentStageIndex ? 'bg-brand-600' : 'bg-surface-tertiary'
                      }`}
                    />
                  ))}
                </div>
              )}

              {fileState.error && (
                <p className="text-xs text-status-error mt-1">{fileState.error}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
