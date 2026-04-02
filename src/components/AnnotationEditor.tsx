import { useState } from 'react';
import type { EvaluationResult } from '@lib/types';

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
}

export default function AnnotationEditor({ result, onSave, onCancel }: Props) {
  const [annotation, setAnnotation] = useState<AnnotationData>(
    (result.annotation as unknown as AnnotationData) || {}
  );

  const updateField = (section: string, field: string, value: string) => {
    setAnnotation({
      ...annotation,
      [section]: { ...annotation[section], [field]: value }
    });
  };

  const parsed = result.parsedResume;
  const ann = annotation;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">标注编辑 - {result.fileName}</h3>

        <div className="space-y-4">
          {/* 基本信息 */}
          <div className="border rounded p-3">
            <div className="font-semibold mb-2">基本信息</div>
            <div className="space-y-2">
              <FieldEditor label="姓名" parsed={parsed?.basics?.name} annotated={ann.basics?.name}
                onChange={(v) => updateField('basics', 'name', v)} />
              <FieldEditor label="电话" parsed={parsed?.basics?.phone} annotated={ann.basics?.phone}
                onChange={(v) => updateField('basics', 'phone', v)} />
              <FieldEditor label="邮箱" parsed={parsed?.basics?.email} annotated={ann.basics?.email}
                onChange={(v) => updateField('basics', 'email', v)} />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={() => onSave(annotation)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            保存标注
          </button>
          <button onClick={onCancel}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldEditor({ label, parsed, annotated, onChange }: {
  label: string;
  parsed?: string;
  annotated?: string;
  onChange: (value: string) => void;
}) {
  const match = parsed === annotated;
  return (
    <div className="grid grid-cols-3 gap-2 items-center text-sm">
      <span className="text-gray-600">{label}:</span>
      <span className={match ? 'text-green-600' : 'text-red-600'}>{parsed || '-'}</span>
      <input type="text" value={annotated || ''} onChange={(e) => onChange(e.target.value)}
        className="border rounded px-2 py-1" placeholder="标注值" />
    </div>
  );
}
