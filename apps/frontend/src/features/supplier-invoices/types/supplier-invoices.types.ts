import {
  SupplierInvoiceErrorCode,
  SupplierInvoiceAdjustmentMode,
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
} from '@erp/shared-types';

export {
  SupplierInvoiceErrorCode,
  SupplierInvoiceAdjustmentMode,
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
