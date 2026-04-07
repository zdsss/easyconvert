import { describe, it, expect } from 'vitest';
import { validate, validateBasic, validateStandard, validateStrict } from './validators';

describe('Validators', () => {
  it('validateBasic requires name and contact', () => {
    const result = validateBasic({ basics: { name: 'Test', email: 'test@example.com' } });
    expect(result.isValid).toBe(true);
  });

  it('validateBasic fails without name', () => {
    const result = validateBasic({ basics: { email: 'test@example.com' } });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('缺少姓名');
  });

  it('validateStandard warns about missing work/education', () => {
    const result = validateStandard({ basics: { name: 'Test', email: 'test@example.com' } });
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('validateStrict validates email format', () => {
    const result = validateStrict({ basics: { name: 'Test', email: 'invalid' } });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('邮箱格式无效');
  });

  it('validate delegates to correct level', () => {
    const basic = validate({ basics: { name: 'Test', email: 'test@example.com' } }, 'basic');
    expect(basic.isValid).toBe(true);

    const strict = validate({ basics: { name: 'Test', email: 'invalid' } }, 'strict');
    expect(strict.isValid).toBe(false);
  });
});
