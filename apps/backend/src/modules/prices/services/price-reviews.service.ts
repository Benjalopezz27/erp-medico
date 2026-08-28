import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm';
import Decimal from 'decimal.js';
import {
  AuditAction,
  IPaginatedPriceReviewsResponse,
  IPriceReviewDetail,
  IPriceReviewPendingCount,
  PriceReviewApprovalMode,
  PriceReviewDecisionAction,
  PriceReviewErrorCode,
  PriceReviewStaleReason,
  PriceReviewStatus,
} from '@erp/shared-types';
import { AuditService } from '../../audit/audit.service';
import { Product } from '../../products/entities/product.entity';
import { PriceReview } from '../../purchases/entities/price-review.entity';
import { mapPriceReview } from '../../purchases/mappers/supplier-cost-adjustment.mapper';
import { ApprovePriceReviewDto } from '../dto/price-review-decision.dto';
import { QueryPriceReviewsDto } from '../dto/query-price-reviews.dto';

interface DecisionInput {
  action: PriceReviewDecisionAction;
  reason: string | null;
  customPriceNet: string | null;
}

interface StaleState {
  reasons: PriceReviewStaleReason[];
  supersededByReviewId: string | null;
}

@Injectable()
export class PriceReviewsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async findAll(
    query: QueryPriceReviewsDto,
  ): Promise<IPaginatedPriceReviewsResponse> {
    this.validateDateRange(query.dateFrom, query.dateTo);
    const { page = 1, limit = 20 } = query;
    const qb = this.withDisplayRelations(
      this.dataSource.manager.createQueryBuilder(PriceReview, 'review'),
    );

    if (query.status)
      qb.andWhere('review.status = :status', { status: query.status });
    if (query.productId)
      qb.andWhere('review.productId = :productId', {
        productId: query.productId,
      });
    if (query.categoryId)
      qb.andWhere('product.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    if (query.supplierId)
      qb.andWhere('invoice.supplierId = :supplierId', {
        supplierId: query.supplierId,
      });
    if (query.supplierInvoiceId)
      qb.andWhere('review.supplierInvoiceId = :supplierInvoiceId', {
        supplierInvoiceId: query.supplierInvoiceId,
      });
    if (query.dateFrom)
      qb.andWhere('review.createdAt >= :dateFrom', {
        dateFrom: this.startOfUtcDate(query.dateFrom),
      });
    if (query.dateTo)
      qb.andWhere('review.createdAt < :dateToExclusive', {
        dateToExclusive: this.startOfNextUtcDate(query.dateTo),
      });

    qb.orderBy('review.createdAt', 'DESC')
      .addOrderBy('review.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    const [reviews, total] = await qb.getManyAndCount();
    const latestByProduct = await this.loadLatestByProduct(
      this.dataSource.manager,
      reviews.map((review) => review.productId),
    );
    const totalPages = Math.ceil(total / limit) || 1;
    return {
      data: reviews.map((review) =>
        this.mapDetail(review, latestByProduct.get(review.productId) ?? review),
      ),
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

  async findOne(id: string): Promise<IPriceReviewDetail> {
    const review = await this.loadReview(this.dataSource.manager, id);
    const latest = await this.loadLatestForProduct(
      this.dataSource.manager,
      review.productId,
    );
    return this.mapDetail(review, latest ?? review);
  }

  async getPendingCount(): Promise<IPriceReviewPendingCount> {
    return {
      count: await this.dataSource.manager.countBy(PriceReview, {
        status: PriceReviewStatus.PENDIENTE,
      }),
    };
  }

  approve(
    id: string,
    dto: ApprovePriceReviewDto,
    userId: string,
  ): Promise<IPriceReviewDetail> {
    const reason = this.normalizeReason(dto.reason);
    if (dto.mode === PriceReviewApprovalMode.SUGGESTED) {
      if (dto.customPriceNet !== undefined)
        this.throwInvalidCustomPrice(
          'No envíe customPriceNet al aprobar el precio sugerido.',
        );
      return this.decide(id, userId, {
        action: PriceReviewDecisionAction.APPROVE_SUGGESTED,
        reason,
        customPriceNet: null,
      });
    }
    return this.decide(id, userId, {
      action: PriceReviewDecisionAction.APPROVE_CUSTOM,
      reason,
      customPriceNet: this.normalizeCustomPrice(dto.customPriceNet),
    });
  }

  reject(
    id: string,
    reason: string,
    userId: string,
  ): Promise<IPriceReviewDetail> {
    return this.decide(id, userId, {
      action: PriceReviewDecisionAction.REJECT,
      reason: this.normalizeReason(reason, true),
      customPriceNet: null,
    });
  }

  postpone(
    id: string,
    reason: string | undefined,
    userId: string,
  ): Promise<IPriceReviewDetail> {
    return this.decide(id, userId, {
      action: PriceReviewDecisionAction.POSTPONE,
      reason: this.normalizeReason(reason),
      customPriceNet: null,
    });
  }

  reopen(
    id: string,
    reason: string | undefined,
    userId: string,
  ): Promise<IPriceReviewDetail> {
    return this.decide(id, userId, {
      action: PriceReviewDecisionAction.REOPEN,
      reason: this.normalizeReason(reason),
      customPriceNet: null,
    });
  }

  private async decide(
    id: string,
    userId: string,
    input: DecisionInput,
  ): Promise<IPriceReviewDetail> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const partial = await manager.findOne(PriceReview, {
          select: { id: true, productId: true },
          where: { id },
        });
        if (!partial) this.throwNotFound();

        const product = await this.loadProduct(
          manager,
          partial.productId,
          true,
        );
        const review = await this.loadReview(manager, id, true);
        if (review.productId !== product.id)
          throw new ConflictException({
            code: PriceReviewErrorCode.PRICE_REVIEW_CONCURRENCY_CONFLICT,
            message:
              'La revisión cambió durante la decisión. Actualice la fila.',
          });
        review.product = product;
        const latest =
          (await this.loadLatestForProduct(manager, review.productId)) ??
          review;

        if (this.isIdempotent(review, input))
          return this.mapDetail(review, latest);

        if (!this.isAllowedTransition(review.status, input.action))
          throw this.buildConflict(
            PriceReviewErrorCode.PRICE_REVIEW_INVALID_TRANSITION,
            'La revisión ya no admite esta decisión.',
            review,
            latest,
          );

        const stale = this.getStaleState(review, product, latest);
        if (this.isApproval(input.action) && stale.reasons.length)
          throw this.buildConflict(
            PriceReviewErrorCode.PRICE_REVIEW_STALE,
            'La propuesta fue superada o sus snapshots ya no coinciden con el producto.',
            review,
            latest,
          );

        const previousValues = this.auditSnapshot(review, product);
        const now = new Date();
        review.decisionAction = input.action;
        review.decisionReason = input.reason;
        review.reviewedByUserId = userId;
        review.reviewedAt = now;

        if (this.isApproval(input.action)) {
          const approvedPrice =
            input.action === PriceReviewDecisionAction.APPROVE_CUSTOM
              ? input.customPriceNet!
              : new Decimal(review.suggestedPriceNet).toFixed(2);
          review.status = PriceReviewStatus.APROBADO;
          review.approvedPriceNet = approvedPrice;
          product.activePriceNet = approvedPrice;
          await manager.save(Product, product);
        } else if (input.action === PriceReviewDecisionAction.REJECT) {
          review.status = PriceReviewStatus.RECHAZADO;
          review.approvedPriceNet = null;
        } else if (input.action === PriceReviewDecisionAction.POSTPONE) {
          review.status = PriceReviewStatus.POSPUESTO;
          review.approvedPriceNet = null;
        } else {
          review.status = PriceReviewStatus.PENDIENTE;
          review.approvedPriceNet = null;
        }

        await manager.save(PriceReview, review);
        await this.auditService.record(manager, {
          actorId: userId,
          action: AuditAction.UPDATE,
          entityName: 'PriceReview',
          entityId: review.id,
          previousValues,
          newValues: this.auditSnapshot(review, product),
        });

        const saved = await this.loadReview(manager, id);
        saved.product = product;
        return this.mapDetail(saved, latest.id === review.id ? saved : latest);
      });
    } catch (error) {
      const code = this.databaseErrorCode(error);
      if (code === '40P01' || code === '40001')
        return this.throwConcurrencyConflict(id);
      throw error;
    }
  }

  private async throwConcurrencyConflict(
    id: string,
  ): Promise<IPriceReviewDetail> {
    const current = await this.findOne(id);
    throw new ConflictException({
      code: PriceReviewErrorCode.PRICE_REVIEW_CONCURRENCY_CONFLICT,
      message: 'La revisión fue decidida simultáneamente. Actualice la fila.',
      details: {
        currentReview: current,
        currentProduct: current.product,
        supersededByReviewId: current.supersededByReviewId,
      },
    });
  }

  private isIdempotent(review: PriceReview, input: DecisionInput): boolean {
    if (review.decisionAction !== input.action) return false;
    if ((review.decisionReason ?? null) !== input.reason) return false;
    if (
      input.action === PriceReviewDecisionAction.APPROVE_CUSTOM &&
      new Decimal(review.approvedPriceNet ?? -1).toFixed(2) !==
        input.customPriceNet
    )
      return false;
    const expectedStatus = this.resultingStatus(input.action);
    return review.status === expectedStatus;
  }

  private isAllowedTransition(
    status: PriceReviewStatus,
    action: PriceReviewDecisionAction,
  ): boolean {
    if (action === PriceReviewDecisionAction.REOPEN)
      return status === PriceReviewStatus.POSPUESTO;
    return status === PriceReviewStatus.PENDIENTE;
  }

  private resultingStatus(
    action: PriceReviewDecisionAction,
  ): PriceReviewStatus {
    if (this.isApproval(action)) return PriceReviewStatus.APROBADO;
    if (action === PriceReviewDecisionAction.REJECT)
      return PriceReviewStatus.RECHAZADO;
    if (action === PriceReviewDecisionAction.POSTPONE)
      return PriceReviewStatus.POSPUESTO;
    return PriceReviewStatus.PENDIENTE;
  }

  private isApproval(action: PriceReviewDecisionAction): boolean {
    return (
      action === PriceReviewDecisionAction.APPROVE_SUGGESTED ||
      action === PriceReviewDecisionAction.APPROVE_CUSTOM
    );
  }

  private getStaleState(
    review: PriceReview,
    product: Product,
    latest: PriceReview,
  ): StaleState {
    if (
      review.status !== PriceReviewStatus.PENDIENTE &&
      review.status !== PriceReviewStatus.POSPUESTO
    )
      return { reasons: [], supersededByReviewId: null };

    const reasons: PriceReviewStaleReason[] = [];
    if (latest.id !== review.id)
      reasons.push(PriceReviewStaleReason.SUPERSEDED);
    if (!new Decimal(product.costNet).eq(review.newCostNet))
      reasons.push(PriceReviewStaleReason.COST_CHANGED);
    if (!new Decimal(product.suggestedPriceNet).eq(review.suggestedPriceNet))
      reasons.push(PriceReviewStaleReason.SUGGESTED_PRICE_CHANGED);
    if (!new Decimal(product.activePriceNet).eq(review.activePriceNetSnapshot))
      reasons.push(PriceReviewStaleReason.ACTIVE_PRICE_CHANGED);
    return {
      reasons,
      supersededByReviewId: latest.id === review.id ? null : latest.id,
    };
  }

  private mapDetail(
    review: PriceReview,
    latest: PriceReview,
  ): IPriceReviewDetail {
    const product = review.product;
    const category = product?.category;
    const invoice = review.supplierInvoice;
    const supplier = invoice?.supplier;
    if (!product || !category || !invoice || !supplier)
      throw new Error('PriceReview display relations were not loaded.');
    const stale = this.getStaleState(review, product, latest);
    return {
      ...mapPriceReview(review),
      product: {
        id: product.id,
        code: product.internalCode,
        name: product.name,
        categoryId: product.categoryId,
        categoryName: category.name,
        costNet: new Decimal(product.costNet).toFixed(4),
        suggestedPriceNet: new Decimal(product.suggestedPriceNet).toFixed(2),
        activePriceNet: new Decimal(product.activePriceNet).toFixed(2),
      },
      origin: {
        supplierInvoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        supplierId: invoice.supplierId,
        supplierName: supplier.businessName,
      },
      reviewedBy: review.reviewedByUser
        ? {
            id: review.reviewedByUser.id,
            name: review.reviewedByUser.name,
            email: review.reviewedByUser.email,
          }
        : null,
      isStale: stale.reasons.length > 0,
      staleReasons: stale.reasons,
      supersededByReviewId: stale.supersededByReviewId,
      allowedActions: this.allowedActions(review.status, stale.reasons.length),
    };
  }

  private allowedActions(
    status: PriceReviewStatus,
    staleReasonCount: number,
  ): PriceReviewDecisionAction[] {
    if (status === PriceReviewStatus.POSPUESTO)
      return [PriceReviewDecisionAction.REOPEN];
    if (status !== PriceReviewStatus.PENDIENTE) return [];
    const actions = [
      PriceReviewDecisionAction.REJECT,
      PriceReviewDecisionAction.POSTPONE,
    ];
    if (!staleReasonCount)
      actions.unshift(
        PriceReviewDecisionAction.APPROVE_SUGGESTED,
        PriceReviewDecisionAction.APPROVE_CUSTOM,
      );
    return actions;
  }

  private buildConflict(
    code: PriceReviewErrorCode,
    message: string,
    review: PriceReview,
    latest: PriceReview,
  ): ConflictException {
    const currentReview = this.mapDetail(review, latest);
    return new ConflictException({
      code,
      message,
      details: {
        currentReview,
        currentProduct: currentReview.product,
        supersededByReviewId: currentReview.supersededByReviewId,
      },
    });
  }

  private auditSnapshot(
    review: PriceReview,
    product: Product,
  ): Record<string, unknown> {
    return {
      productId: review.productId,
      status: review.status,
      decisionAction: review.decisionAction,
      decisionReason: review.decisionReason,
      approvedPriceNet:
        review.approvedPriceNet === null
          ? null
          : new Decimal(review.approvedPriceNet).toFixed(2),
      reviewedByUserId: review.reviewedByUserId,
      reviewedAt: review.reviewedAt?.toISOString() ?? null,
      productActivePriceNet: new Decimal(product.activePriceNet).toFixed(2),
      activePriceNetSnapshot: new Decimal(
        review.activePriceNetSnapshot,
      ).toFixed(2),
      suggestedPriceNet: new Decimal(review.suggestedPriceNet).toFixed(2),
      newCostNet: new Decimal(review.newCostNet).toFixed(4),
    };
  }

  private withDisplayRelations(
    qb: SelectQueryBuilder<PriceReview>,
  ): SelectQueryBuilder<PriceReview> {
    return qb
      .leftJoinAndSelect('review.product', 'product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('review.supplierInvoice', 'invoice')
      .leftJoinAndSelect('invoice.supplier', 'supplier')
      .leftJoinAndSelect('review.reviewedByUser', 'reviewedBy');
  }

  private async loadReview(
    manager: EntityManager,
    id: string,
    lock = false,
  ): Promise<PriceReview> {
    const qb = this.withDisplayRelations(
      manager
        .createQueryBuilder(PriceReview, 'review')
        .where('review.id = :id', { id }),
    );
    if (lock) qb.setLock('pessimistic_write', undefined, ['review']);
    const review = await qb.getOne();
    if (!review) this.throwNotFound();
    return review;
  }

  private async loadProduct(
    manager: EntityManager,
    id: string,
    lock = false,
  ): Promise<Product> {
    const qb = manager
      .createQueryBuilder(Product, 'product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.id = :id', { id });
    if (lock) qb.setLock('pessimistic_write', undefined, ['product']);
    const product = await qb.getOne();
    if (!product)
      throw new NotFoundException({
        code: PriceReviewErrorCode.PRICE_REVIEW_PRODUCT_NOT_FOUND,
        message: 'El producto de la revisión ya no existe.',
      });
    return product;
  }

  private async loadLatestForProduct(
    manager: EntityManager,
    productId: string,
  ): Promise<PriceReview | null> {
    return manager
      .createQueryBuilder(PriceReview, 'latest')
      .where('latest.productId = :productId', { productId })
      .orderBy('latest.createdAt', 'DESC')
      .addOrderBy('latest.id', 'DESC')
      .getOne();
  }

  private async loadLatestByProduct(
    manager: EntityManager,
    productIds: string[],
  ): Promise<Map<string, PriceReview>> {
    const uniqueIds = [...new Set(productIds)];
    if (!uniqueIds.length) return new Map();
    const rows = await manager
      .createQueryBuilder(PriceReview, 'latest')
      .distinctOn(['latest.productId'])
      .where('latest.productId IN (:...productIds)', {
        productIds: uniqueIds,
      })
      .orderBy('latest.productId', 'ASC')
      .addOrderBy('latest.createdAt', 'DESC')
      .addOrderBy('latest.id', 'DESC')
      .getMany();
    return new Map(rows.map((row) => [row.productId, row]));
  }

  private normalizeCustomPrice(value: string | undefined): string {
    if (
      typeof value !== 'string' ||
      !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value)
    )
      this.throwInvalidCustomPrice(
        'El precio custom debe ser un string decimal positivo con hasta 2 decimales.',
      );
    const decimal = new Decimal(value);
    if (!decimal.isFinite() || decimal.lte(0) || decimal.gt('9999999999.99'))
      this.throwInvalidCustomPrice(
        'El precio custom debe ser mayor a cero y caber en numeric(12,2).',
      );
    return decimal.toFixed(2);
  }

  private throwInvalidCustomPrice(message: string): never {
    throw new BadRequestException({
      code: PriceReviewErrorCode.PRICE_REVIEW_INVALID_CUSTOM_PRICE,
      message,
    });
  }

  private normalizeReason(
    value: string | undefined,
    required = false,
  ): string | null {
    if (value === undefined || value === null) {
      if (!required) return null;
      this.throwInvalidReason();
    }
    const normalized = value.trim();
    if (normalized.length < 3 || normalized.length > 500)
      this.throwInvalidReason();
    return normalized;
  }

  private throwInvalidReason(): never {
    throw new BadRequestException({
      code: PriceReviewErrorCode.PRICE_REVIEW_INVALID_REASON,
      message: 'El motivo debe contener entre 3 y 500 caracteres.',
    });
  }

  private validateDateRange(dateFrom?: string, dateTo?: string): void {
    if (dateFrom && dateTo && dateFrom > dateTo)
      throw new BadRequestException({
        code: PriceReviewErrorCode.PRICE_REVIEW_INVALID_DATE_RANGE,
        message: 'dateFrom no puede ser posterior a dateTo.',
      });
  }

  private startOfUtcDate(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private startOfNextUtcDate(value: string): Date {
    const date = this.startOfUtcDate(value);
    date.setUTCDate(date.getUTCDate() + 1);
    return date;
  }

  private throwNotFound(): never {
    throw new NotFoundException({
      code: PriceReviewErrorCode.PRICE_REVIEW_NOT_FOUND,
      message: 'La revisión de precio no existe.',
    });
  }

  private databaseErrorCode(error: unknown): string | undefined {
    if (!error || typeof error !== 'object') return undefined;
    const direct = (error as { code?: string }).code;
    if (direct) return direct;
    return (error as { driverError?: { code?: string } }).driverError?.code;
  }
}
