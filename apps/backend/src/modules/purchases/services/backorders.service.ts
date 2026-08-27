import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Decimal from 'decimal.js';
import {
  PurchaseOrderStatus,
  normalizeCuitForSearch,
  type IBackorderItem,
  type IBackorderOrder,
  type IBackordersResponse,
  type IBackorderSupplierGroup,
} from '@erp/shared-types';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../entities/purchase-order-item.entity';
import { QueryBackordersDto } from '../dto/query-backorders.dto';
import {
  calculateBackorderAgeDays,
  isBackorderUrgent,
} from '../utils/backorder-age.utils';

const supplierCollator = new Intl.Collator('es-AR', {
  sensitivity: 'base',
  numeric: true,
});

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

@Injectable()
export class BackordersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepo: Repository<PurchaseOrder>,
  ) {}

  async findPending(query: QueryBackordersDto): Promise<IBackordersResponse> {
    const now = new Date();
    const qb = this.purchaseOrderRepo
      .createQueryBuilder('po')
      .innerJoinAndSelect('po.supplier', 'supplier')
      .innerJoinAndSelect(
        'po.items',
        'items',
        'items.orderedQty > items.receivedQty',
      )
      .where('po.status IN (:...pendingStatuses)', {
        pendingStatuses: [
          PurchaseOrderStatus.EMITIDA,
          PurchaseOrderStatus.PARCIAL,
        ],
      })
      .andWhere('po.emittedAt IS NOT NULL');

    if (query.supplierId) {
      qb.andWhere('po.supplierId = :supplierId', {
        supplierId: query.supplierId,
      });
    }

    const normalizedSearch = query.search?.trim().toLowerCase();
    if (normalizedSearch) {
      const search = `%${escapeLikePattern(normalizedSearch)}%`;
      const normalizedCuit = normalizeCuitForSearch(normalizedSearch);
      const cuitSearch = normalizedCuit
        ? `%${escapeLikePattern(normalizedCuit)}%`
        : search;
      qb.andWhere(
        `(
          LOWER(po.orderNumber) LIKE :search ESCAPE '\\'
          OR LOWER(supplier.businessName) LIKE :search ESCAPE '\\'
          OR supplier.cuit LIKE :cuitSearch ESCAPE '\\'
          OR EXISTS (
            SELECT 1
            FROM purchase_order_items search_item
            WHERE search_item.purchase_order_id = po.id
              AND search_item.ordered_qty > search_item.received_qty
              AND (
                LOWER(search_item.product_code_snapshot) LIKE :search ESCAPE '\\'
                OR LOWER(search_item.product_name_snapshot) LIKE :search ESCAPE '\\'
                OR LOWER(search_item.supplier_sku_snapshot) LIKE :search ESCAPE '\\'
              )
          )
        )`,
        { search, cuitSearch },
      );
    }

    qb.orderBy('supplier.businessName', 'ASC')
      .addOrderBy('po.emittedAt', 'ASC')
      .addOrderBy('po.orderNumber', 'ASC')
      .addOrderBy('items.itemIndex', 'ASC');

    const purchaseOrders = await qb.getMany();
    const groupsBySupplier = new Map<string, IBackorderSupplierGroup>();

    for (const purchaseOrder of purchaseOrders) {
      if (!purchaseOrder.emittedAt || !purchaseOrder.supplier) continue;

      const ageDays = calculateBackorderAgeDays(purchaseOrder.emittedAt, now);
      const isUrgent = isBackorderUrgent(ageDays);
      if (query.urgentOnly && !isUrgent) continue;

      const items = this.mapPendingItems(purchaseOrder.items ?? []);
      if (items.length === 0) continue;

      const order: IBackorderOrder = {
        id: purchaseOrder.id,
        orderNumber: purchaseOrder.orderNumber,
        status: purchaseOrder.status as
          PurchaseOrderStatus.EMITIDA | PurchaseOrderStatus.PARCIAL,
        emittedAt: purchaseOrder.emittedAt.toISOString(),
        expectedDeliveryDate: purchaseOrder.expectedDeliveryDate ?? null,
        ageDays,
        isUrgent,
        pendingLineCount: items.length,
        items,
      };

      const existing = groupsBySupplier.get(purchaseOrder.supplierId);
      if (existing) {
        existing.orders.push(order);
      } else {
        groupsBySupplier.set(purchaseOrder.supplierId, {
          supplier: {
            id: purchaseOrder.supplier.id,
            businessName: purchaseOrder.supplier.businessName,
            cuit: purchaseOrder.supplier.cuit,
          },
          orderCount: 0,
          pendingProductCount: 0,
          pendingLineCount: 0,
          urgentOrderCount: 0,
          orders: [order],
        });
      }
    }

    const groups = Array.from(groupsBySupplier.values())
      .map((group) => this.withGroupCounts(group))
      .sort((left, right) =>
        supplierCollator.compare(
          left.supplier.businessName,
          right.supplier.businessName,
        ),
      );

    const globalProductIds = new Set<string>();
    let orderCount = 0;
    let pendingLineCount = 0;
    let urgentOrderCount = 0;

    for (const group of groups) {
      orderCount += group.orderCount;
      pendingLineCount += group.pendingLineCount;
      urgentOrderCount += group.urgentOrderCount;
      for (const order of group.orders) {
        for (const item of order.items) globalProductIds.add(item.productId);
      }
    }

    return {
      generatedAt: now.toISOString(),
      summary: {
        supplierCount: groups.length,
        orderCount,
        pendingProductCount: globalProductIds.size,
        pendingLineCount,
        urgentOrderCount,
      },
      groups,
    };
  }

  private mapPendingItems(items: PurchaseOrderItem[]): IBackorderItem[] {
    return [...items]
      .sort((left, right) => left.itemIndex - right.itemIndex)
      .flatMap((item) => {
        const orderedQty = new Decimal(item.orderedQty);
        const receivedQty = new Decimal(item.receivedQty ?? 0);
        const pendingQty = orderedQty.minus(receivedQty);
        if (!pendingQty.gt(0)) return [];

        return [
          {
            purchaseOrderItemId: item.id,
            productId: item.productId,
            productCode: item.productCodeSnapshot,
            productName: item.productNameSnapshot,
            supplierSku: item.supplierSkuSnapshot,
            purchaseUnitName: item.purchaseUnitNameSnapshot,
            purchaseUnitSymbol: item.purchaseUnitSymbolSnapshot,
            orderedQty: orderedQty.toFixed(4),
            receivedQty: receivedQty.toFixed(4),
            pendingQty: pendingQty.toFixed(4),
          },
        ];
      });
  }

  private withGroupCounts(
    group: IBackorderSupplierGroup,
  ): IBackorderSupplierGroup {
    group.orders.sort((left, right) => {
      if (left.ageDays !== right.ageDays) return right.ageDays - left.ageDays;
      return left.orderNumber.localeCompare(right.orderNumber, 'es-AR', {
        numeric: true,
      });
    });

    const productIds = new Set<string>();
    let pendingLineCount = 0;
    let urgentOrderCount = 0;

    for (const order of group.orders) {
      pendingLineCount += order.pendingLineCount;
      if (order.isUrgent) urgentOrderCount += 1;
      for (const item of order.items) productIds.add(item.productId);
    }

    return {
      ...group,
      orderCount: group.orders.length,
      pendingProductCount: productIds.size,
      pendingLineCount,
      urgentOrderCount,
    };
  }
}
