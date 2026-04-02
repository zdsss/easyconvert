import { describe, it, expect } from 'vitest';
import { parsePdf } from './parsePdf';

describe('parsePdf error handling', () => {
  it('throws error on corrupted PDF', async () => {
    const corruptedFile = new File(['invalid pdf content'], 'test.pdf', { type: 'application/pdf' });
    await expect(parsePdf(corruptedFile)).rejects.toThrow('PDF文件格式错误或已损坏');
  });
});
