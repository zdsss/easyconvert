import { test, expect } from '@playwright/test';

const API = 'http://localhost:3001';

test.describe('API Key Management Workflow', () => {
  test('create, list, and deactivate API key', async ({ request }) => {
    // Create a key
    const createRes = await request.post(`${API}/api/keys`, {
      data: { name: 'Test Key' },
    });
    expect(createRes.ok()).toBeTruthy();
    const created = await createRes.json();
    expect(created.key).toMatch(/^ec_/);
    expect(created.name).toBe('Test Key');
    const keyId = created.id;

    // List keys — should include the new key
    const listRes = await request.get(`${API}/api/keys?tenantId=default`);
    expect(listRes.ok()).toBeTruthy();
    const keys = await listRes.json();
    expect(keys.some((k: { id: string }) => k.id === keyId)).toBeTruthy();

    // Deactivate the key
    const deleteRes = await request.delete(`${API}/api/keys/${keyId}`);
    expect(deleteRes.ok()).toBeTruthy();
    const deleted = await deleteRes.json();
    expect(deleted.message).toContain('deactivated');
  });
});

test.describe('Evaluation Workflow', () => {
  let taskId: string;

  test('create evaluation task', async ({ request }) => {
    const res = await request.post(`${API}/api/evaluations`, {
      data: {
        name: 'E2E Test Evaluation',
        description: 'Created by E2E test',
        type: 'accuracy',
        config: { model: 'qwen-plus' },
      },
    });
    expect(res.ok()).toBeTruthy();
    const task = await res.json();
    expect(task.name).toBe('E2E Test Evaluation');
    expect(task.status).toBe('pending');
    taskId = task.id;
  });

  test('list evaluation tasks includes new task', async ({ request }) => {
    const res = await request.get(`${API}/api/evaluations`);
    expect(res.ok()).toBeTruthy();
    const tasks = await res.json();
    expect(tasks.some((t: { id: string }) => t.id === taskId)).toBeTruthy();
  });

  test('get evaluation task by id', async ({ request }) => {
    const res = await request.get(`${API}/api/evaluations/${taskId}`);
    expect(res.ok()).toBeTruthy();
    const task = await res.json();
    expect(task.id).toBe(taskId);
    expect(task.name).toBe('E2E Test Evaluation');
  });

  test('save evaluation result', async ({ request }) => {
    const res = await request.post(`${API}/api/evaluations/${taskId}/results`, {
      data: {
        fileName: 'test-resume.pdf',
        fileHash: 'abc123',
        parsedResume: { basics: { name: 'Test User', email: 'test@test.com', phone: '123' } },
        classification: { difficulty: 'easy', completeness: 'basic', scenario: 'general' },
        processTrace: [{ name: 'llm_extract', status: 'completed', duration: 500 }],
        metrics: { accuracy: 0.95, completeness: 0.8 },
        processingTime: 1200,
        fromCache: false,
      },
    });
    expect(res.ok()).toBeTruthy();
    const result = await res.json();
    expect(result.file_name).toBe('test-resume.pdf');
    expect(result.task_id).toBe(taskId);
  });

  test('get evaluation results', async ({ request }) => {
    const res = await request.get(`${API}/api/evaluations/${taskId}/results`);
    expect(res.ok()).toBeTruthy();
    const results = await res.json();
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].file_name).toBe('test-resume.pdf');
  });

  test('update task status', async ({ request }) => {
    const res = await request.put(`${API}/api/evaluations/${taskId}`, {
      data: {
        status: 'completed',
        stats: { totalFiles: 1, processedFiles: 1, successCount: 1, failureCount: 0 },
      },
    });
    expect(res.ok()).toBeTruthy();
    const task = await res.json();
    expect(task.status).toBe('completed');
  });
});

test.describe('Tenant Management', () => {
  test('list tenants', async ({ request }) => {
    const res = await request.get(`${API}/api/tenants`);
    expect(res.ok()).toBeTruthy();
    const tenants = await res.json();
    expect(Array.isArray(tenants)).toBeTruthy();
  });
});

test.describe('Prompt Experiments', () => {
  let experimentId: string;

  test('create experiment', async ({ request }) => {
    const res = await request.post(`${API}/api/prompt-experiments`, {
      data: {
        taskIds: ['task-1'],
        weakFields: ['education.gpa'],
        suggestion: 'Add GPA extraction prompt',
      },
    });
    expect(res.ok()).toBeTruthy();
    const exp = await res.json();
    expect(exp.suggestion).toBe('Add GPA extraction prompt');
    experimentId = exp.id;
  });

  test('list experiments', async ({ request }) => {
    const res = await request.get(`${API}/api/prompt-experiments`);
    expect(res.ok()).toBeTruthy();
    const exps = await res.json();
    expect(exps.length).toBeGreaterThan(0);
  });

  test('update experiment', async ({ request }) => {
    const res = await request.put(`${API}/api/prompt-experiments/${experimentId}`, {
      data: { status: 'applied' },
    });
    expect(res.ok()).toBeTruthy();
    const exp = await res.json();
    expect(exp.status).toBe('applied');
  });

  test('delete experiment', async ({ request }) => {
    const res = await request.delete(`${API}/api/prompt-experiments/${experimentId}`);
    expect(res.ok()).toBeTruthy();
  });
});

test.describe('Parse History', () => {
  test('list parse history returns array', async ({ request }) => {
    const res = await request.get(`${API}/api/parse-history`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.rows || body)).toBeTruthy();
  });
});

test.describe('Data Flywheel', () => {
  test('get candidates returns structure', async ({ request }) => {
    const res = await request.get(`${API}/api/data-flywheel`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('candidates');
    expect(body).toHaveProperty('total');
  });

  test('get stats returns structure', async ({ request }) => {
    const res = await request.get(`${API}/api/data-flywheel/stats`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('totalCandidates');
    expect(body).toHaveProperty('avgConfidence');
  });
});
