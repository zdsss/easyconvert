import { describe, it, expect } from 'vitest';
import { analyzeWeakFields, type FieldMetric } from './promptOptimizer';

describe('analyzeWeakFields', () => {
  it('returns [] for empty input', () => {
    expect(analyzeWeakFields([])).toEqual([]);
  });

  it('filters out fields with accuracy >= 0.7', () => {
    const metrics: FieldMetric[] = [
      { field: 'name', accuracy: 0.95, count: 100 },
      { field: 'email', accuracy: 0.7, count: 80 },
      { field: 'skills', accuracy: 0.4, count: 50 },
    ];
    const result = analyzeWeakFields(metrics);
    expect(result).toHaveLength(1);
    expect(result[0].field).toBe('skills');
  });

  it('sorts by accuracy ascending', () => {
    const metrics: FieldMetric[] = [
      { field: 'education', accuracy: 0.5, count: 30 },
      { field: 'work', accuracy: 0.3, count: 40 },
      { field: 'skills', accuracy: 0.1, count: 20 },
      { field: 'name', accuracy: 0.9, count: 100 },
    ];
    const result = analyzeWeakFields(metrics);
    expect(result.map(r => r.field)).toEqual(['skills', 'work', 'education']);
  });

  it('respects custom threshold', () => {
    const metrics: FieldMetric[] = [
      { field: 'name', accuracy: 0.85, count: 100 },
      { field: 'email', accuracy: 0.8, count: 80 },
      { field: 'skills', accuracy: 0.6, count: 50 },
    ];
    const result = analyzeWeakFields(metrics, 0.9);
    expect(result).toHaveLength(3);
  });
});
