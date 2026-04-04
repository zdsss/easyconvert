import crypto from 'crypto';
import type { Resume } from '@shared/types';

export function hashResume(resume: Resume): string {
  const keys = Object.keys(resume as object).sort();
  const sorted = JSON.stringify(resume, keys);
  return crypto.createHash('sha256').update(sorted).digest('hex');
}

const dedupStore = new Map<string, string>();

export function checkDuplicate(hash: string): string | null {
  return dedupStore.get(hash) ?? null;
}

export function registerResult(hash: string, resultId: string): void {
  dedupStore.set(hash, resultId);
}
