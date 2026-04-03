import type { Resume } from './types';

const WEIGHTS = {
  name: 15,
  email: 10,
  phone: 10,
  title: 5,
  work: 25,
  education: 20,
  skills: 15,
} as const;

export function calcQualityScore(resume: Resume): number {
  let score = 0;
  if (resume.basics?.name) score += WEIGHTS.name;
  if (resume.basics?.email) score += WEIGHTS.email;
  if (resume.basics?.phone) score += WEIGHTS.phone;
  if (resume.basics?.title) score += WEIGHTS.title;
  if (resume.work?.length) score += WEIGHTS.work;
  if (resume.education?.length) score += WEIGHTS.education;
  if ((resume.skills?.length ?? 0) >= 3) score += WEIGHTS.skills;
  return score;
}
