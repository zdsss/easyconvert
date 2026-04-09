import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ProcessTrace } from '@lib/processTracer';

interface Props {
  trace: ProcessTrace;
}

const STAGE_LABEL_KEYS: Record<string, string> = {
  file_upload: 'timeline.fileUpload',
  file_parse: 'timeline.fileParse',
  difficulty_classify: 'timeline.difficultyClassify',
  strategy_select: 'timeline.strategySelect',
  llm_extract: 'timeline.llmExtract',
  content_classify: 'timeline.contentClassify',
  validation: 'timeline.validation',
  cache_store: 'timeline.cacheStore',
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
  const { t } = useTranslation();

  if (!trace?.stages?.length) {
    return <div className="text-sm text-text-tertiary">{t('timeline.noData')}</div>;
  }

  const maxDuration = Math.max(...trace.stages.map(s => s.duration || 0), 1);

  return (
    <div>
      <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-3">{t('timeline.title')}</h3>
      <div className="space-y-2">
        {trace.stages.map((stage) => {
          const width = maxDuration > 0 ? ((stage.duration || 0) / maxDuration) * 100 : 0;
          const color = STAGE_COLORS[stage.name] || 'bg-text-tertiary';

          return (
            <div key={stage.name} className="flex items-center gap-3">
              <div className="w-20 text-xs text-text-tertiary text-right shrink-0">
                {t(STAGE_LABEL_KEYS[stage.name] || stage.name)}
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
                  <span className="text-status-success">{t('timeline.completed')}</span>
                ) : stage.status === 'failed' ? (
                  <span className="text-status-error">{t('timeline.failed')}</span>
                ) : t('timeline.processing')}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-xs text-text-tertiary text-right">
        {t('timeline.totalTime')}: {trace.totalDuration}ms
      </div>
    </div>
  );
}

export default React.memo(ProcessTimeline);
