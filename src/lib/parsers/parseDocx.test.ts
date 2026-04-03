import { describe, it, expect } from 'vitest';
import { parseDocx } from './parseDocx';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

describe('parseDocx error handling', () => {
  it('throws error on corrupted DOCX', async () => {
    const corruptedFile = new File(['invalid docx content'], 'test.docx', { type: DOCX_MIME });
    await expect(parseDocx(corruptedFile)).rejects.toThrow('DOCX文件格式错误或已损坏');
  });

  it('throws on empty file', async () => {
    const emptyFile = new File([], 'empty.docx', { type: DOCX_MIME });
    await expect(parseDocx(emptyFile)).rejects.toThrow('DOCX文件格式错误或已损坏');
  });

  it('throws on non-DOCX content', async () => {
    const fakeFile = new File(['plain text'], 'fake.docx', { type: DOCX_MIME });
    await expect(parseDocx(fakeFile)).rejects.toThrow('DOCX文件格式错误或已损坏');
  });

  it('throws on very short content', async () => {
    const tinyFile = new File(['ab'], 'tiny.docx', { type: DOCX_MIME });
    await expect(parseDocx(tinyFile)).rejects.toThrow('DOCX文件格式错误或已损坏');
  });
});
