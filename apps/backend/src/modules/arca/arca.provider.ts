import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ARCA_SERVICE } from './arca.constants';
import { ArcaMockService } from './arca-mock.service';
import { IArcaService } from './interfaces/arca-service.interface';

export const arcaServiceProvider: Provider = {
  provide: ARCA_SERVICE,
  useFactory: (configService: ConfigService): IArcaService => {
    const nodeEnv = configService.get<string>('NODE_ENV')?.trim().toLowerCase();
    const arcaEnv = configService.get<string>('ARCA_ENV')?.trim().toLowerCase();

    // 1. Development mode -> Mock with 200ms latency
    if (nodeEnv === 'development' && arcaEnv === 'development') {
      return new ArcaMockService({ latencyMs: 200 });
    }

    // 2. Testing mode -> Mock with 0ms latency for fast test runs
    if (nodeEnv === 'test' && arcaEnv === 'development') {
      return new ArcaMockService({ latencyMs: 0 });
    }

    // 3. Prohibited or Invalid configurations -> Fail fast
    if (nodeEnv === 'production') {
      throw new Error(
        `[FATAL] Production ARCA client is not implemented (pending Sprint 8). ArcaMockService cannot be used in production.`,
      );
    }

    if (arcaEnv === 'homologation') {
      throw new Error(
        `[FATAL] Homologation ARCA client is not implemented (pending Sprint 8). Mock cannot be used for homologation.`,
      );
    }

    throw new Error(
      `[FATAL] Invalid ARCA environment configuration: NODE_ENV=${nodeEnv}, ARCA_ENV=${arcaEnv}. Allowed values: NODE_ENV=development/test with ARCA_ENV=development.`,
    );
  },
  inject: [ConfigService],
};
