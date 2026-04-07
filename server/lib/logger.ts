import { createLogger } from '@shared/logger';

export const serverLogger = createLogger({
  level: (process.env.LOG_LEVEL as any) || 'INFO',
  format: (process.env.LOG_FORMAT as 'text' | 'json') || 'text',
  includeTimestamp: true,
});
