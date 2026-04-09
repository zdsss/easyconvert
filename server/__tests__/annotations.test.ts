import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock db
const mockQuery = vi.fn();
vi.mock('../db', () => ({ default: { query: (...args: unknown[]) => mockQuery(...args) } }));

// Mock logger
vi.mock('../lib/logger', () => ({ serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import annotationsRouter from '../routes/annotations';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', annotationsRouter);
  return app;
}

describe('Annotations API', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('POST /:taskId/annotations saves annotation', async () => {
    const row = { id: 'r-1', task_id: 'task-1', annotation: '{"score":5}' };
    mockQuery.mockResolvedValue({ rows: [row] });
    const app = buildApp();
    const res = await request(app)
      .post('/task-1/annotations')
      .send({ resultId: 'r-1', annotation: { score: 5 } });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('r-1');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE evaluation_results'),
      [JSON.stringify({ score: 5 }), 'r-1', 'task-1']
    );
  });

  it('POST /:taskId/annotations returns 400 for missing resultId', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/task-1/annotations')
      .send({ annotation: { score: 5 } });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/validation/i);
  });

  it('POST /:taskId/annotations/batch saves batch annotations', async () => {
    const rows = [
      { id: 'r-1', task_id: 'task-1', annotation: '{"score":5}' },
      { id: 'r-2', task_id: 'task-1', annotation: '{"score":3}' },
    ];
    mockQuery
      .mockResolvedValueOnce({ rows: [rows[0]] })
      .mockResolvedValueOnce({ rows: [rows[1]] });
    const app = buildApp();
    const res = await request(app)
      .post('/task-1/annotations/batch')
      .send({
        annotations: [
          { resultId: 'r-1', annotation: { score: 5 } },
          { resultId: 'r-2', annotation: { score: 3 } },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it('POST /:taskId/annotations/batch returns 400 for empty annotations', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/task-1/annotations/batch')
      .send({ annotations: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/validation/i);
  });
});
