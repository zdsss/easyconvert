import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { EvaluationResult, Resume } from '@lib/types';
import Drawer from './ui/Drawer';
import ComparisonView from './ComparisonView';
import ProcessTimeline from './ProcessTimeline';
import Icon from './ui/Icon';

interface Props {
  result: EvaluationResult | null;
  onClose: () => void;
  onSaveAnnotation?: (annotation: unknown) => void;
  prefillData?: Resume;
  confidenceData?: Record<string, number>;
}

type TabKey = 'parsed' | 'compare' | 'timeline';

export default function EvaluationResultDrawer({ result, onClose, onSaveAnnotation, prefillData, confidenceData }: Props) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('parsed');

  if (!result) return null;

  const tabs = [
    { key: 'parsed' as const, label: t('evaluation.tabParsed'), icon: 'file-text' },
    { key: 'compare' as const, label: t('evaluation.tabCompare'), icon: 'eye' },
    { key: 'timeline' as const, label: t('evaluation.tabTimeline'), icon: 'clock' },
  ];

  return (
    <Drawer
      open={!!result}
      onClose={onClose}
      title={result.fileName}
      subtitle={result.error ? `${t('evaluation.failed')}: ${result.error}` : `${t('evaluation.accuracy')} ${result.metrics.accuracy.toFixed(1)}% · ${result.processingTime}ms`}
      width={600}
      footer={
        onSaveAnnotation && (
          <div className="flex justify-end">
            <button onClick={onClose} className="btn-secondary">{t('evaluation.close')}</button>
          </div>
        )
      }
    >
      {/* Tab bar */}
      <div className="flex border-b border-border mb-4 -mx-6 px-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-brand-600 text-brand-700 dark:text-brand-400'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Icon name={tab.icon} size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in">
        {activeTab === 'parsed' && <ParsedTab result={result} />}
        {activeTab === 'compare' && <CompareTab result={result} onSaveAnnotation={onSaveAnnotation} prefillData={prefillData} confidenceData={confidenceData} />}
        {activeTab === 'timeline' && <TimelineTab result={result} />}
      </div>
    </Drawer>
  );
}

