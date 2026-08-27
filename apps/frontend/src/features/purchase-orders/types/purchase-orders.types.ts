import {
  PurchaseOrderStatus,
  PurchaseOrderErrorCode,
  GoodsReceiptErrorCode,
  type ICreatePurchaseOrderPayload,
  type IUpdatePurchaseOrderPayload,
  type ICancelPurchaseOrderPayload,
  type IPurchaseOrderSummary,
  type IPurchaseOrderDetail,
  type IPurchaseOrderItemDetail,
  type IPurchaseOrderSearchParams,
  type ICreateGoodsReceiptPayload,
  type ICreateGoodsReceiptItemPayload,
  type ICreateGoodsReceiptResponse,
  type IGoodsReceiptDetail,
  type IGoodsReceiptItemDetail,
  type IQueryGoodsReceiptsParams,
  type IPaginatedGoodsReceiptsResponse,
} from '@erp/shared-types';

export {
  PurchaseOrderStatus,
  PurchaseOrderErrorCode,
  GoodsReceiptErrorCode,
  type ICreatePurchaseOrderPayload,
  type IUpdatePurchaseOrderPayload,
  type ICancelPurchaseOrderPayload,
  type IPurchaseOrderSummary,
  type IPurchaseOrderDetail,
  type IPurchaseOrderItemDetail,
  type IPurchaseOrderSearchParams,
  type ICreateGoodsReceiptPayload,
  type ICreateGoodsReceiptItemPayload,
  type ICreateGoodsReceiptResponse,
  type IGoodsReceiptDetail,
  type IGoodsReceiptItemDetail,
  type IQueryGoodsReceiptsParams,
  type IPaginatedGoodsReceiptsResponse,
};

export interface PaginatedPurchaseOrdersResponse {
  data: IPurchaseOrderSummary[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface IPurchaseOrderFormItem {
  supplierProductId: string;
  productId: string;
  productInternalCode: string;
  productName: string;
  supplierSku: string;
  purchaseUnitName: string;
  purchaseUnitSymbol: string;
  conversionFactorToBase: number;
  baseUnitSymbol: string;
  usualCostNet?: number | null;
  orderedQty: string;
  expectedCostUnitNet: string;
  isDeletedAssociation?: boolean;
  driftWarning?: string | null;
}

export interface IPurchaseOrderFormData {
  supplierId: string;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  items: IPurchaseOrderFormItem[];
}

export interface IGoodsReceiptFormItem {
  purchaseOrderItemId: string;
  receivedQtyPurchaseUnit: string;
  provisionalCostUnitNet: string;
}

export interface IGoodsReceiptFormData {
  deliveryNoteNumber: string;
  items: IGoodsReceiptFormItem[];
}
