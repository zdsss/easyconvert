import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock db
const mockQuery = vi.fn();
vi.mock('../db', () => ({ default: { query: (...args: unknown[]) => mockQuery(...args) } }));

// Mock logger
vi.mock('../lib/logger', () => ({ serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import evaluationsRouter from '../routes/evaluations';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', evaluationsRouter);
  return app;
}

describe('Evaluations API', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('POST / creates evaluation task', async () => {
    const task = { id: 'task-1', name: 'Test Eval', description: 'desc', type: 'accuracy', status: 'pending', config: '{}', stats: '{}' };
    mockQuery.mockResolvedValue({ rows: [task] });
    const app = buildApp();
    const res = await request(app).post('/').send({ name: 'Test Eval', description: 'desc', type: 'accuracy', config: {} });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('task-1');
    expect(res.body.name).toBe('Test Eval');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO evaluation_tasks'),
      expect.any(Array)
    );
  });

  it('GET / returns task list', async () => {
    const tasks = [
      { id: 'task-2', name: 'Eval 2', status: 'completed', created_at: '2026-04-02' },
      { id: 'task-1', name: 'Eval 1', status: 'pending', created_at: '2026-04-01' },
    ];
    mockQuery.mockResolvedValue({ rows: tasks });
    const app = buildApp();
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].id).toBe('task-2');
  });

  it('GET /:id returns 404 for non-existent task', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const app = buildApp();
    const res = await request(app).get('/non-existent');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('PUT /:id updates task status', async () => {
    const updated = { id: 'task-1', name: 'Eval', status: 'running', stats: '{"totalFiles":5}' };
    mockQuery.mockResolvedValue({ rows: [updated] });
    const app = buildApp();
    const res = await request(app).put('/task-1').send({ status: 'running', stats: { totalFiles: 5 } });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('running');
  });

  it('GET /:id/results returns results for task', async () => {
    const results = [
      { id: 'r-1', task_id: 'task-1', file_name: 'a.pdf', status: 'completed' },
      { id: 'r-2', task_id: 'task-1', file_name: 'b.pdf', status: 'failed' },
    ];
    mockQuery.mockResolvedValue({ rows: results });
    const app = buildApp();
    const res = await request(app).get('/task-1/results');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('evaluation_results'),
      ['task-1']
    );
  });

  it('POST /:id/retry-failed resets failed results to pending', async () => {
    mockQuery.mockResolvedValue({ rowCount: 3, rows: [{ id: 'r-1' }, { id: 'r-2' }, { id: 'r-3' }] });
    const app = buildApp();
    const res = await request(app).post('/task-1/retry-failed');
    expect(res.status).toBe(200);
    expect(res.body.retriedCount).toBe(3);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("status = 'pending'"),
      ['task-1']
    );
  });

  it('POST /:id/results saves a new result', async () => {
    const saved = { id: 'r-new', task_id: 'task-1', file_name: 'c.pdf', file_hash: 'hash123', processing_time: 500, from_cache: false };
    mockQuery.mockResolvedValue({ rows: [saved] });
    const app = buildApp();
    const res = await request(app).post('/task-1/results').send({
      fileName: 'c.pdf',
      fileHash: 'hash123',
      parsedResume: { basics: { name: 'Test' } },
      classification: { structure: 'simple' },
      processTrace: [],
      metrics: { accuracy: 0.9 },
      processingTime: 500,
      fromCache: false,
    });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('r-new');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO evaluation_results'),
      expect.arrayContaining(['task-1', 'c.pdf', 'hash123'])
    );
  });
});
