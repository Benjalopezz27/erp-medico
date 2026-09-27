import { Module } from '@nestjs/common';
import { redisConnectionProvider } from './services/redis-client.factory';
import { OpsProbeProcessor } from './processors/ops-probe.processor';
import { FiscalInvoiceProcessor } from './processors/fiscal-invoice.processor';
import { PdfGenerateProcessor } from './processors/pdf-generate.processor';
import { PdfGenerateQueueService } from './services/pdf-generate.queue';
import { ArcaModule } from '../arca/arca.module';
import { FiscalNumberingService } from '../sales/services/fiscal-numbering.service';
import { FiscalQrPayloadService } from '../sales/services/fiscal-qr-payload.service';
import { FiscalPdfTemplateService } from '../sales/services/fiscal-pdf-template.service';

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
    // Registered here (not only in QueueProducerModule) so
    // FiscalInvoiceProcessor can enqueue pdf-generate post-CAE from the
    // worker process itself, sharing this module's REDIS_CONNECTION.
    PdfGenerateQueueService,
    FiscalQrPayloadService,
    FiscalPdfTemplateService,
    FiscalInvoiceProcessor,
    PdfGenerateProcessor,
  ],
  exports: [
    redisConnectionProvider,
    OpsProbeProcessor,
    FiscalInvoiceProcessor,
    PdfGenerateProcessor,
  ],
})
export class QueueConsumerModule {}
