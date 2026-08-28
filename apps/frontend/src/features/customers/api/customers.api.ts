import { apiClient } from '@/services/api.client';
import type {
  CreateCustomerPayload,
  CustomerSearchParams,
  ICustomer,
  IPaginatedCustomersResponse,
  UpdateCustomerPayload,
} from '../types/customers.types';

export async function getCustomersApi(
  params: CustomerSearchParams,
): Promise<IPaginatedCustomersResponse> {
  const response = await apiClient.get<IPaginatedCustomersResponse>('/customers', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      ...(params.search ? { search: params.search.trim() } : {}),
      ...(params.taxCondition ? { taxCondition: params.taxCondition } : {}),
      ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
      ...(params.sortBy ? { sortBy: params.sortBy } : {}),
      ...(params.sortOrder ? { sortOrder: params.sortOrder } : {}),
    },
  });
  return response.data;
}

export async function getCustomerByIdApi(id: string): Promise<ICustomer> {
  return (await apiClient.get<ICustomer>(`/customers/${id}`)).data;
}

export async function createCustomerApi(payload: CreateCustomerPayload): Promise<ICustomer> {
  return (await apiClient.post<ICustomer>('/customers', payload)).data;
}

export async function updateCustomerApi(
  id: string,
  payload: UpdateCustomerPayload,
): Promise<ICustomer> {
  return (await apiClient.patch<ICustomer>(`/customers/${id}`, payload)).data;
}

export async function deactivateCustomerApi(id: string): Promise<ICustomer> {
  return (await apiClient.delete<ICustomer>(`/customers/${id}`)).data;
}

export async function reactivateCustomerApi(id: string): Promise<ICustomer> {
  return (await apiClient.patch<ICustomer>(`/customers/${id}/reactivate`)).data;
}
