import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock db
const mockQuery = vi.fn();
vi.mock('../db', () => ({ default: { query: (...args: any[]) => mockQuery(...args) } }));

// Mock logger
vi.mock('../lib/logger', () => ({ serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import dataFlywheelRouter from '../routes/dataFlywheel';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', dataFlywheelRouter);
  return app;
}

function makeParseJobRow(id: string, confidence: Record<string, number>, language: string, qualityScore: number) {
  return {
    id,
    file_name: `${id}.pdf`,
    file_size: 1024,
    mime_type: 'application/pdf',
    result: JSON.stringify({
      basics: { name: 'Test' },
      additional: { _confidence: confidence, language, qualityScore },
    }),
    processing_time: 1000,
    created_at: '2026-04-01T00:00:00Z',
  };
}

describe('Data Flywheel API', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('GET / returns empty candidates when no parse_jobs', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const app = buildApp();
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.candidates).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it('GET / respects threshold query parameter', async () => {
    const rows = [
      makeParseJobRow('job-1', { name: 0.5, email: 0.6 }, 'zh', 70),  // avg 0.55 — below both thresholds
      makeParseJobRow('job-2', { name: 0.8, email: 0.9 }, 'en', 90),  // avg 0.85 — above both thresholds
      makeParseJobRow('job-3', { name: 0.6, email: 0.7 }, 'zh', 75),  // avg 0.65 — below 0.75 but above 0.6
    ];
    mockQuery.mockResolvedValue({ rows });
    const app = buildApp();

    // Default threshold 0.75: job-1 (0.55) and job-3 (0.65) qualify
    const res1 = await request(app).get('/');
    expect(res1.body.total).toBe(2);

    // Threshold 0.6: only job-1 (0.55) qualifies
    mockQuery.mockResolvedValue({ rows });
    const res2 = await request(app).get('/?threshold=0.6');
    expect(res2.body.total).toBe(1);
    expect(res2.body.candidates[0].id).toBe('job-1');
  });

  it('POST /promote returns 400 when missing required fields', async () => {
    const app = buildApp();
    const res1 = await request(app).post('/promote').send({});
    expect(res1.status).toBe(400);
    expect(res1.body.error).toMatch(/required/i);

    const res2 = await request(app).post('/promote').send({ candidateId: 'c1' });
    expect(res2.status).toBe(400);
  });

  it('POST /promote creates promotion record', async () => {
    const promotionRow = { id: 'promo-1', candidate_id: 'job-1', evaluation_task_id: 'task-1', promoted_at: '2026-04-01T00:00:00Z' };
    mockQuery.mockResolvedValue({ rows: [promotionRow] });
    const app = buildApp();
    const res = await request(app).post('/promote').send({ candidateId: 'job-1', evaluationTaskId: 'task-1' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('promo-1');
    expect(res.body.candidateId).toBe('job-1');
    expect(res.body.evaluationTaskId).toBe('task-1');
  });

  it('GET /stats returns correct statistics', async () => {
    const rows = [
      makeParseJobRow('job-1', { name: 0.5, email: 0.6 }, 'zh', 70),  // avg 0.55
      makeParseJobRow('job-2', { name: 0.8, email: 0.9 }, 'en', 90),  // avg 0.85
      makeParseJobRow('job-3', { name: 0.6, email: 0.7 }, 'zh', 75),  // avg 0.65
    ];
    mockQuery.mockResolvedValue({ rows });
    const app = buildApp();
    const res = await request(app).get('/stats');
    expect(res.status).toBe(200);
    // totalCandidates = those below 0.75 threshold = job-1 + job-3 = 2
    expect(res.body.totalCandidates).toBe(2);
    // avgConfidence across all 3: (0.55 + 0.85 + 0.65) / 3 = 0.683...
    expect(res.body.avgConfidence).toBeCloseTo(0.683, 2);
    expect(res.body.languageDistribution).toEqual({ zh: 2, en: 1 });
  });
});
