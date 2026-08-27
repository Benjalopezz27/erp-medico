import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import Decimal from 'decimal.js';
import {
  AuditAction,
  IPaginatedPendingInvoiceReceiptsResponse,
  IPaginatedSupplierInvoicesResponse,
  IPendingInvoiceReceipt,
  ISupplierInvoiceDetail,
  SupplierInvoiceErrorCode,
  SupplierInvoiceQuantityStatus,
  SupplierInvoiceStatus,
} from '@erp/shared-types';
import { AuditService } from '../../audit/audit.service';
import { GoodsReceipt } from '../entities/goods-receipt.entity';
import { GoodsReceiptItem } from '../entities/goods-receipt-item.entity';
import { PurchaseOrderItem } from '../entities/purchase-order-item.entity';
import { SupplierInvoice } from '../entities/supplier-invoice.entity';
import { SupplierInvoiceItem } from '../entities/supplier-invoice-item.entity';
import { CreateSupplierInvoiceDto } from '../dto/create-supplier-invoice.dto';
import { QuerySupplierInvoicesDto } from '../dto/query-supplier-invoices.dto';
import { QueryPendingInvoiceReceiptsDto } from '../dto/query-pending-invoice-receipts.dto';
import {
  calculateSupplierInvoiceAllocation,
  calculateSupplierInvoiceAmounts,
  calculateSupplierInvoiceTax,
} from '../utils/supplier-invoice-math.utils';
import { evaluateSupplierInvoiceCost } from '../utils/supplier-invoice-tolerance.utils';
import { SystemConfigService } from '../../config/system-config.service';
import { normalizeSupplierInvoiceNumber } from '../utils/supplier-invoice-number-normalizer';
import {
  mapSupplierInvoiceDetail,
  paginateSupplierInvoices,
} from '../mappers/supplier-invoice.mapper';

const ACTIVE_ALLOCATION_STATUSES = [
  SupplierInvoiceStatus.VALIDANDO,
  SupplierInvoiceStatus.OBSERVADA,
  SupplierInvoiceStatus.AUTORIZADA,
  SupplierInvoiceStatus.CONFIRMADA,
];

interface AllocationTotals {
  purchase: string;
  base: string;
}

