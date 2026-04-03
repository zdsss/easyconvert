import * as pdfjsLib from 'pdfjs-dist';

export async function parsePdf(file: File): Promise<string> {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map((item: any) => item.str).join(' ') + '\n';
    }

    return fullText;
  } catch (error) {
    throw new Error('PDF文件格式错误或已损坏');
  }
}

export async function parsePdfWithVisionFallback(
  file: File,
  strategy?: import('../types').ParsingStrategy,
): Promise<import('../types').Resume | null> {
  const text = await parsePdf(file);
  if (text.trim().length >= 50) return null;

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);

  const { extractResume } = await import('../extractWithLLM');
  return extractResume('', strategy, base64);
}
