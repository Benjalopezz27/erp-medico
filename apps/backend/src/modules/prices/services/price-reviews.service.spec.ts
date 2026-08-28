import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  PriceReviewApprovalMode,
  PriceReviewDecisionAction,
  PriceReviewErrorCode,
  PriceReviewStatus,
} from '@erp/shared-types';
import { Product } from '../../products/entities/product.entity';
import { PriceReview } from '../../purchases/entities/price-review.entity';
import { PriceReviewsService } from './price-reviews.service';

describe('PriceReviewsService', () => {
  const product = {
    id: '10000000-0000-4000-8000-000000000001',
    internalCode: 'P-001',
    name: 'Producto',
    categoryId: '20000000-0000-4000-8000-000000000001',
    category: { id: 'category', name: 'Insumos' },
    costNet: '100.0000',
    suggestedPriceNet: '125.00',
    activePriceNet: '120.00',
  } as Product;

  const makeReview = (): PriceReview =>
    ({
      id: '30000000-0000-4000-8000-000000000001',
      supplierInvoiceId: '40000000-0000-4000-8000-000000000001',
      productId: product.id,
      productCodeSnapshot: 'P-001',
      productNameSnapshot: 'Producto',
      previousCostNet: '90.0000',
      newCostNet: '100.0000',
      markupPercentageSnapshot: '25.0000',
      effectiveMarkupLevel: null,
      effectiveMarkupConfigurationId: null,
      effectiveMarkupTargetId: null,
      effectiveMarkupTargetName: null,
      previousSuggestedPriceNet: '112.50',
      suggestedPriceNet: '125.00',
      activePriceNetSnapshot: '120.00',
      approvedPriceNet: null,
      status: PriceReviewStatus.PENDIENTE,
      decisionAction: null,
      decisionReason: null,
      reviewedByUserId: null,
      reviewedAt: null,
      createdAt: new Date('2026-08-28T12:00:00Z'),
      updatedAt: new Date('2026-08-28T12:00:00Z'),
      product,
      supplierInvoice: {
        id: '40000000-0000-4000-8000-000000000001',
        invoiceNumber: 'A 0001-00000001',
        invoiceDate: '2026-08-28',
        supplierId: '50000000-0000-4000-8000-000000000001',
        supplier: {
          id: '50000000-0000-4000-8000-000000000001',
          businessName: 'Proveedor',
        },
      },
      reviewedByUser: null,
    }) as unknown as PriceReview;

  const chain = (getOne: jest.Mock) => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getOne,
  });

  let review: PriceReview;
  let latest: PriceReview;
  let manager: any;
  let dataSource: any;
  let auditService: any;
  let service: PriceReviewsService;

  beforeEach(() => {
    product.costNet = '100.0000';
    product.suggestedPriceNet = '125.00';
    product.activePriceNet = '120.00';
    review = makeReview();
    latest = review;
    const productQb = chain(jest.fn(async () => product));
    const reviewQb = chain(jest.fn(async () => review));
    const latestQb = chain(jest.fn(async () => latest));
    manager = {
      findOne: jest.fn(async () => ({
        id: review.id,
        productId: review.productId,
      })),
      createQueryBuilder: jest.fn((entity, alias) => {
        if (entity === Product) return productQb;
        if (alias === 'latest') return latestQb;
        return reviewQb;
      }),
      save: jest.fn(async (_entity, value) => value),
      countBy: jest.fn(),
    };
    dataSource = {
      manager,
      transaction: jest.fn(async (callback) => callback(manager)),
    };
    auditService = { record: jest.fn(async () => ({})) };
    service = new PriceReviewsService(dataSource, auditService);
  });

  it('approves the persisted suggested price exactly once', async () => {
    const result = await service.approve(
      review.id,
      { mode: PriceReviewApprovalMode.SUGGESTED },
      'admin-id',
    );

    expect(result.status).toBe(PriceReviewStatus.APROBADO);
    expect(result.approvedPriceNet).toBe('125.00');
    expect(product.activePriceNet).toBe('125.00');
    expect(review.decisionAction).toBe(
      PriceReviewDecisionAction.APPROVE_SUGGESTED,
    );
    expect(auditService.record).toHaveBeenCalledTimes(1);
    expect(auditService.record).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        entityName: 'PriceReview',
        previousValues: expect.objectContaining({
          productActivePriceNet: '120.00',
        }),
        newValues: expect.objectContaining({
          productActivePriceNet: '125.00',
        }),
      }),
    );

    jest.clearAllMocks();
    await service.approve(
      review.id,
      { mode: PriceReviewApprovalMode.SUGGESTED },
      'admin-id',
    );
    expect(manager.save).not.toHaveBeenCalled();
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('rejects stale approvals with authoritative state', async () => {
    latest = {
      ...makeReview(),
      id: '30000000-0000-4000-8000-000000000002',
      createdAt: new Date('2026-08-28T13:00:00Z'),
    };
    product.costNet = '110.0000';

    const promise = service.approve(
      review.id,
      { mode: PriceReviewApprovalMode.SUGGESTED },
      'admin-id',
    );
    await expect(promise).rejects.toBeInstanceOf(ConflictException);
    try {
      await promise;
    } catch (error) {
      const response = (error as ConflictException).getResponse() as any;
      expect(response.code).toBe(PriceReviewErrorCode.PRICE_REVIEW_STALE);
      expect(response.details.currentReview.staleReasons).toEqual(
        expect.arrayContaining(['SUPERSEDED', 'COST_CHANGED']),
      );
      expect(response.details.supersededByReviewId).toBe(latest.id);
    }
    expect(manager.save).not.toHaveBeenCalled();
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('allows stale proposals to be rejected without changing active price', async () => {
    latest = { ...makeReview(), id: '30000000-0000-4000-8000-000000000002' };
    product.costNet = '110.0000';
    const result = await service.reject(
      review.id,
      'Mantener el precio actual',
      'admin-id',
    );
    expect(result.status).toBe(PriceReviewStatus.RECHAZADO);
    expect(product.activePriceNet).toBe('120.00');
    expect(manager.save).not.toHaveBeenCalledWith(Product, expect.anything());
    expect(auditService.record).toHaveBeenCalledTimes(1);
  });

  it('postpones and reopens with one audit per effective transition', async () => {
    await service.postpone(review.id, 'Revisar mañana', 'admin-id');
    expect(review.status).toBe(PriceReviewStatus.POSPUESTO);
    await service.reopen(review.id, 'Nueva evaluación', 'admin-id');
    expect(review.status).toBe(PriceReviewStatus.PENDIENTE);
    expect(review.decisionAction).toBe(PriceReviewDecisionAction.REOPEN);
    expect(product.activePriceNet).toBe('120.00');
    expect(auditService.record).toHaveBeenCalledTimes(2);
  });

  it.each(['0', '-1', '1.001', '1e3', '10000000000.00', '01.00'])(
    'rejects invalid custom price %s before opening a transaction',
    (customPriceNet) => {
      expect(() =>
        service.approve(
          review.id,
          { mode: PriceReviewApprovalMode.CUSTOM, customPriceNet },
          'admin-id',
        ),
      ).toThrow(BadRequestException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    },
  );

  it('propagates audit failures so the database transaction can roll back', async () => {
    auditService.record.mockRejectedValueOnce(new Error('audit unavailable'));
    await expect(
      service.reject(review.id, 'Motivo válido', 'admin-id'),
    ).rejects.toThrow('audit unavailable');
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects inverted date filters and counts pending rows cheaply', async () => {
    await expect(
      service.findAll({
        page: 1,
        limit: 20,
        dateFrom: '2026-08-29',
        dateTo: '2026-08-28',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    manager.countBy.mockResolvedValueOnce(7);
    await expect(service.getPendingCount()).resolves.toEqual({ count: 7 });
    expect(manager.countBy).toHaveBeenCalledWith(PriceReview, {
      status: PriceReviewStatus.PENDIENTE,
    });
  });
});
