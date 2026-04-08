import { describe, it, expect } from 'vitest';
import { getStrategy } from '@shared/parsingStrategy';

describe('parsingStrategy', () => {
  it('returns basic strategy for easy+basic', () => {
    const strategy = getStrategy({ difficulty: 'easy', completeness: 'basic', scenario: 'general' });
    expect(strategy.promptType).toBe('basic');
    expect(strategy.timeout).toBe(20000);
  });

  it('returns comprehensive strategy for hard+rich', () => {
    const strategy = getStrategy({ difficulty: 'hard', completeness: 'rich', scenario: 'general' });
    expect(strategy.promptType).toBe('comprehensive');
    expect(strategy.validationLevel).toBe('strict');
  });

  it('adjusts timeout for tech scenario', () => {
    const strategy = getStrategy({ difficulty: 'standard', completeness: 'complete', scenario: 'tech' });
    expect(strategy.timeout).toBe(50000); // 45000 + 5000
  });

  it('adjusts temperature for fresh scenario', () => {
    const strategy = getStrategy({ difficulty: 'easy', completeness: 'basic', scenario: 'fresh' });
    expect(strategy.temperature).toBe(0.4); // 0.3 + 0.1
  });
});
