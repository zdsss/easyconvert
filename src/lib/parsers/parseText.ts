import type { Parser } from './registry';

export const textParser: Parser = {
  name: 'text',
  extensions: ['.txt'],
  async parse(file: File): Promise<string> {
    return file.text();
  },
};
