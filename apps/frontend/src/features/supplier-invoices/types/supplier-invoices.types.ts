import {
  SupplierInvoiceErrorCode,
  SupplierInvoiceAdjustmentMode,
  SupplierInvoiceCostStatus,
  SupplierInvoiceDecisionAction,
  SupplierInvoiceObservationReason,
  SupplierInvoiceQuantityStatus,
  SupplierInvoiceStatus,
  type IPurchaseSettings,
  type ICreateSupplierInvoicePayload,
  type IPaginatedPendingInvoiceReceiptsResponse,
  type IPaginatedSupplierInvoicesResponse,
  type IPendingInvoiceReceipt,
  type IPendingInvoiceReceiptItem,
  type IQueryPendingInvoiceReceiptsParams,
  type ISupplierInvoiceDetail,
  type ISupplierInvoiceItemDetail,
  type ISupplierInvoiceSearchParams,
  type ISupplierInvoiceSummary,
  type IRejectSupplierInvoicePayload,
} from '@erp/shared-types';

export {
  SupplierInvoiceErrorCode,
  SupplierInvoiceAdjustmentMode,
  SupplierInvoiceCostStatus,
  SupplierInvoiceDecisionAction,
  SupplierInvoiceObservationReason,
  SupplierInvoiceQuantityStatus,
  SupplierInvoiceStatus,
  type IPurchaseSettings,
  type ICreateSupplierInvoicePayload,
  type IPaginatedPendingInvoiceReceiptsResponse,
  type IPaginatedSupplierInvoicesResponse,
  type IPendingInvoiceReceipt,
  type IPendingInvoiceReceiptItem,
  type IQueryPendingInvoiceReceiptsParams,
  type ISupplierInvoiceDetail,
  type ISupplierInvoiceItemDetail,
  type ISupplierInvoiceSearchParams,
  type ISupplierInvoiceSummary,
  type IRejectSupplierInvoicePayload,
};

export interface SupplierInvoiceFormLine {
  goodsReceiptItemId: string;
  invoicedQtyPurchaseUnit: string;
  unitPriceNet: string;
  discountNet: string;
  bonusNet: string;
  surchargeNet: string;
  discountMode: SupplierInvoiceAdjustmentMode;
  bonusMode: SupplierInvoiceAdjustmentMode;
  surchargeMode: SupplierInvoiceAdjustmentMode;
}

export interface SupplierInvoiceFormData {
  invoiceNumber: string;
  invoiceDate: string;
  taxTotal: string;
  taxMode: SupplierInvoiceAdjustmentMode;
  items: SupplierInvoiceFormLine[];
}
