import { resumeSchema } from './schemas';
import type { ValidationResult } from '../types';

export type { ValidationResult };

export function validateWithZod(data: any, level: 'basic' | 'standard' | 'strict'): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic checks — always required
  if (!data.basics?.name) errors.push('缺少姓名');
  if (!data.basics?.email && !data.basics?.phone) errors.push('缺少联系方式');

  // Standard checks — warnings for missing optional sections
  if (level === 'standard' || level === 'strict') {
    if (!data.work?.length) warnings.push('缺少工作经历');
    if (!data.education?.length) warnings.push('缺少教育经历');
  }

  // Strict checks — format validation + array type checking
  if (level === 'strict') {
    if (data.basics?.email) {
      const emailResult = resumeSchema.shape.basics.shape.email.safeParse(data.basics.email);
      if (!emailResult.success) errors.push('邮箱格式无效');
    }

    if (data.basics?.phone) {
      const phoneResult = resumeSchema.shape.basics.shape.phone.safeParse(data.basics.phone);
      if (!phoneResult.success) errors.push('电话格式无效');
    }

    // Array field type checking
    const validateArrayField = (field: any, name: string) => {
      if (field && !Array.isArray(field)) {
        errors.push(`${name}应为数组格式`);
      } else if (Array.isArray(field) && field.some(item => typeof item !== 'string')) {
        errors.push(`${name}数组元素应为字符串`);
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
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    completeness: calculateCompleteness(data)
  };
}

export function calculateCompleteness(data: any): number {
  let score = 0;
  if (data.basics?.name) score += 30;
  if (data.basics?.email || data.basics?.phone) score += 20;
  if (data.work?.length) score += 25;
  if (data.education?.length) score += 15;
  if (data.skills?.length) score += 10;
  return score;
}
