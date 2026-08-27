import { apiClient } from '@/services/api.client';
import type {
  IPurchaseSettings,
  IUpdatePurchaseSettingsPayload,
} from '../types/purchase-settings.types';

export async function getPurchaseSettingsApi(options?: {
  signal?: AbortSignal;
}): Promise<IPurchaseSettings> {
  const response = await apiClient.get<IPurchaseSettings>('/config/purchases', {
    signal: options?.signal,
  });
  return response.data;
}

export async function updatePurchaseSettingsApi(
  payload: IUpdatePurchaseSettingsPayload,
): Promise<IPurchaseSettings> {
  const response = await apiClient.patch<IPurchaseSettings>('/config/purchases', payload);
  return response.data;
}
