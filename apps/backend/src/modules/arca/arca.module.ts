import { Module } from '@nestjs/common';
import { ArcaController } from './arca.controller';
import { ArcaService } from './arca.service';
import { arcaServiceProvider } from './arca.provider';
import { ArcaCertificateLoader } from './services/arca-certificate-loader.service';
import { ArcaClockSyncService } from './services/arca-clock-sync.service';
import { ARCA_SERVICE } from './arca.constants';

@Module({
  controllers: [ArcaController],
  providers: [
    ArcaService,
    ArcaCertificateLoader,
    ArcaClockSyncService,
    arcaServiceProvider,
  ],
  exports: [
    ArcaService,
    ARCA_SERVICE,
    ArcaCertificateLoader,
    ArcaClockSyncService,
  ],
})
export class ArcaModule {}
