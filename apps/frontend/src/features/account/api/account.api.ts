import type { IAuthUser } from '@erp/shared-types';
import { apiClient } from '@/services/api.client';

export async function updateProfileApi(payload: { name: string }): Promise<IAuthUser> {
  const response = await apiClient.patch<IAuthUser>('/users/me', payload);
  return response.data;
}

export async function changePasswordApi(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await apiClient.post('/users/me/change-password', payload);
}
