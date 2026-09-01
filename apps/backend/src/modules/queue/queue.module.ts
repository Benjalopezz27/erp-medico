import { Module } from '@nestjs/common';
import { redisConnectionProvider } from './services/redis-client.factory';
import { OpsProbeQueueService } from './services/ops-probe.queue';
import { OpsProbeProcessor } from './processors/ops-probe.processor';
import { REDIS_CONNECTION } from './queue.constants';

@Module({
  providers: [redisConnectionProvider, OpsProbeQueueService, OpsProbeProcessor],
  exports: [REDIS_CONNECTION, OpsProbeQueueService, OpsProbeProcessor],
})
export class QueueModule {}
