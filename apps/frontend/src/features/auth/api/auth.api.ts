import type { IAuthSession } from '@erp/shared-types';
import { publicApiClient } from '@/services/api.client';
import type { LoginCredentials, SignupFormValues } from '../auth.schema';

export async function loginRequest(credentials: LoginCredentials): Promise<IAuthSession> {
  const response = await publicApiClient.post<IAuthSession>('/auth/login', credentials);
  return response.data;
}

export async function registerRequest(
  data: Pick<SignupFormValues, 'name' | 'email' | 'password'>,
): Promise<{ message: string }> {
  const response = await publicApiClient.post<{ message: string }>('/auth/register', data);
  return response.data;
}

export async function forgotPasswordRequest(email: string): Promise<{ message: string }> {
  const response = await publicApiClient.post<{ message: string }>('/auth/forgot-password', {
    email,
  });
  return response.data;
}

export async function resetPasswordRequest(data: {
  token: string;
  newPassword: string;
}): Promise<{ message: string }> {
  const response = await publicApiClient.post<{ message: string }>('/auth/reset-password', data);
  return response.data;
}
