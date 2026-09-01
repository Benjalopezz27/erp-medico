import { Module } from '@nestjs/common';
import { redisConnectionProvider } from './services/redis-client.factory';
import { OpsProbeQueueService } from './services/ops-probe.queue';
import { QueueOpsController } from './controllers/queue-ops.controller';

@Module({
  controllers: [QueueOpsController],
  providers: [redisConnectionProvider, OpsProbeQueueService],
  exports: [redisConnectionProvider, OpsProbeQueueService],
})
export class QueueProducerModule {}
