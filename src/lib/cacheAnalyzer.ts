interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
  avgHitTime: number;
  avgMissTime: number;
}

class CacheAnalyzer {
  private hits = 0;
  private misses = 0;
  private hitTimes: number[] = [];
  private missTimes: number[] = [];

  recordHit(time: number) {
    this.hits++;
    this.hitTimes.push(time);
  }

  recordMiss(time: number) {
    this.misses++;
    this.missTimes.push(time);
  }

  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      totalRequests: total,
      hitRate: total > 0 ? this.hits / total : 0,
      avgHitTime: this.hitTimes.length > 0 ? this.hitTimes.reduce((a, b) => a + b, 0) / this.hitTimes.length : 0,
      avgMissTime: this.missTimes.length > 0 ? this.missTimes.reduce((a, b) => a + b, 0) / this.missTimes.length : 0
    };
  }

  reset() {
    this.hits = 0;
    this.misses = 0;
    this.hitTimes = [];
    this.missTimes = [];
  }
}

export const cacheAnalyzer = new CacheAnalyzer();
