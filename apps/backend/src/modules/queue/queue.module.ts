import { Module } from '@nestjs/common';
import { QueueProducerModule } from './queue-producer.module';

@Module({
  imports: [QueueProducerModule],
  exports: [QueueProducerModule],
})
export class QueueModule {}
