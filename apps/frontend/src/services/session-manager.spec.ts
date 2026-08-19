import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '@erp/shared-types';
import { createTestQueryClient } from '@/test/test-utils';
import { useAuthStore } from '@/stores/authStore';
import { privateRequestRegistry } from './private-request-registry';
import { configureSessionManager } from './session-manager';
import { sessionTerminator } from './session-terminator';

describe('session manager', () => {
  beforeEach(() => {
    sessionTerminator.clearListeners();
    useAuthStore.setState(useAuthStore.getInitialState(), true);
    privateRequestRegistry.abortAll('test cleanup');
  });

  it('cancels requests and clears cache, session and navigation on logout', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['private-user'], { secret: true });
    useAuthStore.getState().setSession({
      accessToken: 'token',
      user: {
        id: 'user-id',
        name: 'Admin',
        email: 'admin@erp.com',
        role: UserRole.ADMINISTRADOR,
        isActive: true,
      },
    });
    const { signal } = privateRequestRegistry.createSignal();
    const navigateToLogin = vi.fn();
    configureSessionManager({
      queryClient,
      getCurrentPath: () => '/products',
      navigateToLogin,
    });

    await sessionTerminator.terminate('user_logout');

    expect(signal.aborted).toBe(true);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(navigateToLogin).toHaveBeenCalledOnce();
  });

  it('does not redirect again when the user is already on login', async () => {
    const navigateToLogin = vi.fn();
    configureSessionManager({
      queryClient: createTestQueryClient(),
      getCurrentPath: () => '/login',
      navigateToLogin,
    });

    await sessionTerminator.terminate('unauthorized_401');

    expect(navigateToLogin).not.toHaveBeenCalled();
  });
});
