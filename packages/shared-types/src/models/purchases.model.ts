import {
  PurchaseOrderStatus,
  SupplierInvoiceAdjustmentMode,
  SupplierInvoiceCostStatus,
  SupplierInvoiceDecisionAction,
  SupplierInvoiceObservationReason,
  SupplierInvoiceQuantityStatus,
  SupplierInvoiceStatus,
} from '../enums/purchases.enum';

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

export interface IBackorderSearchParams {
  search?: string;
  supplierId?: string;
  urgentOnly?: boolean;
}

export interface IBackorderItem {
  purchaseOrderItemId: string;
  productId: string;
  productCode: string;
  productName: string;
  supplierSku: string;
  purchaseUnitName: string;
  purchaseUnitSymbol: string;
  orderedQty: string;
  receivedQty: string;
  pendingQty: string;
}

export interface IBackorderOrder {
  id: string;
  orderNumber: string;
  status: PurchaseOrderStatus.EMITIDA | PurchaseOrderStatus.PARCIAL;
  emittedAt: string;
  expectedDeliveryDate: string | null;
  ageDays: number;
  isUrgent: boolean;
  pendingLineCount: number;
  items: IBackorderItem[];
}

export interface IBackorderSupplierGroup {
  supplier: {
    id: string;
    businessName: string;
    cuit: string;
  };
  orderCount: number;
  pendingProductCount: number;
  pendingLineCount: number;
  urgentOrderCount: number;
  orders: IBackorderOrder[];
}

export interface IBackordersResponse {
  generatedAt: string;
  summary: {
    supplierCount: number;
    orderCount: number;
    pendingProductCount: number;
    pendingLineCount: number;
    urgentOrderCount: number;
  };
  groups: IBackorderSupplierGroup[];
}

// Backward-compatible alias for preliminary models
export type IGoodsReceipt = IGoodsReceiptDetail;
export type IGoodsReceiptItem = IGoodsReceiptItemDetail;

export interface ICreateSupplierInvoiceItemPayload {
  goodsReceiptItemId: string;
  invoicedQtyPurchaseUnit: string;
  unitPriceNet: string;
  discountNet?: string;
  bonusNet?: string;
  surchargeNet?: string;
  discountMode?: SupplierInvoiceAdjustmentMode;
  discountPercentage?: string;
  bonusMode?: SupplierInvoiceAdjustmentMode;
  bonusPercentage?: string;
  surchargeMode?: SupplierInvoiceAdjustmentMode;
  surchargePercentage?: string;
}

export interface ICreateSupplierInvoicePayload {
  goodsReceiptId: string;
  invoiceNumber: string;
  invoiceDate: string;
  taxTotal: string;
  taxMode?: SupplierInvoiceAdjustmentMode;
  taxPercentage?: string;
  items: ICreateSupplierInvoiceItemPayload[];
}

export interface ISupplierInvoiceItemDetail {
  id: string;
  itemIndex: number;
  goodsReceiptItemId: string;
  purchaseOrderItemId: string;
  productId: string;
  productCode: string;
  productName: string;
  purchaseUnitId: string;
  purchaseUnitName: string;
  purchaseUnitSymbol: string;
  conversionFactor: string;
  receivedQtyPurchaseUnit: string;
  previouslyAllocatedQtyPurchaseUnit: string;
  availableQtyBefore: string;
  invoicedQtyPurchaseUnit: string;
  allocatedReceivedQtyPurchaseUnit: string;
  allocatedReceivedQtyBase: string;
  pendingQtyAfter: string;
  quantityExcess: string;
  quantityStatus: SupplierInvoiceQuantityStatus;
  provisionalCostUnitNet: string;
  unitPriceNet: string;
  discountNet: string;
  bonusNet: string;
  surchargeNet: string;
  realCostUnitNet: string;
  lineNetTotal: string;
  discountMode: SupplierInvoiceAdjustmentMode;
  discountPercentage: string | null;
  bonusMode: SupplierInvoiceAdjustmentMode;
  bonusPercentage: string | null;
  surchargeMode: SupplierInvoiceAdjustmentMode;
  surchargePercentage: string | null;
  costDifferenceUnitNet: string;
  costVariationPercentage: string | null;
  costStatus: SupplierInvoiceCostStatus;
  observationReasons: SupplierInvoiceObservationReason[];
}

export interface ISupplierInvoiceSummary {
  id: string;
  invoiceNumber: string;
  supplier: {
    id: string;
    businessName: string;
    cuit: string;
  };
  goodsReceipt: {
    id: string;
    receiptNumber: string;
    deliveryNoteNumber: string;
    createdAt: string;
  };
  purchaseOrder: {
    id: string;
    orderNumber: string;
  };
  invoiceDate: string;
  status: SupplierInvoiceStatus;
  netTotal: string;
  taxTotal: string;
  taxMode: SupplierInvoiceAdjustmentMode;
  taxPercentage: string | null;
  costTolerancePercentageSnapshot: string;
  totalAmount: string;
  itemCount: number;
  observedLineCount: number;
  user: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ISupplierInvoiceDetail extends ISupplierInvoiceSummary {
  items: ISupplierInvoiceItemDetail[];
  decision: ISupplierInvoiceDecision | null;
}

export interface ISupplierInvoiceDecision {
  action: SupplierInvoiceDecisionAction;
  reason: string | null;
  decidedAt: string;
  user: { id: string; name: string; email: string };
}

export interface IPurchaseSettings {
  costTolerancePercentage: string;
  updatedAt: string;
  updatedBy: { id: string; name: string; email: string } | null;
}

export interface IUpdatePurchaseSettingsPayload {
  costTolerancePercentage: string;
}

export interface IRejectSupplierInvoicePayload {
  reason: string;
}

export interface ISupplierInvoiceSearchParams {
  page?: number;
  limit?: number;
  supplierId?: string;
  status?: SupplierInvoiceStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface IPaginatedSupplierInvoicesResponse {
  data: ISupplierInvoiceSummary[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface IPendingInvoiceReceiptItem {
  goodsReceiptItemId: string;
  purchaseOrderItemId: string;
  productId: string;
  productCode: string;
  productName: string;
  supplierSku: string;
  purchaseUnitId: string;
  purchaseUnitName: string;
  purchaseUnitSymbol: string;
  conversionFactor: string;
  receivedQtyPurchaseUnit: string;
  previouslyAllocatedQtyPurchaseUnit: string;
  availableQtyPurchaseUnit: string;
  receivedQtyBase: string;
  provisionalCostUnitNet: string;
}

export interface IPendingInvoiceReceipt {
  id: string;
  receiptNumber: string;
  deliveryNoteNumber: string;
  createdAt: string;
  supplier: {
    id: string;
    businessName: string;
    cuit: string;
  };
  purchaseOrder: {
    id: string;
    orderNumber: string;
  };
  pendingLineCount: number;
  items: IPendingInvoiceReceiptItem[];
}

export interface IQueryPendingInvoiceReceiptsParams {
  page?: number;
  limit?: number;
  supplierId?: string;
  search?: string;
}

export interface IPaginatedPendingInvoiceReceiptsResponse {
  data: IPendingInvoiceReceipt[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// Backward-compatible aliases for the preliminary contracts.
export type ISupplierInvoice = ISupplierInvoiceDetail;
export type ISupplierInvoiceItem = ISupplierInvoiceItemDetail;

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
