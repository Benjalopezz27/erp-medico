import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { DataSource, EntityManager, IsNull } from 'typeorm';
import {
  ArcaStatus,
  FiscalDocumentData,
  FiscalErrorCode,
  FiscalFailureStage,
} from '@erp/shared-types';
import { ARCA_SERVICE } from '../../arca/arca.constants';
import { IArcaService } from '../../arca/interfaces/arca-service.interface';
import { InvoiceTypeResolverService } from '../../arca/services/invoice-type-resolver.service';
import {
  CBTE_TIPO_BY_DOCUMENT_TYPE,
  WsfeRejectedError,
} from '../../arca/services/wsfe-soap-client.service';
import {
  buildFiscalAmounts,
  validateFiscalAmounts,
} from '../../arca/utils/fiscal-amounts.util';
import { redactSecrets } from '../../../common/utils/sanitizer.utils';
import { FiscalNumberingService } from '../../sales/services/fiscal-numbering.service';
import {
  resolveReceiverDocument,
  resolveReceiverIvaConditionId,
} from '../../sales/utils/fiscal-receiver.util';
import { FiscalDocument } from '../../sales/entities/fiscal-document.entity';
import { Sale } from '../../sales/entities/sale.entity';
import { SaleItem } from '../../sales/entities/sale-item.entity';
import { SaleReturnItem } from '../../sales/returns/entities/sale-return-item.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { FiscalInvoiceJobData } from './fiscal-invoice.queue';

export interface FiscalInvoiceJobResult {
  status: 'emitted' | 'rejected' | 'skipped' | 'retrying';
  fiscalDocumentId: string;
  /** Only set for `retrying` — the sanitized message the processor rethrows post-commit. */
  error?: string;
}

/**
 * Retry delays (seconds → ms) for the wsfe-emit queue, indexed by
 * `job.attemptsMade` at the time of THIS failure (0 for the 1st failure, 4
 * for the 5th). Matches BullMQ's own exponential backoff (`delay *
 * 2^(attemptsMade - 1)` computed with attemptsMade AFTER increment) — see
 * openspec/changes/arca-contingency-engine/design.md decision D1.
 * `next_attempt_at` is informational/diagnostic only; BullMQ, not this
 * value, controls actual scheduling.
 */
const RETRY_DELAYS_MS = [30_000, 60_000, 120_000, 240_000, 480_000];

/** Tags a `queryDocument` failure (result unknown/uncertain) distinctly from a `requestCAE` failure. */
class QueryUncertainError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = 'QueryUncertainError';
  }
}

/**
 * Domain logic for the `wsfe-emit` contingency engine: idempotent
 * transitions, Escenario A (fallo pre-CAE) and Escenario B (reconciliación
 * post-CAE vía FECompConsultar), clasificación de errores, y agotamiento de
 * reintentos. `FiscalInvoiceProcessor` is a thin BullMQ adapter that opens
 * the transaction/lock and delegates here.
 */
@Injectable()
export class FiscalContingencyOrchestrator {
  private readonly logger = new Logger(FiscalContingencyOrchestrator.name);

  constructor(
    private readonly dataSource: DataSource,
    @Inject(ARCA_SERVICE) private readonly arcaService: IArcaService,
    private readonly invoiceTypeResolver: InvoiceTypeResolverService,
    private readonly numberingService: FiscalNumberingService,
    private readonly configService: ConfigService,
  ) {}

