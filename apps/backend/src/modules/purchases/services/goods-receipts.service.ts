import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import Decimal from 'decimal.js';
import {
  PurchaseOrderStatus,
  StockMovementType,
  GoodsReceiptErrorCode,
  AuditAction,
} from '@erp/shared-types';
import { GoodsReceipt } from '../entities/goods-receipt.entity';
import { GoodsReceiptItem } from '../entities/goods-receipt-item.entity';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../entities/purchase-order-item.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { User } from '../../users/entities/user.entity';
import { StockService } from '../../stock/stock.service';

import { AuditService } from '../../audit/audit.service';
import { normalizeDeliveryNoteNumber } from '../utils/delivery-note-normalizer';
import {
  calculateCumulativeGoodsReceiptBaseStock,
  calculateProvisionalSubtotal,
} from '../utils/goods-receipt-math.utils';
import { CreateGoodsReceiptDto } from '../dto/create-goods-receipt.dto';
import { QueryGoodsReceiptsDto } from '../dto/query-goods-receipts.dto';
import { CreateGoodsReceiptResponseDto } from '../dto/create-goods-receipt-response.dto';
import { PaginatedGoodsReceiptsResponseDto } from '../dto/paginated-goods-receipts-response.dto';
import {
  mapGoodsReceiptToResponseDto,
  mapCreateGoodsReceiptToResponseDto,
} from '../mappers/goods-receipt.mapper';

