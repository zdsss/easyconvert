import type { LLMProvider } from './types';
import { QwenProvider } from './qwen';
import { DeepSeekProvider } from './deepseek';
import { ClaudeProvider } from './claude';
import { OpenAIProvider } from './openai';

/**
 * Provider 注册表
 * env 默认 + 租户级覆盖
 */
class LLMRegistry {
  private providers = new Map<string, LLMProvider>();

  constructor() {
    this.registerFromEnv();
  }

  private registerFromEnv() {
    const qwenKey = process.env.SERVER_QWEN_API_KEY || process.env.VITE_QWEN_API_KEY;
    if (qwenKey) this.providers.set('qwen', new QwenProvider(qwenKey));

    const deepseekKey = process.env.SERVER_DEEPSEEK_API_KEY || process.env.VITE_DEEPSEEK_API_KEY;
    if (deepseekKey) this.providers.set('deepseek', new DeepSeekProvider(deepseekKey));

    const claudeKey = process.env.SERVER_CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (claudeKey) this.providers.set('claude', new ClaudeProvider(claudeKey));

    const openaiKey = process.env.SERVER_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (openaiKey) this.providers.set('openai', new OpenAIProvider(openaiKey));
  }

  get(name?: string): LLMProvider {
    const providerName = name || process.env.SERVER_LLM_PROVIDER || process.env.VITE_LLM_PROVIDER || 'qwen';
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`LLM provider "${providerName}" not configured. Set SERVER_${providerName.toUpperCase()}_API_KEY`);
    }
    return provider;
  }

  list(): string[] {
    return [...this.providers.keys()];
  }

  register(name: string, provider: LLMProvider) {
    this.providers.set(name, provider);
  }
}

export const llmRegistry = new LLMRegistry();