  async process(
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
        `[FiscalContingencyOrchestrator] FiscalDocument ${fiscalDocumentId} no existe.`,
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

    let caeObtained = false;

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

      let documentNumber = document.documentNumber;

      if (documentNumber) {
        // Escenario B: identidad fiscal ya reservada por un intento previo —
        // consultar antes de solicitar un CAE nuevo.
        const cbteTipo = CBTE_TIPO_BY_DOCUMENT_TYPE[documentType];
        let queried: Awaited<ReturnType<IArcaService['queryDocument']>>;
        try {
          queried = await this.arcaService.queryDocument(
            cbteTipo,
            pointOfSale,
            documentNumber,
          );
        } catch (queryErr) {
          throw new QueryUncertainError(queryErr);
        }

        if (queried) {
          return this.persistEmitido(manager, fiscalDocumentId, job, {
            documentType,
            pointOfSale,
            documentNumber,
            cae: queried.cae as string,
            caeExpirationDate: queried.caeExpiration
              ? this.formatCaeExpiration(queried.caeExpiration)
              : null,
          });
        }
        // queried === null: ARCA confirma que el comprobante no existe
        // todavía — continuar con la emisión normal usando el mismo número.
      } else {
        documentNumber = await this.numberingService.reserveNextNumber(
          fiscalDocumentId,
          documentType,
          pointOfSale,
          () =>
            this.arcaService.getLastAuthorizedNumber(documentType, pointOfSale),
          manager,
        );
      }

      const { docType, docNumber } = resolveReceiverDocument(customer);

      // Notas de Crédito must reference the original emitted invoice (CbteAsoc).
      let associatedDocument: FiscalDocumentData['associatedDocument'];
      if (document.saleReturnId) {
        const original = await manager.getRepository(FiscalDocument).findOne({
          where: {
            saleId: document.saleId,
            saleReturnId: IsNull(),
            arcaStatus: ArcaStatus.EMITIDO,
          },
        });
        if (
          !original?.documentType ||
          original.pointOfSale == null ||
          original.documentNumber == null
        ) {
          throw new WsfeRejectedError(
            'La nota de crédito no tiene factura original emitida para asociar.',
            'Sin comprobante asociado (CbteAsoc).',
          );
        }
        associatedDocument = {
          documentType: original.documentType,
          pointOfSale: original.pointOfSale,
          documentNumber: original.documentNumber,
        };
      }

      const caeResponse = await this.arcaService.requestCAE({
        associatedDocument,
        ...fiscalAmounts,
        documentType,
        pointOfSale,
        documentNumber,
        concept: 1,
        docType,
        docNumber,
        receiverIvaConditionId: resolveReceiverIvaConditionId(customer),
      });
      caeObtained = true;

      return await this.persistEmitido(manager, fiscalDocumentId, job, {
        documentType,
        pointOfSale,
        documentNumber,
        cae: caeResponse.cae,
        caeExpirationDate: this.formatCaeExpiration(caeResponse.caeExpiration),
      });
    } catch (err: unknown) {
      if (err instanceof WsfeRejectedError) {
        return this.persistRechazado(manager, document, fiscalDocumentId, {
          arcaErrorCode: FiscalErrorCode.WSFE_REJECTED,
          message: `WSFE_REJECTED: ${err.observations || err.message}`,
          failureStage: FiscalFailureStage.PRE_CAE,
        });
      }

      const message = err instanceof Error ? err.message : String(err);
      if (this.isTotalsMismatch(message)) {
        return this.persistRechazado(manager, document, fiscalDocumentId, {
          arcaErrorCode: FiscalErrorCode.TOTALS_MISMATCH,
          message: `TOTALS_MISMATCH: ${redactSecrets(message)}`,
          failureStage: FiscalFailureStage.PRE_CAE,
        });
      }

      // Transitorio (red, timeout, fault SOAP, consulta incierta, o falla de
      // persistencia post-CAE no cubierta por el backstop de unicidad).
      const arcaErrorCode =
        err instanceof QueryUncertainError
          ? FiscalErrorCode.QUERY_UNCERTAIN
          : FiscalErrorCode.TRANSIENT;
      const failureStage = caeObtained
        ? FiscalFailureStage.POST_CAE
        : FiscalFailureStage.PRE_CAE;
      const sanitized = redactSecrets(message);

      const attemptsMade = job.attemptsMade ?? 0;
      const maxAttempts = job.opts?.attempts;
      const isLastAttempt =
        typeof maxAttempts === 'number' && attemptsMade + 1 >= maxAttempts;

      if (isLastAttempt) {
        this.logger.warn(
          `[Worker] wsfe-emit job ${job.id}: reintentos agotados para documento ${fiscalDocumentId}. ${sanitized}`,
        );
        return this.persistRechazado(manager, document, fiscalDocumentId, {
          arcaErrorCode: FiscalErrorCode.RETRIES_EXHAUSTED,
          message: `RETRIES_EXHAUSTED: ${sanitized}`,
          failureStage,
        });
      }

      const nextDelayMs =
        RETRY_DELAYS_MS[Math.min(attemptsMade, RETRY_DELAYS_MS.length - 1)];
      await manager.getRepository(FiscalDocument).update(
        { id: fiscalDocumentId },
        {
          attemptCount: (document.attemptCount ?? 0) + 1,
          lastAttemptAt: new Date(),
          nextAttemptAt: new Date(Date.now() + nextDelayMs),
          failureStage,
          arcaErrorCode,
          arcaErrorMessage: sanitized,
        },
      );

      this.logger.warn(
        `[Worker] wsfe-emit job ${job.id} failed, retry scheduled: ${sanitized}`,
      );
      // Returns instead of throwing: throwing here would run inside the
      // still-open DB transaction (dataSource.transaction in the processor)
      // and roll back the attempt-metadata UPDATE just above. The processor
      // throws AFTER this commits, from the result's `error`, so BullMQ
      // still schedules the retry.
      return { status: 'retrying', fiscalDocumentId, error: sanitized };
    }
  }

  private async persistEmitido(
    manager: EntityManager,
    fiscalDocumentId: string,
    job: Job<FiscalInvoiceJobData, FiscalInvoiceJobResult>,
    data: {
      documentType: FiscalDocument['documentType'];
      pointOfSale: number;
      documentNumber: number;
      cae: string;
      caeExpirationDate: string | null;
    },
  ): Promise<FiscalInvoiceJobResult> {
    let updateResult: { affected?: number };
    try {
      updateResult = await manager.getRepository(FiscalDocument).update(
        {
          id: fiscalDocumentId,
          arcaStatus: ArcaStatus.PENDIENTE_FACTURACION,
        },
        {
          documentType: data.documentType,
          pointOfSale: data.pointOfSale,
          documentNumber: data.documentNumber,
          cae: data.cae,
          caeExpirationDate: data.caeExpirationDate,
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
  }

  private async persistRechazado(
    manager: EntityManager,
    document: FiscalDocument,
    fiscalDocumentId: string,
    data: {
      arcaErrorCode: FiscalErrorCode;
      message: string;
      failureStage: FiscalFailureStage;
    },
  ): Promise<FiscalInvoiceJobResult> {
    await manager.getRepository(FiscalDocument).update(
      {
        id: fiscalDocumentId,
        arcaStatus: ArcaStatus.PENDIENTE_FACTURACION,
      },
      {
        arcaStatus: ArcaStatus.RECHAZADO,
        arcaErrorMessage: data.message,
        arcaErrorCode: data.arcaErrorCode,
        failureStage: data.failureStage,
        attemptCount: (document.attemptCount ?? 0) + 1,
        lastAttemptAt: new Date(),
        nextAttemptAt: null,
      },
    );
    return { status: 'rejected', fiscalDocumentId };
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
}
