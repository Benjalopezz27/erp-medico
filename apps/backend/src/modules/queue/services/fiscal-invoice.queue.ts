import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import {
  REDIS_CONNECTION,
  FISCAL_INVOICE_QUEUE_NAME,
  FISCAL_INVOICE_JOB_NAME,
} from '../queue.constants';

export interface FiscalInvoiceJobData {
  fiscalDocumentId: string;
}

/**
 * Producer for the `wsfe-emit` queue. Uses a deterministic jobId
 * (`wsfe-emit:<fiscalDocumentId>`) so enqueuing the same fiscal document
 * twice (retry, duplicate call) never creates a second pending job — BullMQ
 * treats a repeated `add` with an existing jobId as a no-op while that job
 * hasn't been removed yet.
 */
@Injectable()
export class FiscalInvoiceQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(FiscalInvoiceQueueService.name);
  private queueInstance: Queue<FiscalInvoiceJobData> | null = null;

  constructor(@Inject(REDIS_CONNECTION) private readonly redisClient: Redis) {}

  private getQueue(): Queue<FiscalInvoiceJobData> {
    if (!this.queueInstance) {
      this.queueInstance = new Queue<FiscalInvoiceJobData>(
        FISCAL_INVOICE_QUEUE_NAME,
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

  async enqueueCaeRequest(
    data: FiscalInvoiceJobData,
  ): Promise<{ jobId: string }> {
    const jobId = `wsfe-emit:${data.fiscalDocumentId}`;
    const queue = this.getQueue();
    const job = await queue.add(FISCAL_INVOICE_JOB_NAME, data, { jobId });

    this.logger.log(
      `[Queue] Enqueued wsfe-emit job ${job.id} (fiscalDocumentId: ${data.fiscalDocumentId})`,
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
