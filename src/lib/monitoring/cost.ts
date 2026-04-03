// 真实模型定价（元/千 token）— 2026 年 4 月
const PRICING: Record<string, { input: number; output: number }> = {
  'qwen-plus':     { input: 0.0008, output: 0.002 },   // 通义千问 Plus
  'deepseek-chat': { input: 0.001,  output: 0.002 },   // DeepSeek Chat
};

class CostTracker {
  private calls = 0;
  private inputTokens = 0;
  private outputTokens = 0;
  private model = 'qwen-plus';

  setModel(model: string) {
    this.model = model;
  }

  record(inputTokens: number, outputTokens: number) {
    this.calls++;
    this.inputTokens += inputTokens;
    this.outputTokens += outputTokens;
  }

  getStats() {
    const pricing = PRICING[this.model] || PRICING['qwen-plus'];
    const inputCost = (this.inputTokens / 1000) * pricing.input;
    const outputCost = (this.outputTokens / 1000) * pricing.output;

    return {
      calls: this.calls,
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      tokens: this.inputTokens + this.outputTokens,
      inputCost,
      outputCost,
      estimatedCost: inputCost + outputCost,
      model: this.model,
    };
  }
}

export const costTracker = new CostTracker();
