import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import { DataSource, EntityManager } from 'typeorm';
import {
  ArcaStatus,
  FiscalAmounts,
  FiscalDocumentType,
  PdfArtifactStatus,
  TaxCondition,
} from '@erp/shared-types';
import { REDIS_CONNECTION, PDF_GENERATE_QUEUE_NAME } from '../queue.constants';
import { PdfGenerateJobData } from '../services/pdf-generate.queue';
import { FiscalDocument } from '../../sales/entities/fiscal-document.entity';
import { Sale } from '../../sales/entities/sale.entity';
import { SaleItem } from '../../sales/entities/sale-item.entity';
import { SaleReturnItem } from '../../sales/returns/entities/sale-return-item.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { resolveReceiverDocument } from '../../sales/utils/fiscal-receiver.util';
import { buildFiscalAmounts } from '../../arca/utils/fiscal-amounts.util';
import {
  FiscalQrPayloadService,
  FiscalQrReceiver,
} from '../../sales/services/fiscal-qr-payload.service';
import {
  FiscalPdfLineItem,
  FiscalPdfParty,
  FiscalPdfTemplateService,
  PDF_TEMPLATE_VERSION,
} from '../../sales/services/fiscal-pdf-template.service';
import { redactSecrets } from '../../../common/utils/sanitizer.utils';

export interface PdfGenerateJobResult {
  status: 'generated' | 'skipped';
  fiscalDocumentId: string;
}

const DOCUMENT_TYPE_LABELS: Record<FiscalDocumentType, string> = {
  [FiscalDocumentType.FACTURA_A]: 'Factura A',
  [FiscalDocumentType.FACTURA_B]: 'Factura B',
  [FiscalDocumentType.NOTA_CREDITO_A]: 'Nota de Crédito A',
  [FiscalDocumentType.NOTA_CREDITO_B]: 'Nota de Crédito B',
  [FiscalDocumentType.NOTA_DEBITO_A]: 'Nota de Débito A',
  [FiscalDocumentType.NOTA_DEBITO_B]: 'Nota de Débito B',
  [FiscalDocumentType.REMITO]: 'Remito',
};

const TAX_CONDITION_LABELS: Record<TaxCondition, string> = {
  [TaxCondition.RESPONSABLE_INSCRIPTO]: 'Responsable Inscripto',
  [TaxCondition.MONOTRIBUTO]: 'Monotributo',
  [TaxCondition.EXENTO]: 'Exento',
  [TaxCondition.CONSUMIDOR_FINAL]: 'Consumidor Final',
};

/**
 * Consumer for the `pdf-generate` queue: builds the AFIP QR payload and the
 * PDF template for an already-EMITIDO FiscalDocument, and persists both
 * atomically. Idempotent — a no-op if the document isn't EMITIDO yet, or if
 * it already has an artifact at the current template version (source data on
 * an EMITIDO document never changes, so a version match is sufficient to
 * skip regeneration).
 */
