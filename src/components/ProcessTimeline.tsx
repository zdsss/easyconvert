import React from 'react';
import type { ProcessTrace } from '@lib/processTracer';

interface Props {
  trace: ProcessTrace;
}

const STAGE_LABELS: Record<string, string> = {
  file_upload: '文件上传',
  file_parse: '文件解析',
  difficulty_classify: '难度分类',
  strategy_select: '策略选择',
  llm_extract: 'LLM 提取',
  content_classify: '内容分类',
  validation: '验证',
  cache_store: '缓存存储',
};

const STAGE_COLORS: Record<string, string> = {
  file_upload: 'bg-brand-400',
  file_parse: 'bg-brand-500',
  difficulty_classify: 'bg-purple-400',
  strategy_select: 'bg-pink-400',
  llm_extract: 'bg-status-error',
  content_classify: 'bg-amber-400',
  validation: 'bg-status-success',
  cache_store: 'bg-status-info',
};

function ProcessTimeline({ trace }: Props) {
  if (!trace?.stages?.length) {
    return <div className="text-sm text-text-tertiary">无处理时间线数据</div>;
  }

  const maxDuration = Math.max(...trace.stages.map(s => s.duration || 0), 1);

  return (
    <div>
      <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-3">处理时间线</h3>
      <div className="space-y-2">
        {trace.stages.map((stage) => {
          const width = maxDuration > 0 ? ((stage.duration || 0) / maxDuration) * 100 : 0;
          const color = STAGE_COLORS[stage.name] || 'bg-text-tertiary';

          return (
            <div key={stage.name} className="flex items-center gap-3">
              <div className="w-20 text-xs text-text-tertiary text-right shrink-0">
                {STAGE_LABELS[stage.name] || stage.name}
              </div>
              <div className="flex-1 bg-surface-tertiary rounded-full h-5 relative overflow-hidden">
                <div
                  className={`h-5 rounded-full ${color} transition-all duration-500 flex items-center justify-end pr-2`}
                  style={{ width: `${Math.max(width, 3)}%` }}
                >
                  {(stage.duration || 0) > 0 && (
                    <span className="text-xs text-white font-medium">{stage.duration}ms</span>
                  )}
                </div>
              </div>
              <div className="w-12 text-xs text-text-tertiary shrink-0">
                {stage.status === 'completed' ? (
                  <span className="text-status-success">完成</span>
                ) : stage.status === 'failed' ? (
                  <span className="text-status-error">失败</span>
                ) : '处理中'}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-xs text-text-tertiary text-right">
        总耗时: {trace.totalDuration}ms
      </div>
    </div>
  );
}

export default React.memo(ProcessTimeline);
