// 真实模型定价（元/千 token）— 2026 年 4 月
export const PRICING: Record<string, { input: number; output: number }> = {
  'qwen-plus':     { input: 0.0008, output: 0.002 },   // 通义千问 Plus
  'deepseek-chat': { input: 0.001,  output: 0.002 },   // DeepSeek Chat
};

export const DEFAULT_MODEL = 'qwen-plus';

/** 根据模型和 token 数计算成本（元） */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): { inputCost: number; outputCost: number; totalCost: number } {
  const pricing = PRICING[model] || PRICING[DEFAULT_MODEL];
  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  return { inputCost, outputCost, totalCost: inputCost + outputCost };
}
