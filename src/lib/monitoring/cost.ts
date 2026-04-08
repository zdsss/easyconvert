import { calculateCost, DEFAULT_MODEL } from '@shared/pricing';

interface ModelStats {
  calls: number;
  inputTokens: number;
  outputTokens: number;
}

class CostTracker {
  private perModel = new Map<string, ModelStats>();

  private getOrCreate(model: string): ModelStats {
    let stats = this.perModel.get(model);
    if (!stats) {
      stats = { calls: 0, inputTokens: 0, outputTokens: 0 };
      this.perModel.set(model, stats);
    }
    return stats;
  }

  record(model: string, inputTokens: number, outputTokens: number) {
    const stats = this.getOrCreate(model);
    stats.calls++;
    stats.inputTokens += inputTokens;
    stats.outputTokens += outputTokens;
  }

  getStats(model?: string) {
    if (model) {
      const stats = this.perModel.get(model) || { calls: 0, inputTokens: 0, outputTokens: 0 };
      const { inputCost, outputCost, totalCost } = calculateCost(model, stats.inputTokens, stats.outputTokens);
      return {
        calls: stats.calls,
        inputTokens: stats.inputTokens,
        outputTokens: stats.outputTokens,
        tokens: stats.inputTokens + stats.outputTokens,
        inputCost,
        outputCost,
        estimatedCost: totalCost,
        model,
      };
    }

    // Aggregate across all models
    let totalCalls = 0, totalInput = 0, totalOutput = 0, totalCost = 0;
    for (const [m, stats] of this.perModel) {
      totalCalls += stats.calls;
      totalInput += stats.inputTokens;
      totalOutput += stats.outputTokens;
      totalCost += calculateCost(m, stats.inputTokens, stats.outputTokens).totalCost;
    }
    return {
      calls: totalCalls,
      inputTokens: totalInput,
      outputTokens: totalOutput,
      tokens: totalInput + totalOutput,
      inputCost: 0,
      outputCost: 0,
      estimatedCost: totalCost,
      model: this.perModel.size === 1 ? this.perModel.keys().next().value! : DEFAULT_MODEL,
    };
  }
}

export const costTracker = new CostTracker();
