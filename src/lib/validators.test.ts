import { describe, it, expect } from 'vitest';
import { validateWithZod } from '@shared/validation/engine';

describe('validateWithZod', () => {
  it('basic: requires name and contact', () => {
    const result = validateWithZod({ basics: { name: 'Test', email: 'test@example.com' } }, 'basic');
    expect(result.isValid).toBe(true);
  });

  it('basic: fails without name', () => {
    const result = validateWithZod({ basics: { email: 'test@example.com' } }, 'basic');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('缺少姓名');
  });

  it('standard: warns about missing work/education', () => {
    const result = validateWithZod({ basics: { name: 'Test', email: 'test@example.com' } }, 'standard');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('strict: validates email format', () => {
    const result = validateWithZod({ basics: { name: 'Test', email: 'invalid' } }, 'strict');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('邮箱格式无效');
  });

  it('strict: validates phone format', () => {
    const result = validateWithZod({ basics: { name: 'Test', email: 'a@b.com', phone: 'abc' } }, 'strict');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('电话格式无效');
  });
});
