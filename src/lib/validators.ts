import { z } from 'zod';
import type { ValidationResult } from '@shared/types';
import { calculateCompleteness } from '@lib/validation/engine';

const emailSchema = z.string().email();
const phoneSchema = z.string().regex(/^[\d\s\-+()]+$/);

export type { ValidationResult };

export function validateBasic(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data.basics?.name) errors.push('缺少姓名');
  if (!data.basics?.email && !data.basics?.phone) errors.push('缺少联系方式');

  return { isValid: errors.length === 0, errors, warnings, completeness: calculateCompleteness(data) };
}

export function validateStandard(data: any): ValidationResult {
  const result = validateBasic(data);

  if (!data.work?.length) result.warnings.push('缺少工作经历');
  if (!data.education?.length) result.warnings.push('缺少教育经历');

  return result;
}

export function validateStrict(data: any): ValidationResult {
  const result = validateStandard(data);

  if (data.basics?.email) {
    try {
      emailSchema.parse(data.basics.email);
    } catch {
      result.errors.push('邮箱格式无效');
    }
  }

  if (data.basics?.phone) {
    try {
      phoneSchema.parse(data.basics.phone);
    } catch {
      result.errors.push('电话格式无效');
    }
  }

  const validateArrayField = (field: any, name: string) => {
    if (field && !Array.isArray(field)) {
      result.errors.push(`${name}应为数组格式`);
    } else if (Array.isArray(field) && field.some(item => typeof item !== 'string')) {
      result.errors.push(`${name}数组元素应为字符串`);
    }
  };

  data.work?.forEach((w: any, i: number) => {
    validateArrayField(w.responsibilities, `工作经历${i + 1}的职责`);
    validateArrayField(w.achievements, `工作经历${i + 1}的成果`);
  });

  data.education?.forEach((e: any, i: number) => {
    validateArrayField(e.courses, `教育经历${i + 1}的课程`);
    validateArrayField(e.honors, `教育经历${i + 1}的荣誉`);
  });

  validateArrayField(data.skills, '技能');

  result.isValid = result.errors.length === 0;
  return result;
}

export function validate(data: any, _type: 'basic' | 'standard' | 'strict'): ValidationResult {
  switch (_type) {
    case 'basic': return validateBasic(data);
    case 'standard': return validateStandard(data);
    case 'strict': return validateStrict(data);
    default: throw new Error(`Invalid validation type: ${_type}`);
  }
}
