import type { ISystemConfig, IUpdateSystemConfigPayload } from '@erp/shared-types';
import { apiClient } from '@/services/api.client';

export async function getSystemConfigApi(options?: { signal?: AbortSignal }) {
  return (await apiClient.get<ISystemConfig>('/config', { signal: options?.signal })).data;
}

export async function updateSystemConfigApi(payload: IUpdateSystemConfigPayload) {
  return (await apiClient.patch<ISystemConfig>('/config', payload)).data;
}
