import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock db
const mockQuery = vi.fn();
vi.mock('../db', () => ({ default: { query: (...args: unknown[]) => mockQuery(...args) } }));

// Mock logger
vi.mock('../lib/logger', () => ({ serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

// Mock reportGenerator
const mockGenerateServerReport = vi.fn();
const mockGetAccuracyTrends = vi.fn();
const mockGetDistribution = vi.fn();
const mockGetErrorPatterns = vi.fn();
const mockGetCostReport = vi.fn();

vi.mock('../lib/reportGenerator', () => ({
  generateServerReport: (...args: unknown[]) => mockGenerateServerReport(...args),
  getAccuracyTrends: (...args: unknown[]) => mockGetAccuracyTrends(...args),
  getDistribution: (...args: unknown[]) => mockGetDistribution(...args),
  getErrorPatterns: (...args: unknown[]) => mockGetErrorPatterns(...args),
  getCostReport: (...args: unknown[]) => mockGetCostReport(...args),
}));

import reportsRouter from '../routes/reports';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', reportsRouter);
  return app;
}

describe('Reports API', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('POST / generates report for taskId', async () => {
    const report = { task: { name: 'Test' }, summary: { totalFiles: 5 } };
    mockGenerateServerReport.mockResolvedValue(report);
    const app = buildApp();
    const res = await request(app).post('/').send({ taskId: 'task-1' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(report);
    expect(mockGenerateServerReport).toHaveBeenCalledWith('task-1');
  });

  it('POST / returns 400 when taskId is missing', async () => {
    const app = buildApp();
    const res = await request(app).post('/').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('taskId is required');
    expect(mockGenerateServerReport).not.toHaveBeenCalled();
  });

  it('POST / returns 500 when report generation fails', async () => {
    mockGenerateServerReport.mockRejectedValue(new Error('Task not found'));
    const app = buildApp();
    const res = await request(app).post('/').send({ taskId: 'bad-id' });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Task not found');
  });

  it('GET /trends returns accuracy trends', async () => {
    const trends = [{ date: '2026-04-01', accuracy: 85, count: 2 }];
    mockGetAccuracyTrends.mockResolvedValue(trends);
    const app = buildApp();
    const res = await request(app).get('/trends');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(trends);
    expect(mockGetAccuracyTrends).toHaveBeenCalled();
  });

  it('GET /distribution/:taskId returns distribution data', async () => {
    const distribution = { difficulty: { easy: 3, standard: 2 } };
    mockGetDistribution.mockResolvedValue(distribution);
    const app = buildApp();
    const res = await request(app).get('/distribution/task-1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(distribution);
    expect(mockGetDistribution).toHaveBeenCalledWith('task-1');
  });

  it('GET /errors/:taskId returns error patterns', async () => {
    const errors = [{ field: 'name', errorRate: 0.15 }];
    mockGetErrorPatterns.mockResolvedValue(errors);
    const app = buildApp();
    const res = await request(app).get('/errors/task-1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(errors);
    expect(mockGetErrorPatterns).toHaveBeenCalledWith('task-1');
  });

  it('GET /cost/:taskId returns cost report', async () => {
    const cost = { totalFiles: 3, cachedFiles: 1, avgProcessingTime: 1500, model: 'qwen-plus', estimatedCost: 0.05 };
    mockGetCostReport.mockResolvedValue(cost);
    const app = buildApp();
    const res = await request(app).get('/cost/task-1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(cost);
    expect(mockGetCostReport).toHaveBeenCalledWith('task-1');
  });
});
