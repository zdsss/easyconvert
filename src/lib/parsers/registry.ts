export interface Parser {
  name: string;
  extensions: string[];
  parse: (file: File) => Promise<string>;
}

class ParserRegistry {
  private parsers = new Map<string, Parser>();

  register(parser: Parser) {
    parser.extensions.forEach(ext => {
      this.parsers.set(ext.toLowerCase(), parser);
    });
  }

  get(extension: string): Parser | undefined {
    return this.parsers.get(extension.toLowerCase());
  }
}

export const parserRegistry = new ParserRegistry();
