import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import multer from 'multer';

// Stateful in-memory store to simulate DB
const store: { tasks: any[]; results: any[] } = { tasks: [], results: [] };
let taskIdCounter = 1;
let resultIdCounter = 1;

const mockQuery = vi.fn().mockImplementation((text: string, params?: any[]) => {
  // INSERT evaluation_tasks
  if (text.includes('INSERT INTO evaluation_tasks')) {
    const task = {
      id: 'task-' + taskIdCounter++,
      name: params![0],
      description: params![1],
      type: params![2],
      status: 'pending',
      config: params![3],
      stats: { totalFiles: 0, processedFiles: 0, successCount: 0, failureCount: 0 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.tasks.push(task);
    return { rows: [task] };
  }
  // INSERT evaluation_results
  if (text.includes('INSERT INTO evaluation_results')) {
    const result = {
      id: 'result-' + resultIdCounter++,
      task_id: params![0],
      file_name: params![1],
      file_hash: params![2],
      parsed_resume: params![3],
      classification: params![4],
      process_trace: params![5],
      metrics: params![6],
      processing_time: params![7],
      from_cache: params![8],
      created_at: new Date().toISOString(),
    };
    store.results.push(result);
    return { rows: [result] };
  }
  // SELECT evaluation_results WHERE task_id
  if (text.includes('SELECT') && text.includes('evaluation_results') && text.includes('WHERE task_id')) {
    return { rows: store.results.filter(r => r.task_id === params![0]) };
  }
  // SELECT evaluation_tasks WHERE id
  if (text.includes('SELECT') && text.includes('evaluation_tasks') && text.includes('WHERE id')) {
    return { rows: store.tasks.filter(t => t.id === params![0]) };
  }
  return { rows: [] };
});

vi.mock('../db', () => ({ default: { query: (...args: any[]) => mockQuery(...args) } }));
vi.mock('../lib/logger', () => ({
  serverLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../lib/jobQueue', () => ({ jobQueue: { enqueue: vi.fn() } }));
vi.mock('../lib/webhookDelivery', () => ({ deliverWebhook: vi.fn() }));

const mockProcessResume = vi.fn();
vi.mock('../lib/resumeProcessor', () => ({
  processResume: (...args: any[]) => mockProcessResume(...args),
}));

import parseRouter from '../routes/parse';
import evaluationsRouter from '../routes/evaluations';

function buildApp() {
  const app = express();
  app.use(express.json());
  const upload = multer({ storage: multer.memoryStorage() });
  app.use('/parse', upload.single('file'), parseRouter);
  app.use('/evaluations', evaluationsRouter);
  return app;
}

const mockResumeResult = {
  resume: {
    basics: { name: 'Zhang San', email: 'zhangsan@example.com', phone: '13800138000' },
    work: [{ company: 'ACME Corp', position: 'Engineer', startDate: '2020-01' }],
    education: [{ institution: 'MIT', area: 'CS', studyType: 'Bachelor' }],
  },
  classification: { structure: 'standard', detail: 'moderate', modules: ['work', 'education'], category: 'tech' },
  difficultyClass: 'easy',
  fromCache: false,
  hash: 'abc123def456',
  validation: { isValid: true, errors: [], warnings: [], completeness: 80 },
};

describe('E2E workflow: parse -> evaluate -> report', () => {
  beforeEach(() => {
    store.tasks = [];
    store.results = [];
    taskIdCounter = 1;
    resultIdCounter = 1;
    mockQuery.mockClear();
    mockProcessResume.mockReset();
    mockProcessResume.mockResolvedValue(mockResumeResult);
  });

  it('complete parse -> evaluate -> results workflow', async () => {
    const app = buildApp();

    // Step 1: POST /parse with a file
    const parseRes = await request(app)
      .post('/parse')
      .attach('file', Buffer.from('fake resume content'), 'resume.pdf');

    expect(parseRes.status).toBe(200);
    expect(parseRes.body.success).toBe(true);
    expect(parseRes.body.data.resume.basics.name).toBe('Zhang San');
    expect(parseRes.body.data.hash).toBe('abc123def456');

    const parsedData = parseRes.body.data;

    // Step 2: POST /evaluations to create a task
    const evalRes = await request(app)
      .post('/evaluations')
      .send({ name: 'Test Eval', description: 'E2E test', type: 'accuracy', config: { threshold: 0.8 } });

    expect(evalRes.status).toBe(200);
    expect(evalRes.body.id).toBe('task-1');
    expect(evalRes.body.status).toBe('pending');

    const taskId = evalRes.body.id;

    // Step 3: POST /evaluations/:taskId/results with parsed data
    const saveRes = await request(app)
      .post(`/evaluations/${taskId}/results`)
      .send({
        fileName: 'resume.pdf',
        fileHash: parsedData.hash,
        parsedResume: parsedData.resume,
        classification: parsedData.classification,
        processTrace: [{ stage: 'parse', duration: 100 }],
        metrics: { completeness: parsedData.validation.completeness },
        processingTime: 150,
        fromCache: parsedData.fromCache,
      });

    expect(saveRes.status).toBe(200);
    expect(saveRes.body.id).toBe('result-1');
    expect(saveRes.body.task_id).toBe(taskId);

    // Step 4: GET /evaluations/:taskId/results to verify
    const getRes = await request(app).get(`/evaluations/${taskId}/results`);

    expect(getRes.status).toBe(200);
    expect(getRes.body).toHaveLength(1);
    expect(getRes.body[0].task_id).toBe(taskId);
    expect(getRes.body[0].file_name).toBe('resume.pdf');
    expect(getRes.body[0].file_hash).toBe('abc123def456');
  });

  it('parse result data flows correctly to evaluation result', async () => {
    const app = buildApp();

    // Parse
    const parseRes = await request(app)
      .post('/parse')
      .attach('file', Buffer.from('test content'), 'test.pdf');

    const parsedData = parseRes.body.data;

    // Create task
    const evalRes = await request(app)
      .post('/evaluations')
      .send({ name: 'Field mapping test', type: 'accuracy' });

    const taskId = evalRes.body.id;

    // Save result with all fields from parse
    await request(app)
      .post(`/evaluations/${taskId}/results`)
      .send({
        fileName: 'test.pdf',
        fileHash: parsedData.hash,
        parsedResume: parsedData.resume,
        classification: parsedData.classification,
        processTrace: [],
        metrics: { completeness: parsedData.validation.completeness },
        processingTime: 200,
        fromCache: parsedData.fromCache,
      });

    // Retrieve and verify field mapping
    const getRes = await request(app).get(`/evaluations/${taskId}/results`);
    const saved = getRes.body[0];

    expect(saved.file_hash).toBe(parsedData.hash);
    expect(saved.from_cache).toBe(parsedData.fromCache);
    expect(saved.processing_time).toBe(200);
    // parsed_resume and classification are JSON-stringified by the route
    expect(saved.parsed_resume).toBe(JSON.stringify(parsedData.resume));
    expect(saved.classification).toBe(JSON.stringify(parsedData.classification));
  });

  it('GET results returns empty for task with no results', async () => {
    const app = buildApp();

    // Create task but don't add any results
    const evalRes = await request(app)
      .post('/evaluations')
      .send({ name: 'Empty task', type: 'accuracy' });

    const taskId = evalRes.body.id;

    const getRes = await request(app).get(`/evaluations/${taskId}/results`);

    expect(getRes.status).toBe(200);
    expect(getRes.body).toEqual([]);
  });

  it('multiple results can be saved for same task', async () => {
    const app = buildApp();

    // Create task
    const evalRes = await request(app)
      .post('/evaluations')
      .send({ name: 'Multi-result task', type: 'accuracy' });

    const taskId = evalRes.body.id;

    // Save first result
    const res1 = await request(app)
      .post(`/evaluations/${taskId}/results`)
      .send({
        fileName: 'resume1.pdf',
        fileHash: 'hash_aaa',
        parsedResume: { basics: { name: 'User A' } },
        classification: { structure: 'simple' },
        processTrace: [],
        metrics: { completeness: 60 },
        processingTime: 100,
        fromCache: false,
      });

    expect(res1.status).toBe(200);

    // Save second result
    const res2 = await request(app)
      .post(`/evaluations/${taskId}/results`)
      .send({
        fileName: 'resume2.docx',
        fileHash: 'hash_bbb',
        parsedResume: { basics: { name: 'User B' } },
        classification: { structure: 'complex' },
        processTrace: [],
        metrics: { completeness: 90 },
        processingTime: 250,
        fromCache: true,
      });

    expect(res2.status).toBe(200);

    // Verify both results are returned
    const getRes = await request(app).get(`/evaluations/${taskId}/results`);

    expect(getRes.status).toBe(200);
    expect(getRes.body).toHaveLength(2);
    expect(getRes.body[0].file_name).toBe('resume1.pdf');
    expect(getRes.body[1].file_name).toBe('resume2.docx');
    expect(getRes.body[0].from_cache).toBe(false);
    expect(getRes.body[1].from_cache).toBe(true);
  });
});
