import { useState } from 'react';
import type { EvaluationResult } from '@lib/types';
import Icon from './ui/Icon';

interface AnnotationData {
  basics?: {
    name?: string;
    phone?: string;
    email?: string;
    title?: string;
    location?: string;
  };
  [key: string]: Record<string, string | undefined> | undefined;
}

interface Props {
  result: EvaluationResult;
  onSave: (annotation: AnnotationData) => void;
  onCancel: () => void;
  prefillData?: Record<string, any>;
  confidenceData?: Record<string, number>;
}

function ConfidenceBadge({ score }: { score?: number }) {
  if (score === undefined) return null;
  const cls = score >= 0.9
    ? 'bg-emerald-500'
    : score >= 0.7
    ? 'bg-amber-500'
    : 'bg-red-500';
  return (
    <span className={`ml-1 px-1 py-0.5 rounded text-xs text-white font-mono ${cls}`}>
      {(score * 100).toFixed(0)}%
    </span>
  );
}

export default function AnnotationEditor({ result, onSave, onCancel, prefillData, confidenceData }: Props) {
  const [annotation, setAnnotation] = useState<AnnotationData>(() => {
    if (result.annotation && Object.keys(result.annotation).length > 0) {
      return result.annotation as AnnotationData;
    }
    if (prefillData?.basics) {
      return { basics: { ...prefillData.basics } };
    }
    return {};
  });

  const updateField = (section: string, field: string, value: string) => {
    setAnnotation({
      ...annotation,
      [section]: { ...annotation[section], [field]: value }
    });
  };

  const parsed = result.parsedResume;
  const ann = annotation;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-surface rounded-xl shadow-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between mb-5">
          <h3 className="section-title">标注编辑 — {result.fileName}</h3>
          <button onClick={onCancel} className="btn-ghost p-1">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">基本信息</div>
            <div className="space-y-3">
              <FieldEditor label="姓名" parsed={parsed?.basics?.name} annotated={ann.basics?.name}
                confidence={confidenceData?.['basics.name']}
                onChange={(v) => updateField('basics', 'name', v)} />
              <FieldEditor label="电话" parsed={parsed?.basics?.phone} annotated={ann.basics?.phone}
                confidence={confidenceData?.['basics.phone']}
                onChange={(v) => updateField('basics', 'phone', v)} />
              <FieldEditor label="邮箱" parsed={parsed?.basics?.email} annotated={ann.basics?.email}
                confidence={confidenceData?.['basics.email']}
                onChange={(v) => updateField('basics', 'email', v)} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={() => onSave(annotation)} className="btn-primary flex items-center gap-2">
            <Icon name="check-circle" size={16} />
            保存标注
          </button>
          <button onClick={onCancel} className="btn-secondary">
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldEditor({ label, parsed, annotated, confidence, onChange }: {
  label: string;
  parsed?: string;
  annotated?: string;
  confidence?: number;
  onChange: (value: string) => void;
}) {
  const match = parsed === annotated;
  return (
    <div className="grid grid-cols-3 gap-3 items-center text-sm">
      <span className="text-gray-500 font-medium">{label}<ConfidenceBadge score={confidence} /></span>
      <span className={match ? 'text-status-success' : 'text-status-error'}>{parsed || '-'}</span>
      <input
        type="text"
        value={annotated || ''}
        onChange={(e) => onChange(e.target.value)}
        className="input py-1.5"
        placeholder="标注值"
      />
    </div>
  );
}
