import { apiClient } from '@/services/api.client';
import type { CreateUnitPayload, IUnit, UpdateUnitPayload } from '../types/units.types';

export async function getUnitsApi(): Promise<IUnit[]> {
  const { data } = await apiClient.get<IUnit[]>('/units');
  return data;
}

export async function getUnitByIdApi(id: string): Promise<IUnit> {
  const { data } = await apiClient.get<IUnit>(`/units/${id}`);
  return data;
}

export async function createUnitApi(payload: CreateUnitPayload): Promise<IUnit> {
  const { data } = await apiClient.post<IUnit>('/units', payload);
  return data;
}

export async function updateUnitApi(id: string, payload: UpdateUnitPayload): Promise<IUnit> {
  const { data } = await apiClient.patch<IUnit>(`/units/${id}`, payload);
  return data;
}

export async function deleteUnitApi(id: string): Promise<void> {
  await apiClient.delete(`/units/${id}`);
}
