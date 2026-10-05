import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ArcaStatus, AuditAction } from '@erp/shared-types';
import { AuditService } from '../../audit/audit.service';
import { FiscalInvoiceQueueService } from '../../queue/services/fiscal-invoice.queue';
import { FiscalDocument } from '../entities/fiscal-document.entity';
import {
  PENDING_FISCAL_SORT_FIELDS,
  QueryPendingFiscalDto,
} from '../dto/query-pending-fiscal.dto';
import { resolveSort } from '../../../common/sorting/sorting';
import {
  FiscalQueueMetricsResponseDto,
  PaginatedPendingFiscalResponseDto,
  PendingFiscalCountResponseDto,
  RetryFiscalDocumentResponseDto,
} from '../dto/pending-fiscal-response.dto';

const RETRYABLE_STATUSES = [
  ArcaStatus.PENDIENTE_FACTURACION,
  ArcaStatus.RECHAZADO,
];

// Values starting with `sort_` are aliases of the SQL expressions in SORT_EXPR,
// selected on demand so skip/take pagination keeps working.
const SORT_COLUMNS: Record<
  (typeof PENDING_FISCAL_SORT_FIELDS)[number],
  string
> = {
  saleNumber: 'sale.saleNumber',
  customer: 'sort_customer',
  createdAt: 'doc.createdAt',
  type: 'doc.documentType',
  status: 'doc.arcaStatus',
  amount: 'sort_amount',
  attempts: 'doc.attemptCount',
  lastAttemptAt: 'doc.lastAttemptAt',
  nextAttemptAt: 'doc.nextAttemptAt',
};
const SORT_EXPR: Record<string, string> = {
  sort_customer: "COALESCE(customer.businessName, 'Consumidor Final')",
  sort_amount:
    'CASE WHEN doc.saleReturnId IS NOT NULL THEN COALESCE(saleReturn.totalGross, sale.totalGross) ELSE sale.totalGross END',
};

/**
 * Visibilidad y control administrativo sobre documentos fiscales pendientes
 * o rechazados — listado, conteo y reintento manual — para US27-A.
 * Ver openspec/changes/arca-contingency-engine.
 */
