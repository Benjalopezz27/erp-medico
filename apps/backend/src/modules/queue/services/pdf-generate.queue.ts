import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import {
  REDIS_CONNECTION,
  PDF_GENERATE_QUEUE_NAME,
  PDF_GENERATE_JOB_NAME,
} from '../queue.constants';

export interface PdfGenerateJobData {
  fiscalDocumentId: string;
}

/**
 * Producer for the `pdf-generate` queue. Same deterministic-jobId pattern as
 * `FiscalInvoiceQueueService` (`pdf-generate:<fiscalDocumentId>`): enqueuing
 * the same document twice (retry from a 409 download, duplicate post-CAE
 * enqueue) never creates a second pending job.
 */
@Injectable()
export class PdfGenerateQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfGenerateQueueService.name);
  private queueInstance: Queue<PdfGenerateJobData> | null = null;

  constructor(@Inject(REDIS_CONNECTION) private readonly redisClient: Redis) {}

  private getQueue(): Queue<PdfGenerateJobData> {
    if (!this.queueInstance) {
      this.queueInstance = new Queue<PdfGenerateJobData>(
        PDF_GENERATE_QUEUE_NAME,
        {
          connection: this.redisClient as any,
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
            removeOnComplete: { count: 500 },
            removeOnFail: { count: 500 },
          },
        },
      );
    }
    return this.queueInstance;
  }

  async enqueue(data: PdfGenerateJobData): Promise<{ jobId: string }> {
    const jobId = `pdf-generate:${data.fiscalDocumentId}`;
    const queue = this.getQueue();
    const job = await queue.add(PDF_GENERATE_JOB_NAME, data, { jobId });

    this.logger.log(
      `[Queue] Enqueued pdf-generate job ${job.id} (fiscalDocumentId: ${data.fiscalDocumentId})`,
    );

    return { jobId: job.id as string };
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queueInstance) {
      await this.queueInstance.close();
      this.queueInstance = null;
    }
  }
}
