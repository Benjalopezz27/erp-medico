import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { ArcaAuthTicket } from '@erp/shared-types';
import { REDIS_CONNECTION } from '../../queue/queue.constants';

const MAX_TTL_SECONDS = 12 * 60 * 60; // 12 hours, per issue #224
const RENEWAL_MARGIN_SECONDS = 10 * 60; // matches the in-memory margin ArcaHomologationService used

@Injectable()
export class ArcaTicketCacheService {
  private readonly logger = new Logger(ArcaTicketCacheService.name);

  constructor(@Inject(REDIS_CONNECTION) private readonly redisClient: Redis) {}

  private key(env: string, cuit: string): string {
    return `arca:wsaa:ticket:${env}:${cuit}`;
  }

  async get(env: string, cuit: string): Promise<ArcaAuthTicket | null> {
    try {
      const raw = await this.redisClient.get(this.key(env, cuit));
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as ArcaAuthTicket;
    } catch (err: unknown) {
      this.logger.warn(
        `[ArcaTicketCache] Redis unavailable on get, degrading to direct WSAA login: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return null;
    }
  }

  async set(env: string, cuit: string, ticket: ArcaAuthTicket): Promise<void> {
    const secondsToExpiration = Math.floor(
      (new Date(ticket.expirationTime).getTime() - Date.now()) / 1000,
    );
    const ttlSeconds =
      Math.min(MAX_TTL_SECONDS, secondsToExpiration) - RENEWAL_MARGIN_SECONDS;

    if (ttlSeconds <= 0) {
      // Ticket already inside (or past) its renewal margin: not worth caching.
      return;
    }

    try {
      await this.redisClient.set(
        this.key(env, cuit),
        JSON.stringify(ticket),
        'EX',
        ttlSeconds,
      );
    } catch (err: unknown) {
      this.logger.warn(
        `[ArcaTicketCache] Redis unavailable on set, ticket will not be shared: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
