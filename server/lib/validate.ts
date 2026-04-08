import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

/**
 * Express middleware that validates req.body against a Zod schema.
 * Returns 400 with structured errors on validation failure.
 */
export function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
      res.status(400).json({ error: 'Validation failed', details: errors });
      return;
    }
    req.body = result.data;
    next();
  };
}

/**
 * Validates a single query parameter and returns the parsed value or a default.
 */
export function parseQueryNumber(value: unknown, defaultVal: number, min?: number, max?: number): number {
  const n = Number(value);
  if (isNaN(n)) return defaultVal;
  if (min !== undefined && n < min) return min;
  if (max !== undefined && n > max) return max;
  return n;
}

// ---------------------------------------------------------------------------
// Shared validation schemas for route endpoints
// ---------------------------------------------------------------------------

export const createEvaluationSchema = z.object({
  name: z.string().min(1, '名称不能为空'),
  description: z.string().optional(),
  type: z.string().min(1, '类型不能为空'),
  config: z.unknown().optional(),
});

export const updateEvaluationSchema = z.object({
  status: z.string().min(1),
  stats: z.unknown(),
});

export const saveResultSchema = z.object({
  fileName: z.string().min(1),
  fileHash: z.string().min(1),
  parsedResume: z.unknown(),
  classification: z.unknown(),
  processTrace: z.unknown(),
  metrics: z.unknown(),
  processingTime: z.number().min(0),
  fromCache: z.boolean(),
});

export const annotationSchema = z.object({
  resultId: z.string().min(1, 'resultId 不能为空'),
  annotation: z.unknown(),
});

export const batchAnnotationSchema = z.object({
  annotations: z.array(annotationSchema).min(1, '标注列表不能为空'),
});

export const promoteSchema = z.object({
  candidateId: z.string().min(1),
  evaluationTaskId: z.string().min(1),
});

export const createKeySchema = z.object({
  name: z.string().min(1, 'name 不能为空'),
  tenantId: z.string().optional(),
  scopes: z.array(z.string()).optional(),
  rateLimit: z.number().int().positive().optional(),
  expiresAt: z.string().optional(),
});

export const createExperimentSchema = z.object({
  taskIds: z.array(z.string()).optional(),
  weakFields: z.array(z.string()).optional(),
  suggestion: z.string().optional(),
});

export const saveParseHistorySchema = z.object({
  fileName: z.string().min(1),
  status: z.string().min(1),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
  result: z.unknown().optional(),
  processingTime: z.number().min(0).optional(),
});
