import type { IAuthSession } from '@erp/shared-types';
import { publicApiClient } from '@/services/api.client';
import type { LoginCredentials } from '../auth.schema';

export async function loginRequest(credentials: LoginCredentials): Promise<IAuthSession> {
  const response = await publicApiClient.post<IAuthSession>('/auth/login', credentials);
  return response.data;
}
