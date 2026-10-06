import { Module } from '@nestjs/common';
import { redisConnectionProvider } from './services/redis-client.factory';
import { OpsProbeProcessor } from './processors/ops-probe.processor';
import { FiscalInvoiceProcessor } from './processors/fiscal-invoice.processor';
import { PdfGenerateProcessor } from './processors/pdf-generate.processor';
import { PdfGenerateQueueService } from './services/pdf-generate.queue';
import { FiscalInvoiceQueueService } from './services/fiscal-invoice.queue';
import { FiscalContingencyOrchestrator } from './services/fiscal-contingency-orchestrator.service';
import { FiscalReconciliationSweepService } from './services/fiscal-reconciliation-sweep.service';
import { MailSendProcessor } from './processors/mail-send.processor';
import { MailModule } from '../mail/mail.module';
import { ArcaModule } from '../arca/arca.module';
import { SystemConfigModule } from '../config/system-config.module';
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
  imports: [ArcaModule, SystemConfigModule, MailModule],
  providers: [
    redisConnectionProvider,
    OpsProbeProcessor,
    FiscalNumberingService,
    // Registered here (not only in QueueProducerModule) so
    // FiscalInvoiceProcessor can enqueue pdf-generate post-CAE from the
    // worker process itself, sharing this module's REDIS_CONNECTION.
    PdfGenerateQueueService,
    // Same reasoning: FiscalReconciliationSweepService re-encolas huérfanos
    // desde el propio proceso worker, compartiendo este REDIS_CONNECTION.
    FiscalInvoiceQueueService,
    FiscalQrPayloadService,
    FiscalPdfTemplateService,
    FiscalContingencyOrchestrator,
    FiscalInvoiceProcessor,
    FiscalReconciliationSweepService,
    PdfGenerateProcessor,
    MailSendProcessor,
  ],
  exports: [
    redisConnectionProvider,
    OpsProbeProcessor,
    FiscalInvoiceProcessor,
    FiscalReconciliationSweepService,
    PdfGenerateProcessor,
  ],
})
export class QueueConsumerModule {}
