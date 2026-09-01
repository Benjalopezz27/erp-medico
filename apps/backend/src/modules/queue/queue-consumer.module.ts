import { Module } from '@nestjs/common';
import { redisConnectionProvider } from './services/redis-client.factory';
import { OpsProbeProcessor } from './processors/ops-probe.processor';

@Module({
  providers: [redisConnectionProvider, OpsProbeProcessor],
  exports: [redisConnectionProvider, OpsProbeProcessor],
})
export class QueueConsumerModule {}
