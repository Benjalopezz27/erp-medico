import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import {
  REDIS_CONNECTION,
  MAIL_SEND_QUEUE_NAME,
  MAIL_SEND_JOB_NAME,
} from '../queue.constants';

export interface MailSendJobData {
  type: 'password-reset';
  to: string;
  token: string;
}

/**
 * Producer for the `mail-send` queue. Retries with exponential backoff so a
 * provider outage never loses the mail nor blocks the HTTP request. Jobs are
 * kept short-lived in Redis: the payload carries a 30-min, single-use token.
 */
@Injectable()
export class MailSendQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(MailSendQueueService.name);
  private queueInstance: Queue<MailSendJobData> | null = null;

  constructor(@Inject(REDIS_CONNECTION) private readonly redisClient: Redis) {}

  private getQueue(): Queue<MailSendJobData> {
    if (!this.queueInstance) {
      this.queueInstance = new Queue<MailSendJobData>(MAIL_SEND_QUEUE_NAME, {
        connection: this.redisClient as any,
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: { age: 3600 },
        },
      });
    }
    return this.queueInstance;
  }

  async enqueue(data: MailSendJobData): Promise<void> {
    const job = await this.getQueue().add(MAIL_SEND_JOB_NAME, data);
    // Never log `data`: it contains the reset token.
    this.logger.log(`[Queue] Enqueued mail-send job ${job.id} (${data.type})`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queueInstance) {
      await this.queueInstance.close();
      this.queueInstance = null;
    }
  }
}
