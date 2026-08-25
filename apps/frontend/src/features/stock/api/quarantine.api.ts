import { apiClient } from '@/services/api.client';
import type {
  IQuarantineStock,
  IQuarantineSearchParams,
  PaginatedStockResponse,
  CreateQuarantinePayload,
  ResolveQuarantinePayload,
} from '../types/quarantine.types';

/**
 * Retrieves paginated quarantine list with optional filters.
 */
export async function getQuarantineListApi(
  params?: IQuarantineSearchParams,
  signal?: AbortSignal,
): Promise<PaginatedStockResponse<IQuarantineStock>> {
  const response = await apiClient.get<PaginatedStockResponse<IQuarantineStock>>('/quarantine', {
    params,
    signal,
  });
  return response.data;
}

/**
 * Transfers stock from available balance to quarantine.
 */
export async function createQuarantineEntryApi(
  payload: CreateQuarantinePayload,
): Promise<IQuarantineStock> {
  const response = await apiClient.post<IQuarantineStock>('/quarantine', payload);
  return response.data;
}

/**
 * Resolves a quarantine entry (MERMA, DEVOLUCION_PROVEEDOR, or REINGRESO).
 */
export async function resolveQuarantineApi(
  id: string,
  payload: ResolveQuarantinePayload,
): Promise<IQuarantineStock> {
  const response = await apiClient.patch<IQuarantineStock>(`/quarantine/${id}/resolve`, payload);
  return response.data;
}
