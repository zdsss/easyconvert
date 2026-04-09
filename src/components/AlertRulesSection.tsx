import Icon from '@components/ui/Icon';

interface AlertRule {
  id: string;
  type: 'errorRate' | 'p95Latency' | 'dailyCost';
  threshold: number;
  enabled: boolean;
  label: string;
  unit: string;
}

interface Props {
  rules: AlertRule[];
  onUpdate: (id: string, updates: Partial<AlertRule>) => void;
}

export default function AlertRulesSection({ rules, onUpdate }: Props) {
  return (
    <div className="card p-5">
      <h3 className="section-title flex items-center gap-2 mb-4">
        <Icon name="bell" size={16} className="text-text-tertiary" />
        告警规则
      </h3>
      <div className="space-y-3">
        {rules.map(rule => (
          <div key={rule.id} className="flex items-center gap-4 p-3 bg-surface-secondary rounded-lg">
            <input
              type="checkbox"
              aria-label={`启用 ${rule.label} 告警`}
              checked={rule.enabled}
              onChange={e => onUpdate(rule.id, { enabled: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-text-primary w-24">{rule.label}</span>
            <span className="text-xs text-text-secondary">超过</span>
            <input
              type="number"
              aria-label={`${rule.label} 阈值`}
              value={rule.threshold}
              onChange={e => onUpdate(rule.id, { threshold: Number(e.target.value) })}
              className="w-20 px-2 py-1 border border-border rounded text-sm font-mono"
              min={0}
            />
            <span className="text-xs text-text-secondary">{rule.unit} 时告警</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export type { AlertRule };
