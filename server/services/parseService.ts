import { processResume } from '../lib/resumeProcessor';
import { jobQueue } from '../lib/jobQueue';
import { deliverWebhook } from '../lib/webhookDelivery';
import { serverLogger } from '../lib/logger';
import db, { ky } from '../db';
import type { ServerFileInput } from '../lib/types';

interface WebhookPayload {
  jobId: string;
  status: 'completed' | 'failed';
  completedAt: string;
  result?: unknown;
  error?: string;
}

export interface JobResponse {
  jobId: string;
  status: string;
  fileName: string;
  createdAt: string;
  result?: unknown;
  processingTime?: number;
  completedAt?: string;
  error?: string;
}

export interface ParseResult {
  resume: unknown;
  classification?: unknown;
  difficultyClass?: string;
  fromCache: boolean;
  hash: string;
  validation?: unknown;
}

/** Create a parse_jobs row and enqueue processing */
async function createAndExecuteJob(
  file: ServerFileInput,
  tenantId: string | null,
  apiKeyId: string | null,
  webhookUrl?: string,
): Promise<string> {
  const params = [tenantId, apiKeyId, file.name, file.size, file.mimeType];
  const jobResult = webhookUrl
    ? await db.query(
        `INSERT INTO parse_jobs (tenant_id, api_key_id, file_name, file_size, mime_type, webhook_url)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [...params, webhookUrl]
      )
    : await db.query(
        `INSERT INTO parse_jobs (tenant_id, api_key_id, file_name, file_size, mime_type)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        params
      );

  const job = jobResult.rows[0];
  const jobId = job.id as string;

  jobQueue.enqueue({
    id: jobId,
    status: 'pending',
    execute: async () => {
      await db.query('UPDATE parse_jobs SET status = $1, started_at = NOW() WHERE id = $2', ['processing', jobId]);
      const startTime = Date.now();

      let finalStatus: 'completed' | 'failed' = 'completed';
      let jobResultData: unknown = null;
      let jobError: string | null = null;

      try {
        const result = await processResume(file);
        jobResultData = result.resume;
        await db.query(
          `UPDATE parse_jobs SET status = $1, result = $2, file_hash = $3, processing_time = $4, completed_at = NOW() WHERE id = $5`,
          ['completed', JSON.stringify(result.resume), result.hash, Date.now() - startTime, jobId]
        );
      } catch (error) {
        finalStatus = 'failed';
        jobError = error instanceof Error ? error.message : 'Unknown error';
        serverLogger.error('Job failed', error instanceof Error ? error : new Error(String(error)), { jobId });
        await db.query(
          `UPDATE parse_jobs SET status = $1, error = $2, completed_at = NOW() WHERE id = $3`,
          ['failed', jobError, jobId]
        );
      }

      if (webhookUrl) {
        const payload: WebhookPayload = {
          jobId,
          status: finalStatus,
          completedAt: new Date().toISOString(),
        };
        if (finalStatus === 'completed') payload.result = jobResultData;
        else payload.error = jobError ?? undefined;

        const delivered = await deliverWebhook(webhookUrl, payload);
        await db.query(
          `UPDATE parse_jobs SET webhook_status = $1 WHERE id = $2`,
          [delivered ? 'delivered' : 'failed', jobId]
        );
      }
    },
  });

  return jobId;
}

export const parseService = {
  /** Synchronous parse — process file and return result immediately */
  async syncParse(file: ServerFileInput): Promise<ParseResult> {
    const result = await processResume(file);
    return {
      resume: result.resume,
      classification: result.classification,
      difficultyClass: result.difficultyClass,
      fromCache: result.fromCache,
      hash: result.hash,
      validation: result.validation,
    };
  },

  /** Create an async job, enqueue it, return the job record */
  async asyncParse(
    file: ServerFileInput,
    tenantId: string | undefined,
    apiKeyId: string | undefined,
    webhookUrl?: string,
  ): Promise<{ id: string; status: string }> {
    const id = await createAndExecuteJob(file, tenantId || null, apiKeyId || null, webhookUrl);
    return { id, status: 'pending' };
  },

  /** Get job status by ID */
  async getJobStatus(jobId: string): Promise<JobResponse | null> {
    const result = await db.query('SELECT * FROM parse_jobs WHERE id = $1', [jobId]);
    if (result.rows.length === 0) return null;

    const job = result.rows[0];
    const response: JobResponse = {
      jobId: job.id as string,
      status: job.status as string,
      fileName: job.file_name as string,
      createdAt: job.created_at as string,
    };

    if (job.status === 'completed') {
      response.result = typeof job.result === 'string' ? JSON.parse(job.result) : job.result;
      response.processingTime = job.processing_time as number;
      response.completedAt = job.completed_at as string;
    } else if (job.status === 'failed') {
      response.error = job.error as string;
      response.completedAt = job.completed_at as string;
    }

    return response;
  },

  /** Batch async parse — create jobs for multiple files */
  async batchParse(
    files: Array<{ buffer: Buffer; originalname: string; size: number; mimetype: string }>,
    tenantId: string | undefined,
    apiKeyId: string | undefined,
  ): Promise<string[]> {
    const jobIds: string[] = [];
    for (const f of files) {
      const file: ServerFileInput = { buffer: f.buffer, name: f.originalname, size: f.size, mimeType: f.mimetype };
      const id = await createAndExecuteJob(file, tenantId || null, apiKeyId || null);
      jobIds.push(id);
    }
    return jobIds;
  },

  /** Check which hashes are already cached */
  async checkCachedHashes(hashes: string[]): Promise<{ uncached: number; alreadyCached: number }> {
    const rows = await ky
      .selectFrom('parse_cache')
      .select('hash')
      .where('hash', 'in', hashes)
      .execute();

    const cachedSet = new Set(rows.map(r => r.hash));
    const uncached = hashes.filter(h => !cachedSet.has(h));

    return { uncached: uncached.length, alreadyCached: cachedSet.size };
  },
};
