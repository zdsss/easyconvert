import { ValidationResult } from '@lib/validators';

interface Props {
  result: ValidationResult | null;
}

export default function ValidationPanel({ result }: Props) {
  if (!result) return null;

  return (
    <div className="mt-4 p-4 border rounded-lg">
      <h3 className="font-semibold mb-2">验证结果</h3>

      <div className="mb-2">
        <span
          className={`px-2 py-1 rounded text-sm ${result.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
        >
          {result.isValid ? '✓ 验证通过' : '✗ 验证失败'}
        </span>
        <span className="ml-2 text-sm text-gray-600">完整度: {result.completeness}%</span>
      </div>

      {result.errors.length > 0 && (
        <div className="mb-2">
          <p className="text-sm font-medium text-red-600">错误:</p>
          <ul className="list-disc list-inside text-sm text-red-600">
            {result.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {result.warnings.length > 0 && (
        <div>
          <p className="text-sm font-medium text-yellow-600">警告:</p>
          <ul className="list-disc list-inside text-sm text-yellow-600">
            {result.warnings.map((warn, i) => (
              <li key={i}>{warn}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
