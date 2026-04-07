import { createLogger } from '@shared/logger';

export const logger = createLogger({
  level: (import.meta.env.VITE_LOG_LEVEL as any) || 'INFO',
  format: (import.meta.env.VITE_LOG_FORMAT as 'text' | 'json') || 'text',
});
