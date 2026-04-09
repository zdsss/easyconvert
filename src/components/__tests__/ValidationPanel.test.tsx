import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ValidationPanel from '../ValidationPanel';
import type { ValidationResult } from '@shared/types';

// Mock i18n — return the key as-is for testing
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => {
    const map: Record<string, string> = {
      'validation.title': '验证结果',
      'validation.passed': '✓ 验证通过',
      'validation.failed': '✗ 验证失败',
      'validation.completeness': '完整度',
      'validation.errors': '错误',
      'validation.warnings': '警告',
    };
    return map[key] || key;
  }}),
}));

describe('ValidationPanel', () => {
  it('renders nothing when result is null', () => {
    const { container } = render(<ValidationPanel result={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows success state when valid', () => {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [], completeness: 100 };
    render(<ValidationPanel result={result} />);
    expect(screen.getByText('✓ 验证通过')).toBeDefined();
    expect(screen.getByText(/完整度.*100%/)).toBeDefined();
  });

  it('shows failure state with errors', () => {
    const result: ValidationResult = {
      isValid: false,
      errors: ['缺少姓名', '缺少联系方式'],
      warnings: [],
      completeness: 0,
    };
    render(<ValidationPanel result={result} />);
    expect(screen.getByText('✗ 验证失败')).toBeDefined();
    expect(screen.getByText('缺少姓名')).toBeDefined();
    expect(screen.getByText('缺少联系方式')).toBeDefined();
  });

  it('shows warnings when present', () => {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: ['缺少工作经历'],
      completeness: 50,
    };
    render(<ValidationPanel result={result} />);
    expect(screen.getByText('缺少工作经历')).toBeDefined();
  });

  it('hides error section when no errors', () => {
    const result: ValidationResult = { isValid: true, errors: [], warnings: ['warn'], completeness: 80 };
    render(<ValidationPanel result={result} />);
    expect(screen.queryByText(/^错误/)).toBeNull();
  });
});
