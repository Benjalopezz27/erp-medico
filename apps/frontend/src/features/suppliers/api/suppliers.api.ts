import { apiClient } from '@/services/api.client';
import type {
  ISupplier,
  PaginatedSuppliersResponse,
  ISupplierSearchParams,
  CreateSupplierPayload,
  UpdateSupplierPayload,
} from '../types/suppliers.types';

export async function getSuppliersApi(
  params: ISupplierSearchParams,
): Promise<PaginatedSuppliersResponse> {
  const queryParams: Record<string, unknown> = {
    page: params.page ?? 1,
    limit: params.limit ?? 10,
  };

  if (params.search && params.search.trim() !== '') {
    queryParams.search = params.search.trim();
  }

  if (params.isActive !== undefined) {
    queryParams.isActive = params.isActive;
  }

  if (params.sortBy) {
    queryParams.sortBy = params.sortBy;
  }

  if (params.sortOrder) {
    queryParams.sortOrder = params.sortOrder;
  }

  const response = await apiClient.get<PaginatedSuppliersResponse>('/suppliers', {
    params: queryParams,
  });

  return response.data;
}

export async function getSupplierByIdApi(id: string): Promise<ISupplier> {
  const response = await apiClient.get<ISupplier>(`/suppliers/${id}`);
  return response.data;
}

export async function createSupplierApi(payload: CreateSupplierPayload): Promise<ISupplier> {
  const response = await apiClient.post<ISupplier>('/suppliers', payload);
  return response.data;
}

export async function updateSupplierApi(
  id: string,
  payload: UpdateSupplierPayload,
): Promise<ISupplier> {
  const response = await apiClient.patch<ISupplier>(`/suppliers/${id}`, payload);
  return response.data;
}

export async function deactivateSupplierApi(id: string): Promise<ISupplier> {
  const response = await apiClient.delete<ISupplier>(`/suppliers/${id}`);
  return response.data;
}

export async function reactivateSupplierApi(id: string): Promise<ISupplier> {
  const response = await apiClient.patch<ISupplier>(`/suppliers/${id}`, {
    isActive: true,
  });
  return response.data;
}
