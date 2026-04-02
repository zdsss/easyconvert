import { StageName, StageStatus } from '@lib/processTracer';

interface StageInfo {
  status: StageStatus;
  duration?: number;
}

interface Props {
  stages: Record<StageName, StageInfo>;
  currentStage: StageName | null;
}

const stageConfig: Record<StageName, { label: string; icon: string }> = {
  file_upload: { label: '上传文件', icon: '📤' },
  file_parse: { label: '解析文件', icon: '📄' },
  difficulty_classify: { label: '难度分类', icon: '🎯' },
  strategy_select: { label: '策略选择', icon: '🧠' },
  llm_extract: { label: 'AI提取', icon: '🤖' },
  content_classify: { label: '内容分类', icon: '📊' },
  validation: { label: '数据验证', icon: '✅' },
  cache_store: { label: '缓存存储', icon: '💾' },
};

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

export default function ProgressTracker({ stages, currentStage }: Props) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 shadow-sm border border-blue-100">
      <div className="grid grid-cols-4 gap-4 mb-4">
        {stageOrder.map((stageName) => {
          const stage = stages[stageName];
          const config = stageConfig[stageName];
          const isActive = currentStage === stageName;
          const isCompleted = stage.status === 'completed';
          const isFailed = stage.status === 'failed';

          return (
            <div
              key={stageName}
              className={`flex flex-col items-center p-3 rounded-lg transition-all ${
                isActive ? 'bg-blue-100 scale-105' : isCompleted ? 'bg-green-50' : isFailed ? 'bg-red-50' : 'bg-white'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-xl mb-2 ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isFailed
                      ? 'bg-red-500 text-white'
                      : isActive
                        ? 'bg-blue-500 text-white animate-pulse'
                        : 'bg-gray-200'
                }`}
              >
                {isCompleted ? '✓' : isFailed ? '✗' : config.icon}
              </div>
              <span className="text-xs font-medium text-gray-700 text-center">{config.label}</span>
              {stage.duration && (
                <span className="text-xs text-gray-500 mt-1">{stage.duration}ms</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
