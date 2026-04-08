import { createLogger, type LogLevel } from '@shared/logger';

const VALID_LEVELS: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

export const serverLogger = createLogger({
  level: VALID_LEVELS.includes(process.env.LOG_LEVEL as LogLevel) ? (process.env.LOG_LEVEL as LogLevel) : 'INFO',
  format: (process.env.LOG_FORMAT as 'text' | 'json') || 'text',
  includeTimestamp: true,
});
