import type { Resume } from '@lib/types';

interface Props {
  parsed: Resume;
  annotation: Resume;
}

const FIELD_LABELS: Record<string, string> = {
  'basics.name': '姓名',
  'basics.email': '邮箱',
  'basics.phone': '电话',
  'basics.title': '职位',
  'basics.location': '地点',
};

function getValueByPath(obj: any, path: string): any {
  return path.split('.').reduce((curr, key) => curr?.[key], obj);
}

function compareValues(a: any, b: any): 'match' | 'partial' | 'missing' | 'mismatch' {
  if (a === undefined && b === undefined) return 'match';
  if (a === undefined || b === undefined) return 'missing';
  if (JSON.stringify(a) === JSON.stringify(b)) return 'match';
  if (typeof a === 'string' && typeof b === 'string') {
    const similarity = a.length > 0 && b.length > 0 && (a.includes(b) || b.includes(a));
    return similarity ? 'partial' : 'mismatch';
  }
  return 'mismatch';
}

const STATUS_STYLES = {
  match: { row: 'bg-status-success-bg', badge: 'badge-success', label: '匹配' },
  partial: { row: 'bg-status-warning-bg', badge: 'badge-warning', label: '部分' },
  missing: { row: 'bg-surface-secondary', badge: 'badge-neutral', label: '缺失' },
  mismatch: { row: 'bg-status-error-bg', badge: 'badge-error', label: '不匹配' },
};

export default function ComparisonView({ parsed, annotation }: Props) {
  const fields = [
    'basics.name', 'basics.email', 'basics.phone', 'basics.title', 'basics.location',
  ];

  return (
    <div className="space-y-5">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">字段对比</h3>

      {/* Basic fields */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-secondary">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">字段</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">解析结果</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">标注数据</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">状态</th>
            </tr>
          </thead>
          <tbody>
            {fields.map(field => {
              const parsedVal = getValueByPath(parsed, field);
              const annotationVal = getValueByPath(annotation, field);
              const status = compareValues(parsedVal, annotationVal);
              const style = STATUS_STYLES[status];

              return (
                <tr key={field} className={`border-t border-border-light ${style.row}`}>
                  <td className="px-4 py-2.5 font-medium text-gray-600">{FIELD_LABELS[field] || field}</td>
                  <td className="px-4 py-2.5">{parsedVal ?? <span className="text-gray-400">-</span>}</td>
                  <td className="px-4 py-2.5">{annotationVal ?? <span className="text-gray-400">-</span>}</td>
                  <td className="px-4 py-2.5"><span className={style.badge}>{style.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Work comparison */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          工作经历（解析: {parsed.work?.length || 0} / 标注: {annotation.work?.length || 0}）
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4 border-l-2 border-l-brand-400">
            <div className="text-xs font-semibold text-brand-600 mb-2">解析结果</div>
            {parsed.work?.map((w, i) => (
              <div key={i} className="text-sm text-gray-600 mb-1">{w.company} — {w.position}</div>
            )) || <div className="text-sm text-gray-400">无</div>}
          </div>
          <div className="card p-4 border-l-2 border-l-status-success">
            <div className="text-xs font-semibold text-emerald-600 mb-2">标注数据</div>
            {annotation.work?.map((w, i) => (
              <div key={i} className="text-sm text-gray-600 mb-1">{w.company} — {w.position}</div>
            )) || <div className="text-sm text-gray-400">无</div>}
          </div>
        </div>
      </div>

      {/* Education comparison */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          教育背景（解析: {parsed.education?.length || 0} / 标注: {annotation.education?.length || 0}）
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4 border-l-2 border-l-brand-400">
            <div className="text-xs font-semibold text-brand-600 mb-2">解析结果</div>
            {parsed.education?.map((e, i) => (
              <div key={i} className="text-sm text-gray-600 mb-1">{e.institution} — {e.degree}</div>
            )) || <div className="text-sm text-gray-400">无</div>}
          </div>
          <div className="card p-4 border-l-2 border-l-status-success">
            <div className="text-xs font-semibold text-emerald-600 mb-2">标注数据</div>
            {annotation.education?.map((e, i) => (
              <div key={i} className="text-sm text-gray-600 mb-1">{e.institution} — {e.degree}</div>
            )) || <div className="text-sm text-gray-400">无</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
