import { marked } from 'marked';
import type { Parser } from './registry';

export const markdownParser: Parser = {
  name: 'markdown',
  extensions: ['.md', '.markdown'],
  async parse(file: File): Promise<string> {
    const raw = await file.text();
    const html = await marked(raw);
    return (html as string).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  },
};
