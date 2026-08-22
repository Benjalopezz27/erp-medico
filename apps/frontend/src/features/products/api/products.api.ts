import { apiClient } from '@/services/api.client';
import { ProductStatus } from '@erp/shared-types';
import type {
  CreateProductPayload,
  IProduct,
  IProductSummary,
  IProductUnitConversion,
  PaginatedProductsResponse,
  ProductListItem,
  ProductSearchFilterParams,
  ProductSearchParams,
  UpdateProductPayload,
} from '../types/products.types';

export async function getProductsApi(
  params: ProductSearchParams,
): Promise<PaginatedProductsResponse<ProductListItem>> {
  const limit = params.limit || 10;
  const page = params.page || 1;
  const offset = (page - 1) * limit;

  const queryParams: Record<string, string | number> = {
    offset,
    limit,
  };

  if (params.status) {
    queryParams.status = params.status;
  }

  if (params.category) {
    queryParams.category = params.category;
  }

  if (params.search && params.search.trim().length > 0) {
    queryParams.search = params.search.trim();
  }

  const { data } = await apiClient.get<PaginatedProductsResponse<ProductListItem>>('/products', {
    params: queryParams,
  });
  return data;
}

export async function searchProductsTypeaheadApi(
  params: ProductSearchFilterParams,
  signal?: AbortSignal,
): Promise<IProductSummary[]> {
  const { data } = await apiClient.get<IProductSummary[]>('/products/search', {
    params: {
      q: params.q.trim(),
      ...(params.limit ? { limit: params.limit } : {}),
    },
    signal,
  });
  return data;
}

export async function getProductByIdApi(id: string): Promise<IProduct> {
  const { data } = await apiClient.get<IProduct>(`/products/${id}`);
  return data;
}

export async function createProductApi(payload: CreateProductPayload): Promise<IProduct> {
  const { data } = await apiClient.post<IProduct>('/products', payload);
  return data;
}

export async function updateProductApi(
  id: string,
  payload: UpdateProductPayload,
): Promise<IProduct> {
  const { data } = await apiClient.patch<IProduct>(`/products/${id}`, payload);
  return data;
}

export async function deactivateProductApi(id: string): Promise<void> {
  await apiClient.delete(`/products/${id}`);
}

export async function reactivateProductApi(id: string): Promise<IProduct> {
  const { data } = await apiClient.patch<IProduct>(`/products/${id}`, {
    status: ProductStatus.ACTIVE,
  });
  return data;
}

export async function createProductConversionApi(
  productId: string,
  payload: { presentationUnitId: string; conversionFactor: number },
): Promise<IProductUnitConversion> {
  const { data } = await apiClient.post<IProductUnitConversion>(
    `/products/${productId}/conversions`,
    payload,
  );
  return data;
}

export async function updateProductConversionApi(
  productId: string,
  conversionId: string,
  payload: { conversionFactor: number },
): Promise<IProductUnitConversion> {
  const { data } = await apiClient.patch<IProductUnitConversion>(
    `/products/${productId}/conversions/${conversionId}`,
    payload,
  );
  return data;
}

export async function deleteProductConversionApi(
  productId: string,
  conversionId: string,
): Promise<void> {
  await apiClient.delete(`/products/${productId}/conversions/${conversionId}`);
}
