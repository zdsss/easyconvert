import * as pdfjsLib from 'pdfjs-dist';

export interface PdfParseConfig {
  workerSrc: string;
}

export function configurePdfWorker(config: PdfParseConfig) {
  if (pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = config.workerSrc;
  }
}

export async function extractTextFromPdf(data: Uint8Array): Promise<string> {
  try {
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map((item: unknown) => (item as { str: string }).str).join(' ') + '\n';
    }
    return fullText;
  } catch {
    throw new Error('PDF文件格式错误或已损坏');
  }
}
