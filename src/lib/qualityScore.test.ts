import { describe, it, expect } from 'vitest';
import { calcQualityScore } from './qualityScore';

describe('calcQualityScore', () => {
  it('returns 0 for empty resume', () => {
    expect(calcQualityScore({} as any)).toBe(0);
  });

  it('returns 100 for complete resume', () => {
    const resume = {
      basics: { name: 'A', email: 'a@b.com', phone: '123', title: 'Dev' },
      work: [{ company: 'X', position: 'Y', startDate: '2020', endDate: '2023' }],
      education: [{ institution: 'U', degree: 'BS', startDate: '2016', endDate: '2020' }],
      skills: ['JS', 'TS', 'React'],
    };
    expect(calcQualityScore(resume as any)).toBe(100);
  });

  it('partial resume scores proportionally', () => {
    const resume = { basics: { name: 'A', email: 'a@b.com' } };
    const score = calcQualityScore(resume as any);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });
});
