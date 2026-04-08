import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  tenantId?: string;
  apiKeyId?: string;
  scopes?: string[];
  quotaPerMinute?: number;
}
