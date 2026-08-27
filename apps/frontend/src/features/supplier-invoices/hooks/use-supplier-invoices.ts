import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSupplierInvoiceApi,
  getPendingInvoiceReceiptsApi,
  getSupplierInvoiceApi,
  getSupplierInvoicesApi,
  authorizeSupplierInvoiceApi,
  rejectSupplierInvoiceApi,
} from '../api/supplier-invoices.api';
import { supplierInvoicesKeys } from './supplier-invoices-keys';
import type {
  ICreateSupplierInvoicePayload,
  IQueryPendingInvoiceReceiptsParams,
  ISupplierInvoiceSearchParams,
  IRejectSupplierInvoicePayload,
} from '../types/supplier-invoices.types';

export function useSupplierInvoicesQuery(params: ISupplierInvoiceSearchParams) {
  return useQuery({
    queryKey: supplierInvoicesKeys.list(params),
    queryFn: ({ signal }) => getSupplierInvoicesApi(params, { signal }),
    placeholderData: (previous) => previous,
    staleTime: 30_000,
  });
}

export function useSupplierInvoiceQuery(id: string) {
  return useQuery({
    queryKey: supplierInvoicesKeys.detail(id),
    queryFn: ({ signal }) => getSupplierInvoiceApi(id, { signal }),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function usePendingInvoiceReceiptsQuery(params: IQueryPendingInvoiceReceiptsParams) {
  return useQuery({
    queryKey: supplierInvoicesKeys.pendingReceiptList(params),
    queryFn: ({ signal }) => getPendingInvoiceReceiptsApi(params, { signal }),
    placeholderData: (previous) => previous,
    staleTime: 15_000,
  });
}

export function useCreateSupplierInvoiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ICreateSupplierInvoicePayload) => createSupplierInvoiceApi(payload),
    onSuccess: async (invoice) => {
      queryClient.setQueryData(supplierInvoicesKeys.detail(invoice.id), invoice);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: supplierInvoicesKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: supplierInvoicesKeys.pendingReceipts() }),
      ]);
    },
  });
}

function useDecisionSuccess() {
  const queryClient = useQueryClient();
  return async (invoice: { id: string }) => {
    queryClient.setQueryData(supplierInvoicesKeys.detail(invoice.id), invoice);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: supplierInvoicesKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: supplierInvoicesKeys.pendingReceipts() }),
    ]);
  };
}

export function useAuthorizeSupplierInvoiceMutation() {
  const onSuccess = useDecisionSuccess();
  return useMutation({
    mutationFn: (id: string) => authorizeSupplierInvoiceApi(id),
    onSuccess,
  });
}

export function useRejectSupplierInvoiceMutation() {
  const onSuccess = useDecisionSuccess();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: IRejectSupplierInvoicePayload }) =>
      rejectSupplierInvoiceApi(id, payload),
    onSuccess,
  });
}
