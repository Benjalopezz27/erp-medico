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
import { DataSource, EntityManager } from 'typeorm';
import { ArcaStatus, CustomerDocumentType } from '@erp/shared-types';
import {
  REDIS_CONNECTION,
  FISCAL_INVOICE_QUEUE_NAME,
} from '../queue.constants';
import { FiscalInvoiceJobData } from '../services/fiscal-invoice.queue';
import { ARCA_SERVICE } from '../../arca/arca.constants';
import { IArcaService } from '../../arca/interfaces/arca-service.interface';
import { InvoiceTypeResolverService } from '../../arca/services/invoice-type-resolver.service';
import {
  buildFiscalAmounts,
  validateFiscalAmounts,
} from '../../arca/utils/fiscal-amounts.util';
import { WsfeRejectedError } from '../../arca/services/wsfe-soap-client.service';
import { redactSecrets } from '../../../common/utils/sanitizer.utils';
import { FiscalNumberingService } from '../../sales/services/fiscal-numbering.service';
import { FiscalDocument } from '../../sales/entities/fiscal-document.entity';
import { Sale } from '../../sales/entities/sale.entity';
import { SaleItem } from '../../sales/entities/sale-item.entity';
import { SaleReturnItem } from '../../sales/returns/entities/sale-return-item.entity';
import { Customer } from '../../customers/entities/customer.entity';

export interface FiscalInvoiceJobResult {
  status: 'emitted' | 'rejected' | 'skipped';
  fiscalDocumentId: string;
}

/**
 * Consumer for the `wsfe-emit` queue: resolves invoice type, reserves the
 * next comprobante number and requests a CAE, persisting the result
 * atomically. Idempotent — a `FiscalDocument` no longer PENDIENTE_FACTURACION
 * (already EMITIDO/RECHAZADO by a previous attempt or a concurrent worker)
 * is a no-op.
 */
