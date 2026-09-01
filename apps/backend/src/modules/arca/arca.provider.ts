import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ARCA_SERVICE } from './arca.constants';
import { ArcaMockService } from './arca-mock.service';
import { ArcaDisabledService } from './arca-disabled.service';
import { ArcaHomologationService } from './services/arca-homologation.service';
import { ArcaCertificateLoader } from './services/arca-certificate-loader.service';
import { ArcaClockSyncService } from './services/arca-clock-sync.service';
import { IArcaService } from './interfaces/arca-service.interface';

export const arcaServiceProvider: Provider = {
  provide: ARCA_SERVICE,
  useFactory: (
    configService: ConfigService,
    certLoader: ArcaCertificateLoader,
    clockSyncService: ArcaClockSyncService,
  ): IArcaService => {
    const nodeEnv = configService.get<string>('NODE_ENV')?.trim().toLowerCase();
    const arcaEnv = configService.get<string>('ARCA_ENV')?.trim().toLowerCase();

    // 1. Explicitly disabled mode -> Fail-closed disabled service (safe for production until Sprint 8)
    if (arcaEnv === 'disabled' || !arcaEnv) {
      return new ArcaDisabledService();
    }

    // 2. Development mode -> Mock with simulated latency in dev, 0ms in test
    if (arcaEnv === 'development') {
      if (nodeEnv === 'production') {
        throw new Error(
          '[SECURITY] ARCA_ENV=development is strictly prohibited in production mode.',
        );
      }
      return new ArcaMockService({ latencyMs: nodeEnv === 'test' ? 0 : 200 });
    }

    // 3. Homologation mode -> Real WSAA Authentication & diagnostics client
    if (arcaEnv === 'homologation') {
      if (nodeEnv === 'production') {
        // Production NODE_ENV with homologation is permitted ONLY if testing staging with production container
      }
      return new ArcaHomologationService(
        certLoader,
        clockSyncService,
        configService,
      );
    }

    // 4. Live Production ARCA -> strictly deferred to Sprint 8
    if (arcaEnv === 'production') {
      throw new Error(
        '[FATAL] Live production ARCA client is not implemented (pending Sprint 8). Set ARCA_ENV=disabled to run safely.',
      );
    }

    throw new Error(
      `[FATAL] Invalid ARCA environment configuration: NODE_ENV=${nodeEnv}, ARCA_ENV=${arcaEnv}. Allowed values: ARCA_ENV=disabled, development, homologation.`,
    );
  },
  inject: [ConfigService, ArcaCertificateLoader, ArcaClockSyncService],
};
