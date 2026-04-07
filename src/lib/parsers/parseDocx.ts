import { parseDocxFromArrayBuffer } from '../../../shared/parseDocx';

export async function parseDocx(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    return await parseDocxFromArrayBuffer(arrayBuffer);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.startsWith('DOCX文件格式错误或已损坏')) throw err;
    throw new Error(`DOCX文件格式错误或已损坏: ${msg}`);
  }
}
