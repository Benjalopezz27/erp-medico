import type {
  CheckStatus,
  ISortParams,
  ICheck,
  ICheckDetail,
  ICheckListResponse,
} from '@erp/shared-types';
import { apiClient } from '@/services/api.client';

export type CheckSortField = 'bank' | 'checkNumber' | 'customer' | 'amount' | 'dueDate' | 'status';

export interface CheckSearchParams extends ISortParams<CheckSortField> {
  page: number;
  limit: number;
  status?: CheckStatus;
  dueFrom?: string;
  dueTo?: string;
}

export type CheckAction = 'to-cartera' | 'deposit' | 'endorse' | 'reject';

export async function getChecksApi(params: CheckSearchParams): Promise<ICheckListResponse> {
  return (await apiClient.get<ICheckListResponse>('/checks', { params })).data;
}

export async function getCheckApi(id: string): Promise<ICheckDetail> {
  return (await apiClient.get<ICheckDetail>(`/checks/${id}`)).data;
}

export async function transitionCheckApi(
  id: string,
  action: CheckAction,
  body: { supplierId?: string; reason?: string } = {},
): Promise<ICheck> {
  return (await apiClient.patch<ICheck>(`/checks/${id}/${action}`, body)).data;
}
