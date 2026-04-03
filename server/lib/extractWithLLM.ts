import { getPrompt } from '../../src/lib/prompts';
import { deduplicateRequest } from '../../src/lib/llmCache';
import { circuitBreaker } from '../../src/lib/circuitBreaker';
import { serverLogger } from './logger';
import type { Resume } from '../../src/lib/types';
import type { ParsingStrategy } from '../../src/lib/parsingStrategy';

export { TimeoutError } from '../../src/lib/types';

class ServerCostTracker {
  private calls = 0;
  private tokens = 0;

  record(inputTokens: number, outputTokens: number) {
    this.calls++;
    this.tokens += inputTokens + outputTokens;
  }

  getStats() {
    const costPerMToken = 0.5;
    return {
      calls: this.calls,
      tokens: this.tokens,
      estimatedCost: (this.tokens / 1000000) * costPerMToken,
    };
  }
}

export const serverCostTracker = new ServerCostTracker();

function isRetryableError(error: any): boolean {
  if (error.name === 'TimeoutError') return true;
  if (error.name === 'AbortError') return true;
  if (error.message?.includes('network') || error.message?.includes('ECONNREFUSED')) return true;
  if (error.message?.includes('429')) return true;
  if (error.message?.includes('401') || error.message?.includes('403')) return false;
  if (error.message?.includes('API error')) return true;
  return false;
}

function getRetryDelay(error: any): number {
  if (error.message?.includes('429')) return 5000;
  return 0;
}

export async function extractResume(text: string, strategy?: ParsingStrategy, pdfBase64?: string): Promise<Resume> {
  const strat = strategy || {
    timeout: 10000,
    temperature: 0.05,
    maxRetries: 2,
    promptType: 'standard' as const,
    validationLevel: 'standard' as const,
  };

  const cacheKey = `${(pdfBase64 || text).substring(0, 100)}-${strat.promptType}`;
  return deduplicateRequest(cacheKey, async () => {
    for (let attempt = 0; attempt <= strat.maxRetries; attempt++) {
      try {
        return await circuitBreaker.execute(() => extractWithTimeout(text, strat, pdfBase64));
      } catch (error) {
        if (attempt === strat.maxRetries || !isRetryableError(error)) throw error;
        const delay = getRetryDelay(error);
        if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
        serverLogger.debug('Retrying LLM request', { attempt, error: (error as Error).message, delay });
      }
    }
    throw new Error('Max retries exceeded');
  });
}

async function extractWithTimeout(text: string, strategy: ParsingStrategy, pdfBase64?: string): Promise<Resume> {
  // 服务端使用 process.env 替代 import.meta.env.VITE_*
  const provider = process.env.SERVER_LLM_PROVIDER || process.env.VITE_LLM_PROVIDER || 'qwen';
  const apiKey =
    process.env[`SERVER_${provider.toUpperCase()}_API_KEY`] ||
    process.env[`VITE_${provider.toUpperCase()}_API_KEY`];

  const configs: Record<string, { url: string; model: string }> = {
    qwen: {
      url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      model: 'qwen-plus',
    },
    deepseek: {
      url: 'https://api.deepseek.com/v1/chat/completions',
      model: 'deepseek-chat',
    },
  };

  const config = configs[provider];
  if (!config) throw new Error(`Unsupported provider: ${provider}`);

  const resumeSchema = {
    type: 'object',
    properties: {
      basics: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '姓名' },
          email: { type: 'string', description: '邮箱地址' },
          phone: { type: 'string', description: '联系电话' },
          title: { type: 'string', description: '职位意向或当前职位' },
          location: { type: 'string', description: '所在地址或城市' },
        },
        required: ['name', 'email', 'phone'],
      },
      work: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            company: { type: 'string' },
            position: { type: 'string' },
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            responsibilities: { type: 'array', items: { type: 'string' } },
            achievements: { type: 'array', items: { type: 'string' } },
          },
          required: ['company', 'position', 'startDate', 'endDate'],
        },
      },
      education: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            institution: { type: 'string' },
            degree: { type: 'string' },
            major: { type: 'string' },
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            courses: { type: 'array', items: { type: 'string' } },
            honors: { type: 'array', items: { type: 'string' } },
            gpa: { type: 'string' },
          },
          required: ['institution', 'degree', 'startDate', 'endDate'],
        },
      },
      skills: { type: 'array', items: { type: 'string' } },
      certificates: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            issuer: { type: 'string' },
            date: { type: 'string' },
          },
          required: ['name'],
        },
      },
      projects: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            role: { type: 'string' },
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            description: { type: 'string' },
            achievements: { type: 'array', items: { type: 'string' } },
          },
          required: ['name'],
        },
      },
      summary: { type: 'string' },
      additional: { type: 'object' },
    },
    required: ['basics', 'work', 'education'],
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), strategy.timeout);

  try {
    const prompt = getPrompt(strategy.promptType, strategy.scenario);
    const userContent = (provider === 'claude' && pdfBase64)
      ? [
          { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: pdfBase64 } },
          { type: 'text' as const, text: prompt },
        ]
      : `${prompt}\n\n简历文本：\n${text}`;
    const response = await fetch(config.url, {
      signal: controller.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: 'user',
            content: userContent,
          },
        ],
        response_format:
          provider === 'qwen'
            ? {
                type: 'json_schema',
                json_schema: { name: 'resume_extraction', strict: true, schema: resumeSchema },
              }
            : { type: 'json_object' },
        temperature: strategy.temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data.usage) {
      serverCostTracker.record(data.usage.prompt_tokens || 0, data.usage.completion_tokens || 0);
    }
    return JSON.parse(data.choices[0].message.content);
  } catch (error: any) {
    if (error.name === 'AbortError') {
      const { TimeoutError } = await import('../../src/lib/types');
      throw new TimeoutError(`Request timeout after ${strategy.timeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
