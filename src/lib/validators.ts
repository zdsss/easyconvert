import { z } from 'zod';

const emailSchema = z.string().email();
const phoneSchema = z.string().regex(/^[\d\s\-+()]+$/);

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  completeness: number;
}

export interface FieldValidation {
  field: string;
  isValid: boolean;
  score: number;
  issues: string[];
}

export interface EnhancedValidationResult {
  isValid: boolean;
  overallScore: number;
  fieldValidations: FieldValidation[];
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export function validateBasic(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data.basics?.name) errors.push('缺少姓名');
  if (!data.basics?.email && !data.basics?.phone) errors.push('缺少联系方式');

  const completeness = (data.basics?.name ? 50 : 0) +
    ((data.basics?.email || data.basics?.phone) ? 50 : 0);

  return { isValid: errors.length === 0, errors, warnings, completeness };
}

export function validateStandard(data: any): ValidationResult {
  const result = validateBasic(data);

  if (!data.work?.length) result.warnings.push('缺少工作经历');
  if (!data.education?.length) result.warnings.push('缺少教育经历');

  result.completeness = Math.min(100,
    (data.basics?.name ? 50 : 0) +
    (data.work?.length ? 15 : 0) +
    (data.education?.length ? 15 : 0) +
    (data.skills?.length ? 10 : 0) +
    (data.certificates?.length ? 5 : 0) +
    (data.projects?.length ? 5 : 0)
  );

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

export function validateEnhanced(data: any, _type: 'basic' | 'standard' | 'strict'): EnhancedValidationResult {
  const fieldValidations: FieldValidation[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Structure validation
  const basicsValidation = validateField('basics', data.basics, {
    required: ['name'],
    optional: ['phone', 'email']
  });
  fieldValidations.push(basicsValidation);
  if (!basicsValidation.isValid) errors.push(...basicsValidation.issues);

  // Semantic validation
  if (data.basics?.email && !emailSchema.safeParse(data.basics.email).success) {
    errors.push('邮箱格式无效');
  }
  if (data.basics?.phone && !phoneSchema.safeParse(data.basics.phone).success) {
    errors.push('电话格式无效');
  }

  // Completeness validation
  if (!data.work?.length) warnings.push('缺少工作经历');
  if (!data.education?.length) warnings.push('缺少教育经历');

  const overallScore = fieldValidations.reduce((sum, fv) => sum + fv.score, 0) / fieldValidations.length;

  return {
    isValid: errors.length === 0,
    overallScore,
    fieldValidations,
    errors,
    warnings,
    suggestions
  };
}

function validateField(name: string, data: any, schema: { required: string[], optional?: string[] }): FieldValidation {
  const issues: string[] = [];
  let score = 100;

  if (!data) {
    issues.push(`${name} 缺失`);
    return { field: name, isValid: false, score: 0, issues };
  }

  schema.required.forEach(field => {
    if (!data[field]) {
      issues.push(`${name}.${field} 必填`);
      score -= 50;
    }
  });

  return { field: name, isValid: issues.length === 0, score: Math.max(0, score), issues };
}
