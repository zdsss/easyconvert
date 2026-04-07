export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LoggerConfig {
  level: LogLevel;
  format: 'text' | 'json';
  includeTimestamp?: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

function shouldLog(level: LogLevel, currentLevel: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;
}

export function createLogger(config: LoggerConfig): Logger {
  const formatMessage = (level: LogLevel, message: string, meta?: Record<string, unknown>): string => {
    if (config.format === 'json') {
      return JSON.stringify({ level, message, timestamp: new Date().toISOString(), ...meta });
    }
    if (config.includeTimestamp) {
      const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
      return `[${new Date().toISOString()}] [${level}] ${message}${metaStr}`;
    }
    return `[${level}] ${message}`;
  };

  return {
    debug(message: string, meta?: Record<string, unknown>) {
      if (shouldLog('DEBUG', config.level)) console.log(formatMessage('DEBUG', message, meta));
    },
    info(message: string, meta?: Record<string, unknown>) {
      if (shouldLog('INFO', config.level)) console.log(formatMessage('INFO', message, meta));
    },
    warn(message: string, meta?: Record<string, unknown>) {
      if (shouldLog('WARN', config.level)) console.warn(formatMessage('WARN', message, meta));
    },
    error(message: string, error?: Error, meta?: Record<string, unknown>) {
      if (shouldLog('ERROR', config.level)) {
        console.error(formatMessage('ERROR', message, { error: error?.message, stack: error?.stack, ...meta }));
      }
    },
  };
}
