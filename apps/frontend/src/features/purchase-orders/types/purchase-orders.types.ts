import {
  PurchaseOrderStatus,
  PurchaseOrderErrorCode,
  type ICreatePurchaseOrderPayload,
  type IUpdatePurchaseOrderPayload,
  type ICancelPurchaseOrderPayload,
  type IPurchaseOrderSummary,
  type IPurchaseOrderDetail,
  type IPurchaseOrderItemDetail,
  type IPurchaseOrderSearchParams,
} from '@erp/shared-types';

export {
  PurchaseOrderStatus,
  PurchaseOrderErrorCode,
  type ICreatePurchaseOrderPayload,
  type IUpdatePurchaseOrderPayload,
  type ICancelPurchaseOrderPayload,
  type IPurchaseOrderSummary,
  type IPurchaseOrderDetail,
  type IPurchaseOrderItemDetail,
  type IPurchaseOrderSearchParams,
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
