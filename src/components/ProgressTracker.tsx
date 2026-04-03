import { StageName, StageStatus } from '@lib/processTracer';
import Icon from './ui/Icon';

interface StageInfo {
  status: StageStatus;
  duration?: number;
}

interface Props {
  stages: Record<StageName, StageInfo>;
  currentStage: StageName | null;
}

const stageConfig: Record<StageName, { label: string; icon: string }> = {
  file_upload: { label: '上传', icon: 'upload' },
  file_parse: { label: '解析', icon: 'file-text' },
  difficulty_classify: { label: '分类', icon: 'layers' },
  strategy_select: { label: '策略', icon: 'zap' },
  llm_extract: { label: 'AI提取', icon: 'activity' },
  content_classify: { label: '内容', icon: 'bar-chart' },
  validation: { label: '验证', icon: 'check-circle' },
  cache_store: { label: '缓存', icon: 'folder' },
};

const stageOrder: StageName[] = [
  'file_upload', 'file_parse', 'difficulty_classify', 'strategy_select',
  'llm_extract', 'content_classify', 'validation', 'cache_store',
];

export default function ProgressTracker({ stages, currentStage }: Props) {
  const completedCount = stageOrder.filter(s => stages[s].status === 'completed').length;
  const percentage = Math.round((completedCount / stageOrder.length) * 100);
  const currentLabel = currentStage ? stageConfig[currentStage]?.label : '';

  return (
    <div className="card p-4 space-y-3">
      {/* Stage nodes */}
      <div className="flex items-center">
        {stageOrder.map((stageName, i) => {
          const stage = stages[stageName];
          const config = stageConfig[stageName];
          const isActive = currentStage === stageName;
          const isCompleted = stage.status === 'completed';
          const isFailed = stage.status === 'failed';

          return (
            <div key={stageName} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? 'bg-status-success text-white'
                      : isFailed
                        ? 'bg-status-error text-white'
                        : isActive
                          ? 'bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-brand-900/50'
                          : 'bg-surface-tertiary text-text-tertiary'
                  }`}
                >
                  {isCompleted ? (
                    <Icon name="check-circle" size={16} />
                  ) : isFailed ? (
                    <Icon name="x-circle" size={16} />
                  ) : isActive ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Icon name={config.icon} size={16} />
                  )}
                </div>
                <span className={`text-xs mt-1.5 whitespace-nowrap ${
                  isActive ? 'text-brand-700 dark:text-brand-400 font-medium' : isCompleted ? 'text-text-secondary' : 'text-text-tertiary'
                }`}>
                  {config.label}
                </span>
                {stage.duration != null && stage.duration > 0 && (
                  <span className="text-xs text-text-tertiary">{stage.duration}ms</span>
                )}
              </div>

              {i < stageOrder.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1.5 rounded-full transition-colors duration-300 ${
                  isCompleted ? 'bg-status-success' : 'bg-surface-tertiary'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">
            {currentLabel ? `正在${currentLabel}...` : percentage === 100 ? '处理完成' : '准备中...'}
          </span>
          <span className="text-text-tertiary font-mono">{percentage}%</span>
        </div>
        <div className="w-full bg-surface-tertiary rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-brand-600 h-1.5 rounded-full transition-all duration-500 ease-smooth"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
