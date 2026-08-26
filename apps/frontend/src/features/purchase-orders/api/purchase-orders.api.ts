import { apiClient } from '@/services/api.client';
import type {
  IPurchaseOrderSearchParams,
  PaginatedPurchaseOrdersResponse,
  IPurchaseOrderDetail,
  ICreatePurchaseOrderPayload,
  IUpdatePurchaseOrderPayload,
  ICancelPurchaseOrderPayload,
} from '../types/purchase-orders.types';

export async function getPurchaseOrdersApi(
  params: IPurchaseOrderSearchParams,
  options?: { signal?: AbortSignal },
): Promise<PaginatedPurchaseOrdersResponse> {
  const queryParams: Record<string, unknown> = {
    page: params.page ?? 1,
    limit: params.limit ?? 10,
  };

  if (params.search && params.search.trim() !== '') {
    queryParams.search = params.search.trim();
  }

  if (params.supplierId) {
    queryParams.supplierId = params.supplierId;
  }

  if (params.status) {
    queryParams.status = params.status;
  }

  if (params.dateFrom) {
    queryParams.dateFrom = params.dateFrom;
  }

  if (params.dateTo) {
    queryParams.dateTo = params.dateTo;
  }

  const response = await apiClient.get<PaginatedPurchaseOrdersResponse>('/purchase-orders', {
    params: queryParams,
    signal: options?.signal,
  });

  return response.data;
}

export async function getPurchaseOrderByIdApi(
  id: string,
  options?: { signal?: AbortSignal },
): Promise<IPurchaseOrderDetail> {
  const response = await apiClient.get<IPurchaseOrderDetail>(`/purchase-orders/${id}`, {
    signal: options?.signal,
  });
  return response.data;
}

export async function createPurchaseOrderApi(
  payload: ICreatePurchaseOrderPayload,
): Promise<IPurchaseOrderDetail> {
  const response = await apiClient.post<IPurchaseOrderDetail>('/purchase-orders', payload);
  return response.data;
}

export async function updatePurchaseOrderApi(
  id: string,
  payload: IUpdatePurchaseOrderPayload,
): Promise<IPurchaseOrderDetail> {
  const response = await apiClient.patch<IPurchaseOrderDetail>(`/purchase-orders/${id}`, payload);
  return response.data;
}

export async function emitPurchaseOrderApi(id: string): Promise<IPurchaseOrderDetail> {
  const response = await apiClient.patch<IPurchaseOrderDetail>(`/purchase-orders/${id}/emit`);
  return response.data;
}

export async function cancelPurchaseOrderApi(
  id: string,
  payload?: ICancelPurchaseOrderPayload,
): Promise<IPurchaseOrderDetail> {
  const response = await apiClient.patch<IPurchaseOrderDetail>(
    `/purchase-orders/${id}/cancel`,
    payload || {},
  );
  return response.data;
}
