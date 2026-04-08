import db from '../db';

export interface CreateTaskInput {
  name: string;
  description?: string;
  type: string;
  config?: unknown;
}

export interface ListTasksInput {
  page?: number;
  limit?: number;
  status?: string;
}

export interface UpdateTaskInput {
  status: string;
  stats: unknown;
}

export interface SaveResultInput {
  fileName: string;
  fileHash: string;
  parsedResume: unknown;
  classification: unknown;
  processTrace: unknown;
  metrics: unknown;
  processingTime: number;
  fromCache: boolean;
}

export async function createTask(input: CreateTaskInput) {
  const result = await db.query(
    `INSERT INTO evaluation_tasks (name, description, type, status, config, stats)
     VALUES ($1, $2, $3, 'pending', $4, '{"totalFiles":0,"processedFiles":0,"successCount":0,"failureCount":0}')
     RETURNING *`,
    [input.name, input.description, input.type, JSON.stringify(input.config)]
  );
  return result.rows[0];
}

export async function listTasks(input: ListTasksInput) {
  const { page = 1, limit = 20, status } = input;
  const offset = (Number(page) - 1) * Number(limit);

  let query = 'SELECT * FROM evaluation_tasks';
  const params: (string | number)[] = [];

  if (status) {
    query += ' WHERE status = $1';
    params.push(String(status));
  }

  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(Number(limit), offset);

  const result = await db.query(query, params);
  return result.rows;
}

export async function getTask(id: string) {
  const result = await db.query('SELECT * FROM evaluation_tasks WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function updateTask(id: string, input: UpdateTaskInput) {
  const result = await db.query(
    'UPDATE evaluation_tasks SET status = $1, stats = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
    [input.status, JSON.stringify(input.stats), id]
  );
  return result.rows[0];
}

export async function getResults(taskId: string) {
  const result = await db.query('SELECT * FROM evaluation_results WHERE task_id = $1', [taskId]);
  return result.rows;
}

export async function saveResult(taskId: string, input: SaveResultInput) {
  const result = await db.query(
    `INSERT INTO evaluation_results (task_id, file_name, file_hash, parsed_resume, classification, process_trace, metrics, processing_time, from_cache)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [taskId, input.fileName, input.fileHash, JSON.stringify(input.parsedResume), JSON.stringify(input.classification), JSON.stringify(input.processTrace), JSON.stringify(input.metrics), input.processingTime, input.fromCache]
  );
  return result.rows[0];
}

export async function retryFailed(taskId: string) {
  const result = await db.query(
    `UPDATE evaluation_results SET status = 'pending' WHERE task_id = $1 AND status = 'failed' RETURNING id`,
    [taskId]
  );
  return result.rowCount;
}
