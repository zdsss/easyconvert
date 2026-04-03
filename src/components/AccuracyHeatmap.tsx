interface Props {
  fields: Record<string, { accuracy: number; matchType: string }>;
}

const ACCURACY_COLORS = [
  { min: 90, bg: 'bg-green-500', text: 'text-white' },
  { min: 70, bg: 'bg-green-300', text: 'text-green-900' },
  { min: 50, bg: 'bg-yellow-300', text: 'text-yellow-900' },
  { min: 30, bg: 'bg-orange-300', text: 'text-orange-900' },
  { min: 0, bg: 'bg-red-400', text: 'text-white' },
];

function getColor(accuracy: number) {
  return ACCURACY_COLORS.find(c => accuracy >= c.min) || ACCURACY_COLORS[ACCURACY_COLORS.length - 1];
}

export default function AccuracyHeatmap({ fields }: Props) {
  const entries = Object.entries(fields).sort((a, b) => a[0].localeCompare(b[0]));

  if (entries.length === 0) {
    return <div className="text-sm text-gray-400">无字段级数据</div>;
  }

  return (
    <div>
      <h3 className="font-semibold text-gray-700 mb-3">字段准确率热力图</h3>
      <div className="flex flex-wrap gap-1">
        {entries.map(([field, data]) => {
          const color = getColor(data.accuracy);
          return (
            <div
              key={field}
              className={`px-2 py-1 rounded text-xs ${color.bg} ${color.text} cursor-default`}
              title={`${field}: ${data.accuracy.toFixed(1)}% (${data.matchType})`}
            >
              {field.split('.').pop()} {data.accuracy.toFixed(0)}%
            </div>
          );
        })}
      </div>

      {/* 图例 */}
      <div className="flex gap-3 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded" /> 90%+</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-300 rounded" /> 70-90%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-300 rounded" /> 50-70%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-300 rounded" /> 30-50%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded" /> &lt;30%</span>
      </div>
    </div>
  );
}
