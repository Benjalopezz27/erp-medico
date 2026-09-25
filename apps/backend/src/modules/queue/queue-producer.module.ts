import { Module } from '@nestjs/common';
import { redisConnectionProvider } from './services/redis-client.factory';
import { OpsProbeQueueService } from './services/ops-probe.queue';
import { FiscalInvoiceQueueService } from './services/fiscal-invoice.queue';
import { QueueOpsController } from './controllers/queue-ops.controller';

@Module({
  controllers: [QueueOpsController],
  providers: [
    redisConnectionProvider,
    OpsProbeQueueService,
    FiscalInvoiceQueueService,
  ],
  exports: [
    redisConnectionProvider,
    OpsProbeQueueService,
    FiscalInvoiceQueueService,
  ],
})
export class QueueProducerModule {}
