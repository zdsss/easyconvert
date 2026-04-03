import Icon from './Icon';
import SparklineChart from './SparklineChart';

interface Props {
  title: string;
  value: string | number;
  icon: string;
  trend?: { value: number; direction: 'up' | 'down' };
  sparklineData?: number[];
  color?: string;
}

export default function MetricCard({ title, value, icon, trend, sparklineData, color }: Props) {
  return (
    <div className="card p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-surface-tertiary flex items-center justify-center group-hover:bg-brand-50 dark:group-hover:bg-brand-900/20 transition-colors">
              <Icon name={icon} size={16} className="text-text-tertiary group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors" />
            </div>
          </div>
          <p className="text-xs text-text-secondary">{title}</p>
          <p className={`text-2xl font-bold font-mono ${color || 'text-text-primary'}`}>{value}</p>
        </div>

        {sparklineData && sparklineData.length > 1 && (
          <div className="w-16 h-8 shrink-0 mt-1">
            <SparklineChart data={sparklineData} />
          </div>
        )}
      </div>

      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${
          trend.direction === 'up' ? 'text-status-success' : 'text-status-error'
        }`}>
          <Icon name={trend.direction === 'up' ? 'trending-up' : 'trending-down'} size={14} />
          <span>{trend.value > 0 ? '+' : ''}{trend.value}%</span>
        </div>
      )}
    </div>
  );
}