@Injectable()
export class PendingFiscalService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly fiscalInvoiceQueueService: FiscalInvoiceQueueService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(
    query: QueryPendingFiscalDto,
  ): Promise<PaginatedPendingFiscalResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.dataSource
      .getRepository(FiscalDocument)
      .createQueryBuilder('doc')
      .leftJoinAndSelect('doc.sale', 'sale')
      .leftJoinAndSelect('sale.customer', 'customer')
      .leftJoinAndSelect('doc.saleReturn', 'saleReturn');

    if (query.status) {
      qb.andWhere('doc.arcaStatus = :status', { status: query.status });
    } else {
      qb.andWhere('doc.arcaStatus IN (:...statuses)', {
        statuses: RETRYABLE_STATUSES,
      });
    }
    if (query.documentType) {
      qb.andWhere('doc.documentType = :documentType', {
        documentType: query.documentType,
      });
    }
    if (query.dateFrom)
      qb.andWhere('doc.createdAt >= :dateFrom', { dateFrom: query.dateFrom });
    if (query.dateTo)
      qb.andWhere('doc.createdAt <= :dateTo', { dateTo: query.dateTo });
    if (query.search) {
      qb.andWhere(
        '(sale.saleNumber ILIKE :search OR customer.businessName ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const sort = resolveSort(SORT_COLUMNS, query.sortBy, query.sortOrder);
    if (sort) {
      const expr = SORT_EXPR[sort.column];
      if (expr) qb.addSelect(expr, sort.column);
      qb.orderBy(sort.column, sort.direction).addOrderBy(
        'doc.id',
        sort.direction,
      );
    } else {
      qb.orderBy('doc.createdAt', 'ASC').addOrderBy('doc.id', 'ASC');
    }
    qb.skip((page - 1) * limit).take(limit);

    const [documents, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: await Promise.all(documents.map((doc) => this.toResponse(doc))),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async count(): Promise<PendingFiscalCountResponseDto> {
    const repo = this.dataSource.getRepository(FiscalDocument);
    const [pending, rejected] = await Promise.all([
      repo.count({ where: { arcaStatus: ArcaStatus.PENDIENTE_FACTURACION } }),
      repo.count({ where: { arcaStatus: ArcaStatus.RECHAZADO } }),
    ]);
    return { pending, rejected, total: pending + rejected };
  }

  async metrics(): Promise<FiscalQueueMetricsResponseDto> {
    const [{ pending, rejected }, queueCounts, oldestPending] =
      await Promise.all([
        this.count(),
        this.fiscalInvoiceQueueService
          .getQueueInstance()
          .getJobCounts('waiting', 'active', 'delayed', 'failed'),
        this.dataSource.getRepository(FiscalDocument).findOne({
          where: { arcaStatus: ArcaStatus.PENDIENTE_FACTURACION },
          order: { createdAt: 'ASC' },
        }),
      ]);

    return {
      waiting: queueCounts.waiting ?? 0,
      active: queueCounts.active ?? 0,
      delayed: queueCounts.delayed ?? 0,
      failed: queueCounts.failed ?? 0,
      pendingCount: pending,
      rejectedCount: rejected,
      oldestPendingAgeSeconds: oldestPending
        ? Math.floor((Date.now() - oldestPending.createdAt.getTime()) / 1000)
        : null,
    };
  }

  async retry(
    fiscalDocumentId: string,
    actorId: string,
  ): Promise<RetryFiscalDocumentResponseDto> {
    const previousStatus = await this.dataSource.transaction(
      async (manager) => {
        const document = await manager.getRepository(FiscalDocument).findOne({
          where: { id: fiscalDocumentId },
        });
        if (!document) {
          throw new NotFoundException({
            code: 'FISCAL_DOCUMENT_NOT_FOUND',
            message: `FiscalDocument ${fiscalDocumentId} no existe.`,
          });
        }
        if (document.arcaStatus === ArcaStatus.EMITIDO) {
          throw new ConflictException({
            code: 'FISCAL_DOCUMENT_ALREADY_ISSUED',
            message: `FiscalDocument ${fiscalDocumentId} ya está EMITIDO; no se reintenta.`,
          });
        }
        if (!RETRYABLE_STATUSES.includes(document.arcaStatus)) {
          throw new UnprocessableEntityException({
            code: 'FISCAL_DOCUMENT_NOT_RETRYABLE',
            message: `FiscalDocument ${fiscalDocumentId} no es reintentable en su estado actual.`,
          });
        }

        if (document.arcaStatus === ArcaStatus.RECHAZADO) {
          await manager
            .getRepository(FiscalDocument)
            .update(
              { id: fiscalDocumentId, arcaStatus: ArcaStatus.RECHAZADO },
              { arcaStatus: ArcaStatus.PENDIENTE_FACTURACION },
            );
        }
        return document.arcaStatus;
      },
    );

    const { jobId, created } =
      await this.fiscalInvoiceQueueService.requeue(fiscalDocumentId);

    if (created) {
      await this.dataSource.transaction((manager: EntityManager) =>
        this.auditService.record(manager, {
          actorId,
          action: AuditAction.UPDATE,
          entityName: 'FiscalDocument',
          entityId: fiscalDocumentId,
          previousValues: { arcaStatus: previousStatus },
          newValues: { arcaStatus: ArcaStatus.PENDIENTE_FACTURACION, jobId },
        }),
      );
    }

    return {
      fiscalDocumentId,
      arcaStatus: ArcaStatus.PENDIENTE_FACTURACION,
      jobId,
      created,
    };
  }

  private async hasActiveRetryJob(fiscalDocumentId: string): Promise<boolean> {
    const job = await this.fiscalInvoiceQueueService.getJob(fiscalDocumentId);
    if (!job) return false;
    const state = await job.getState();
    return state === 'waiting' || state === 'active' || state === 'delayed';
  }

  private async toResponse(doc: FiscalDocument) {
    const amount = doc.saleReturnId
      ? (doc.saleReturn?.totalGross ?? doc.sale?.totalGross)
      : doc.sale?.totalGross;

    return {
      id: doc.id,
      saleId: doc.saleId,
      saleNumber: doc.sale?.saleNumber ?? '',
      saleReturnId: doc.saleReturnId,
      customerName: doc.sale?.customer?.businessName ?? 'Consumidor Final',
      amount,
      documentType: doc.documentType,
      pointOfSale: doc.pointOfSale,
      documentNumber: doc.documentNumber,
      arcaStatus: doc.arcaStatus,
      attemptCount: doc.attemptCount,
      lastAttemptAt: doc.lastAttemptAt,
      nextRetryAt: doc.nextAttemptAt,
      failureStage: doc.failureStage,
      arcaErrorCode: doc.arcaErrorCode,
      arcaErrorMessage: doc.arcaErrorMessage,
      hasActiveRetryJob: await this.hasActiveRetryJob(doc.id),
      isRetryable: RETRYABLE_STATUSES.includes(doc.arcaStatus),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
