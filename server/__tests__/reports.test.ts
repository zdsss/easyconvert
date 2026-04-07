import { describe, it, expect, vi } from 'vitest';

// Mock db
const mockQuery = vi.fn();
vi.mock('../db', () => ({ default: { query: (...args: any[]) => mockQuery(...args) } }));

import {
  generateServerReport,
  getAccuracyTrends,
  getDistribution,
  getCostReport,
} from '../lib/reportGenerator';

describe('reportGenerator', () => {
  describe('generateServerReport', () => {
    it('should generate report with summary', async () => {
      mockQuery.mockImplementation((text: string) => {
        if (text.includes('evaluation_tasks')) {
          return Promise.resolve({
            rows: [{ id: 'task1', name: 'Test Task', status: 'completed' }],
          });
        }
        if (text.includes('evaluation_results')) {
          return Promise.resolve({
            rows: [
              {
                file_name: 'test.pdf',
                metrics: { accuracy: 85, completeness: 90, structureScore: 80 },
                classification: { difficulty: 'easy', completeness: 'complete', scenario: 'tech' },
                processing_time: 1500,
                from_cache: false,
              },
              {
                file_name: 'test2.pdf',
                metrics: { accuracy: 75, completeness: 80, structureScore: 70 },
                classification: { difficulty: 'standard', completeness: 'basic', scenario: 'general' },
                processing_time: 2000,
                from_cache: true,
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const report = await generateServerReport('task1');
      expect(report.task.name).toBe('Test Task');
      expect(report.summary.totalFiles).toBe(2);
      expect(report.summary.avgAccuracy).toBe(80);
      expect(report.summary.cacheHitRate).toBe(50);
      expect(report.distribution?.difficulty).toHaveProperty('easy');
      expect(report.distribution?.difficulty).toHaveProperty('standard');
    });

    it('should throw for non-existent task', async () => {
      mockQuery.mockImplementation((text: string) => {
        if (text.includes('evaluation_tasks')) return Promise.resolve({ rows: [] });
        return Promise.resolve({ rows: [] });
      });

      await expect(generateServerReport('nonexistent')).rejects.toThrow('Task not found');
    });
  });

  describe('getAccuracyTrends', () => {
    it('should aggregate by date', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          { metrics: { accuracy: 80 }, created_at: '2026-04-01T10:00:00Z' },
          { metrics: { accuracy: 90 }, created_at: '2026-04-01T11:00:00Z' },
          { metrics: { accuracy: 70 }, created_at: '2026-04-02T10:00:00Z' },
        ],
      });

      const trends = await getAccuracyTrends();
      expect(trends).toHaveLength(2);
      expect(trends[0].date).toBe('2026-04-01');
      expect(trends[0].accuracy).toBe(85);
      expect(trends[0].count).toBe(2);
    });
  });

  describe('getCostReport', () => {
    it('should calculate cost metrics', async () => {
      mockQuery.mockImplementation((text: string) => {
        if (text.includes('evaluation_tasks')) {
          return Promise.resolve({
            rows: [{ config: { model: 'qwen-plus' } }],
          });
        }
        return Promise.resolve({
          rows: [
            { processing_time: 1000, from_cache: false },
            { processing_time: 2000, from_cache: false },
            { processing_time: 50, from_cache: true },
          ],
        });
      });

      const cost = await getCostReport('task1');
      expect(cost.totalFiles).toBe(3);
      expect(cost.cachedFiles).toBe(1);
      expect(cost.avgProcessingTime).toBe(1500);
      expect(cost.model).toBe('qwen-plus');
      expect(cost.estimatedCost).toBeGreaterThan(0);
    });
  });
});
