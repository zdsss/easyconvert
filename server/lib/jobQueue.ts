import { serverLogger } from './logger';

export interface Job {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  execute: () => Promise<void>;
}

/**
 * 进程内异步任务队列
 * 用于异步解析和批量处理
 */
class JobQueue {
  private queue: Job[] = [];
  private processing = 0;
  private maxConcurrent = 3;

  enqueue(job: Job): void {
    this.queue.push(job);
    this.processNext();
  }

  private async processNext(): Promise<void> {
    if (this.processing >= this.maxConcurrent || this.queue.length === 0) return;

    const job = this.queue.find((j) => j.status === 'pending');
    if (!job) return;

    this.processing++;
    job.status = 'processing';

    try {
      await job.execute();
      job.status = 'completed';
    } catch (error) {
      job.status = 'failed';
      serverLogger.error('Job failed', error as Error, { jobId: job.id });
    } finally {
      this.processing--;
      this.processNext();
    }
  }

  getStatus() {
    return {
      queued: this.queue.filter((j) => j.status === 'pending').length,
      processing: this.processing,
      completed: this.queue.filter((j) => j.status === 'completed').length,
      failed: this.queue.filter((j) => j.status === 'failed').length,
    };
  }
}

export const jobQueue = new JobQueue();
