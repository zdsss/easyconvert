import * as pdfjsLib from 'pdfjs-dist';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Node 环境下禁用 worker（不需要）
if (pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = path.join(
    __dirname,
    '../../node_modules/pdfjs-dist/build/pdf.worker.mjs'
  );
}

/**
 * 服务端 PDF 文本提取（Buffer 输入替代 File）
 */
export async function parsePdf(buffer: Buffer): Promise<string> {
  try {
    const uint8 = new Uint8Array(buffer);
    const pdf = await pdfjsLib.getDocument({ data: uint8 }).promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map((item: any) => item.str).join(' ') + '\n';
    }

    return fullText;
  } catch {
    throw new Error('PDF文件格式错误或已损坏');
  }
}
