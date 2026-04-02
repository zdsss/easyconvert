export type StageName =
  | 'file_upload'
  | 'file_parse'
  | 'difficulty_classify'
  | 'strategy_select'
  | 'llm_extract'
  | 'content_classify'
  | 'validation'
  | 'cache_store';

export type StageStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ProcessStage {
  name: StageName;
  status: StageStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ProcessTrace {
  stages: ProcessStage[];
  totalDuration: number;
}

export class ProcessTracer {
  private stages: ProcessStage[] = [];

  startStage(name: StageName) {
    this.stages.push({
      name,
      status: 'processing',
      startTime: new Date(),
    });
  }

  completeStage(name: StageName, metadata?: any) {
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
