import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { REDIS_CONNECTION, MAIL_SEND_QUEUE_NAME } from '../queue.constants';
import { MailSendJobData } from '../services/mail-send.queue';
import { MailService } from '../../mail/mail.service';
import { redactSecrets } from '../../../common/utils/sanitizer.utils';

@Injectable()
export class MailSendProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailSendProcessor.name);
  private worker: Worker<MailSendJobData> | null = null;

  constructor(
    @Inject(REDIS_CONNECTION) private readonly redisClient: Redis,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker<MailSendJobData>(
      MAIL_SEND_QUEUE_NAME,
      (job) => this.process(job),
      { connection: this.redisClient as any, concurrency: 2 },
    );

    this.worker.on('failed', (job: Job | undefined, err: Error) => {
      this.logger.warn(
        `[Worker] mail-send job ${job?.id} failed: ${redactSecrets(err.message)}`,
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
  }

  async process(job: Job<MailSendJobData>): Promise<void> {
    const { to, token } = job.data;
    const baseUrl = this.config
      .getOrThrow<string>('APP_PUBLIC_URL')
      .replace(/\/$/, '');
    const link = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await this.mailService.sendPasswordReset(to, link);
  }
}