@Injectable()
export class SupplierInvoicesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly systemConfigService: SystemConfigService,
    @InjectRepository(SupplierInvoice)
    private readonly invoiceRepository: Repository<SupplierInvoice>,
    @InjectRepository(GoodsReceipt)
    private readonly receiptRepository: Repository<GoodsReceipt>,
  ) {}

  async create(
    dto: CreateSupplierInvoiceDto,
    userId: string,
  ): Promise<ISupplierInvoiceDetail> {
    const normalizedNumber = normalizeSupplierInvoiceNumber(dto.invoiceNumber);
    this.validateInvoiceDate(dto.invoiceDate);
    if (!dto.items?.length) {
      throw new BadRequestException({
        code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_EMPTY_ITEMS,
        message: 'Debe incluir al menos una línea de factura.',
      });
    }
    if (
      new Set(dto.items.map((item) => item.goodsReceiptItemId)).size !==
      dto.items.length
    ) {
      throw new BadRequestException({
        code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_DUPLICATE_ITEM,
        message:
          'No se puede facturar dos veces la misma línea en un comprobante.',
      });
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const receipt = await manager
          .createQueryBuilder(GoodsReceipt, 'receipt')
          .setLock('pessimistic_write')
          .where('receipt.id = :id', { id: dto.goodsReceiptId })
          .getOne();
        if (!receipt) {
          throw new NotFoundException({
            code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_RECEIPT_NOT_FOUND,
            message: 'La recepción indicada no existe.',
          });
        }
        const toleranceSnapshot =
          await this.systemConfigService.getPurchaseToleranceSnapshot(manager);

        const duplicate = await manager.findOne(SupplierInvoice, {
          where: {
            supplierId: receipt.supplierId,
            invoiceNumberNormalized: normalizedNumber,
          },
        });
        if (duplicate) this.throwDuplicate(dto.invoiceNumber);

        const receiptItems = await manager
          .createQueryBuilder(GoodsReceiptItem, 'item')
          .setLock('pessimistic_write')
          .where('item.goodsReceiptId = :receiptId', { receiptId: receipt.id })
          .orderBy('item.id', 'ASC')
          .getMany();
        const receiptItemMap = new Map(
          receiptItems.map((item) => [item.id, item]),
        );
        const poItems = await manager.find(PurchaseOrderItem, {
          where: {
            id: In(receiptItems.map((item) => item.purchaseOrderItemId)),
          },
        });
        const poItemMap = new Map(poItems.map((item) => [item.id, item]));
        const allocations = await this.loadAllocationTotals(
          manager,
          receiptItems.map((item) => item.id),
        );

        const prepared = dto.items.map((input, index) => {
          const receiptItem = receiptItemMap.get(input.goodsReceiptItemId);
          if (!receiptItem) {
            throw new NotFoundException({
              code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_ITEM_MISMATCH,
              message:
                'Una línea no existe o no pertenece a la recepción indicada.',
            });
          }
          const poItem = poItemMap.get(receiptItem.purchaseOrderItemId);
          if (!poItem) {
            throw new ConflictException({
              code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_ALLOCATION_INCONSISTENT,
              message:
                'No se encontraron los datos históricos de la línea recibida.',
            });
          }
          const previous = allocations.get(receiptItem.id) ?? {
            purchase: '0',
            base: '0',
          };
          const allocation = calculateSupplierInvoiceAllocation({
            receivedQtyPurchaseUnit: receiptItem.receivedQtyPurchaseUnit,
            receivedQtyBase: receiptItem.receivedQtyBase,
            previouslyAllocatedQtyPurchaseUnit: previous.purchase,
            previouslyAllocatedQtyBase: previous.base,
            invoicedQtyPurchaseUnit: input.invoicedQtyPurchaseUnit,
          });
          const amounts = calculateSupplierInvoiceAmounts({
            invoicedQty: input.invoicedQtyPurchaseUnit,
            unitPriceNet: input.unitPriceNet,
            discountNet: input.discountNet,
            bonusNet: input.bonusNet,
            surchargeNet: input.surchargeNet,
            discountMode: input.discountMode,
            discountPercentage: input.discountPercentage,
            bonusMode: input.bonusMode,
            bonusPercentage: input.bonusPercentage,
            surchargeMode: input.surchargeMode,
            surchargePercentage: input.surchargePercentage,
          });
          const costEvaluation = evaluateSupplierInvoiceCost({
            provisionalCostUnitNet: receiptItem.provisionalCostUnitNet,
            realCostUnitNet: amounts.realCostUnitNet,
            tolerancePercentage: toleranceSnapshot,
          });
          return {
            index,
            input,
            receiptItem,
            poItem,
            allocation,
            amounts,
            costEvaluation,
          };
        });

        const netTotalDecimal = prepared.reduce(
          (total, line) => total.plus(line.amounts.lineNetTotal),
          new Decimal(0),
        );
        const tax = calculateSupplierInvoiceTax({
          netTotal: netTotalDecimal,
          taxTotal: dto.taxTotal,
          taxMode: dto.taxMode,
          taxPercentage: dto.taxPercentage,
        });
        const totalAmountDecimal = netTotalDecimal.plus(tax.taxTotal);
        if (
          netTotalDecimal.gt('99999999999999999999.9999') ||
          totalAmountDecimal.gt('99999999999999999999.9999')
        ) {
          throw new BadRequestException({
            code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_COST,
            message: 'El total de la factura supera el máximo permitido.',
          });
        }
        const observed = prepared.some(
          (line) =>
            line.allocation.quantityStatus ===
              SupplierInvoiceQuantityStatus.EXCEDIDA ||
            line.costEvaluation.costObserved,
        );

        let invoice = await manager.save(
          SupplierInvoice,
          manager.create(SupplierInvoice, {
            invoiceNumber: dto.invoiceNumber.trim(),
            invoiceNumberNormalized: normalizedNumber,
            supplierId: receipt.supplierId,
            goodsReceiptId: receipt.id,
            purchaseOrderId: receipt.purchaseOrderId,
            invoiceDate: dto.invoiceDate,
            status: observed
              ? SupplierInvoiceStatus.OBSERVADA
              : SupplierInvoiceStatus.AUTORIZADA,
            netTotal: netTotalDecimal.toFixed(4),
            taxTotal: tax.taxTotal,
            taxMode: tax.taxMode,
            taxPercentage: tax.taxPercentage,
            costTolerancePercentageSnapshot: toleranceSnapshot,
            totalAmount: totalAmountDecimal.toFixed(4),
            userId,
          }),
        );

        const invoiceItems = prepared.map((line) =>
          manager.create(SupplierInvoiceItem, {
            supplierInvoiceId: invoice.id,
            itemIndex: line.index + 1,
            goodsReceiptItemId: line.receiptItem.id,
            purchaseOrderItemId: line.receiptItem.purchaseOrderItemId,
            productId: line.receiptItem.productId,
            purchaseUnitId: line.receiptItem.purchaseUnitId,
            productCodeSnapshot: line.poItem.productCodeSnapshot,
            productNameSnapshot: line.poItem.productNameSnapshot,
            purchaseUnitNameSnapshot: line.poItem.purchaseUnitNameSnapshot,
            purchaseUnitSymbolSnapshot: line.poItem.purchaseUnitSymbolSnapshot,
            conversionFactorSnapshot: line.receiptItem.conversionFactorUsed,
            receivedQtyPurchaseUnit: line.receiptItem.receivedQtyPurchaseUnit,
            provisionalCostUnitNet: line.receiptItem.provisionalCostUnitNet,
            invoicedQtyPurchaseUnit: line.input.invoicedQtyPurchaseUnit,
            ...line.allocation,
            ...line.amounts,
            ...line.costEvaluation,
            quantityObserved:
              line.allocation.quantityStatus ===
              SupplierInvoiceQuantityStatus.EXCEDIDA,
          }),
        );
        invoice.items = await manager.save(SupplierInvoiceItem, invoiceItems);

        await this.auditService.record(manager, {
          actorId: userId,
          action: AuditAction.CREATE,
          entityName: 'SupplierInvoice',
          entityId: invoice.id,
          previousValues: null,
          newValues: {
            invoiceNumber: invoice.invoiceNumber,
            goodsReceiptId: invoice.goodsReceiptId,
            status: invoice.status,
            netTotal: invoice.netTotal,
            taxTotal: invoice.taxTotal,
            totalAmount: invoice.totalAmount,
            costTolerancePercentageSnapshot: toleranceSnapshot,
            observations: invoice.items.map((item) => ({
              productId: item.productId,
              quantityObserved: item.quantityObserved,
              costObserved: item.costObserved,
              costDifferenceUnitNet: item.costDifferenceUnitNet,
              costVariationPercentage: item.costVariationPercentage,
            })),
          },
        });

        invoice = (await manager.findOne(SupplierInvoice, {
          where: { id: invoice.id },
          relations: {
            supplier: true,
            goodsReceipt: true,
            purchaseOrder: true,
            user: true,
            decisionUser: true,
            confirmedBy: true,
            items: true,
            costAdjustments: true,
            priceReviews: true,
          },
        }))!;
        return mapSupplierInvoiceDetail(invoice);
      });
    } catch (error: any) {
      if (error?.code === '23505') this.throwDuplicate(dto.invoiceNumber);
      if (error?.code === '40P01' || error?.code === '40001') {
        throw new ConflictException({
          code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_CONCURRENCY_CONFLICT,
          message:
            'La recepción fue modificada simultáneamente. Vuelva a intentarlo.',
        });
      }
      throw error;
    }
  }

  async findAll(
    query: QuerySupplierInvoicesDto,
  ): Promise<IPaginatedSupplierInvoicesResponse> {
    const { page = 1, limit = 20 } = query;
    const qb = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.supplier', 'supplier')
      .leftJoinAndSelect('invoice.goodsReceipt', 'receipt')
      .leftJoinAndSelect('invoice.purchaseOrder', 'purchaseOrder')
      .leftJoinAndSelect('invoice.user', 'user')
      .leftJoinAndSelect('invoice.items', 'items');
    if (query.supplierId)
      qb.andWhere('invoice.supplierId = :supplierId', {
        supplierId: query.supplierId,
      });
    if (query.status)
      qb.andWhere('invoice.status = :status', { status: query.status });
    if (query.dateFrom)
      qb.andWhere('invoice.invoiceDate >= :dateFrom', {
        dateFrom: query.dateFrom,
      });
    if (query.dateTo)
      qb.andWhere('invoice.invoiceDate <= :dateTo', { dateTo: query.dateTo });
    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        `(invoice.invoiceNumber ILIKE :search OR supplier.businessName ILIKE :search OR supplier.cuit ILIKE :search OR receipt.receiptNumber ILIKE :search OR receipt.deliveryNoteNumber ILIKE :search OR purchaseOrder.orderNumber ILIKE :search OR EXISTS (SELECT 1 FROM supplier_invoice_items sii LEFT JOIN purchase_order_items poi ON poi.id = sii.purchase_order_item_id WHERE sii.supplier_invoice_id = invoice.id AND (sii.product_code_snapshot ILIKE :search OR sii.product_name_snapshot ILIKE :search OR poi.supplier_sku_snapshot ILIKE :search)))`,
        { search },
      );
    }
    qb.orderBy('invoice.createdAt', 'DESC')
      .addOrderBy('invoice.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    const [invoices, total] = await qb.getManyAndCount();
    return paginateSupplierInvoices(invoices, total, page, limit);
  }

  async findOne(id: string): Promise<ISupplierInvoiceDetail> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: {
        supplier: true,
        goodsReceipt: true,
        purchaseOrder: true,
        user: true,
        decisionUser: true,
        confirmedBy: true,
        items: true,
        costAdjustments: true,
        priceReviews: true,
      },
    });
    if (!invoice) {
      throw new NotFoundException({
        code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_NOT_FOUND,
        message: 'La factura de proveedor indicada no existe.',
      });
    }
    return mapSupplierInvoiceDetail(invoice);
  }

  async findPendingReceipts(
    query: QueryPendingInvoiceReceiptsDto,
  ): Promise<IPaginatedPendingInvoiceReceiptsResponse> {
    const receipts = await this.receiptRepository.find({
      relations: {
        supplier: true,
        purchaseOrder: true,
        items: { purchaseOrderItem: true },
      },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    const allItemIds = receipts.flatMap((receipt) =>
      (receipt.items ?? []).map((item) => item.id),
    );
    const allocations = await this.loadAllocationTotals(
      this.dataSource.manager,
      allItemIds,
    );
    const search = query.search?.trim().toLocaleLowerCase('es-AR');
    const mapped: IPendingInvoiceReceipt[] = receipts.flatMap((receipt) => {
      if (query.supplierId && receipt.supplierId !== query.supplierId)
        return [];
      const pendingItems = (receipt.items ?? []).flatMap((item) => {
        const allocated = new Decimal(
          allocations.get(item.id)?.purchase ?? '0',
        );
        const available = new Decimal(item.receivedQtyPurchaseUnit).minus(
          allocated,
        );
        if (available.lte(0)) return [];
        const poItem = item.purchaseOrderItem!;
        return [
          {
            goodsReceiptItemId: item.id,
            purchaseOrderItemId: item.purchaseOrderItemId,
            productId: item.productId,
            productCode: poItem.productCodeSnapshot,
            productName: poItem.productNameSnapshot,
            supplierSku: poItem.supplierSkuSnapshot,
            purchaseUnitId: item.purchaseUnitId,
            purchaseUnitName: poItem.purchaseUnitNameSnapshot,
            purchaseUnitSymbol: poItem.purchaseUnitSymbolSnapshot,
            conversionFactor: new Decimal(item.conversionFactorUsed).toFixed(4),
            receivedQtyPurchaseUnit: new Decimal(
              item.receivedQtyPurchaseUnit,
            ).toFixed(4),
            previouslyAllocatedQtyPurchaseUnit: allocated.toFixed(4),
            availableQtyPurchaseUnit: available.toFixed(4),
            receivedQtyBase: new Decimal(item.receivedQtyBase).toFixed(2),
            provisionalCostUnitNet: new Decimal(
              item.provisionalCostUnitNet,
            ).toFixed(4),
          },
        ];
      });
      if (!pendingItems.length) return [];
      const haystack = [
        receipt.receiptNumber,
        receipt.deliveryNoteNumber,
        receipt.supplier?.businessName,
        receipt.supplier?.cuit,
        receipt.purchaseOrder?.orderNumber,
        ...pendingItems.flatMap((item) => [
          item.productCode,
          item.productName,
          item.supplierSku,
        ]),
      ]
        .join(' ')
        .toLocaleLowerCase('es-AR');
      if (search && !haystack.includes(search)) return [];
      return [
        {
          id: receipt.id,
          receiptNumber: receipt.receiptNumber,
          deliveryNoteNumber: receipt.deliveryNoteNumber,
          createdAt: receipt.createdAt.toISOString(),
          supplier: {
            id: receipt.supplierId,
            businessName: receipt.supplier?.businessName ?? '',
            cuit: receipt.supplier?.cuit ?? '',
          },
          purchaseOrder: {
            id: receipt.purchaseOrderId,
            orderNumber: receipt.purchaseOrder?.orderNumber ?? '',
          },
          pendingLineCount: pendingItems.length,
          items: pendingItems,
        },
      ];
    });
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const total = mapped.length;
    const totalPages = Math.ceil(total / limit) || 1;
    return {
      data: mapped.slice((page - 1) * limit, page * limit),
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

  private async loadAllocationTotals(
    manager: any,
    receiptItemIds: string[],
  ): Promise<Map<string, AllocationTotals>> {
    if (!receiptItemIds.length) return new Map();
    const rows = await manager
      .createQueryBuilder(SupplierInvoiceItem, 'item')
      .innerJoin(
        SupplierInvoice,
        'invoice',
        'invoice.id = item.supplierInvoiceId',
      )
      .select('item.goodsReceiptItemId', 'goodsReceiptItemId')
      .addSelect(
        'COALESCE(SUM(item.allocatedReceivedQtyPurchaseUnit), 0)',
        'purchase',
      )
      .addSelect('COALESCE(SUM(item.allocatedReceivedQtyBase), 0)', 'base')
      .where('item.goodsReceiptItemId IN (:...ids)', { ids: receiptItemIds })
      .andWhere('invoice.status IN (:...statuses)', {
        statuses: ACTIVE_ALLOCATION_STATUSES,
      })
      .groupBy('item.goodsReceiptItemId')
      .getRawMany();
    return new Map(
      rows.map((row: any) => [
        row.goodsReceiptItemId,
        { purchase: row.purchase, base: row.base },
      ]),
    );
  }

  private validateInvoiceDate(value: string): void {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    const date = match ? new Date(`${value}T00:00:00.000Z`) : null;
    if (
      !match ||
      !date ||
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new BadRequestException({
        code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_DATE,
        message:
          'La fecha de factura debe ser una fecha calendario válida (YYYY-MM-DD).',
      });
    }
  }

  private throwDuplicate(number: string): never {
    throw new ConflictException({
      code: SupplierInvoiceErrorCode.SUPPLIER_INVOICE_DUPLICATE_NUMBER,
      message: `Ya existe la factura "${number.trim()}" para este proveedor.`,
    });
  }
}