@Injectable()
export class FiscalInvoiceProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FiscalInvoiceProcessor.name);
  private worker: Worker<FiscalInvoiceJobData, FiscalInvoiceJobResult> | null =
    null;

  constructor(
    @Inject(REDIS_CONNECTION) private readonly redisClient: Redis,
    private readonly dataSource: DataSource,
    @Inject(ARCA_SERVICE) private readonly arcaService: IArcaService,
    private readonly invoiceTypeResolver: InvoiceTypeResolverService,
    private readonly numberingService: FiscalNumberingService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker<FiscalInvoiceJobData, FiscalInvoiceJobResult>(
      FISCAL_INVOICE_QUEUE_NAME,
      (job) => this.process(job),
      {
        connection: this.redisClient as any,
        concurrency: 5,
      },
    );

    this.worker.on('completed', (job: Job) => {
      this.logger.log(`[Worker] wsfe-emit job ${job.id} completed.`);
    });

    this.worker.on('failed', (job: Job | undefined, err: Error) => {
      this.logger.warn(
        `[Worker] wsfe-emit job ${job?.id} failed: ${redactSecrets(err.message)}`,
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
    job: Job<FiscalInvoiceJobData, FiscalInvoiceJobResult>,
  ): Promise<FiscalInvoiceJobResult> {
    const { fiscalDocumentId } = job.data;

    // Runs inside a single transaction holding a row lock on the
    // FiscalDocument for the whole external round-trip: a concurrent worker
    // picking up the same job blocks on the lock instead of also calling
    // ARCA, and sees the already-resolved status once it acquires it.
    return this.dataSource.transaction((manager) =>
      this.processWithLock(manager, job, fiscalDocumentId),
    );
  }

  private async processWithLock(
    manager: EntityManager,
    job: Job<FiscalInvoiceJobData, FiscalInvoiceJobResult>,
    fiscalDocumentId: string,
  ): Promise<FiscalInvoiceJobResult> {
    const document = await manager.getRepository(FiscalDocument).findOne({
      where: { id: fiscalDocumentId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!document) {
      throw new Error(
        `[FiscalInvoiceProcessor] FiscalDocument ${fiscalDocumentId} no existe.`,
      );
    }

    if (document.arcaStatus !== ArcaStatus.PENDIENTE_FACTURACION) {
      this.logger.log(
        `[Worker] wsfe-emit job ${job.id} skipped: document ${fiscalDocumentId} already ${document.arcaStatus}.`,
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
      const fiscalAmounts = await this.loadFiscalAmounts(document);
      validateFiscalAmounts(fiscalAmounts);

      const documentType =
        document.documentType ??
        this.invoiceTypeResolver.resolve(
          customer
            ? {
                taxCondition: customer.taxCondition,
                documentType: customer.documentType,
              }
            : null,
        );

      const pointOfSale =
        document.pointOfSale ?? this.resolveEmisorPointOfSale();

      const documentNumber = await this.numberingService.reserveNextNumber(
        fiscalDocumentId,
        documentType,
        pointOfSale,
        () =>
          this.arcaService.getLastAuthorizedNumber(documentType, pointOfSale),
        manager,
      );

      const { docType, docNumber } = this.resolveReceiverDocument(customer);

      const caeResponse = await this.arcaService.requestCAE({
        ...fiscalAmounts,
        documentType,
        pointOfSale,
        documentNumber,
        concept: 1,
        docType,
        docNumber,
      });

      let updateResult: { affected?: number };
      try {
        updateResult = await manager.getRepository(FiscalDocument).update(
          {
            id: fiscalDocumentId,
            arcaStatus: ArcaStatus.PENDIENTE_FACTURACION,
          },
          {
            documentType,
            pointOfSale,
            documentNumber,
            cae: caeResponse.cae,
            caeExpirationDate: this.formatCaeExpiration(
              caeResponse.caeExpiration,
            ),
            arcaStatus: ArcaStatus.EMITIDO,
            issuedAt: new Date(),
          },
        );
      } catch (persistError: unknown) {
        if (this.isUniqueViolation(persistError)) {
          // The (documentType, pointOfSale, documentNumber) backstop index
          // rejected a duplicate number — reload instead of surfacing a raw
          // 500. The advisory lock should prevent this in practice; this is
          // the last-instance guard the design calls for.
          this.logger.warn(
            `[Worker] wsfe-emit job ${job.id}: numbering collision on document ${fiscalDocumentId}, reloading.`,
          );
          updateResult = { affected: 0 };
        } else {
          throw persistError;
        }
      }

      if (updateResult.affected === 0) {
        // Another worker already persisted a terminal status for this
        // document (idempotent race, or the unique index rejected a
        // concurrent duplicate number) — nothing left to do here.
        this.logger.log(
          `[Worker] wsfe-emit job ${job.id}: document ${fiscalDocumentId} was already resolved by another worker.`,
        );
        return { status: 'skipped', fiscalDocumentId };
      }

      return { status: 'emitted', fiscalDocumentId };
    } catch (err: unknown) {
      if (err instanceof WsfeRejectedError) {
        await manager.getRepository(FiscalDocument).update(
          {
            id: fiscalDocumentId,
            arcaStatus: ArcaStatus.PENDIENTE_FACTURACION,
          },
          {
            arcaStatus: ArcaStatus.RECHAZADO,
            arcaErrorMessage: `WSFE_REJECTED: ${err.observations || err.message}`,
          },
        );
        return { status: 'rejected', fiscalDocumentId };
      }

      const message = err instanceof Error ? err.message : String(err);
      if (this.isTotalsMismatch(message)) {
        await manager.getRepository(FiscalDocument).update(
          {
            id: fiscalDocumentId,
            arcaStatus: ArcaStatus.PENDIENTE_FACTURACION,
          },
          {
            arcaStatus: ArcaStatus.RECHAZADO,
            arcaErrorMessage: `TOTALS_MISMATCH: ${redactSecrets(message)}`,
          },
        );
        return { status: 'rejected', fiscalDocumentId };
      }

      // Unknown/transient failure (network, WSFE unavailable, config
      // incomplete): leave PENDIENTE_FACTURACION and let BullMQ retry.
      this.logger.error(
        `[Worker] wsfe-emit job ${job.id} failed: ${redactSecrets(message)}`,
      );
      throw new Error(redactSecrets(message));
    }
  }

  private async loadFiscalAmounts(document: FiscalDocument) {
    if (document.saleReturnId) {
      const items = await this.dataSource
        .getRepository(SaleReturnItem)
        .find({ where: { saleReturnId: document.saleReturnId } });
      return buildFiscalAmounts(items);
    }
    const items = await this.dataSource
      .getRepository(SaleItem)
      .find({ where: { saleId: document.saleId } });
    return buildFiscalAmounts(items);
  }

  private resolveEmisorPointOfSale(): number {
    const configured = Number(
      this.configService.get<number>('ARCA_PUNTO_VENTA'),
    );
    if (!configured || Number.isNaN(configured) || configured < 1) {
      throw new Error(
        '[ARCA] ARCA_PUNTO_VENTA no está configurado; no se puede resolver el punto de venta del emisor.',
      );
    }
    return configured;
  }

  private resolveReceiverDocument(customer: Customer | null): {
    docType: number;
    docNumber: string;
  } {
    if (!customer) {
      return { docType: 99, docNumber: '0' };
    }
    return {
      docType: customer.documentType === CustomerDocumentType.CUIT ? 80 : 96,
      docNumber: customer.cuitOrDni,
    };
  }

  private formatCaeExpiration(caeExpiration: string): string {
    // ARCA returns YYYYMMDD; the column is a plain DATE.
    return `${caeExpiration.slice(0, 4)}-${caeExpiration.slice(4, 6)}-${caeExpiration.slice(6, 8)}`;
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const code =
      (error as { code?: string }).code ??
      (error as { driverError?: { code?: string } }).driverError?.code;
    return code === '23505';
  }

  private isTotalsMismatch(message: string): boolean {
    return /no coincide|debe informar su alícuota|no tiene mapeo ARCA|no pueden ser negativos/.test(
      message,
    );
  }

  getWorker(): Worker<FiscalInvoiceJobData, FiscalInvoiceJobResult> | null {
    return this.worker;
  }
}
