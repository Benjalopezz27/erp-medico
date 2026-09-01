import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QueueConsumerModule } from './queue-consumer.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    QueueConsumerModule,
  ],
})
export class WorkerModule {}
