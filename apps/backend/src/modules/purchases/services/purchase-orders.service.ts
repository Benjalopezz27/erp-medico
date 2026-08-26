import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In } from 'typeorm';
import Decimal from 'decimal.js';
import {
  AuditAction,
  ProductStatus,
  PurchaseOrderErrorCode,
  PurchaseOrderStatus,
} from '@erp/shared-types';
import { AuditService } from '../../audit/audit.service';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { SupplierProduct } from '../../suppliers/supplier-products/entities/supplier-product.entity';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../entities/purchase-order-item.entity';

import {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  CancelPurchaseOrderDto,
  QueryPurchaseOrderDto,
  PurchaseOrderDetailResponseDto,
  PaginatedPurchaseOrdersResponseDto,
} from '../dto';
import { PurchaseOrderMapper } from '../mappers/purchase-order.mapper';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepo: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private readonly purchaseOrderItemRepo: Repository<PurchaseOrderItem>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(SupplierProduct)
    private readonly supplierProductRepo: Repository<SupplierProduct>,
  ) {}

  /**
   * Creates a new Purchase Order in BORRADOR status inside a single database transaction.
   */
  async create(
    dto: CreatePurchaseOrderDto,
    actorId: string,
  ): Promise<PurchaseOrderDetailResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const supplierRepo = manager.getRepository(Supplier);
      const supplierProductRepo = manager.getRepository(SupplierProduct);
      const poRepo = manager.getRepository(PurchaseOrder);
      const itemRepo = manager.getRepository(PurchaseOrderItem);

      const supplier = await supplierRepo.findOne({
        where: { id: dto.supplierId },
      });
      if (!supplier) {
        throw new NotFoundException({
          code: PurchaseOrderErrorCode.PURCHASE_ORDER_SUPPLIER_NOT_FOUND,
          message: 'Supplier not found',
        });
      }
      if (!supplier.isActive) {
        throw new BadRequestException({
          code: PurchaseOrderErrorCode.PURCHASE_ORDER_SUPPLIER_INACTIVE,
          message: 'Supplier is inactive',
        });
      }

      if (!dto.items || dto.items.length === 0) {
        throw new BadRequestException({
          code: PurchaseOrderErrorCode.PURCHASE_ORDER_EMPTY_ITEMS,
          message: 'Purchase order must have at least one item',
        });
      }

      // Check duplicates
      const spIds = dto.items.map((i) => i.supplierProductId);
      const uniqueSpIds = new Set(spIds);
      if (uniqueSpIds.size !== spIds.length) {
        throw new BadRequestException({
          code: PurchaseOrderErrorCode.PURCHASE_ORDER_DUPLICATE_ITEM,
          message: 'Duplicate line items are not allowed in a purchase order',
        });
      }

      // Query associations with relations in deterministic order
      const associations = await supplierProductRepo.find({
        where: { id: In(Array.from(uniqueSpIds)) },
        relations: ['product', 'purchaseUnit'],
        order: { id: 'ASC' },
      });

      const spMap = new Map<string, SupplierProduct>();
      for (const sp of associations) {
        spMap.set(sp.id, sp);
      }

      let totalNetDecimal = new Decimal(0);
      const preparedItems: Array<{
        sp: SupplierProduct;
        orderedQty: Decimal;
        cost: Decimal;
        subtotal: Decimal;
      }> = [];

      for (const itemDto of dto.items) {
        const sp = spMap.get(itemDto.supplierProductId);
        if (!sp) {
          throw new BadRequestException({
            code: PurchaseOrderErrorCode.PURCHASE_ORDER_SUPPLIER_PRODUCT_NOT_FOUND,
            message: `Supplier product association ${itemDto.supplierProductId} not found`,
          });
        }
        if (sp.supplierId !== dto.supplierId) {
          throw new BadRequestException({
            code: PurchaseOrderErrorCode.PURCHASE_ORDER_SUPPLIER_PRODUCT_MISMATCH,
            message: `Association ${sp.id} does not belong to supplier ${dto.supplierId}`,
          });
        }
        if (sp.product && sp.product.status !== ProductStatus.ACTIVE) {
          throw new BadRequestException({
            code: PurchaseOrderErrorCode.PURCHASE_ORDER_PRODUCT_INACTIVE,
            message: `Product ${sp.product.name} is inactive`,
          });
        }

        // Determine unit cost
        let unitCost: Decimal;
        if (
          itemDto.expectedCostUnitNet !== undefined &&
          itemDto.expectedCostUnitNet !== null
        ) {
          unitCost = new Decimal(itemDto.expectedCostUnitNet);
        } else if (sp.usualCostNet !== null && sp.usualCostNet !== undefined) {
          unitCost = new Decimal(sp.usualCostNet);
        } else {
          throw new BadRequestException({
            code: PurchaseOrderErrorCode.PURCHASE_ORDER_COST_REQUIRED,
            message: `Expected unit cost is required for product ${sp.supplierExternalCode} because usualCostNet is not set`,
          });
        }

        if (unitCost.isNegative()) {
          throw new BadRequestException({
            code: PurchaseOrderErrorCode.PURCHASE_ORDER_INVALID_COST,
            message: 'Cost cannot be negative',
          });
        }

        const orderedQtyDec = new Decimal(itemDto.orderedQty);
        if (!orderedQtyDec.isPositive() || orderedQtyDec.isZero()) {
          throw new BadRequestException({
            code: PurchaseOrderErrorCode.PURCHASE_ORDER_INVALID_QUANTITY,
            message: 'Ordered quantity must be greater than zero',
          });
        }

        const subtotalDec = orderedQtyDec
          .times(unitCost)
          .toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
        totalNetDecimal = totalNetDecimal.plus(subtotalDec);

        preparedItems.push({
          sp,
          orderedQty: orderedQtyDec,
          cost: unitCost,
          subtotal: subtotalDec,
        });
      }

      // Create and save PO
      const poEntity = poRepo.create({
        supplierId: dto.supplierId,
        status: PurchaseOrderStatus.BORRADOR,
        expectedDeliveryDate: dto.expectedDeliveryDate || null,
        notes: dto.notes ? dto.notes.trim() : null,
        totalNet: totalNetDecimal.toFixed(4),
        userId: actorId,
      });

      const savedPo = await poRepo.save(poEntity);

      // Create and save items
      const itemEntities: PurchaseOrderItem[] = [];
      for (let i = 0; i < preparedItems.length; i++) {
        const item = preparedItems[i];
        const entity = itemRepo.create({
          purchaseOrderId: savedPo.id,
          itemIndex: i + 1,
          supplierProductId: item.sp.id,
          productId: item.sp.productId,
          purchaseUnitId: item.sp.purchaseUnitId,
          supplierSkuSnapshot: item.sp.supplierExternalCode,
          productCodeSnapshot: item.sp.product?.internalCode || '',
          productNameSnapshot: item.sp.product?.name || '',
          purchaseUnitNameSnapshot: item.sp.purchaseUnit?.name || '',
          purchaseUnitSymbolSnapshot: item.sp.purchaseUnit?.symbol || '',
          conversionFactorSnapshot: new Decimal(
            item.sp.conversionFactorToBase,
          ).toFixed(4),
          orderedQty: item.orderedQty.toFixed(4),
          receivedQty: '0.0000',
          expectedCostUnitNet: item.cost.toFixed(4),
          subtotalNet: item.subtotal.toFixed(4),
        });
        itemEntities.push(entity);
      }

      await itemRepo.save(itemEntities);

      // Audit Log
      await this.auditService.record(manager, {
        actorId,
        action: AuditAction.CREATE,
        entityName: 'PurchaseOrder',
        entityId: savedPo.id,
        previousValues: null,
        newValues: {
          id: savedPo.id,
          orderNumber: savedPo.orderNumber,
          supplierId: savedPo.supplierId,
          status: savedPo.status,
          expectedDeliveryDate: savedPo.expectedDeliveryDate,
          notes: savedPo.notes,
          totalNet: savedPo.totalNet,
          itemsCount: itemEntities.length,
          items: itemEntities.map((it) => ({
            supplierSku: it.supplierSkuSnapshot,
            productCode: it.productCodeSnapshot,
            orderedQty: it.orderedQty,
            expectedCostUnitNet: it.expectedCostUnitNet,
            subtotalNet: it.subtotalNet,
          })),
        },
      });

      const completePo = await poRepo.findOne({
        where: { id: savedPo.id },
        relations: ['supplier', 'user', 'items'],
      });

      return PurchaseOrderMapper.toDetailDto(completePo!);
    });
  }

  /**
   * Updates an existing Purchase Order while in BORRADOR status.
   */
  async updateDraft(
    id: string,
    dto: UpdatePurchaseOrderDto,
    actorId: string,
  ): Promise<PurchaseOrderDetailResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const supplierRepo = manager.getRepository(Supplier);
      const supplierProductRepo = manager.getRepository(SupplierProduct);
      const poRepo = manager.getRepository(PurchaseOrder);
      const itemRepo = manager.getRepository(PurchaseOrderItem);

      const po = await poRepo
        .createQueryBuilder('po')
        .setLock('pessimistic_write')
        .where('po.id = :id', { id })
        .getOne();

      if (!po) {
        throw new NotFoundException({
          code: PurchaseOrderErrorCode.PURCHASE_ORDER_NOT_FOUND,
          message: 'Purchase order not found',
        });
      }

      if (po.status !== PurchaseOrderStatus.BORRADOR) {
        throw new ConflictException({
          code: PurchaseOrderErrorCode.PURCHASE_ORDER_CANNOT_EDIT_NON_DRAFT,
          message: 'Only draft purchase orders can be edited',
        });
      }

      const existingItems = await itemRepo.find({
        where: { purchaseOrderId: id },
        order: { itemIndex: 'ASC' },
      });

      const previousValues = {
        supplierId: po.supplierId,
        expectedDeliveryDate: po.expectedDeliveryDate,
        notes: po.notes,
        totalNet: po.totalNet,
        itemsCount: existingItems.length,
        items: existingItems.map((it) => ({
          supplierSku: it.supplierSkuSnapshot,
          orderedQty: it.orderedQty,
          expectedCostUnitNet: it.expectedCostUnitNet,
          subtotalNet: it.subtotalNet,
        })),
      };

      // Supplier change validation
      if (dto.supplierId && dto.supplierId !== po.supplierId) {
        if (!dto.items || dto.items.length === 0) {
          throw new BadRequestException({
            code: PurchaseOrderErrorCode.PURCHASE_ORDER_SUPPLIER_CHANGE_REQUIRES_ITEMS,
            message:
              'Changing supplier requires providing items belonging to the new supplier in the same request',
          });
        }
        const newSupplier = await supplierRepo.findOne({
          where: { id: dto.supplierId },
        });
        if (!newSupplier) {
          throw new NotFoundException({
            code: PurchaseOrderErrorCode.PURCHASE_ORDER_SUPPLIER_NOT_FOUND,
            message: 'New supplier not found',
          });
        }
        if (!newSupplier.isActive) {
          throw new BadRequestException({
            code: PurchaseOrderErrorCode.PURCHASE_ORDER_SUPPLIER_INACTIVE,
            message: 'New supplier is inactive',
          });
        }
        po.supplierId = dto.supplierId;
      }

      if (dto.expectedDeliveryDate !== undefined) {
        po.expectedDeliveryDate = dto.expectedDeliveryDate || null;
      }
      if (dto.notes !== undefined) {
        po.notes = dto.notes ? dto.notes.trim() : null;
      }

      if (dto.items) {
        if (dto.items.length === 0) {
          throw new BadRequestException({
            code: PurchaseOrderErrorCode.PURCHASE_ORDER_EMPTY_ITEMS,
            message: 'Purchase order must have at least one item',
          });
        }

        const spIds = dto.items.map((i) => i.supplierProductId);
        const uniqueSpIds = new Set(spIds);
        if (uniqueSpIds.size !== spIds.length) {
          throw new BadRequestException({
            code: PurchaseOrderErrorCode.PURCHASE_ORDER_DUPLICATE_ITEM,
            message: 'Duplicate line items are not allowed in a purchase order',
          });
        }

        const associations = await supplierProductRepo.find({
          where: { id: In(Array.from(uniqueSpIds)) },
          relations: ['product', 'purchaseUnit'],
          order: { id: 'ASC' },
        });

        const spMap = new Map<string, SupplierProduct>();
        for (const sp of associations) {
          spMap.set(sp.id, sp);
        }

        let totalNetDecimal = new Decimal(0);
        const preparedItems: Array<{
          sp: SupplierProduct;
          orderedQty: Decimal;
          cost: Decimal;
          subtotal: Decimal;
        }> = [];

        for (const itemDto of dto.items) {
          const sp = spMap.get(itemDto.supplierProductId);
          if (!sp) {
            throw new BadRequestException({
              code: PurchaseOrderErrorCode.PURCHASE_ORDER_SUPPLIER_PRODUCT_NOT_FOUND,
              message: `Supplier product association ${itemDto.supplierProductId} not found`,
            });
          }
          if (sp.supplierId !== po.supplierId) {
            throw new BadRequestException({
              code: PurchaseOrderErrorCode.PURCHASE_ORDER_SUPPLIER_PRODUCT_MISMATCH,
              message: `Association ${sp.id} does not belong to supplier ${po.supplierId}`,
            });
          }
          if (sp.product && sp.product.status !== ProductStatus.ACTIVE) {
            throw new BadRequestException({
              code: PurchaseOrderErrorCode.PURCHASE_ORDER_PRODUCT_INACTIVE,
              message: `Product ${sp.product.name} is inactive`,
            });
          }

          let unitCost: Decimal;
          if (
            itemDto.expectedCostUnitNet !== undefined &&
            itemDto.expectedCostUnitNet !== null
          ) {
            unitCost = new Decimal(itemDto.expectedCostUnitNet);
          } else if (
            sp.usualCostNet !== null &&
            sp.usualCostNet !== undefined
          ) {
            unitCost = new Decimal(sp.usualCostNet);
          } else {
            throw new BadRequestException({
              code: PurchaseOrderErrorCode.PURCHASE_ORDER_COST_REQUIRED,
              message: `Expected unit cost is required for product ${sp.supplierExternalCode} because usualCostNet is not set`,
            });
          }

          if (unitCost.isNegative()) {
            throw new BadRequestException({
              code: PurchaseOrderErrorCode.PURCHASE_ORDER_INVALID_COST,
              message: 'Cost cannot be negative',
            });
          }

          const orderedQtyDec = new Decimal(itemDto.orderedQty);
          if (!orderedQtyDec.isPositive() || orderedQtyDec.isZero()) {
            throw new BadRequestException({
              code: PurchaseOrderErrorCode.PURCHASE_ORDER_INVALID_QUANTITY,
              message: 'Ordered quantity must be greater than zero',
            });
          }

          const subtotalDec = orderedQtyDec
            .times(unitCost)
            .toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
          totalNetDecimal = totalNetDecimal.plus(subtotalDec);

          preparedItems.push({
            sp,
            orderedQty: orderedQtyDec,
            cost: unitCost,
            subtotal: subtotalDec,
          });
        }

        // Atomically delete previous items of this draft
        await itemRepo.delete({ purchaseOrderId: po.id });

        // Save fresh items
        const newItemEntities: PurchaseOrderItem[] = [];
        for (let i = 0; i < preparedItems.length; i++) {
          const item = preparedItems[i];
          const entity = itemRepo.create({
            purchaseOrderId: po.id,
            itemIndex: i + 1,
            supplierProductId: item.sp.id,
            productId: item.sp.productId,
            purchaseUnitId: item.sp.purchaseUnitId,
            supplierSkuSnapshot: item.sp.supplierExternalCode,
            productCodeSnapshot: item.sp.product?.internalCode || '',
            productNameSnapshot: item.sp.product?.name || '',
            purchaseUnitNameSnapshot: item.sp.purchaseUnit?.name || '',
            purchaseUnitSymbolSnapshot: item.sp.purchaseUnit?.symbol || '',
            conversionFactorSnapshot: new Decimal(
              item.sp.conversionFactorToBase,
            ).toFixed(4),
            orderedQty: item.orderedQty.toFixed(4),
            receivedQty: '0.0000',
            expectedCostUnitNet: item.cost.toFixed(4),
            subtotalNet: item.subtotal.toFixed(4),
          });
          newItemEntities.push(entity);
        }

        await itemRepo.save(newItemEntities);
        po.totalNet = totalNetDecimal.toFixed(4);
      }

      await poRepo.save(po);

      const completePo = await poRepo.findOne({
        where: { id: po.id },
        relations: ['supplier', 'user', 'items'],
      });

      // Audit Log
      await this.auditService.record(manager, {
        actorId,
        action: AuditAction.UPDATE,
        entityName: 'PurchaseOrder',
        entityId: po.id,
        previousValues,
        newValues: {
          supplierId: completePo!.supplierId,
          expectedDeliveryDate: completePo!.expectedDeliveryDate,
          notes: completePo!.notes,
          totalNet: completePo!.totalNet,
          itemsCount: completePo!.items ? completePo!.items.length : 0,
          items: (completePo!.items || []).map((it) => ({
            supplierSku: it.supplierSkuSnapshot,
            orderedQty: it.orderedQty,
            expectedCostUnitNet: it.expectedCostUnitNet,
            subtotalNet: it.subtotalNet,
          })),
        },
      });

      return PurchaseOrderMapper.toDetailDto(completePo!);
    });
  }

  /**
   * Emits a Purchase Order transitioning status from BORRADOR to EMITIDA with strict drift protection.
   */
  async emit(
    id: string,
    actorId: string,
  ): Promise<PurchaseOrderDetailResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const supplierRepo = manager.getRepository(Supplier);
      const supplierProductRepo = manager.getRepository(SupplierProduct);
      const poRepo = manager.getRepository(PurchaseOrder);
      const itemRepo = manager.getRepository(PurchaseOrderItem);

      const po = await poRepo
        .createQueryBuilder('po')
        .setLock('pessimistic_write')
        .where('po.id = :id', { id })
        .getOne();

      if (!po) {
        throw new NotFoundException({
          code: PurchaseOrderErrorCode.PURCHASE_ORDER_NOT_FOUND,
          message: 'Purchase order not found',
        });
      }

      if (po.status !== PurchaseOrderStatus.BORRADOR) {
        throw new ConflictException({
          code: PurchaseOrderErrorCode.PURCHASE_ORDER_CANNOT_EMIT_NON_DRAFT,
          message: 'Only draft purchase orders can be emitted',
        });
      }

      const items = await itemRepo.find({
        where: { purchaseOrderId: id },
        order: { itemIndex: 'ASC' },
      });

      if (!items || items.length === 0) {
        throw new BadRequestException({
          code: PurchaseOrderErrorCode.PURCHASE_ORDER_EMPTY_ITEMS,
          message: 'Purchase order must have at least one item to be emitted',
        });
      }

      const supplier = await supplierRepo
        .createQueryBuilder('s')
        .setLock('pessimistic_write')
        .where('s.id = :id', { id: po.supplierId })
        .getOne();

      if (!supplier || !supplier.isActive) {
        throw new BadRequestException({
          code: PurchaseOrderErrorCode.PURCHASE_ORDER_SUPPLIER_INACTIVE,
          message: 'Supplier is inactive or not found',
        });
      }

      // Lock current associations in deterministic order
      const spIds = items.map((i) => i.supplierProductId).sort();
      const associations = await supplierProductRepo
        .createQueryBuilder('sp')
        .setLock('pessimistic_write')
        .where('sp.id IN (:...spIds)', { spIds })
        .innerJoinAndSelect('sp.product', 'product')
        .orderBy('sp.id', 'ASC')
        .getMany();

      const spMap = new Map<string, SupplierProduct>();
      for (const sp of associations) {
        spMap.set(sp.id, sp);
      }

      // 4-Point structural drift check
      for (const item of items) {
        const currentSp = spMap.get(item.supplierProductId);
        if (!currentSp) {
          throw new ConflictException({
            code: PurchaseOrderErrorCode.PURCHASE_ORDER_ASSOCIATION_CHANGED,
            message: `Supplier product association for SKU ${item.supplierSkuSnapshot} has been removed`,
          });
        }

        const externalCodeMatch =
          currentSp.supplierExternalCode === item.supplierSkuSnapshot;
        const productIdMatch = currentSp.productId === item.productId;
        const purchaseUnitMatch =
          currentSp.purchaseUnitId === item.purchaseUnitId;
        const factorMatch = new Decimal(
          currentSp.conversionFactorToBase,
        ).equals(new Decimal(item.conversionFactorSnapshot));

        if (
          !externalCodeMatch ||
          !productIdMatch ||
          !purchaseUnitMatch ||
          !factorMatch
        ) {
          throw new ConflictException({
            code: PurchaseOrderErrorCode.PURCHASE_ORDER_ASSOCIATION_CHANGED,
            message: `Supplier product association configuration for SKU ${item.supplierSkuSnapshot} has changed since draft was created`,
          });
        }

        if (
          currentSp.product &&
          currentSp.product.status !== ProductStatus.ACTIVE
        ) {
          throw new BadRequestException({
            code: PurchaseOrderErrorCode.PURCHASE_ORDER_PRODUCT_INACTIVE,
            message: `Product ${currentSp.product.name} is inactive`,
          });
        }
      }

      po.status = PurchaseOrderStatus.EMITIDA;
      po.emittedAt = new Date();
      await poRepo.save(po);

      await this.auditService.record(manager, {
        actorId,
        action: AuditAction.UPDATE,
        entityName: 'PurchaseOrder',
        entityId: po.id,
        previousValues: { status: PurchaseOrderStatus.BORRADOR },
        newValues: {
          status: PurchaseOrderStatus.EMITIDA,
          emittedAt: po.emittedAt,
        },
      });

      const completePo = await poRepo.findOne({
        where: { id: po.id },
        relations: ['supplier', 'user', 'items'],
      });

      return PurchaseOrderMapper.toDetailDto(completePo!);
    });
  }

  /**
   * Cancels a Purchase Order transitioning from BORRADOR, EMITIDA, or PARCIAL to CANCELADA.
   */
  async cancel(
    id: string,
    dto: CancelPurchaseOrderDto,
    actorId: string,
  ): Promise<PurchaseOrderDetailResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const poRepo = manager.getRepository(PurchaseOrder);

      const po = await poRepo
        .createQueryBuilder('po')
        .setLock('pessimistic_write')
        .where('po.id = :id', { id })
        .getOne();

      if (!po) {
        throw new NotFoundException({
          code: PurchaseOrderErrorCode.PURCHASE_ORDER_NOT_FOUND,
          message: 'Purchase order not found',
        });
      }

      if (
        po.status === PurchaseOrderStatus.COMPLETADA ||
        po.status === PurchaseOrderStatus.CANCELADA
      ) {
        throw new ConflictException({
          code: PurchaseOrderErrorCode.PURCHASE_ORDER_CANNOT_CANCEL,
          message: `Cannot cancel a purchase order with status ${po.status}`,
        });
      }

      const previousStatus = po.status;
      po.status = PurchaseOrderStatus.CANCELADA;
      po.cancelledAt = new Date();
      po.cancelReason = dto.cancelReason ? dto.cancelReason.trim() : null;

      await poRepo.save(po);

      await this.auditService.record(manager, {
        actorId,
        action: AuditAction.UPDATE,
        entityName: 'PurchaseOrder',
        entityId: po.id,
        previousValues: { status: previousStatus },
        newValues: {
          status: PurchaseOrderStatus.CANCELADA,
          cancelledAt: po.cancelledAt,
          cancelReason: po.cancelReason,
        },
      });

      const completePo = await poRepo.findOne({
        where: { id: po.id },
        relations: ['supplier', 'user', 'items'],
      });

      return PurchaseOrderMapper.toDetailDto(completePo!);
    });
  }

  /**
   * Finds paginated purchase orders with deterministic sorting and optional filters.
   */
  async findAll(
    query: QueryPurchaseOrderDto,
  ): Promise<PaginatedPurchaseOrdersResponseDto> {
    const {
      page = 1,
      limit = 20,
      supplierId,
      status,
      dateFrom,
      dateTo,
      search,
    } = query;
    const skip = (page - 1) * limit;

    const qb = this.purchaseOrderRepo
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.supplier', 'supplier')
      .leftJoinAndSelect('po.user', 'user')
      .leftJoinAndSelect('po.items', 'items');

    if (supplierId) {
      qb.andWhere('po.supplierId = :supplierId', { supplierId });
    }

    if (status) {
      qb.andWhere('po.status = :status', { status });
    }

    if (dateFrom) {
      const fromDate = new Date(`${dateFrom}T00:00:00.000Z`);
      qb.andWhere('po.createdAt >= :dateFromStart', {
        dateFromStart: fromDate,
      });
    }

    if (dateTo) {
      const toDate = new Date(`${dateTo}T00:00:00.000Z`);
      toDate.setUTCDate(toDate.getUTCDate() + 1);
      qb.andWhere('po.createdAt < :dateToEndExclusive', {
        dateToEndExclusive: toDate,
      });
    }

    if (search && search.trim()) {
      qb.andWhere(
        '(LOWER(po.orderNumber) LIKE :search OR LOWER(supplier.businessName) LIKE :search)',
        { search: `%${search.trim().toLowerCase()}%` },
      );
    }

    qb.orderBy('po.createdAt', 'DESC').addOrderBy('po.orderNumber', 'DESC');
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit) || 1;

    const data = items.map((po) =>
      PurchaseOrderMapper.toSummaryDto(po, po.items ? po.items.length : 0),
    );

    return {
      data,
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

  /**
   * Retrieves single Purchase Order detail by ID.
   */
  async findOne(id: string): Promise<PurchaseOrderDetailResponseDto> {
    const po = await this.purchaseOrderRepo.findOne({
      where: { id },
      relations: ['supplier', 'user', 'items'],
    });

    if (!po) {
      throw new NotFoundException({
        code: PurchaseOrderErrorCode.PURCHASE_ORDER_NOT_FOUND,
        message: 'Purchase order not found',
      });
    }

    return PurchaseOrderMapper.toDetailDto(po);
  }
}
