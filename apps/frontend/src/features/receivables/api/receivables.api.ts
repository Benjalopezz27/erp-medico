import type {
  ISortParams,
  DebtorStatus,
  ICustomerAccountResponse,
  IReceivableDebtorsResponse,
} from '@erp/shared-types';
import { apiClient } from '@/services/api.client';

export const DEBTOR_SORT_FIELDS = [
  'businessName',
  'pendingCount',
  'aging0to30',
  'aging31to60',
  'aging60Plus',
  'totalBalance',
  'oldestDebtDate',
] as const;
export type DebtorSortField = (typeof DEBTOR_SORT_FIELDS)[number];

export interface DebtorSearchParams extends ISortParams<DebtorSortField> {
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
        ...(params.sortBy ? { sortBy: params.sortBy, sortOrder: params.sortOrder ?? 'ASC' } : {}),
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
