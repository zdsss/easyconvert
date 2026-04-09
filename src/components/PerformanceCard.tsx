import React from 'react';
import Icon from '@components/ui/Icon';

interface Props {
  performance: { p50: number; p95: number; p99: number };
}

function PerformanceCard({ performance }: Props) {
  return (
    <div className="card p-5">
      <h3 className="section-title flex items-center gap-2 mb-4">
        <Icon name="activity" size={16} className="text-text-tertiary" />
        延迟分布
      </h3>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'P50', value: performance.p50 },
          { label: 'P95', value: performance.p95 },
          { label: 'P99', value: performance.p99 },
        ].map(p => {
          const color = p.value < 500 ? 'text-status-success' : p.value < 2000 ? 'text-status-warning' : 'text-status-error';
          return (
            <div key={p.label} className="p-4 bg-surface-secondary rounded-lg text-center">
              <p className="text-xs text-text-secondary mb-1">{p.label}</p>
              <p className={`text-2xl font-bold font-mono ${color}`}>{p.value}ms</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default React.memo(PerformanceCard);
