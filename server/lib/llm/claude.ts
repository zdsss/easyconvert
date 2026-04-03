import type { LLMProvider, LLMRequest, LLMResponse } from './types';

/**
 * Anthropic Claude Provider (Messages API)
 */
export class ClaudeProvider implements LLMProvider {
  name = 'claude';
  private url = 'https://api.anthropic.com/v1/messages';
  private model = 'claude-sonnet-4-20250514';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async call(request: LLMRequest): Promise<LLMResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), request.timeout);

    try {
      const response = await fetch(this.url, {
        signal: controller.signal,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 4096,
          messages: [{ role: 'user', content: `${request.prompt}\n\n简历文本：\n${request.text}\n\n请返回JSON格式。` }],
          temperature: request.temperature,
        }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status} ${response.statusText}`);

      const data = await response.json();
      const textBlock = data.content.find((b: any) => b.type === 'text');
      return {
        content: textBlock?.text || '',
        usage: data.usage
          ? { promptTokens: data.usage.input_tokens, completionTokens: data.usage.output_tokens }
          : undefined,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
