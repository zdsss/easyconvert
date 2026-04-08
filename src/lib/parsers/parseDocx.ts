import { parseDocxFromArrayBuffer } from '@shared/parseDocx';

export async function parseDocx(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    return await parseDocxFromArrayBuffer(arrayBuffer);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.startsWith('DOCX文件格式错误或已损坏')) throw err;
    throw new Error(`DOCX文件格式错误或已损坏: ${msg}`);
  }
}