@Injectable()
export class PdfGenerateProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PdfGenerateProcessor.name);
  private worker: Worker<PdfGenerateJobData, PdfGenerateJobResult> | null =
    null;

  constructor(
    @Inject(REDIS_CONNECTION) private readonly redisClient: Redis,
    private readonly dataSource: DataSource,
    private readonly qrPayloadService: FiscalQrPayloadService,
    private readonly pdfTemplateService: FiscalPdfTemplateService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker<PdfGenerateJobData, PdfGenerateJobResult>(
      PDF_GENERATE_QUEUE_NAME,
      (job) => this.process(job),
      {
        connection: this.redisClient as any,
        concurrency: 5,
      },
    );

    this.worker.on('completed', (job: Job) => {
      this.logger.log(`[Worker] pdf-generate job ${job.id} completed.`);
    });

    this.worker.on('failed', (job: Job | undefined, err: Error) => {
      this.logger.warn(
        `[Worker] pdf-generate job ${job?.id} failed: ${redactSecrets(err.message)}`,
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
  }

  async process(
    job: Job<PdfGenerateJobData, PdfGenerateJobResult>,
  ): Promise<PdfGenerateJobResult> {
    const { fiscalDocumentId } = job.data;

    // Same shape as FiscalInvoiceProcessor: hold a row lock for the whole
    // job so a concurrent worker converges to the same final artifact
    // instead of racing a second render.
    return this.dataSource.transaction((manager) =>
      this.processWithLock(manager, job, fiscalDocumentId),
    );
  }

  private async processWithLock(
    manager: EntityManager,
    job: Job<PdfGenerateJobData, PdfGenerateJobResult>,
    fiscalDocumentId: string,
  ): Promise<PdfGenerateJobResult> {
    const document = await manager.getRepository(FiscalDocument).findOne({
      where: { id: fiscalDocumentId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!document) {
      throw new Error(
        `[PdfGenerateProcessor] FiscalDocument ${fiscalDocumentId} no existe.`,
      );
    }

    if (document.arcaStatus !== ArcaStatus.EMITIDO) {
      this.logger.log(
        `[Worker] pdf-generate job ${job.id} skipped: document ${fiscalDocumentId} is ${document.arcaStatus}, not EMITIDO.`,
      );
      return { status: 'skipped', fiscalDocumentId };
    }

    if (
      document.pdfStatus === PdfArtifactStatus.DISPONIBLE &&
      document.pdfTemplateVersion === PDF_TEMPLATE_VERSION
    ) {
      this.logger.log(
        `[Worker] pdf-generate job ${job.id} skipped: document ${fiscalDocumentId} already has an up-to-date artifact.`,
      );
      return { status: 'skipped', fiscalDocumentId };
    }

    const sale = await manager
      .getRepository(Sale)
      .findOneOrFail({ where: { id: document.saleId } });
    const customer = sale.customerId
      ? await manager
          .getRepository(Customer)
          .findOne({ where: { id: sale.customerId } })
      : null;

    try {
      const { items, fiscalAmounts } = await this.loadLineItems(
        manager,
        document,
      );
      const receiver = resolveReceiverDocument(customer);

      const { url: qrUrl } = this.qrPayloadService.build(
        document,
        fiscalAmounts.totalAmount,
        receiver,
      );
      const qrPngBytes = await QRCode.toBuffer(qrUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
      });

      const pdfBytes = await this.pdfTemplateService.render({
        emisor: this.resolveEmisor(),
        receptor: this.resolveReceptor(customer, receiver),
        documentTypeLabel:
          DOCUMENT_TYPE_LABELS[document.documentType as FiscalDocumentType],
        pointOfSale: document.pointOfSale!,
        documentNumber: document.documentNumber!,
        issuedAt: document.issuedAt!,
        items,
        taxableNetAmount: fiscalAmounts.taxableNetAmount,
        exemptAmount: fiscalAmounts.exemptAmount,
        nonTaxedAmount: fiscalAmounts.nonTaxedAmount,
        ivaAmount: fiscalAmounts.ivaAmount,
        totalAmount: fiscalAmounts.totalAmount,
        cae: document.cae!,
        caeExpirationDate: document.caeExpirationDate!,
        qrPngBytes,
      });

      const pdfBuffer = Buffer.from(pdfBytes);
      const checksum = crypto
        .createHash('sha256')
        .update(pdfBuffer)
        .digest('hex');

      await manager.getRepository(FiscalDocument).update(fiscalDocumentId, {
        pdfData: pdfBuffer,
        pdfChecksum: checksum,
        pdfSizeBytes: pdfBuffer.length,
        pdfTemplateVersion: PDF_TEMPLATE_VERSION,
        pdfGeneratedAt: new Date(),
        pdfStatus: PdfArtifactStatus.DISPONIBLE,
        pdfErrorMessage: null,
        qrCodeData: qrUrl,
      });

      return { status: 'generated', fiscalDocumentId };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const sanitized = redactSecrets(message);
      await manager.getRepository(FiscalDocument).update(fiscalDocumentId, {
        pdfStatus: PdfArtifactStatus.ERROR,
        pdfErrorMessage: sanitized,
      });
      this.logger.error(
        `[Worker] pdf-generate job ${job.id} failed: ${sanitized}`,
      );
      throw new Error(sanitized);
    }
  }

  private async loadLineItems(
    manager: EntityManager,
    document: FiscalDocument,
  ): Promise<{
    items: FiscalPdfLineItem[];
    fiscalAmounts: FiscalAmounts;
  }> {
    const rows = document.saleReturnId
      ? await manager.getRepository(SaleReturnItem).find({
          where: { saleReturnId: document.saleReturnId },
          relations: ['product'],
        })
      : await manager
          .getRepository(SaleItem)
          .find({ where: { saleId: document.saleId }, relations: ['product'] });

    const items: FiscalPdfLineItem[] = rows.map((row) => ({
      productCode: row.product?.internalCode ?? '',
      productName: row.product?.name ?? '',
      quantity: Number(row.quantityBase),
      unitPriceNet: Number(row.unitPriceNet),
      ivaPercentage:
        row.ivaPercentage === null ? null : Number(row.ivaPercentage),
      subtotalGross: Number(row.subtotalGross),
    }));

    // Same util FiscalInvoiceProcessor used to validate the amounts before
    // requesting the CAE — reusing it here guarantees the PDF/QR totals are
    // exactly what ARCA already authorized, never a re-derivation that could
    // drift from it.
    const fiscalAmounts = buildFiscalAmounts(rows);

    return { items, fiscalAmounts };
  }

  private resolveEmisor(): FiscalPdfParty {
    const cuit = this.configService.get<string>('ARCA_CUIT') ?? '';
    const razonSocial =
      this.configService.get<string>('ARCA_EMISOR_RAZON_SOCIAL') ??
      'Emisor no configurado';
    const taxCondition = this.configService.get<string>(
      'ARCA_EMISOR_TAX_CONDITION',
    ) as TaxCondition | undefined;
    return {
      razonSocial,
      documentLabel: `CUIT ${cuit}`,
      taxConditionLabel: taxCondition
        ? TAX_CONDITION_LABELS[taxCondition]
        : 'Responsable Inscripto',
    };
  }

  private resolveReceptor(
    customer: Customer | null,
    receiver: FiscalQrReceiver,
  ): FiscalPdfParty {
    if (!customer) {
      return {
        razonSocial: 'Consumidor Final',
        documentLabel: 'Sin documento',
        taxConditionLabel: TAX_CONDITION_LABELS[TaxCondition.CONSUMIDOR_FINAL],
        address: null,
      };
    }
    return {
      razonSocial: customer.businessName,
      documentLabel: `${receiver.docType === 80 ? 'CUIT' : 'DNI'} ${customer.cuitOrDni}`,
      taxConditionLabel: TAX_CONDITION_LABELS[customer.taxCondition],
      address: customer.address,
    };
  }

  getWorker(): Worker<PdfGenerateJobData, PdfGenerateJobResult> | null {
    return this.worker;
  }
}
