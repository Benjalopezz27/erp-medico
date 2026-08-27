import { apiClient } from '@/services/api.client';
import type {
  ICreateSupplierInvoicePayload,
  IPaginatedPendingInvoiceReceiptsResponse,
  IPaginatedSupplierInvoicesResponse,
  IQueryPendingInvoiceReceiptsParams,
  ISupplierInvoiceDetail,
  ISupplierInvoiceSearchParams,
} from '../types/supplier-invoices.types';

function compactParams(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  );
}

export async function getSupplierInvoicesApi(
  params: ISupplierInvoiceSearchParams,
  options?: { signal?: AbortSignal },
): Promise<IPaginatedSupplierInvoicesResponse> {
  const response = await apiClient.get<IPaginatedSupplierInvoicesResponse>('/supplier-invoices', {
    params: compactParams({ page: params.page ?? 1, limit: params.limit ?? 10, ...params }),
    signal: options?.signal,
  });
  return response.data;
}

export async function getSupplierInvoiceApi(
  id: string,
  options?: { signal?: AbortSignal },
): Promise<ISupplierInvoiceDetail> {
  const response = await apiClient.get<ISupplierInvoiceDetail>(`/supplier-invoices/${id}`, {
    signal: options?.signal,
  });
  return response.data;
}

export async function getPendingInvoiceReceiptsApi(
  params: IQueryPendingInvoiceReceiptsParams,
  options?: { signal?: AbortSignal },
): Promise<IPaginatedPendingInvoiceReceiptsResponse> {
  const response = await apiClient.get<IPaginatedPendingInvoiceReceiptsResponse>(
    '/supplier-invoices/pending-receipts',
    {
      params: compactParams({ page: params.page ?? 1, limit: params.limit ?? 10, ...params }),
      signal: options?.signal,
    },
  );
  return response.data;
}

export async function createSupplierInvoiceApi(
  payload: ICreateSupplierInvoicePayload,
): Promise<ISupplierInvoiceDetail> {
  const response = await apiClient.post<ISupplierInvoiceDetail>('/supplier-invoices', payload);
  return response.data;
}
