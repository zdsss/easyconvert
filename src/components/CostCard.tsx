import React from 'react';
import Icon from '@components/ui/Icon';

interface CostData {
  calls: number;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  estimatedCost: number;
  model: string;
}

interface Props {
  cost: CostData;
}

function CostCard({ cost }: Props) {
  return (
    <div className="card p-5">
      <h3 className="section-title flex items-center gap-2 mb-4">
        <Icon name="bar-chart" size={16} className="text-text-tertiary" />
        成本追踪
        {cost.model && <span className="text-xs text-text-tertiary font-normal ml-auto">{cost.model}</span>}
      </h3>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="p-3 bg-surface-secondary rounded-lg text-center">
          <p className="text-xs text-text-secondary mb-1">API 调用</p>
          <p className="text-xl font-bold font-mono text-text-primary">{cost.calls}</p>
        </div>
        <div className="p-3 bg-surface-secondary rounded-lg text-center">
          <p className="text-xs text-text-secondary mb-1">总 Token</p>
          <p className="text-xl font-bold font-mono text-text-primary">{cost.tokens.toLocaleString()}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="p-3 bg-surface-secondary rounded-lg">
          <p className="text-xs text-text-secondary mb-1">输入 Token</p>
          <p className="text-sm font-mono text-text-primary">{cost.inputTokens.toLocaleString()}</p>
          <p className="text-xs font-mono text-text-tertiary mt-0.5">¥{cost.inputCost.toFixed(6)}</p>
        </div>
        <div className="p-3 bg-surface-secondary rounded-lg">
          <p className="text-xs text-text-secondary mb-1">输出 Token</p>
          <p className="text-sm font-mono text-text-primary">{cost.outputTokens.toLocaleString()}</p>
          <p className="text-xs font-mono text-text-tertiary mt-0.5">¥{cost.outputCost.toFixed(6)}</p>
        </div>
      </div>
      <div className="p-3 bg-status-warning-bg dark:bg-amber-900/20 rounded-lg text-center">
        <p className="text-xs text-text-secondary mb-1">累计成本</p>
        <p className="text-2xl font-bold font-mono text-amber-700 dark:text-amber-400">¥{cost.estimatedCost.toFixed(6)}</p>
      </div>
    </div>
  );
}

export default React.memo(CostCard);
