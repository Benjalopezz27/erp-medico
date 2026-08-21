import { apiClient } from '@/services/api.client';
import type {
  IUser,
  PaginatedUsersResponse,
  UserSearchParams,
  CreateUserPayload,
  UpdateUserPayload,
} from '../types/users.types';

export async function getUsersApi(params: UserSearchParams): Promise<PaginatedUsersResponse> {
  const queryParams: Record<string, unknown> = {
    page: params.page,
    limit: params.limit,
  };

  if (params.search && params.search.trim() !== '') {
    queryParams.search = params.search.trim();
  }

  if (params.role) {
    queryParams.role = params.role;
  }

  if (params.isActive !== undefined) {
    queryParams.isActive = params.isActive;
  }

  const response = await apiClient.get<PaginatedUsersResponse>('/users', {
    params: queryParams,
  });

  return response.data;
}

export async function getUserByIdApi(id: string): Promise<IUser> {
  const response = await apiClient.get<IUser>(`/users/${id}`);
  return response.data;
}

export async function createUserApi(payload: CreateUserPayload): Promise<IUser> {
  const response = await apiClient.post<IUser>('/users', payload);
  return response.data;
}

export async function updateUserApi(id: string, payload: UpdateUserPayload): Promise<IUser> {
  const response = await apiClient.patch<IUser>(`/users/${id}`, payload);
  return response.data;
}

export async function deactivateUserApi(id: string): Promise<IUser> {
  const response = await apiClient.delete<IUser>(`/users/${id}`);
  return response.data;
}

export async function reactivateUserApi(id: string): Promise<IUser> {
  const response = await apiClient.patch<IUser>(`/users/${id}`, { isActive: true });
  return response.data;
}
