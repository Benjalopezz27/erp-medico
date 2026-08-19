import { beforeEach, describe, expect, it } from 'vitest';
import { UserRole, type IAuthSession } from '@erp/shared-types';
import { useAuthStore } from '@/stores/authStore';
import { redirectAuthenticatedUser, requireAuthentication, requireRoutePermission } from './router';

const session = (role: UserRole): IAuthSession => ({
  accessToken: 'token',
  user: {
    id: 'user-id',
    name: 'Route User',
    email: 'route@erp.com',
    role,
    isActive: true,
  },
});

function redirectDestination(action: () => void): string | undefined {
  try {
    action();
  } catch (error) {
    return (error as { options?: { to?: string } }).options?.to;
  }
  return undefined;
}

describe('authentication route guards', () => {
  beforeEach(() => useAuthStore.setState(useAuthStore.getInitialState(), true));

  it('redirects anonymous users away from the App Shell', () => {
    expect(redirectDestination(requireAuthentication)).toBe('/login');
  });

  it('redirects authenticated users away from login', () => {
    useAuthStore.getState().setSession(session(UserRole.VENDEDOR));
    expect(redirectDestination(redirectAuthenticatedUser)).toBe('/');
  });

  it('redirects sellers from administrative routes but allows administrators', () => {
    useAuthStore.getState().setSession(session(UserRole.VENDEDOR));
    expect(redirectDestination(() => requireRoutePermission('/settings'))).toBe('/');

    useAuthStore.getState().setSession(session(UserRole.ADMINISTRADOR));
    expect(redirectDestination(() => requireRoutePermission('/settings'))).toBeUndefined();
  });
});
