import type { ValidationResult } from '@shared/types';
import { validateWithZod } from '@lib/validation/engine';

export type { ValidationResult };

export function validateBasic(data: any): ValidationResult {
  return validateWithZod(data, 'basic');
}

export function validateStandard(data: any): ValidationResult {
  return validateWithZod(data, 'standard');
}

export function validateStrict(data: any): ValidationResult {
  return validateWithZod(data, 'strict');
}

export function validate(data: any, level: 'basic' | 'standard' | 'strict'): ValidationResult {
  return validateWithZod(data, level);
}
