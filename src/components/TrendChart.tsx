import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TrendPoint {
  date: string;
  accuracy: number;
  count: number;
}

interface GenericPoint {
  [key: string]: string | number;
}

interface Props {
  data: TrendPoint[] | GenericPoint[];
  dataKey?: string;
  yDomain?: [number, number] | ['auto', 'auto'];
  color?: string;
  tooltipFormatter?: (value: number, name: string) => [string, string];
  xKey?: string;
}

export default function TrendChart({
  data,
  dataKey = 'accuracy',
  yDomain = [0, 100],
  color = '#3b82f6',
  tooltipFormatter,
  xKey = 'date',
}: Props) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center h-full text-text-tertiary text-sm">暂无趋势数据</div>;
  }

  const defaultFormatter = (value: number) => [`${value.toFixed(1)}%`, '准确率'] as [string, string];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
        <YAxis domain={yDomain} tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={tooltipFormatter || defaultFormatter}
          labelFormatter={(label) => `${label}`}
        />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
