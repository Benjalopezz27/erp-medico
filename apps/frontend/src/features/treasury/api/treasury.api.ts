import type {
  ICreateTreasuryMovementPayload,
  ITreasuryMovementListResponse,
  ITreasurySummary,
  TreasuryAccountType,
  TreasuryMovementType,
} from '@erp/shared-types';
import { apiClient } from '@/services/api.client';

export interface TreasuryMovementParams {
  page: number;
  limit: number;
  accountType?: TreasuryAccountType;
  movementType?: TreasuryMovementType;
  from?: string;
  to?: string;
}

export async function getTreasurySummaryApi(): Promise<ITreasurySummary> {
  return (await apiClient.get<ITreasurySummary>('/treasury/summary')).data;
}

export async function getTreasuryMovementsApi(
  params: TreasuryMovementParams,
): Promise<ITreasuryMovementListResponse> {
  return (await apiClient.get<ITreasuryMovementListResponse>('/treasury/movements', { params }))
    .data;
}

export async function createTreasuryMovementApi(
  payload: ICreateTreasuryMovementPayload,
): Promise<{ id: string }> {
  return (await apiClient.post<{ id: string }>('/treasury/movements', payload)).data;
}
