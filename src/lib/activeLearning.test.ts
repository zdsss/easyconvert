import { describe, it, expect } from 'vitest';
import { filterCandidates, ParseHistoryItem } from './activeLearning';

function makeItem(id: string, confidence: Record<string, number> | undefined, language?: string): ParseHistoryItem {
  return {
    id,
    file_name: `${id}.pdf`,
    result: {
      additional: {
        _confidence: confidence,
        language,
      },
    },
  };
}

describe('filterCandidates', () => {
  it('returns items with avg confidence < 0.75', () => {
    const items = [
      makeItem('a', { name: 0.5, email: 0.6 }),   // avg 0.55
      makeItem('b', { name: 0.9, email: 0.8 }),   // avg 0.85
      makeItem('c', { name: 0.3, email: 0.4 }),   // avg 0.35
    ];
    const result = filterCandidates(items, new Set());
    expect(result).toHaveLength(2);
    expect(result.map(r => r.id)).toEqual(['c', 'a']);
  });

  it('excludes items already in evaluation tasks', () => {
    const items = [
      makeItem('a', { name: 0.5, email: 0.6 }),   // avg 0.55
      makeItem('b', { name: 0.3, email: 0.4 }),   // avg 0.35
    ];
    const result = filterCandidates(items, new Set(['b']));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  it('sorts by avgConfidence ascending', () => {
    const items = [
      makeItem('a', { name: 0.7, email: 0.7 }),   // avg 0.70
      makeItem('b', { name: 0.1, email: 0.2 }),   // avg 0.15
      makeItem('c', { name: 0.4, email: 0.5 }),   // avg 0.45
    ];
    const result = filterCandidates(items, new Set());
    expect(result.map(r => r.id)).toEqual(['b', 'c', 'a']);
    expect(result[0].avgConfidence).toBeCloseTo(0.15);
    expect(result[1].avgConfidence).toBeCloseTo(0.45);
    expect(result[2].avgConfidence).toBeCloseTo(0.70);
  });

  it('treats missing confidence as 0', () => {
    const items = [
      makeItem('a', undefined),
      makeItem('b', { name: 0.9, email: 0.9 }),
    ];
    const result = filterCandidates(items, new Set());
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
    expect(result[0].avgConfidence).toBe(0);
  });

  it('respects custom threshold', () => {
    const items = [
      makeItem('a', { name: 0.5, email: 0.6 }),   // avg 0.55
      makeItem('b', { name: 0.3, email: 0.4 }),   // avg 0.35
    ];
    const result = filterCandidates(items, new Set(), 0.5);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b');
  });

  it('includes language in candidate', () => {
    const items = [makeItem('a', { name: 0.5 }, 'zh')];
    const result = filterCandidates(items, new Set());
    expect(result[0].language).toBe('zh');
  });
});
