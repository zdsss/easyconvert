import { Resume, TimeoutError } from '@lib/types';
import { ParsingStrategy } from '@lib/parsingStrategy';
import { getPrompt } from '@lib/prompts';
import { deduplicateRequest } from '@lib/llmCache';
import { logger } from '@lib/logger';
import { costTracker } from '@lib/monitoring/cost';
import { circuitBreaker } from '@lib/circuitBreaker';

export { TimeoutError };

function isRetryableError(error: any): boolean {
  if (error.name === 'TimeoutError') return true;
  if (error.name === 'AbortError') return true;
  if (error.message?.includes('network') || error.message?.includes('ECONNREFUSED')) return true;
  if (error.message?.includes('429')) return true; // Rate limit
  if (error.message?.includes('401') || error.message?.includes('403')) return false; // Auth errors - don't retry
  if (error.message?.includes('API error')) return true;
  return false;
}

function getRetryDelay(error: any): number {
  if (error.message?.includes('429')) return 5000; // 5s for rate limit
  return 0;
}

export async function extractResume(text: string, strategy?: ParsingStrategy, pdfBase64?: string): Promise<Resume> {
  const strat = strategy || { timeout: 10000, temperature: 0.05, maxRetries: 2, promptType: 'standard', validationLevel: 'standard' };

  const cacheKey = `${(pdfBase64 || text).substring(0, 100)}-${strat.promptType}`;
  return deduplicateRequest(cacheKey, async () => {
    for (let attempt = 0; attempt <= strat.maxRetries; attempt++) {
      try {
        return await circuitBreaker.execute(() => extractWithTimeout(text, strat, pdfBase64));
      } catch (error) {
        if (attempt === strat.maxRetries || !isRetryableError(error)) throw error;
        const delay = getRetryDelay(error);
        if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
        logger.debug('Retrying LLM request', { attempt, error: (error as Error).message, delay });
      }
    }
    throw new Error('Max retries exceeded');
  });
}

async function extractWithTimeout(text: string, strategy: ParsingStrategy, pdfBase64?: string): Promise<Resume> {
  const provider = import.meta.env.VITE_LLM_PROVIDER || 'qwen';
  const apiKey = import.meta.env[`VITE_${provider.toUpperCase()}_API_KEY`];

  const configs: Record<string, { url: string; model: string }> = {
    qwen: {
      url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      model: 'qwen-plus'
    },
    deepseek: {
      url: 'https://api.deepseek.com/v1/chat/completions',
      model: 'deepseek-chat'
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
          location: { type: 'string', description: '所在地址或城市' }
        },
        required: ['name', 'email', 'phone']
      },
      work: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            company: { type: 'string', description: '公司名称' },
            position: { type: 'string', description: '职位名称' },
            startDate: { type: 'string', description: '入职日期，格式YYYY-MM' },
            endDate: { type: 'string', description: '离职日期，格式YYYY-MM，在职填"至今"' },
            responsibilities: { type: 'array', items: { type: 'string' }, description: '工作职责列表，每条职责为独立字符串' },
            achievements: { type: 'array', items: { type: 'string' }, description: '业绩成果列表，每条成果为独立字符串' }
          },
          required: ['company', 'position', 'startDate', 'endDate']
        }
      },
      education: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            institution: { type: 'string', description: '学校名称' },
            degree: { type: 'string', description: '学历（如本科、硕士）' },
            major: { type: 'string', description: '专业名称' },
            startDate: { type: 'string', description: '入学日期，格式YYYY-MM' },
            endDate: { type: 'string', description: '毕业日期，格式YYYY-MM' },
            courses: { type: 'array', items: { type: 'string' }, description: '主修课程列表' },
            honors: { type: 'array', items: { type: 'string' }, description: '荣誉奖项列表' },
            gpa: { type: 'string', description: 'GPA或成绩排名信息' }
          },
          required: ['institution', 'degree', 'startDate', 'endDate']
        }
      },
      skills: { type: 'array', items: { type: 'string' }, description: '技能列表，包括编程语言、工具、专业技能等' },
      certificates: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: '证书名称' },
            issuer: { type: 'string', description: '颁发机构' },
            date: { type: 'string', description: '获得日期，格式YYYY-MM' }
          },
          required: ['name']
        }
      },
      projects: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: '项目名称' },
            role: { type: 'string', description: '项目角色' },
            startDate: { type: 'string', description: '开始日期，格式YYYY-MM' },
            endDate: { type: 'string', description: '结束日期，格式YYYY-MM' },
            description: { type: 'string', description: '项目描述' },
            achievements: { type: 'array', items: { type: 'string' }, description: '项目成果列表' }
          },
          required: ['name']
        }
      },
      summary: { type: 'string', description: '自我评价或个人简介' },
      additional: { type: 'object', description: '其他未分类信息' }
    },
    required: ['basics', 'work', 'education']
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
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{
          role: 'user',
          content: userContent,
        }],
        response_format: provider === 'qwen' ? {
          type: 'json_schema',
          json_schema: {
            name: 'resume_extraction',
            strict: true,
            schema: resumeSchema
          }
        } : { type: 'json_object' },
        temperature: strategy.temperature,
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data.usage) {
      costTracker.setModel(config.model);
      costTracker.record(data.usage.prompt_tokens || 0, data.usage.completion_tokens || 0);
    }
    const parsed = JSON.parse(data.choices[0].message.content);

    const confidenceMap: Record<string, number> = {};
    function extractConfidence(obj: Record<string, unknown>, prefix = '') {
      for (const [k, v] of Object.entries(obj)) {
        if (k.endsWith('_confidence') && typeof v === 'number') {
          confidenceMap[prefix + k.replace('_confidence', '')] = v;
        } else if (v && typeof v === 'object' && !Array.isArray(v)) {
          extractConfidence(v as Record<string, unknown>, `${prefix}${k}.`);
        }
      }
    }
    extractConfidence(parsed as Record<string, unknown>);
    if (Object.keys(confidenceMap).length > 0) {
      parsed.additional = { ...parsed.additional, _confidence: confidenceMap };
    }

    return parsed;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new TimeoutError(`Request timeout after ${strategy.timeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