@Injectable()
export class GoodsReceiptsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly stockService: StockService,
    private readonly auditService: AuditService,
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(GoodsReceipt)
    private readonly goodsReceiptRepository: Repository<GoodsReceipt>,
  ) {}

  /**
   * Atomically creates a goods receipt against an emitted purchase order.
   * Converts purchase quantities to base units via cumulative rounding,
   * creates an ENTRADA_COMPRA stock ledger movement for each line, updates
   * the PO items received quantities and PO status (PARCIAL/COMPLETADA),
   * and records transactional audit logs.
   */
  async createGoodsReceipt(
    purchaseOrderId: string,
    dto: CreateGoodsReceiptDto,
    userId: string,
  ): Promise<CreateGoodsReceiptResponseDto> {
    // 1. Validate & Normalize delivery note
    const deliveryNoteNormalized = normalizeDeliveryNoteNumber(
      dto.deliveryNoteNumber,
    );

    // 2. Validate payload items presence and reject duplicate items in same request
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException({
        code: GoodsReceiptErrorCode.GOODS_RECEIPT_EMPTY_ITEMS,
        message: 'Debe incluir al menos un ítem para registrar la recepción.',
      });
    }

    const seenPoItemIds = new Set<string>();
    for (const item of dto.items) {
      if (seenPoItemIds.has(item.purchaseOrderItemId)) {
        throw new BadRequestException({
          code: GoodsReceiptErrorCode.GOODS_RECEIPT_DUPLICATE_ITEM,
          message:
            'No se pueden enviar ítems duplicados en el mismo remito de recepción.',
        });
      }
      seenPoItemIds.add(item.purchaseOrderItemId);
    }

    // 3. Execute in a single TypeORM transaction with pessimistic locking
    try {
      return await this.dataSource.transaction(async (manager) => {
        // 3.1 Lock PurchaseOrder with FOR UPDATE (no outer joins)
        const purchaseOrder = await manager
          .createQueryBuilder(PurchaseOrder, 'po')
          .setLock('pessimistic_write')
          .where('po.id = :id', { id: purchaseOrderId })
          .getOne();

        if (!purchaseOrder) {
          throw new NotFoundException({
            code: GoodsReceiptErrorCode.GOODS_RECEIPT_PURCHASE_ORDER_NOT_FOUND,
            message: 'La orden de compra especificada no existe.',
          });
        }

        // Validate status: ONLY EMITIDA or PARCIAL allowed
        if (
          purchaseOrder.status !== PurchaseOrderStatus.EMITIDA &&
          purchaseOrder.status !== PurchaseOrderStatus.PARCIAL
        ) {
          throw new ConflictException({
            code: GoodsReceiptErrorCode.GOODS_RECEIPT_INVALID_PURCHASE_ORDER_STATUS,
            message: `Solo se pueden recibir órdenes de compra en estado EMITIDA o PARCIAL (estado actual: ${purchaseOrder.status}).`,
          });
        }

        // 3.2 Pre-check Delivery Note duplicate for this supplier
        const existingReceipt = await manager.findOne(GoodsReceipt, {
          where: {
            supplierId: purchaseOrder.supplierId,
            deliveryNoteNormalized,
          },
        });

        if (existingReceipt) {
          throw new ConflictException({
            code: GoodsReceiptErrorCode.GOODS_RECEIPT_DUPLICATE_DELIVERY_NOTE,
            message: `Ya existe una recepción registrada para el proveedor con el remito "${dto.deliveryNoteNumber}".`,
          });
        }

        // 3.3 Lock ALL PurchaseOrderItems of this PO in deterministic order (poi.id ASC, no outer joins)
        const allPoItems = await manager
          .createQueryBuilder(PurchaseOrderItem, 'poi')
          .setLock('pessimistic_write')
          .where('poi.purchaseOrderId = :poId', { poId: purchaseOrderId })
          .orderBy('poi.id', 'ASC')
          .getMany();

        const poItemMap = new Map<string, PurchaseOrderItem>(
          allPoItems.map((item) => [item.id, item]),
        );

        // Capture initial received quantities for audit snapshot
        const initialPoItemReceivedQtys = new Map<string, string>(
          allPoItems.map((item) => [item.id, item.receivedQty]),
        );

        // 3.4 Validate each requested receipt line and prepare calculation
        interface PreparedReceiptLine {
          itemDto: (typeof dto.items)[0];
          poItem: PurchaseOrderItem;
          costToUse: string;
          movementQtyBase: string;
          newCumulativePurchaseQty: string;
          subtotalProv: string;
        }

        const preparedLines: PreparedReceiptLine[] = [];

        for (const itemDto of dto.items) {
          const poItem = poItemMap.get(itemDto.purchaseOrderItemId);
          if (!poItem) {
            throw new NotFoundException({
              code: GoodsReceiptErrorCode.GOODS_RECEIPT_ITEM_MISMATCH,
              message:
                'Uno o más ítems no pertenecen a la orden de compra especificada o no existen.',
            });
          }

          // Query already posted base stock for this PO item from previous receipts
          const rawPostedBase = await manager
            .createQueryBuilder(GoodsReceiptItem, 'gri')
            .select('COALESCE(SUM(gri.received_qty_base), 0)', 'sum')
            .where('gri.purchaseOrderItemId = :poiId', { poiId: poItem.id })
            .getRawOne();

          const previousPostedBase = rawPostedBase?.sum || '0';

          const costToUse =
            itemDto.provisionalCostUnitNet !== undefined &&
            itemDto.provisionalCostUnitNet !== null
              ? String(itemDto.provisionalCostUnitNet)
              : poItem.expectedCostUnitNet;

          const calc = calculateCumulativeGoodsReceiptBaseStock({
            orderedQty: poItem.orderedQty,
            conversionFactor: poItem.conversionFactorSnapshot,
            previousReceivedPurchaseQty: poItem.receivedQty,
            deltaPurchaseQty: itemDto.receivedQtyPurchaseUnit,
            previousPostedBase,
          });

          const subtotalProv = calculateProvisionalSubtotal(
            itemDto.receivedQtyPurchaseUnit,
            costToUse,
          );

          preparedLines.push({
            itemDto,
            poItem,
            costToUse,
            movementQtyBase: calc.movementQtyBase,
            newCumulativePurchaseQty: calc.newCumulativePurchaseQty,
            subtotalProv,
          });
        }

        // 3.5 Create GoodsReceipt header
        const goodsReceipt = manager.create(GoodsReceipt, {
          purchaseOrderId: purchaseOrder.id,
          supplierId: purchaseOrder.supplierId,
          deliveryNoteNumber: dto.deliveryNoteNumber.trim(),
          deliveryNoteNormalized,
          userId,
        });

        let savedReceipt: GoodsReceipt;
        try {
          savedReceipt = await manager.save(GoodsReceipt, goodsReceipt);
          const reloadedReceipt = await manager.findOne(GoodsReceipt, {
            where: { id: savedReceipt.id },
          });
          if (reloadedReceipt) {
            savedReceipt.receiptNumber = reloadedReceipt.receiptNumber;
            savedReceipt.createdAt = reloadedReceipt.createdAt;
          }
        } catch (err: any) {
          if (
            err?.code === '23505' &&
            err?.constraint ===
              'UQ_goods_receipts_supplier_delivery_note_normalized'
          ) {
            throw new ConflictException({
              code: GoodsReceiptErrorCode.GOODS_RECEIPT_DUPLICATE_DELIVERY_NOTE,
              message: `Ya existe una recepción registrada para el proveedor con el remito "${dto.deliveryNoteNumber}".`,
            });
          }
          throw err;
        }

        // 3.6 Sort lines deterministically by productId ASC to mitigate cross-order deadlocks
        const sortedLines = [...preparedLines].sort((a, b) =>
          a.poItem.productId.localeCompare(b.poItem.productId),
        );

        const savedReceiptItemsMap = new Map<string, GoodsReceiptItem>();

        for (const line of sortedLines) {
          const {
            poItem,
            costToUse,
            movementQtyBase,
            newCumulativePurchaseQty,
            subtotalProv,
            itemDto,
          } = line;

          // Record stock movement (acquires FOR UPDATE on Stock table)
          const movement = await this.stockService.recordMovement(
            {
              productId: poItem.productId,
              movementType: StockMovementType.ENTRADA_COMPRA,
              quantityBase: Number(movementQtyBase),
              reason: `Recepción OC ${purchaseOrder.orderNumber} - Remito ${dto.deliveryNoteNumber.trim()}`,
              documentReference: dto.deliveryNoteNumber.trim(),
              userId,
            },
            manager,
          );

          // Create GoodsReceiptItem
          const receiptItem = manager.create(GoodsReceiptItem, {
            goodsReceiptId: savedReceipt.id,
            purchaseOrderItemId: poItem.id,
            productId: poItem.productId,
            purchaseUnitId: poItem.purchaseUnitId,
            receivedQtyPurchaseUnit: new Decimal(
              itemDto.receivedQtyPurchaseUnit,
            ).toFixed(4),
            receivedQtyBase: movementQtyBase,
            conversionFactorUsed: new Decimal(
              poItem.conversionFactorSnapshot,
            ).toFixed(4),
            provisionalCostUnitNet: new Decimal(costToUse).toFixed(4),
            provisionalSubtotalNet: subtotalProv,
            stockMovementId: movement.id,
          });

          const savedItem = await manager.save(GoodsReceiptItem, receiptItem);
          savedItem.purchaseOrderItem = poItem;
          savedItem.product = poItem.product;
          savedItem.purchaseUnit = poItem.purchaseUnit;
          savedItem.stockMovement = {
            id: movement.id,
            previousStock: movement.previousStock,
            subsequentStock: movement.subsequentStock,
          } as any;

          savedReceiptItemsMap.set(poItem.id, savedItem);

          // Update PurchaseOrderItem.receivedQty in database
          poItem.receivedQty = newCumulativePurchaseQty;
          await manager.save(PurchaseOrderItem, poItem);
        }

        // 3.7 Recalculate PurchaseOrder status across all items
        const allCompleted = allPoItems.every((poi) =>
          new Decimal(poi.receivedQty).gte(new Decimal(poi.orderedQty)),
        );

        const previousStatus = purchaseOrder.status;
        const newStatus = allCompleted
          ? PurchaseOrderStatus.COMPLETADA
          : PurchaseOrderStatus.PARCIAL;

        purchaseOrder.status = newStatus;
        await manager.save(PurchaseOrder, purchaseOrder);

        // Reconstruct savedReceipt.items in original request order
        const savedReceiptItemsInOrder = dto.items.map((item) =>
          savedReceiptItemsMap.get(item.purchaseOrderItemId)!,
        );
        savedReceipt.items = savedReceiptItemsInOrder;
        savedReceipt.purchaseOrder = purchaseOrder;

        const supplier = await manager.findOne(Supplier, {
          where: { id: purchaseOrder.supplierId },
        });
        const user = await manager.findOne(User, {
          where: { id: userId },
        });
        savedReceipt.supplier = supplier || undefined;
        savedReceipt.user = user || undefined;
        purchaseOrder.supplier = supplier || undefined;
        purchaseOrder.user = user || undefined;
        purchaseOrder.items = allPoItems;

        // 3.8 Record Transactional Audit Logs
        // Event 1: GoodsReceipt CREATE
        await this.auditService.record(manager, {
          actorId: userId,
          action: AuditAction.CREATE,
          entityName: 'GoodsReceipt',
          entityId: savedReceipt.id,
          previousValues: null,
          newValues: {
            receiptNumber: savedReceipt.receiptNumber,
            purchaseOrderId: purchaseOrder.id,
            orderNumber: purchaseOrder.orderNumber,
            supplierId: purchaseOrder.supplierId,
            deliveryNoteNumber: dto.deliveryNoteNumber.trim(),
            deliveryNoteNormalized,
            items: savedReceiptItemsInOrder.map((item) => ({
              purchaseOrderItemId: item.purchaseOrderItemId,
              productId: item.productId,
              receivedQtyPurchaseUnit: item.receivedQtyPurchaseUnit,
              receivedQtyBase: item.receivedQtyBase,
              conversionFactorUsed: item.conversionFactorUsed,
              provisionalCostUnitNet: item.provisionalCostUnitNet,
              stockMovementId: item.stockMovementId,
            })),
          },
        });

        // Event 2: PurchaseOrder UPDATE
        await this.auditService.record(manager, {
          actorId: userId,
          action: AuditAction.UPDATE,
          entityName: 'PurchaseOrder',
          entityId: purchaseOrder.id,
          previousValues: {
            status: previousStatus,
            items: allPoItems.map((poi) => ({
              id: poi.id,
              receivedQty: initialPoItemReceivedQtys.get(poi.id),
            })),
          },
          newValues: {
            status: newStatus,
            receiptId: savedReceipt.id,
            receiptNumber: savedReceipt.receiptNumber,
            deliveryNoteNumber: dto.deliveryNoteNumber.trim(),
            items: allPoItems.map((poi) => ({
              id: poi.id,
              receivedQty: poi.receivedQty,
            })),
          },
        });

        return mapCreateGoodsReceiptToResponseDto(savedReceipt, purchaseOrder);
      });
    } catch (err: any) {
      if (err?.code === '40P01') {
        throw new ConflictException({
          code: GoodsReceiptErrorCode.GOODS_RECEIPT_CONCURRENCY_CONFLICT,
          message:
            'La operación no pudo completarse debido a contención concurrente de stock. Por favor reintente.',
        });
      }
      throw err;
    }
  }

  /**
   * Retrieves paginated historical goods receipts for a specific purchase order.
   * Accessible regardless of order status (including COMPLETADA and CANCELADA).
   */
  async findGoodsReceiptsByPurchaseOrder(
    purchaseOrderId: string,
    query: QueryGoodsReceiptsDto,
  ): Promise<PaginatedGoodsReceiptsResponseDto> {
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { id: purchaseOrderId },
      relations: ['supplier', 'user'],
    });

    if (!purchaseOrder) {
      throw new NotFoundException({
        code: GoodsReceiptErrorCode.GOODS_RECEIPT_PURCHASE_ORDER_NOT_FOUND,
        message: 'La orden de compra especificada no existe.',
      });
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const [receipts, total] = await this.goodsReceiptRepository.findAndCount({
      where: { purchaseOrderId },
      relations: [
        'purchaseOrder',
        'supplier',
        'user',
        'items',
        'items.purchaseOrderItem',
        'items.product',
        'items.purchaseUnit',
        'items.stockMovement',
      ],
      order: {
        createdAt: 'DESC',
        id: 'DESC',
      },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: receipts.map(mapGoodsReceiptToResponseDto),
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
}
