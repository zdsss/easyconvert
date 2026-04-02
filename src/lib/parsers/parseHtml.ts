import { Parser } from './registry';

export const htmlParser: Parser = {
  name: 'HTML Parser',
  extensions: ['.html', '.htm'],
  parse: async (file: File): Promise<string> => {
    const html = await file.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  }
};
