import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock db
const mockQuery = vi.fn();
vi.mock('../db', () => ({ default: { query: (...args: any[]) => mockQuery(...args) } }));

// Mock logger
vi.mock('../lib/logger', () => ({ serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import promptExperimentsRouter from '../routes/promptExperiments';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', promptExperimentsRouter);
  return app;
}

describe('Prompt Experiments API', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('GET / returns empty array when no experiments', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const app = buildApp();
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST / creates experiment and returns it', async () => {
    const created = { id: 'exp-1', task_ids: '["t1"]', weak_fields: '["name"]', suggestion: 'improve name extraction' };
    mockQuery.mockResolvedValue({ rows: [created] });
    const app = buildApp();
    const res = await request(app).post('/').send({ taskIds: ['t1'], weakFields: ['name'], suggestion: 'improve name extraction' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('exp-1');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO prompt_experiments'),
      expect.any(Array)
    );
  });

  it('GET /:id returns 404 for non-existent id', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const app = buildApp();
    const res = await request(app).get('/non-existent');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('PUT /:id updates experiment fields', async () => {
    const updated = { id: 'exp-1', task_ids: '["t1","t2"]', weak_fields: '["email"]', suggestion: 'updated', status: 'applied' };
    mockQuery.mockResolvedValue({ rows: [updated] });
    const app = buildApp();
    const res = await request(app).put('/exp-1').send({ suggestion: 'updated', status: 'applied' });
    expect(res.status).toBe(200);
    expect(res.body.suggestion).toBe('updated');
  });

  it('PUT /:id returns 404 for non-existent id', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const app = buildApp();
    const res = await request(app).put('/non-existent').send({ suggestion: 'test' });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('DELETE /:id returns 404 for non-existent id', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const app = buildApp();
    const res = await request(app).delete('/non-existent');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('GET / returns list after creation', async () => {
    const experiments = [
      { id: 'exp-2', task_ids: '[]', weak_fields: '[]', suggestion: 'second', created_at: '2026-04-02' },
      { id: 'exp-1', task_ids: '[]', weak_fields: '[]', suggestion: 'first', created_at: '2026-04-01' },
    ];
    mockQuery.mockResolvedValue({ rows: experiments });
    const app = buildApp();
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].id).toBe('exp-2');
  });
});
