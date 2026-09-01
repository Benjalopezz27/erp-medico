import { Injectable, Inject, OnModuleDestroy, Logger } from '@nestjs/common';
import { Queue, Job } from 'bullmq';
import Redis from 'ioredis';
import {
  REDIS_CONNECTION,
  OPS_PROBE_QUEUE_NAME,
  OPS_PROBE_JOB_NAME,
} from '../queue.constants';

export interface OpsProbeJobData {
  probeId: string;
  message: string;
  failAttempts?: number;
  timestamp: string;
}

export interface OpsProbeJobResult {
  processedAt: string;
  attemptsMade: number;
  message: string;
}

@Injectable()
export class OpsProbeQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(OpsProbeQueueService.name);
  private readonly queue: Queue<OpsProbeJobData, OpsProbeJobResult>;

  constructor(@Inject(REDIS_CONNECTION) private readonly redisClient: Redis) {
    this.queue = new Queue(OPS_PROBE_QUEUE_NAME, {
      connection: this.redisClient as any,
    });
  }

  async enqueueProbeJob(data: {
    probeId: string;
    message: string;
    failAttempts?: number;
  }): Promise<Job<OpsProbeJobData, OpsProbeJobResult>> {
    const jobData: OpsProbeJobData = {
      ...data,
      timestamp: new Date().toISOString(),
    };

    const job = await this.queue.add(OPS_PROBE_JOB_NAME, jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 500,
      },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
    });

    this.logger.log(
      `[Queue] Enqueued ops probe job ${job.id} (probeId: ${data.probeId})`,
    );
    return job;
  }

  async getJob(
    jobId: string,
  ): Promise<Job<OpsProbeJobData, OpsProbeJobResult> | undefined> {
    return this.queue.getJob(jobId);
  }

  async getQueueMetrics(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
