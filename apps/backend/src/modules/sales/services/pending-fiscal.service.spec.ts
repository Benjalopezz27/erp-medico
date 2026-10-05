import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ArcaStatus, AuditAction } from '@erp/shared-types';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryPendingFiscalDto } from '../dto/query-pending-fiscal.dto';
import { PendingFiscalService } from './pending-fiscal.service';

describe('PendingFiscalService', () => {
  let service: PendingFiscalService;
  let repo: {
    createQueryBuilder: jest.Mock;
    count: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
  };
  let qb: any;
  let dataSource: any;
  let fiscalInvoiceQueueService: any;
  let auditService: any;

  const document = {
    id: 'doc-1',
    saleId: 'sale-1',
    saleReturnId: null,
    sale: {
      saleNumber: 'V-0001',
      totalGross: '1000.00',
      customer: { businessName: 'Cliente Test' },
    },
    saleReturn: null,
    documentType: null,
    pointOfSale: null,
    documentNumber: null,
    arcaStatus: ArcaStatus.PENDIENTE_FACTURACION,
    attemptCount: 2,
    lastAttemptAt: null,
    nextAttemptAt: null,
    failureStage: null,
    arcaErrorCode: null,
    arcaErrorMessage: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[document], 1]),
    };

    repo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn().mockResolvedValue({ ...document }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    dataSource = {
      getRepository: jest.fn().mockReturnValue(repo),
      transaction: jest.fn((work: (manager: unknown) => unknown) =>
        work({ getRepository: jest.fn().mockReturnValue(repo) }),
      ),
    };

    fiscalInvoiceQueueService = {
      requeue: jest
        .fn()
        .mockResolvedValue({ jobId: 'wsfe-emit-doc-1', created: true }),
      getJob: jest.fn().mockResolvedValue(null),
      getQueueInstance: jest.fn().mockReturnValue({
        getJobCounts: jest.fn().mockResolvedValue({
          waiting: 1,
          active: 0,
          delayed: 2,
          failed: 0,
        }),
      }),
    };

    auditService = { record: jest.fn().mockResolvedValue(undefined) };

    service = new PendingFiscalService(
      dataSource,
      fiscalInvoiceQueueService,
      auditService,
    );
  });

  it('findAll filtra por estado pendiente/rechazado por defecto y pagina', async () => {
    const result = await service.findAll({ page: 1, limit: 20 } as any);

    expect(qb.andWhere).toHaveBeenCalledWith(
      'doc.arcaStatus IN (:...statuses)',
      { statuses: [ArcaStatus.PENDIENTE_FACTURACION, ArcaStatus.RECHAZADO] },
    );
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.data[0]).toMatchObject({
      saleNumber: 'V-0001',
      customerName: 'Cliente Test',
      amount: '1000.00',
      nextRetryAt: null,
      hasActiveRetryJob: false,
      isRetryable: true,
    });
  });

  it('findAll ordena por columna permitida con desempate por id', async () => {
    await service.findAll({ sortBy: 'attempts', sortOrder: 'desc' } as any);
    expect(qb.orderBy).toHaveBeenCalledWith('doc.attemptCount', 'DESC');
    expect(qb.addOrderBy).toHaveBeenCalledWith('doc.id', 'DESC');
  });

  it('findAll ordena por monto con expresión seleccionada', async () => {
    await service.findAll({ sortBy: 'amount' } as any);
    expect(qb.addSelect).toHaveBeenCalledWith(
      expect.stringContaining('saleReturn.totalGross'),
      'sort_amount',
    );
    expect(qb.orderBy).toHaveBeenCalledWith('sort_amount', 'ASC');
  });

  it('findAll mantiene el orden por defecto sin sortBy', async () => {
    await service.findAll({} as any);
    expect(qb.orderBy).toHaveBeenCalledWith('doc.createdAt', 'ASC');
    expect(qb.addOrderBy).toHaveBeenCalledWith('doc.id', 'ASC');
    expect(qb.addSelect).not.toHaveBeenCalled();
  });

  it('rechaza sortBy inválido en el DTO', async () => {
    const dto = plainToInstance(QueryPendingFiscalDto, { sortBy: 'nope' });
    expect((await validate(dto)).map((e) => e.property)).toContain('sortBy');
  });

  it('findAll aplica el filtro explícito de status', async () => {
    await service.findAll({
      page: 1,
      limit: 20,
      status: ArcaStatus.RECHAZADO,
    } as any);

    expect(qb.andWhere).toHaveBeenCalledWith('doc.arcaStatus = :status', {
      status: ArcaStatus.RECHAZADO,
    });
  });

  it('findAll marca hasActiveRetryJob cuando existe un job en curso', async () => {
    fiscalInvoiceQueueService.getJob.mockResolvedValue({
      getState: jest.fn().mockResolvedValue('delayed'),
    });

    const result = await service.findAll({ page: 1, limit: 20 } as any);

    expect(result.data[0].hasActiveRetryJob).toBe(true);
  });

  it('count devuelve pendientes, rechazados y total', async () => {
    repo.count.mockResolvedValueOnce(3).mockResolvedValueOnce(2);
    const result = await service.count();
    expect(result).toEqual({ pending: 3, rejected: 2, total: 5 });
  });

  it('metrics combina conteos de cola y antigüedad del pendiente más viejo', async () => {
    repo.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    repo.findOne.mockResolvedValue({
      createdAt: new Date(Date.now() - 5000),
    });

    const result = await service.metrics();

    expect(result.waiting).toBe(1);
    expect(result.delayed).toBe(2);
    expect(result.pendingCount).toBe(1);
    expect(result.oldestPendingAgeSeconds).toBeGreaterThanOrEqual(5);
  });

  it('retry encola un documento PENDIENTE_FACTURACION y audita', async () => {
    const result = await service.retry('doc-1', 'user-1');

    expect(fiscalInvoiceQueueService.requeue).toHaveBeenCalledWith('doc-1');
    expect(auditService.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actorId: 'user-1',
        action: AuditAction.UPDATE,
        entityName: 'FiscalDocument',
        entityId: 'doc-1',
      }),
    );
    expect(result).toEqual({
      fiscalDocumentId: 'doc-1',
      arcaStatus: ArcaStatus.PENDIENTE_FACTURACION,
      jobId: 'wsfe-emit-doc-1',
      created: true,
    });
  });

  it('retry transiciona RECHAZADO a PENDIENTE_FACTURACION antes de reencolar', async () => {
    repo.findOne.mockResolvedValue({
      ...document,
      arcaStatus: ArcaStatus.RECHAZADO,
    });

    await service.retry('doc-1', 'user-1');

    expect(repo.update).toHaveBeenCalledWith(
      { id: 'doc-1', arcaStatus: ArcaStatus.RECHAZADO },
      { arcaStatus: ArcaStatus.PENDIENTE_FACTURACION },
    );
  });

  it('retry no audita cuando el job ya estaba en curso (created=false)', async () => {
    fiscalInvoiceQueueService.requeue.mockResolvedValue({
      jobId: 'wsfe-emit-doc-1',
      created: false,
    });

    await service.retry('doc-1', 'user-1');

    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('retry rechaza con 404 si el documento no existe', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(service.retry('doc-1', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('retry rechaza con 409 si el documento ya está EMITIDO', async () => {
    repo.findOne.mockResolvedValue({
      ...document,
      arcaStatus: ArcaStatus.EMITIDO,
    });

    await expect(service.retry('doc-1', 'user-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(fiscalInvoiceQueueService.requeue).not.toHaveBeenCalled();
  });

  it('retry rechaza con 422 para un estado no reintentable', async () => {
    repo.findOne.mockResolvedValue({
      ...document,
      arcaStatus: 'ALGO_DESCONOCIDO' as ArcaStatus,
    });

    await expect(service.retry('doc-1', 'user-1')).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });
});
