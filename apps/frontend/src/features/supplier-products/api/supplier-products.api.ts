import { apiClient } from '@/services/api.client';
import type {
  ISupplierProduct,
  PaginatedSupplierProductsResponse,
  ISupplierProductSearchParams,
  CreateSupplierProductPayload,
  UpdateSupplierProductPayload,
} from '../types/supplier-products.types';

export async function getSupplierProductsApi(
  supplierId: string,
  params: ISupplierProductSearchParams,
  options?: { signal?: AbortSignal },
): Promise<PaginatedSupplierProductsResponse> {
  const queryParams: Record<string, unknown> = {
    page: params.page ?? 1,
    limit: params.limit ?? 10,
  };

  if (params.search && params.search.trim() !== '') {
    queryParams.search = params.search.trim();
  }

  if (params.sortBy) {
    queryParams.sortBy = params.sortBy;
  }

  if (params.sortOrder) {
    queryParams.sortOrder = params.sortOrder;
  }

  const response = await apiClient.get<PaginatedSupplierProductsResponse>(
    `/suppliers/${supplierId}/products`,
    { params: queryParams, signal: options?.signal },
  );

  return response.data;
}

export async function getSupplierProductByIdApi(
  supplierId: string,
  associationId: string,
): Promise<ISupplierProduct> {
  const response = await apiClient.get<ISupplierProduct>(
    `/suppliers/${supplierId}/products/${associationId}`,
  );
  return response.data;
}

export async function createSupplierProductApi(
  supplierId: string,
  payload: CreateSupplierProductPayload,
): Promise<ISupplierProduct> {
  const response = await apiClient.post<ISupplierProduct>(
    `/suppliers/${supplierId}/products`,
    payload,
  );
  return response.data;
}

export async function updateSupplierProductApi(
  supplierId: string,
  associationId: string,
  payload: UpdateSupplierProductPayload,
): Promise<ISupplierProduct> {
  const response = await apiClient.patch<ISupplierProduct>(
    `/suppliers/${supplierId}/products/${associationId}`,
    payload,
  );
  return response.data;
}

export async function deleteSupplierProductApi(
  supplierId: string,
  associationId: string,
): Promise<void> {
  await apiClient.delete(`/suppliers/${supplierId}/products/${associationId}`);
}
