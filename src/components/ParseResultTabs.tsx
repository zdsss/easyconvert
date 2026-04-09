import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Resume } from '@lib/types';
import Icon from './ui/Icon';

interface Props {
  resume: Resume;
}

type TabKey = 'basics' | 'work' | 'education' | 'skills' | 'raw';

export default function ParseResultTabs({ resume }: Props) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('basics');

  const tabs = [
    { key: 'basics' as const, label: t('fields.basics'), icon: 'user' },
    { key: 'work' as const, label: t('fields.work'), icon: 'clipboard' },
    { key: 'education' as const, label: t('fields.education'), icon: 'layers' },
    { key: 'skills' as const, label: t('fields.skills'), icon: 'zap' },
    { key: 'raw' as const, label: t('fields.rawJson'), icon: 'code' },
  ];

  return (
    <div className="card overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-border overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-brand-600 text-brand-700 dark:text-brand-400'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
            }`}
          >
            <Icon name={tab.icon} size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-5 animate-fade-in">
        {activeTab === 'basics' && <BasicsTab resume={resume} />}
        {activeTab === 'work' && <WorkTab resume={resume} />}
        {activeTab === 'education' && <EducationTab resume={resume} />}
        {activeTab === 'skills' && <SkillsTab resume={resume} />}
        {activeTab === 'raw' && <RawTab resume={resume} />}
      </div>
    </div>
  );
}

function FieldRow({ label, value, confidence }: { label: string; value?: string; confidence?: number }) {
  return (
    <div className="flex items-center py-2 border-b border-border-light last:border-0">
      <span className="w-24 text-xs text-text-tertiary shrink-0">{label}</span>
      <span className="flex-1 text-sm text-text-primary">{value || '-'}</span>
      {confidence != null && (
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-16 h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${confidence >= 0.9 ? 'bg-status-success' : confidence >= 0.7 ? 'bg-status-warning' : 'bg-status-error'}`}
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
          <span className="text-xs text-text-tertiary w-8">{(confidence * 100).toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
}

function BasicsTab({ resume }: { resume: Resume }) {
  const { t } = useTranslation();
  const b = resume.basics;
  if (!b) return <p className="text-sm text-text-secondary">{t('fields.noBasics')}</p>;
  return (
    <div>
      <FieldRow label={t('fields.name')} value={b.name} />
      <FieldRow label={t('fields.phone')} value={b.phone} />
      <FieldRow label={t('fields.email')} value={b.email} />
      <FieldRow label={t('fields.title')} value={b.title} />
      <FieldRow label={t('fields.location')} value={b.location} />
      {resume.summary && <FieldRow label={t('fields.summary')} value={resume.summary} />}
    </div>
  );
}

function WorkTab({ resume }: { resume: Resume }) {
  const { t } = useTranslation();
  const work = resume.work;
  if (!work?.length) return <p className="text-sm text-text-secondary">{t('fields.noWork')}</p>;
  return (
    <div className="space-y-4">
      {work.map((w, i) => (
        <div key={i} className="p-4 bg-surface-secondary rounded-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-text-primary">{w.company}</p>
              <p className="text-sm text-text-secondary">{w.position}</p>
            </div>
            <span className="text-xs text-text-tertiary">{w.startDate} ~ {w.endDate || t('fields.present')}</span>
          </div>
          {w.highlights && w.highlights.length > 0 && (
            <ul className="mt-2 space-y-1">
              {w.highlights?.map((h, j) => (
                <li key={j} className="text-xs text-text-secondary flex gap-1.5">
                  <span className="text-text-tertiary mt-0.5">·</span>
                  {h}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function EducationTab({ resume }: { resume: Resume }) {
  const { t } = useTranslation();
  const edu = resume.education;
  if (!edu?.length) return <p className="text-sm text-text-secondary">{t('fields.noEducation')}</p>;
  return (
    <div className="space-y-3">
      {edu.map((e, i) => (
        <div key={i} className="p-4 bg-surface-secondary rounded-lg">
          <p className="text-sm font-semibold text-text-primary">{e.institution}</p>
          <p className="text-sm text-text-secondary">{e.degree} · {e.major || '-'}</p>
          <p className="text-xs text-text-tertiary mt-1">{e.startDate} ~ {e.endDate || '-'}</p>
        </div>
      ))}
    </div>
  );
}

function SkillsTab({ resume }: { resume: Resume }) {
  const { t } = useTranslation();
  const skills = resume.skills;
  if (!skills?.length) return <p className="text-sm text-text-secondary">{t('fields.noSkills')}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((s: string, i: number) => (
        <span key={i} className="badge-info">{s}</span>
      ))}
    </div>
  );
}

function RawTab({ resume }: { resume: Resume }) {
  return (
    <pre className="text-xs font-mono text-text-secondary bg-surface-secondary rounded-lg p-4 overflow-auto max-h-96">
      {JSON.stringify(resume, null, 2)}
    </pre>
  );
}
