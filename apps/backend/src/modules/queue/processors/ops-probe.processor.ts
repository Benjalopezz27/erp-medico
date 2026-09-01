import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { REDIS_CONNECTION, OPS_PROBE_QUEUE_NAME } from '../queue.constants';
import {
  OpsProbeJobData,
  OpsProbeJobResult,
} from '../services/ops-probe.queue';

@Injectable()
export class OpsProbeProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OpsProbeProcessor.name);
  private worker: Worker<OpsProbeJobData, OpsProbeJobResult> | null = null;

  constructor(@Inject(REDIS_CONNECTION) private readonly redisClient: Redis) {}

  onModuleInit(): void {
    this.worker = new Worker<OpsProbeJobData, OpsProbeJobResult>(
      OPS_PROBE_QUEUE_NAME,
      async (
        job: Job<OpsProbeJobData, OpsProbeJobResult>,
      ): Promise<OpsProbeJobResult> => {
        this.logger.log(
          `[Worker] Processing job ${job.id} (probeId: ${job.data.probeId}, attempt: ${job.attemptsMade + 1})`,
        );

        // Simulate retry requirement if configured
        if (job.data.failAttempts && job.attemptsMade < job.data.failAttempts) {
          this.logger.warn(
            `[Worker] Simulating temporary failure for job ${job.id} (attempt ${job.attemptsMade + 1}/${job.data.failAttempts})`,
          );
          throw new Error(
            `Simulated transient failure on attempt ${job.attemptsMade + 1}`,
          );
        }

        await job.updateProgress(100);

        return {
          processedAt: new Date().toISOString(),
          attemptsMade: job.attemptsMade + 1,
          message: job.data.message,
        };
      },
      {
        connection: this.redisClient as any,
        concurrency: 5,
      },
    );

    this.worker.on('completed', (job: Job) => {
      this.logger.log(`[Worker] Job ${job.id} completed successfully.`);
    });

    this.worker.on('failed', (job: Job | undefined, err: Error) => {
      this.logger.warn(`[Worker] Job ${job?.id} failed: ${err.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
  }

  getWorker(): Worker<OpsProbeJobData, OpsProbeJobResult> | null {
    return this.worker;
  }
}
