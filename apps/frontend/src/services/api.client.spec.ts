import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { UserRole } from '@erp/shared-types';
import { server } from '@/test/mocks/server';
import { DEFAULT_API_URL } from '@/config/api.config';
import { useAuthStore } from '@/stores/authStore';
import { apiClient, publicApiClient } from './api.client';
import { sessionTerminator } from './session-terminator';

const session = {
  accessToken: 'private-jwt',
  user: {
    id: 'user-id',
    name: 'Test User',
    email: 'test@erp.com',
    role: UserRole.ADMINISTRADOR,
    isActive: true,
  },
};

describe('API clients', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_URL', DEFAULT_API_URL);
    useAuthStore.setState(useAuthStore.getInitialState(), true);
    sessionTerminator.clearListeners();
  });

  it('never attaches Authorization to the public client', async () => {
    useAuthStore.getState().setSession(session);
    let authorization: string | null = 'not-captured';
    server.use(
      http.post(DEFAULT_API_URL + '/auth/login', ({ request }) => {
        authorization = request.headers.get('Authorization');
        return HttpResponse.json(session);
      }),
    );

    await publicApiClient.post('/auth/login', { email: 'test@erp.com', password: 'secret' });

    expect(authorization).toBeNull();
  });

  it('attaches the current in-memory token to private requests', async () => {
    useAuthStore.getState().setSession(session);
    let authorization: string | null = null;
    server.use(
      http.get(DEFAULT_API_URL + '/private', ({ request }) => {
        authorization = request.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      }),
    );

    await apiClient.get('/private');

    expect(authorization).toBe('Bearer private-jwt');
  });

  it('terminates the session after a private 401 response', async () => {
    const handler = vi.fn();
    sessionTerminator.register(handler);
    server.use(
      http.get(DEFAULT_API_URL + '/expired', () => new HttpResponse(null, { status: 401 })),
    );

    await expect(apiClient.get('/expired')).rejects.toMatchObject({ response: { status: 401 } });
    await vi.waitFor(() => expect(handler).toHaveBeenCalledWith('unauthorized_401'));
  });

  it('does not terminate the session after a public 401 response', async () => {
    const handler = vi.fn();
    sessionTerminator.register(handler);
    server.use(
      http.post(DEFAULT_API_URL + '/auth/login', () => new HttpResponse(null, { status: 401 })),
    );

    await expect(publicApiClient.post('/auth/login')).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(handler).not.toHaveBeenCalled();
  });
});
