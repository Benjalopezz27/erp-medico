import { Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';
import { REDIS_CONNECTION } from '../queue.constants';

export const redisConnectionProvider: Provider = {
  provide: REDIS_CONNECTION,
  useFactory: (configService: ConfigService): Redis => {
    const logger = new Logger('RedisConnection');
    const redisUrl = configService.get<string>('REDIS_URL')?.trim();
    const host = configService.get<string>('REDIS_HOST')?.trim() || 'localhost';
    const port = Number(configService.get<number>('REDIS_PORT')) || 6379;
    const password = configService.get<string>('REDIS_PASSWORD')?.trim();
    const tlsEnabled =
      configService.get<string>('REDIS_TLS')?.trim().toLowerCase() === 'true';

    let redis: Redis;

    const baseOptions: RedisOptions = {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
      retryStrategy: (times) => {
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
    };

    if (redisUrl) {
      redis = new Redis(redisUrl, baseOptions);
    } else {
      redis = new Redis({
        ...baseOptions,
        host,
        port,
        password: password || undefined,
        tls: tlsEnabled ? {} : undefined,
      });
    }

    redis.on('connect', () => {
      logger.log(`[Redis] Connected to Redis instance at ${host}:${port}`);
    });

    redis.on('error', (err) => {
      logger.warn(`[Redis] Connection warning/error: ${err.message}`);
    });

    return redis;
  },
  inject: [ConfigService],
};
