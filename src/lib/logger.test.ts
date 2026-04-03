import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from './logger';

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should filter logs based on level', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logger.debug('test debug');
    logger.info('test info');

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should output error logs', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logger.error('test error', new Error('test'));

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('warn calls console.warn', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    logger.warn('test warning', { key: 'value' });

    expect(warnSpy).toHaveBeenCalledOnce();
    warnSpy.mockRestore();
  });

  it('debug is suppressed at INFO level by default', () => {
    // Default level is INFO, so debug should not call console.log
    // We can verify by checking the log level logic
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // At INFO level, debug should be suppressed
    // The logger uses import.meta.env.VITE_LOG_LEVEL which defaults to 'INFO'
    // debug level (0) < INFO level (1), so it should NOT log
    logger.debug('should be suppressed');

    // info level (1) >= INFO level (1), so it SHOULD log
    logger.info('should appear');

    // Only the info call should have triggered console.log
    const calls = consoleSpy.mock.calls.map(c => c[0] as string);
    const debugCalls = calls.filter(msg => msg.includes('DEBUG'));
    const infoCalls = calls.filter(msg => msg.includes('INFO'));

    expect(debugCalls).toHaveLength(0);
    expect(infoCalls).toHaveLength(1);
    consoleSpy.mockRestore();
  });

  it('error log includes error message in output', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logger.error('something failed', new Error('boom'));

    expect(errorSpy).toHaveBeenCalledOnce();
    const output = errorSpy.mock.calls[0][0] as string;
    expect(output).toContain('ERROR');
    expect(output).toContain('something failed');
    errorSpy.mockRestore();
  });

  it('info log contains level and message', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logger.info('hello world');

    expect(consoleSpy).toHaveBeenCalledOnce();
    const output = consoleSpy.mock.calls[0][0] as string;
    expect(output).toContain('INFO');
    expect(output).toContain('hello world');
    consoleSpy.mockRestore();
  });
});
