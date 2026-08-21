import { apiClient } from '@/services/api.client';
import type {
  CreateCategoryPayload,
  ICategory,
  UpdateCategoryPayload,
} from '../types/categories.types';

export async function getCategoriesApi(): Promise<ICategory[]> {
  const { data } = await apiClient.get<ICategory[]>('/categories');
  return data;
}

export async function getCategoryByIdApi(id: string): Promise<ICategory> {
  const { data } = await apiClient.get<ICategory>(`/categories/${id}`);
  return data;
}

export async function createCategoryApi(payload: CreateCategoryPayload): Promise<ICategory> {
  const { data } = await apiClient.post<ICategory>('/categories', payload);
  return data;
}

export async function updateCategoryApi(
  id: string,
  payload: UpdateCategoryPayload,
): Promise<ICategory> {
  const { data } = await apiClient.patch<ICategory>(`/categories/${id}`, payload);
  return data;
}

export async function deleteCategoryApi(id: string): Promise<void> {
  await apiClient.delete(`/categories/${id}`);
}
