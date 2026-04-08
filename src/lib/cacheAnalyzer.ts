interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
  avgHitTime: number;
  avgMissTime: number;
}

const MAX_ENTRIES = 1000;

class CacheAnalyzer {
  private hits = 0;
  private misses = 0;
  private hitTimes: number[] = [];
  private missTimes: number[] = [];
  private hitSum = 0;
  private missSum = 0;

  recordHit(time: number) {
    this.hits++;
    this.hitTimes.push(time);
    this.hitSum += time;
    if (this.hitTimes.length > MAX_ENTRIES) {
      this.hitSum -= this.hitTimes.shift()!;
    }
  }

  recordMiss(time: number) {
    this.misses++;
    this.missTimes.push(time);
    this.missSum += time;
    if (this.missTimes.length > MAX_ENTRIES) {
      this.missSum -= this.missTimes.shift()!;
    }
  }

  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      totalRequests: total,
      hitRate: total > 0 ? this.hits / total : 0,
      avgHitTime: this.hitTimes.length > 0 ? this.hitSum / this.hitTimes.length : 0,
      avgMissTime: this.missTimes.length > 0 ? this.missSum / this.missTimes.length : 0,
    };
  }

  reset() {
    this.hits = 0;
    this.misses = 0;
    this.hitTimes = [];
    this.missTimes = [];
    this.hitSum = 0;
    this.missSum = 0;
  }
}

export const cacheAnalyzer = new CacheAnalyzer();
