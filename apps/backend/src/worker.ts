import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrapWorker() {
  const logger = new Logger('WorkerService');
  logger.log('[Worker] Starting ERP BullMQ background worker context...');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  const handleShutdown = async (signal: string) => {
    logger.log(
      `[Worker] Received ${signal}. Gracefully closing application context...`,
    );
    await app.close();
    logger.log('[Worker] Worker context closed cleanly. Exiting.');
    process.exit(0);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));

  logger.log(
    '[Worker] BullMQ Worker is initialized and actively listening for jobs.',
  );
}

bootstrapWorker().catch((err) => {
  console.error('[Worker] Fatal error during worker startup:', err);
  process.exit(1);
});
