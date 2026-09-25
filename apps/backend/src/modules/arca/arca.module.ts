import { Module } from '@nestjs/common';
import { ArcaController } from './arca.controller';
import { ArcaService } from './arca.service';
import { arcaServiceProvider } from './arca.provider';
import { ArcaCertificateLoader } from './services/arca-certificate-loader.service';
import { ArcaClockSyncService } from './services/arca-clock-sync.service';
import { ArcaTicketCacheService } from './services/arca-ticket-cache.service';
import { InvoiceTypeResolverService } from './services/invoice-type-resolver.service';
import { redisConnectionProvider } from '../queue/services/redis-client.factory';
import { ARCA_SERVICE } from './arca.constants';

@Module({
  controllers: [ArcaController],
  providers: [
    ArcaService,
    ArcaCertificateLoader,
    ArcaClockSyncService,
    redisConnectionProvider,
    ArcaTicketCacheService,
    InvoiceTypeResolverService,
    arcaServiceProvider,
  ],
  exports: [
    ArcaService,
    ARCA_SERVICE,
    ArcaCertificateLoader,
    ArcaClockSyncService,
    InvoiceTypeResolverService,
  ],
})
export class ArcaModule {}
