class CostTracker {
  private calls = 0;
  private tokens = 0;

  record(inputTokens: number, outputTokens: number) {
    this.calls++;
    this.tokens += inputTokens + outputTokens;
  }

  getStats() {
    const costPerMToken = 0.5; // 假设每百万token成本
    return {
      calls: this.calls,
      tokens: this.tokens,
      estimatedCost: (this.tokens / 1000000) * costPerMToken
    };
  }
}

export const costTracker = new CostTracker();
