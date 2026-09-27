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
import { QueryPendingFiscalDto } from '../dto/query-pending-fiscal.dto';
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
      .createQueryBuilder('doc');

    if (query.arcaStatus) {
      qb.andWhere('doc.arcaStatus = :arcaStatus', {
        arcaStatus: query.arcaStatus,
      });
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
    if (query.from) qb.andWhere('doc.createdAt >= :from', { from: query.from });
    if (query.to) qb.andWhere('doc.createdAt <= :to', { to: query.to });

    qb.orderBy('doc.createdAt', 'ASC').addOrderBy('doc.id', 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [documents, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: documents.map((doc) => this.toResponse(doc)),
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
    const [pendingCount, rejectedCount] = await Promise.all([
      repo.count({ where: { arcaStatus: ArcaStatus.PENDIENTE_FACTURACION } }),
      repo.count({ where: { arcaStatus: ArcaStatus.RECHAZADO } }),
    ]);
    return { pendingCount, rejectedCount };
  }

  async metrics(): Promise<FiscalQueueMetricsResponseDto> {
    const [{ pendingCount, rejectedCount }, queueCounts, oldestPending] =
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
      pendingCount,
      rejectedCount,
      oldestPendingAgeSeconds: oldestPending
        ? Math.floor((Date.now() - oldestPending.createdAt.getTime()) / 1000)
        : null,
    };
  }

  async retry(
    fiscalDocumentId: string,
    actorId: string,
  ): Promise<RetryFiscalDocumentResponseDto> {
    const result = await this.dataSource.transaction(async (manager) => {
      const document = await manager.getRepository(FiscalDocument).findOne({
        where: { id: fiscalDocumentId },
      });
      if (!document) {
        throw new NotFoundException(
          `FiscalDocument ${fiscalDocumentId} no existe.`,
        );
      }
      if (document.arcaStatus === ArcaStatus.EMITIDO) {
        throw new ConflictException(
          `FiscalDocument ${fiscalDocumentId} ya está EMITIDO; no se reintenta.`,
        );
      }
      if (!RETRYABLE_STATUSES.includes(document.arcaStatus)) {
        throw new UnprocessableEntityException(
          `FiscalDocument ${fiscalDocumentId} no es reintentable en su estado actual.`,
        );
      }

      if (document.arcaStatus === ArcaStatus.RECHAZADO) {
        await manager
          .getRepository(FiscalDocument)
          .update(
            { id: fiscalDocumentId, arcaStatus: ArcaStatus.RECHAZADO },
            { arcaStatus: ArcaStatus.PENDIENTE_FACTURACION },
          );
      }

      return document;
    });

    const { jobId, created } =
      await this.fiscalInvoiceQueueService.requeue(fiscalDocumentId);

    if (created) {
      await this.dataSource.transaction((manager: EntityManager) =>
        this.auditService.record(manager, {
          actorId,
          action: AuditAction.UPDATE,
          entityName: 'FiscalDocument',
          entityId: fiscalDocumentId,
          previousValues: { arcaStatus: result.arcaStatus },
          newValues: { arcaStatus: ArcaStatus.PENDIENTE_FACTURACION, jobId },
        }),
      );
    }

    return { jobId, created };
  }

  private toResponse(doc: FiscalDocument) {
    return {
      id: doc.id,
      saleId: doc.saleId,
      saleReturnId: doc.saleReturnId,
      documentType: doc.documentType,
      pointOfSale: doc.pointOfSale,
      documentNumber: doc.documentNumber,
      arcaStatus: doc.arcaStatus,
      attemptCount: doc.attemptCount,
      lastAttemptAt: doc.lastAttemptAt,
      nextAttemptAt: doc.nextAttemptAt,
      failureStage: doc.failureStage,
      arcaErrorCode: doc.arcaErrorCode,
      arcaErrorMessage: doc.arcaErrorMessage,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
