import type { LLMProvider, LLMRequest, LLMResponse } from './types';

/**
 * Qwen (通义千问) Provider
 */
export class QwenProvider implements LLMProvider {
  name = 'qwen';
  private url = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
  private model = 'qwen-plus';
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
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: `${request.prompt}\n\n简历文本：\n${request.text}` }],
          response_format: request.responseFormat || {
            type: 'json_schema',
            json_schema: { name: 'resume_extraction', strict: true, schema: request.responseFormat },
          },
          temperature: request.temperature,
        }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status} ${response.statusText}`);

      const data = await response.json();
      return {
        content: data.choices[0].message.content,
        usage: data.usage
          ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens }
          : undefined,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
