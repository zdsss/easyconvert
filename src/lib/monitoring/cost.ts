import { calculateCost, DEFAULT_MODEL } from '@shared/pricing';

class CostTracker {
  private calls = 0;
  private inputTokens = 0;
  private outputTokens = 0;
  private model = DEFAULT_MODEL;

  setModel(model: string) {
    this.model = model;
  }

  record(inputTokens: number, outputTokens: number) {
    this.calls++;
    this.inputTokens += inputTokens;
    this.outputTokens += outputTokens;
  }

  getStats() {
    const { inputCost, outputCost, totalCost } = calculateCost(
      this.model,
      this.inputTokens,
      this.outputTokens,
    );

    return {
      calls: this.calls,
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      tokens: this.inputTokens + this.outputTokens,
      inputCost,
      outputCost,
      estimatedCost: totalCost,
      model: this.model,
    };
  }
}

export const costTracker = new CostTracker();
