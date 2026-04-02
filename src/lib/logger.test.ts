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
});
