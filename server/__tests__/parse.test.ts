import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import multer from 'multer';

// Mock db
const mockQuery = vi.fn();
vi.mock('../db', () => ({ default: { query: (...args: any[]) => mockQuery(...args) } }));

// Mock jobQueue
vi.mock('../lib/jobQueue', () => ({ jobQueue: { enqueue: vi.fn() } }));

// Mock logger
vi.mock('../lib/logger', () => ({ serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

const mockProcessResume = vi.fn();
vi.mock('../lib/resumeProcessor', () => ({
  processResume: (...args: any[]) => mockProcessResume(...args),
}));

import parseRouter from '../routes/parse';

function buildApp() {
  const app = express();
  app.use(express.json());
  const upload = multer({ storage: multer.memoryStorage() });
  // Apply single-file upload for sync/async routes, array upload for batch
  app.post('/batch', upload.array('files', 20), (req, res, next) => { (parseRouter as any)(req, res, next); });
  app.use('/', upload.single('file'), parseRouter);
  return app;
}

const mockResumeResult = {
  resume: { basics: { name: '张三', email: 'test@test.com', phone: '13800138000' }, work: [], education: [] },
  classification: { structure: 'simple', detail: 'brief', modules: [], category: 'general' },
  difficultyClass: 'easy',
  fromCache: false,
  hash: 'abc123',
  validation: { isValid: true, errors: [], warnings: [], completeness: 80 },
};

describe('POST / — sync parse', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 400 when no file uploaded', async () => {
    const app = buildApp();
    const res = await request(app).post('/').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no file/i);
  });

  it('returns 200 with resume JSON on valid file', async () => {
    mockProcessResume.mockResolvedValue(mockResumeResult);
    const app = buildApp();
    const res = await request(app)
      .post('/')
      .attach('file', Buffer.from('%PDF-1.4 test'), 'resume.pdf');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.resume.basics.name).toBe('张三');
    expect(res.body.data.hash).toBe('abc123');
  });

  it('returns 500 when processResume throws', async () => {
    mockProcessResume.mockRejectedValue(new Error('LLM timeout'));
    const app = buildApp();
    const res = await request(app)
      .post('/')
      .attach('file', Buffer.from('%PDF-1.4 test'), 'resume.pdf');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('LLM timeout');
  });
});

describe('POST /async — async parse', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 400 when no file uploaded', async () => {
    const app = buildApp();
    const res = await request(app).post('/async').send({});
    expect(res.status).toBe(400);
  });

  it('returns 202 with jobId on valid file', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 'job-uuid-1', status: 'pending' }] });
    const app = buildApp();
    const res = await request(app)
      .post('/async')
      .attach('file', Buffer.from('%PDF-1.4 test'), 'resume.pdf');
    expect(res.status).toBe(202);
    expect(res.body.jobId).toBe('job-uuid-1');
    expect(res.body.status).toBe('pending');
  });
});

describe('GET /:jobId — job status', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 404 for unknown jobId', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const app = buildApp();
    const res = await request(app).get('/nonexistent-id');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns job status for known jobId', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ id: 'job-1', status: 'completed', file_name: 'resume.pdf', created_at: new Date().toISOString(), result: JSON.stringify({ basics: {} }), processing_time: 1200, completed_at: new Date().toISOString() }],
    });
    const app = buildApp();
    const res = await request(app).get('/job-1');
    expect(res.status).toBe(200);
    expect(res.body.jobId).toBe('job-1');
    expect(res.body.status).toBe('completed');
    expect(res.body.result).toBeDefined();
  });
});

describe('POST /batch — batch parse', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 400 when no files uploaded', async () => {
    const app = buildApp();
    const res = await request(app).post('/batch').send({});
    expect(res.status).toBe(400);
  });

  it('returns 202 with jobIds for multiple files', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'job-a', status: 'pending' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'job-b', status: 'pending' }] });
    const app = buildApp();
    const res = await request(app)
      .post('/batch')
      .attach('files', Buffer.from('%PDF-1.4 a'), 'a.pdf')
      .attach('files', Buffer.from('%PDF-1.4 b'), 'b.pdf');
    expect(res.status).toBe(202);
    expect(res.body.jobIds).toHaveLength(2);
    expect(res.body.totalFiles).toBe(2);
  });
});
