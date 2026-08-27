import { PurchaseOrderStatus, SupplierInvoiceStatus } from '../enums/purchases.enum';

export interface IPurchaseOrderItemPayload {
  supplierProductId: string;
  orderedQty: string | number;
  expectedCostUnitNet?: string | number | null;
}

export interface ICreatePurchaseOrderPayload {
  supplierId: string;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  items: IPurchaseOrderItemPayload[];
}

export interface IUpdatePurchaseOrderPayload {
  supplierId?: string;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  items?: IPurchaseOrderItemPayload[];
}

export interface ICancelPurchaseOrderPayload {
  cancelReason?: string | null;
}

export interface IPurchaseOrderItemDetail {
  id: string;
  itemIndex: number;
  supplierProductId: string;
  productId: string;
  purchaseUnitId: string;
  supplierSku: string;
  productCode: string;
  productName: string;
  purchaseUnitName: string;
  purchaseUnitSymbol: string;
  conversionFactor: string;
  orderedQty: string;
  receivedQty: string;
  pendingQty: string;
  expectedCostUnitNet: string;
  subtotalNet: string;
  createdAt: string;
  updatedAt: string;
}

export interface IPurchaseOrderSummary {
  id: string;
  orderNumber: string;
  supplier: {
    id: string;
    businessName: string;
    cuit: string;
  };
  status: PurchaseOrderStatus;
  expectedDeliveryDate: string | null;
  notes: string | null;
  totalNet: string;
  itemsCount: number;
  user: {
    id: string;
    name: string;
    email: string;
  };
  emittedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IPurchaseOrderDetail extends IPurchaseOrderSummary {
  items: IPurchaseOrderItemDetail[];
}

export interface IPurchaseOrderSearchParams {
  page?: number;
  limit?: number;
  supplierId?: string;
  status?: PurchaseOrderStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// Backward-compatible alias for preliminary models
export type IPurchaseOrderItem = IPurchaseOrderItemDetail;
export type IPurchaseOrder = IPurchaseOrderDetail;

// Goods Receipt Models
export interface ICreateGoodsReceiptItemPayload {
  purchaseOrderItemId: string;
  receivedQtyPurchaseUnit: number;
  provisionalCostUnitNet?: number | null;
}

export interface ICreateGoodsReceiptPayload {
  deliveryNoteNumber: string;
  items: ICreateGoodsReceiptItemPayload[];
}

export interface IGoodsReceiptItemDetail {
  id: string;
  purchaseOrderItemId: string;
  productId: string;
  productCode: string;
  productName: string;
  purchaseUnitId: string;
  purchaseUnitName: string;
  purchaseUnitSymbol: string;
  receivedQtyPurchaseUnit: string;
  conversionFactorUsed: string;
  receivedQtyBase: string;
  provisionalCostUnitNet: string;
  provisionalSubtotalNet: string;
  stockMovementId: string;
  previousStock: string;
  subsequentStock: string;
}

export interface IGoodsReceiptDetail {
  id: string;
  receiptNumber: string;
  purchaseOrderId: string;
  orderNumber: string;
  supplier: {
    id: string;
    businessName: string;
    cuit: string;
  };
  deliveryNoteNumber: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  items: IGoodsReceiptItemDetail[];
}

export interface ICreateGoodsReceiptResponse {
  receipt: IGoodsReceiptDetail;
  resultingPurchaseOrder: {
    id: string;
    status: PurchaseOrderStatus;
    items: Array<{
      purchaseOrderItemId: string;
      orderedQty: string;
      receivedQty: string;
      pendingQty: string;
    }>;
  };
}

export interface IQueryGoodsReceiptsParams {
  page?: number;
  limit?: number;
}

export interface IPaginatedGoodsReceiptsResponse {
  data: IGoodsReceiptDetail[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// Backward-compatible alias for preliminary models
export type IGoodsReceipt = IGoodsReceiptDetail;
export type IGoodsReceiptItem = IGoodsReceiptItemDetail;

export interface ISupplierInvoiceItem {
  id: string;
  supplierInvoiceId: string;
  productId: string;
  quantityBilled: number;
  unitCostNet: number;
  subtotalNet: number;
}

export interface ISupplierInvoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  purchaseOrderId?: string | null;
  goodsReceiptId?: string | null;
  status: SupplierInvoiceStatus;
  totalNet: number;
  ivaTotal: number;
  totalGross: number;
  observationReason?: string | null;
  authorizedByUserId?: string | null;
  authorizedAt?: Date | string | null;
  items?: ISupplierInvoiceItem[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ISupplierCostAdjustment {
  id: string;
  supplierInvoiceId: string;
  productId: string;
  previousCostNet: number;
  newCostNet: number;
  deltaCostUnit: number;
  stockQtyAdjusted: number;
  cogsQtyAdjusted: number;
  totalStockRevaluation: number;
  totalCogsAdjustment: number;
  appliedAt: Date | string;
}
