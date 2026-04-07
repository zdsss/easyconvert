import path from 'path';
import { fileURLToPath } from 'url';
import { configurePdfWorker, extractTextFromPdf } from '../../shared/parsePdf';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

configurePdfWorker({
  workerSrc: path.join(__dirname, '../../node_modules/pdfjs-dist/build/pdf.worker.mjs'),
});

/**
 * 服务端 PDF 文本提取（Buffer 输入替代 File）
 */
export async function parsePdf(buffer: Buffer): Promise<string> {
  return extractTextFromPdf(new Uint8Array(buffer));
}
