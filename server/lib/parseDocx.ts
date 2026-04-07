import { parseDocxFromArrayBuffer } from '../../shared/parseDocx';

export async function parseDocx(buffer: Buffer): Promise<string> {
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
  return parseDocxFromArrayBuffer(arrayBuffer as ArrayBuffer);
}
