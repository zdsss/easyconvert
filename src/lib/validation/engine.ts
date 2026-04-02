import { resumeSchema } from './schemas';
import type { ValidationResult } from '@lib/validators';

export function validateWithZod(data: any, level: 'basic' | 'standard' | 'strict'): ValidationResult {
  const result = resumeSchema.safeParse(data);

  if (result.success) {
    const completeness = calculateCompleteness(data);
    return { isValid: true, errors: [], warnings: [], completeness };
  }

  const errors = result.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`);
  return { isValid: level === 'basic' ? errors.length < 2 : false, errors, warnings: [], completeness: 0 };
}

function calculateCompleteness(data: any): number {
  let score = 0;
  if (data.basics?.name) score += 30;
  if (data.basics?.email || data.basics?.phone) score += 20;
  if (data.work?.length) score += 25;
  if (data.education?.length) score += 15;
  if (data.skills?.length) score += 10;
  return score;
}
