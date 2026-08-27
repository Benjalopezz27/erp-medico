import type {
  IQueryPendingInvoiceReceiptsParams,
  ISupplierInvoiceSearchParams,
} from '../types/supplier-invoices.types';

export const supplierInvoicesKeys = {
  all: ['supplier-invoices'] as const,
  lists: () => [...supplierInvoicesKeys.all, 'list'] as const,
  list: (filters: ISupplierInvoiceSearchParams) =>
    [...supplierInvoicesKeys.lists(), filters] as const,
  details: () => [...supplierInvoicesKeys.all, 'detail'] as const,
  detail: (id: string) => [...supplierInvoicesKeys.details(), id] as const,
  pendingReceipts: () => [...supplierInvoicesKeys.all, 'pending-receipts'] as const,
  pendingReceiptList: (filters: IQueryPendingInvoiceReceiptsParams) =>
    [...supplierInvoicesKeys.pendingReceipts(), filters] as const,
};
