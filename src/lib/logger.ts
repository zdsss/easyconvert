type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const currentLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'INFO';
const logFormat = (import.meta.env.VITE_LOG_FORMAT as 'text' | 'json') || 'text';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatLog(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  if (logFormat === 'json') {
    return JSON.stringify({ level, message, timestamp: new Date().toISOString(), ...meta });
  }
  return `[${level}] ${message}`;
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => {
    if (shouldLog('DEBUG')) console.log(formatLog('DEBUG', message, meta));
  },
  info: (message: string, meta?: Record<string, unknown>) => {
    if (shouldLog('INFO')) console.log(formatLog('INFO', message, meta));
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    if (shouldLog('WARN')) console.warn(formatLog('WARN', message, meta));
  },
  error: (message: string, error?: Error, meta?: Record<string, unknown>) => {
    if (shouldLog('ERROR')) {
      console.error(formatLog('ERROR', message, { error: error?.message, stack: error?.stack, ...meta }));
    }
  }
};
