interface Props {
  fields: Record<string, { accuracy: number; matchType: string }>;
}

const ACCURACY_COLORS = [
  { min: 90, bg: 'bg-status-success', text: 'text-white' },
  { min: 70, bg: 'bg-status-success/60', text: 'text-status-success' },
  { min: 50, bg: 'bg-status-warning/60', text: 'text-status-warning' },
  { min: 30, bg: 'bg-amber-400/60', text: 'text-amber-900 dark:text-amber-200' },
  { min: 0, bg: 'bg-status-error/70', text: 'text-white' },
];

function getColor(accuracy: number) {
  return ACCURACY_COLORS.find(c => accuracy >= c.min) || ACCURACY_COLORS[ACCURACY_COLORS.length - 1];
}

export default function AccuracyHeatmap({ fields }: Props) {
  const entries = Object.entries(fields).sort((a, b) => a[0].localeCompare(b[0]));

  if (entries.length === 0) {
    return <div className="text-sm text-text-tertiary">无字段级数据</div>;
  }

  return (
    <div>
      <h3 className="font-semibold text-text-primary mb-3">字段准确率热力图</h3>
      <div className="flex flex-wrap gap-1">
        {entries.map(([field, data]) => {
          const color = getColor(data.accuracy);
          return (
            <div
              key={field}
              className={`px-2 py-1 rounded text-xs ${color.bg} ${color.text} cursor-default`}
              title={`${field}: ${data.accuracy.toFixed(1)}% (${data.matchType})`}
              role="img"
              aria-label={`${field}: ${data.accuracy.toFixed(1)}%`}
            >
              {field.split('.').pop()} {data.accuracy.toFixed(0)}%
            </div>
          );
        })}
      </div>

      {/* 图例 */}
      <div className="flex gap-3 mt-3 text-xs text-text-tertiary">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-status-success rounded" /> 90%+</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-status-success/60 rounded" /> 70-90%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-status-warning/60 rounded" /> 50-70%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-400/60 rounded" /> 30-50%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-status-error/70 rounded" /> &lt;30%</span>
      </div>
    </div>
  );
}
