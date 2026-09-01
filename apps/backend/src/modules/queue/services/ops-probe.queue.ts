import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import {
  REDIS_CONNECTION,
  OPS_PROBE_QUEUE_NAME,
  OPS_PROBE_JOB_NAME,
} from '../queue.constants';

export interface OpsProbeJobData {
  probeId: string;
  timestamp: string;
  message?: string;
  failAttempts?: number;
}

export interface OpsProbeJobResult {
  jobId?: string;
  probeId?: string;
  status?: string;
  attemptsMade: number;
  processedAt?: string;
  durationMs?: number;
  message?: string;
  result?: any;
  failedReason?: string;
}

export interface QueueMetrics {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

@Injectable()
export class OpsProbeQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(OpsProbeQueueService.name);
  private queueInstance: Queue<OpsProbeJobData> | null = null;

  constructor(@Inject(REDIS_CONNECTION) private readonly redisClient: Redis) {}

  private getQueue(): Queue<OpsProbeJobData> {
    if (!this.queueInstance) {
      this.queueInstance = new Queue<OpsProbeJobData>(OPS_PROBE_QUEUE_NAME, {
        connection: this.redisClient as any,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 100 },
        },
      });
    }
    return this.queueInstance;
  }

  async enqueueProbeJob(
    data: Partial<OpsProbeJobData> = {},
  ): Promise<{ jobId: string; probeId: string; enqueuedAt: string }> {
    const probeId =
      data.probeId ||
      `probe-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const payload: OpsProbeJobData = {
      probeId,
      timestamp: new Date().toISOString(),
      message: data.message || 'Operational connectivity probe',
      failAttempts: data.failAttempts ?? 0,
    };

    const queue = this.getQueue();
    const job = await queue.add(OPS_PROBE_JOB_NAME, payload);

    this.logger.log(
      `[Queue] Enqueued ops probe job ${job.id} (probeId: ${probeId})`,
    );

    return {
      jobId: job.id as string,
      probeId,
      enqueuedAt: payload.timestamp,
    };
  }

  async getJobStatus(jobId: string): Promise<OpsProbeJobResult | null> {
    const queue = this.getQueue();
    const job = await queue.getJob(jobId);
    if (!job) {
      return null;
    }

    const state = await job.getState();
    return {
      jobId: job.id as string,
      probeId: job.data.probeId,
      status: state,
      attemptsMade: job.attemptsMade,
      processedAt: job.processedOn
        ? new Date(job.processedOn).toISOString()
        : undefined,
      durationMs:
        job.finishedOn && job.processedOn
          ? job.finishedOn - job.processedOn
          : undefined,
      result: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

  async getQueueMetrics(): Promise<QueueMetrics> {
    const queue = this.getQueue();
    const [counts, isPaused] = await Promise.all([
      queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      queue.isPaused(),
    ]);

    return {
      queueName: OPS_PROBE_QUEUE_NAME,
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
      paused: isPaused,
    };
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queueInstance) {
      await this.queueInstance.close();
      this.queueInstance = null;
    }
  }
}
