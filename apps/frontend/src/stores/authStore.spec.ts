import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole, type IAuthSession } from '@erp/shared-types';
import { useAuthStore } from './authStore';

const session: IAuthSession = {
  accessToken: 'signed-access-token',
  user: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'admin@erp-medico.com',
    name: 'Admin Test',
    role: UserRole.ADMINISTRADOR,
    isActive: true,
  },
};

describe('auth store', () => {
  beforeEach(() => {
    useAuthStore.setState(useAuthStore.getInitialState(), true);
    vi.spyOn(Storage.prototype, 'setItem');
  });

  it('starts with an anonymous in-memory session', () => {
    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  });

  it('sets a real session atomically and evaluates roles', () => {
    useAuthStore.getState().setSession(session);

    expect(useAuthStore.getState()).toMatchObject({
      user: session.user,
      token: session.accessToken,
      isAuthenticated: true,
    });
    expect(useAuthStore.getState().hasRole(UserRole.ADMINISTRADOR)).toBe(true);
    expect(useAuthStore.getState().hasAnyRole([UserRole.VENDEDOR, UserRole.ADMINISTRADOR])).toBe(
      true,
    );
  });

  it('clears all private session state without writing web storage', () => {
    useAuthStore.getState().setSession(session);
    useAuthStore.getState().clearSession();

    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      token: null,
      isAuthenticated: false,
    });
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(sessionStorage.setItem).not.toHaveBeenCalled();
  });
});
