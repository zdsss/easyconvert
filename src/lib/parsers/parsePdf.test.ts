import { describe, it, expect } from 'vitest';
import { parsePdf } from './parsePdf';

describe('parsePdf error handling', () => {
  it('throws error on corrupted PDF', async () => {
    const corruptedFile = new File(['invalid pdf content'], 'test.pdf', { type: 'application/pdf' });
    await expect(parsePdf(corruptedFile)).rejects.toThrow('PDF文件格式错误或已损坏');
  });

  it('throws on empty file', async () => {
    const emptyFile = new File([], 'empty.pdf', { type: 'application/pdf' });
    await expect(parsePdf(emptyFile)).rejects.toThrow('PDF文件格式错误或已损坏');
  });

  it('throws on non-PDF content', async () => {
    const fakeFile = new File(['not a pdf'], 'fake.pdf', { type: 'application/pdf' });
    await expect(parsePdf(fakeFile)).rejects.toThrow('PDF文件格式错误或已损坏');
  });

  it('handles file with zero-length name gracefully', async () => {
    const noNameFile = new File(['data'], '', { type: 'application/pdf' });
    await expect(parsePdf(noNameFile)).rejects.toThrow('PDF文件格式错误或已损坏');
  });
});
