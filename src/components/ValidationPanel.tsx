import type { ValidationResult } from '@shared/types';

interface Props {
  result: ValidationResult | null;
}

export default function ValidationPanel({ result }: Props) {
  if (!result) return null;

  return (
    <div className="mt-4 p-4 border border-surface-secondary rounded-lg">
      <h3 className="font-semibold mb-2">验证结果</h3>

      <div className="mb-2">
        <span
          className={`px-2 py-1 rounded text-sm ${result.isValid ? 'bg-status-success/10 text-status-success' : 'bg-status-error/10 text-status-error'}`}
          role="status"
        >
          {result.isValid ? '✓ 验证通过' : '✗ 验证失败'}
        </span>
        <span className="ml-2 text-sm text-text-secondary">完整度: {result.completeness}%</span>
      </div>

      {result.errors.length > 0 && (
        <div className="mb-2">
          <p className="text-sm font-medium text-status-error">错误:</p>
          <ul className="list-disc list-inside text-sm text-status-error">
            {result.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {result.warnings.length > 0 && (
        <div>
          <p className="text-sm font-medium text-status-warning">警告:</p>
          <ul className="list-disc list-inside text-sm text-status-warning">
            {result.warnings.map((warn, i) => (
              <li key={i}>{warn}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
