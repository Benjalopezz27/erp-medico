import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { WorkerModule } from './modules/queue/worker.module';

const logger = new Logger('WorkerBootstrap');

export const WORKER_HEARTBEAT_PATH =
  process.env.WORKER_HEARTBEAT_PATH ||
  path.join(os.tmpdir(), 'erp-worker-heartbeat.json');

async function bootstrap() {
  logger.log('Starting BullMQ background worker application context...');

  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Heartbeat loop for container health check
  const heartbeatInterval = setInterval(() => {
    try {
      const payload = {
        timestamp: new Date().toISOString(),
        pid: process.pid,
        uptime: process.uptime(),
        status: 'healthy',
      };
      fs.writeFileSync(WORKER_HEARTBEAT_PATH, JSON.stringify(payload), 'utf8');
    } catch (err: unknown) {
      logger.warn(
        `Failed to write worker heartbeat: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }, 5000);

  // Write initial heartbeat
  try {
    fs.writeFileSync(
      WORKER_HEARTBEAT_PATH,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        pid: process.pid,
        uptime: 0,
        status: 'healthy',
      }),
      'utf8',
    );
  } catch (err: unknown) {
    logger.warn(
      `Failed to write initial heartbeat: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  logger.log('BullMQ worker process is actively listening for jobs.');

  let isShuttingDown = false;
  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.log(`Received ${signal}. Shutting down worker gracefully...`);
    clearInterval(heartbeatInterval);

    try {
      if (fs.existsSync(WORKER_HEARTBEAT_PATH)) {
        fs.unlinkSync(WORKER_HEARTBEAT_PATH);
      }
    } catch {
      // ignore
    }

    try {
      await app.close();
      logger.log('Worker application context closed successfully.');
      process.exit(0);
    } catch (err: unknown) {
      logger.error(
        `Error during worker shutdown: ${err instanceof Error ? err.message : String(err)}`,
      );
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error(`Worker bootstrap failed: ${err.message}`, err.stack);
  process.exit(1);
});
