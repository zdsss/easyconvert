import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { validateBody, parseQueryNumber, createEvaluationSchema, promoteSchema } from '../lib/validate';

function buildApp(schema: Parameters<typeof validateBody>[0]) {
  const app = express();
  app.use(express.json());
  app.post('/test', validateBody(schema), (_req, res) => {
    res.json({ ok: true, body: _req.body });
  });
  return app;
}

describe('validateBody', () => {
  it('passes valid data through', async () => {
    const app = buildApp(createEvaluationSchema);
    const res = await request(app).post('/test').send({ name: 'Test', type: 'accuracy' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.body.name).toBe('Test');
  });

  it('returns 400 for missing required fields', async () => {
    const app = buildApp(createEvaluationSchema);
    const res = await request(app).post('/test').send({ description: 'no name or type' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details).toBeDefined();
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  it('returns 400 for empty required string', async () => {
    const app = buildApp(createEvaluationSchema);
    const res = await request(app).post('/test').send({ name: '', type: 'accuracy' });
    expect(res.status).toBe(400);
  });

  it('validates promote schema', async () => {
    const app = buildApp(promoteSchema);

    const valid = await request(app).post('/test').send({ candidateId: 'c1', evaluationTaskId: 't1' });
    expect(valid.status).toBe(200);

    const invalid = await request(app).post('/test').send({ candidateId: 'c1' });
    expect(invalid.status).toBe(400);
  });
});

describe('parseQueryNumber', () => {
  it('returns default for NaN', () => {
    expect(parseQueryNumber('abc', 10)).toBe(10);
    expect(parseQueryNumber(undefined, 5)).toBe(5);
  });

  it('parses valid numbers', () => {
    expect(parseQueryNumber('42', 10)).toBe(42);
    expect(parseQueryNumber('0.75', 0.5)).toBe(0.75);
  });

  it('clamps to min/max', () => {
    expect(parseQueryNumber('-5', 0, 0, 100)).toBe(0);
    expect(parseQueryNumber('200', 0, 0, 100)).toBe(100);
    expect(parseQueryNumber('50', 0, 0, 100)).toBe(50);
  });
});
