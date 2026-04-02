import { describe, it, expect } from 'vitest';
import { parseDocx } from './parseDocx';

describe('parseDocx error handling', () => {
  it('throws error on corrupted DOCX', async () => {
    const corruptedFile = new File(['invalid docx content'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    await expect(parseDocx(corruptedFile)).rejects.toThrow('DOCX文件格式错误或已损坏');
  });
});