function ParsedTab({ result }: { result: EvaluationResult }) {
  const { t } = useTranslation();
  const r = result.parsedResume;
  if (!r) return <div className="text-sm text-status-error">{t('common.parseFailed')}：{result.error}</div>;

  return (
    <div className="space-y-5">
      {/* Basic info */}
      <div>
        <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">{t('fields.basics')}</div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            { label: t('fields.name'), value: r.basics?.name },
            { label: t('fields.phone'), value: r.basics?.phone },
            { label: t('fields.email'), value: r.basics?.email },
            { label: t('fields.title'), value: r.basics?.title },
            { label: t('fields.location'), value: r.basics?.location },
          ].map(f => (
            <div key={f.label} className="flex gap-2">
              <span className="text-text-tertiary w-12 shrink-0">{f.label}</span>
              <span className="text-text-primary">{f.value || '-'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Work */}
      {r.work?.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">
            {t('evaluation.workCount', { count: r.work.length })}
          </div>
          <div className="space-y-2">
            {r.work.map((w, i) => (
              <div key={i} className="p-3 bg-surface-secondary rounded-lg">
                <p className="text-sm font-medium text-text-primary">{w.company} · {w.position}</p>
                <p className="text-xs text-text-tertiary">{w.startDate} ~ {w.endDate || t('evaluation.present')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {r.education?.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">
            {t('evaluation.eduCount', { count: r.education.length })}
          </div>
          <div className="space-y-2">
            {r.education.map((e, i) => (
              <div key={i} className="p-3 bg-surface-secondary rounded-lg">
                <p className="text-sm font-medium text-text-primary">{e.institution}</p>
                <p className="text-xs text-text-secondary">{e.degree} · {e.major || '-'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {(r.skills?.length ?? 0) > 0 && (
        <div>
          <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2">{t('fields.skills')}</div>
          <div className="flex flex-wrap gap-1.5">
            {r.skills?.map((s: string, i: number) => (
              <span key={i} className="badge-info">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Meta */}
      <div className="pt-3 border-t border-border text-xs text-text-tertiary flex flex-wrap gap-4">
        <span>{t('evaluation.classification')}：{result.classification?.difficulty} / {result.classification?.completeness} / {result.classification?.scenario}</span>
        <span>{t('evaluation.cache')}：{result.fromCache ? t('monitor.cacheHit') : t('monitor.cacheMiss')}</span>
        <span>{t('evaluation.duration')}：{result.processingTime}ms</span>
      </div>
    </div>
  );
}

function ConfidenceBadge({ score }: { score?: number }) {
  if (score === undefined) return null;
  const cls = score >= 0.9 ? 'bg-status-success' : score >= 0.7 ? 'bg-status-warning' : 'bg-status-error';
  return (
    <span className={`ml-1 px-1 py-0.5 rounded text-xs text-white font-mono ${cls}`}>
      {(score * 100).toFixed(0)}%
    </span>
  );
}

function CompareTab({ result, onSaveAnnotation, prefillData, confidenceData }: {
  result: EvaluationResult;
  onSaveAnnotation?: (annotation: unknown) => void;
  prefillData?: Resume;
  confidenceData?: Record<string, number>;
}) {
  const { t } = useTranslation();
  const [annotation, setAnnotation] = useState<Record<string, Record<string, string>>>(() => {
    if (result.annotation && Object.keys(result.annotation).length > 0) {
      const a = result.annotation;
      return {
        basics: { name: a.basics?.name || '', phone: a.basics?.phone || '', email: a.basics?.email || '' },
      };
    }
    if (prefillData?.basics) {
      return { basics: { name: prefillData.basics.name, phone: prefillData.basics.phone, email: prefillData.basics.email } };
    }
    return {} as Record<string, Record<string, string>>;
  });

  if (!result.annotation && !result.parsedResume) {
    return <div className="text-sm text-text-secondary">{t('evaluation.noAnnotation')}</div>;
  }

  const updateField = (section: string, field: string, value: string) => {
    setAnnotation({
      ...annotation,
      [section]: { ...annotation[section], [field]: value }
    });
  };

  const fieldLabels: Record<string, string> = {
    name: t('fields.name'),
    phone: t('fields.phone'),
    email: t('fields.email'),
  };

  return (
    <div className="space-y-5">
      {result.annotation && result.parsedResume && (
        <ComparisonView parsed={result.parsedResume} annotation={result.annotation} />
      )}

      {/* Inline annotation editor */}
      <div className="pt-4 border-t border-border">
        <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-3">{t('evaluation.editAnnotation')}</div>
        <div className="space-y-2">
          {['name', 'phone', 'email'].map(field => (
            <div key={field} className="grid grid-cols-3 gap-2 items-center text-sm">
              <span className="text-text-secondary capitalize">
                {fieldLabels[field]}
                <ConfidenceBadge score={confidenceData?.[`basics.${field}`]} />
              </span>
              <span className="text-text-tertiary">{result.parsedResume?.basics?.[field as keyof typeof result.parsedResume.basics] || '-'}</span>
              <input
                type="text"
                value={annotation.basics?.[field] || ''}
                onChange={e => updateField('basics', field, e.target.value)}
                className="input py-1.5"
                placeholder={t('evaluation.annotationPlaceholder')}
              />
            </div>
          ))}
        </div>
        {onSaveAnnotation && (
          <button
            onClick={() => onSaveAnnotation(annotation)}
            className="btn-primary mt-3 flex items-center gap-2"
          >
            <Icon name="check-circle" size={16} />
            {t('evaluation.saveAnnotation')}
          </button>
        )}
      </div>
    </div>
  );
}

function TimelineTab({ result }: { result: EvaluationResult }) {
  const { t } = useTranslation();
  if (!result.processTrace) {
    return <div className="text-sm text-text-secondary">{t('timeline.noData')}</div>;
  }
  return <ProcessTimeline trace={result.processTrace} />;
}
