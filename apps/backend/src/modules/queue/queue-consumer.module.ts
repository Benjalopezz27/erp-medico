import { Module } from '@nestjs/common';
import { redisConnectionProvider } from './services/redis-client.factory';
import { OpsProbeProcessor } from './processors/ops-probe.processor';
import { FiscalInvoiceProcessor } from './processors/fiscal-invoice.processor';
import { ArcaModule } from '../arca/arca.module';
import { FiscalNumberingService } from '../sales/services/fiscal-numbering.service';

@Module({
  // FiscalNumberingService and FiscalInvoiceProcessor read/write entities
  // via the raw DataSource (manager.getRepository), not @InjectRepository,
  // so they need no TypeOrmModule.forFeature registration here — only a
  // DataSource with full entity metadata (see DatabaseModule's `entities`
  // glob, imported by WorkerModule) and ArcaModule for ARCA_SERVICE /
  // InvoiceTypeResolverService.
  imports: [ArcaModule],
  providers: [
    redisConnectionProvider,
    OpsProbeProcessor,
    FiscalNumberingService,
    FiscalInvoiceProcessor,
  ],
  exports: [redisConnectionProvider, OpsProbeProcessor, FiscalInvoiceProcessor],
})
export class QueueConsumerModule {}
