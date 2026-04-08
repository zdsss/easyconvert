import { configurePdfWorker, extractTextFromPdf } from '@shared/parsePdf';

configurePdfWorker({
  workerSrc: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js',
});

export async function parsePdf(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    return await extractTextFromPdf(new Uint8Array(arrayBuffer));
  } catch {
    throw new Error('PDF文件格式错误或已损坏');
  }
}

export async function parsePdfWithVisionFallback(
  file: File,
  strategy?: import('@shared/parsingStrategy').ParsingStrategy,
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
