import { useTranslation } from 'react-i18next';
import type { ValidationResult } from '@shared/types';

interface Props {
  result: ValidationResult | null;
}

export default function ValidationPanel({ result }: Props) {
  const { t } = useTranslation();
  if (!result) return null;

  return (
    <div className="mt-4 p-4 border border-surface-secondary rounded-lg">
      <h3 className="font-semibold mb-2">{t('validation.title')}</h3>

      <div className="mb-2">
        <span
          className={`px-2 py-1 rounded text-sm ${result.isValid ? 'bg-status-success/10 text-status-success' : 'bg-status-error/10 text-status-error'}`}
          role="status"
        >
          {result.isValid ? t('validation.passed') : t('validation.failed')}
        </span>
        <span className="ml-2 text-sm text-text-secondary">{t('validation.completeness')}: {result.completeness}%</span>
      </div>

      {result.errors.length > 0 && (
        <div className="mb-2">
          <p className="text-sm font-medium text-status-error">{t('validation.errors')}:</p>
          <ul className="list-disc list-inside text-sm text-status-error">
            {result.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {result.warnings.length > 0 && (
        <div>
          <p className="text-sm font-medium text-status-warning">{t('validation.warnings')}:</p>
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
