import { apiClient } from '@/services/api.client';
import type {
  CreateMarkupPayload,
  IMarkupConfiguration,
  IMarkupSimulation,
  UpdateMarkupPayload,
} from '../types/markups.types';

export async function getMarkupsApi(signal?: AbortSignal): Promise<IMarkupConfiguration[]> {
  const { data } = await apiClient.get<IMarkupConfiguration[]>('/prices/markups', { signal });
  return data;
}

export async function createMarkupApi(payload: CreateMarkupPayload): Promise<IMarkupConfiguration> {
  const { data } = await apiClient.post<IMarkupConfiguration>('/prices/markups', payload);
  return data;
}

export async function updateMarkupApi(
  id: string,
  payload: UpdateMarkupPayload,
): Promise<IMarkupConfiguration> {
  const { data } = await apiClient.patch<IMarkupConfiguration>(`/prices/markups/${id}`, payload);
  return data;
}

export async function deleteMarkupApi(id: string): Promise<void> {
  await apiClient.delete(`/prices/markups/${id}`);
}

export async function simulateMarkupApi(
  productId: string,
  signal?: AbortSignal,
): Promise<IMarkupSimulation> {
  const { data } = await apiClient.get<IMarkupSimulation>(`/prices/markups/simulate/${productId}`, {
    signal,
  });
  return data;
}
