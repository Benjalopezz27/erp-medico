import {
  SupplierInvoiceErrorCode,
  SupplierInvoiceQuantityStatus,
  SupplierInvoiceStatus,
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
  SupplierInvoiceQuantityStatus,
  SupplierInvoiceStatus,
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
}

export interface SupplierInvoiceFormData {
  invoiceNumber: string;
  invoiceDate: string;
  taxTotal: string;
  items: SupplierInvoiceFormLine[];
}
