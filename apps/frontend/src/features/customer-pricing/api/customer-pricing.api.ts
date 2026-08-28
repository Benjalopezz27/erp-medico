import { apiClient } from '@/services/api.client';
import type {
  CustomerSpecialPriceSearchParams,
  ICreateCustomerSpecialPricePayload,
  ICustomerSpecialPrice,
  IPaginatedCustomerSpecialPricesResponse,
  IResolvedCustomerPrice,
  IUpdateCustomerSpecialPricePayload,
} from '../types/customer-pricing.types';

const basePath = (customerId: string) => `/customers/${customerId}/special-prices`;

export async function getCustomerSpecialPricesApi(
  customerId: string,
  params: CustomerSpecialPriceSearchParams,
): Promise<IPaginatedCustomerSpecialPricesResponse> {
  return (
    await apiClient.get<IPaginatedCustomerSpecialPricesResponse>(basePath(customerId), {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 10,
        ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      },
    })
  ).data;
}

export async function getAllCustomerSpecialPriceProductIdsApi(customerId: string) {
  const ids: string[] = [];
  let page = 1;
  let hasNextPage = true;
  while (hasNextPage) {
    const response = await getCustomerSpecialPricesApi(customerId, { page, limit: 100 });
    ids.push(...response.data.map((rule) => rule.productId));
    hasNextPage = response.meta.hasNextPage;
    page += 1;
  }
  return ids;
}

export async function getCustomerSpecialPriceApi(customerId: string, id: string) {
  return (await apiClient.get<ICustomerSpecialPrice>(`${basePath(customerId)}/${id}`)).data;
}

export async function resolveCustomerPriceApi(customerId: string, productId: string) {
  return (
    await apiClient.get<IResolvedCustomerPrice>(`${basePath(customerId)}/resolve/${productId}`)
  ).data;
}

export async function createCustomerSpecialPriceApi(
  customerId: string,
  payload: ICreateCustomerSpecialPricePayload,
) {
  return (await apiClient.post<ICustomerSpecialPrice>(basePath(customerId), payload)).data;
}

export async function updateCustomerSpecialPriceApi(
  customerId: string,
  id: string,
  payload: IUpdateCustomerSpecialPricePayload,
) {
  return (await apiClient.patch<ICustomerSpecialPrice>(`${basePath(customerId)}/${id}`, payload))
    .data;
}

export async function deleteCustomerSpecialPriceApi(customerId: string, id: string) {
  await apiClient.delete(`${basePath(customerId)}/${id}`);
}
