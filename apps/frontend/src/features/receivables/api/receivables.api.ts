import type {
  DebtorStatus,
  ICustomerAccountResponse,
  IReceivableDebtorsResponse,
} from '@erp/shared-types';
import { apiClient } from '@/services/api.client';

export interface DebtorSearchParams {
  page: number;
  limit: number;
  search?: string;
  status?: DebtorStatus;
}

export async function getCustomerAccountApi(
  customerId: string,
  page = 1,
  limit = 50,
): Promise<ICustomerAccountResponse> {
  return (
    await apiClient.get<ICustomerAccountResponse>(`/customers/${customerId}/account-receivable`, {
      params: { page, limit },
    })
  ).data;
}

export async function getDebtorsApi(
  params: DebtorSearchParams,
): Promise<IReceivableDebtorsResponse> {
  return (
    await apiClient.get<IReceivableDebtorsResponse>('/receivables', {
      params: {
        page: params.page,
        limit: params.limit,
        ...(params.search ? { search: params.search } : {}),
        ...(params.status ? { status: params.status } : {}),
      },
    })
  ).data;
}

export async function downloadAccountStatementPdfApi(customerId: string): Promise<Blob> {
  return (
    await apiClient.get(`/customers/${customerId}/account-receivable/pdf`, {
      responseType: 'blob',
    })
  ).data;
}
