import { createLogger, type LogLevel } from '@shared/logger';

const VALID_LEVELS: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
const envLevel = import.meta.env.VITE_LOG_LEVEL;

export const logger = createLogger({
  level: VALID_LEVELS.includes(envLevel as LogLevel) ? (envLevel as LogLevel) : 'INFO',
  format: (import.meta.env.VITE_LOG_FORMAT as 'text' | 'json') || 'text',
});
