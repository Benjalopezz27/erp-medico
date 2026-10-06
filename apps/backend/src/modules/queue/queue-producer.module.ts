import { Module } from '@nestjs/common';
import { redisConnectionProvider } from './services/redis-client.factory';
import { OpsProbeQueueService } from './services/ops-probe.queue';
import { FiscalInvoiceQueueService } from './services/fiscal-invoice.queue';
import { PdfGenerateQueueService } from './services/pdf-generate.queue';
import { MailSendQueueService } from './services/mail-send.queue';
import { QueueOpsController } from './controllers/queue-ops.controller';

@Module({
  controllers: [QueueOpsController],
  providers: [
    redisConnectionProvider,
    OpsProbeQueueService,
    FiscalInvoiceQueueService,
    PdfGenerateQueueService,
    MailSendQueueService,
  ],
  exports: [
    redisConnectionProvider,
    OpsProbeQueueService,
    FiscalInvoiceQueueService,
    PdfGenerateQueueService,
    MailSendQueueService,
  ],
})
export class QueueProducerModule {}
