import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../database/database.module';
import { QueueConsumerModule } from './queue-consumer.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Same fallback order as AppModule: covers running the worker with a
      // cwd of apps/backend (no local .env there) as well as repo root.
      // Production reads real process.env vars regardless (no .env file).
      envFilePath: ['.env.local', '.env', '../../.env'],
    }),
    DatabaseModule,
    QueueConsumerModule,
  ],
})
export class WorkerModule {}
