import Decimal from 'decimal.js';
import {
  IPaginatedSupplierInvoicesResponse,
  ISupplierInvoiceDetail,
  ISupplierInvoiceItemDetail,
  ISupplierInvoiceSummary,
  SupplierInvoiceQuantityStatus,
} from '@erp/shared-types';
import { SupplierInvoice } from '../entities/supplier-invoice.entity';
import { SupplierInvoiceItem } from '../entities/supplier-invoice-item.entity';

const fixed = (value: string, places: number): string =>
  new Decimal(value).toFixed(places);

export function mapSupplierInvoiceItem(
  item: SupplierInvoiceItem,
): ISupplierInvoiceItemDetail {
  return {
    id: item.id,
    itemIndex: item.itemIndex,
    goodsReceiptItemId: item.goodsReceiptItemId,
    purchaseOrderItemId: item.purchaseOrderItemId,
    productId: item.productId,
    productCode: item.productCodeSnapshot,
    productName: item.productNameSnapshot,
    purchaseUnitId: item.purchaseUnitId,
    purchaseUnitName: item.purchaseUnitNameSnapshot,
    purchaseUnitSymbol: item.purchaseUnitSymbolSnapshot,
    conversionFactor: fixed(item.conversionFactorSnapshot, 4),
    receivedQtyPurchaseUnit: fixed(item.receivedQtyPurchaseUnit, 4),
    previouslyAllocatedQtyPurchaseUnit: fixed(
      item.previouslyAllocatedQtyPurchaseUnit,
      4,
    ),
    availableQtyBefore: fixed(item.availableQtyBefore, 4),
    invoicedQtyPurchaseUnit: fixed(item.invoicedQtyPurchaseUnit, 4),
    allocatedReceivedQtyPurchaseUnit: fixed(
      item.allocatedReceivedQtyPurchaseUnit,
      4,
    ),
    allocatedReceivedQtyBase: fixed(item.allocatedReceivedQtyBase, 2),
    pendingQtyAfter: fixed(item.pendingQtyAfter, 4),
    quantityExcess: fixed(item.quantityExcess, 4),
    quantityStatus: item.quantityStatus,
    provisionalCostUnitNet: fixed(item.provisionalCostUnitNet, 4),
    unitPriceNet: fixed(item.unitPriceNet, 4),
    discountNet: fixed(item.discountNet, 4),
    bonusNet: fixed(item.bonusNet, 4),
    surchargeNet: fixed(item.surchargeNet, 4),
    realCostUnitNet: fixed(item.realCostUnitNet, 4),
    lineNetTotal: fixed(item.lineNetTotal, 4),
  };
}

export function mapSupplierInvoiceSummary(
  invoice: SupplierInvoice,
): ISupplierInvoiceSummary {
  const items = invoice.items ?? [];
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    supplier: {
      id: invoice.supplier?.id ?? invoice.supplierId,
      businessName: invoice.supplier?.businessName ?? '',
      cuit: invoice.supplier?.cuit ?? '',
    },
    goodsReceipt: {
      id: invoice.goodsReceipt?.id ?? invoice.goodsReceiptId,
      receiptNumber: invoice.goodsReceipt?.receiptNumber ?? '',
      deliveryNoteNumber: invoice.goodsReceipt?.deliveryNoteNumber ?? '',
      createdAt: invoice.goodsReceipt?.createdAt?.toISOString() ?? '',
    },
    purchaseOrder: {
      id: invoice.purchaseOrder?.id ?? invoice.purchaseOrderId,
      orderNumber: invoice.purchaseOrder?.orderNumber ?? '',
    },
    invoiceDate: invoice.invoiceDate,
    status: invoice.status,
    netTotal: fixed(invoice.netTotal, 4),
    taxTotal: fixed(invoice.taxTotal, 4),
    totalAmount: fixed(invoice.totalAmount, 4),
    itemCount: items.length,
    observedLineCount: items.filter(
      (item) => item.quantityStatus === SupplierInvoiceQuantityStatus.EXCEDIDA,
    ).length,
    user: {
      id: invoice.user?.id ?? invoice.userId,
      name: invoice.user?.name ?? '',
      email: invoice.user?.email ?? '',
    },
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  };
}

export function mapSupplierInvoiceDetail(
  invoice: SupplierInvoice,
): ISupplierInvoiceDetail {
  return {
    ...mapSupplierInvoiceSummary(invoice),
    items: [...(invoice.items ?? [])]
      .sort((a, b) => a.itemIndex - b.itemIndex)
      .map(mapSupplierInvoiceItem),
  };
}

export function paginateSupplierInvoices(
  invoices: SupplierInvoice[],
  total: number,
  page: number,
  limit: number,
): IPaginatedSupplierInvoicesResponse {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    data: invoices.map(mapSupplierInvoiceSummary),
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
