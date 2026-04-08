// Re-export types from shared (single source of truth)
export type { StageName, StageStatus, ProcessStage, ProcessTrace } from '@shared/types';
import type { StageName, ProcessStage, ProcessTrace } from '@shared/types';

export class ProcessTracer {
  private stages: ProcessStage[] = [];

  startStage(name: StageName) {
    this.stages.push({
      name,
      status: 'processing',
      startTime: new Date(),
    });
  }

  completeStage(name: StageName, metadata?: Record<string, unknown>) {
    const stage = this.stages.find(s => s.name === name);
    if (stage) {
      stage.status = 'completed';
      stage.endTime = new Date();
      stage.duration = stage.endTime.getTime() - stage.startTime.getTime();
      stage.metadata = metadata;
    }
  }

  failStage(name: StageName, error: string) {
    const stage = this.stages.find(s => s.name === name);
    if (stage) {
      stage.status = 'failed';
      stage.endTime = new Date();
      stage.duration = stage.endTime.getTime() - stage.startTime.getTime();
      stage.error = error;
    }
  }

  getTrace(): ProcessTrace {
    return {
      stages: this.stages,
      totalDuration: this.stages.reduce((sum, s) => sum + (s.duration || 0), 0)
    };
  }
}
