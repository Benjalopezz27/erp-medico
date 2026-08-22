import { beforeEach, describe, expect, it } from 'vitest';
import { UserRole, ProductStatus, type IAuthSession } from '@erp/shared-types';
import { useAuthStore } from '@/stores/authStore';
import {
  redirectAuthenticatedUser,
  requireAuthentication,
  requireRoutePermission,
  requireRole,
  validateUserSearchParams,
  validateProductSearchParams,
} from './router';

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
    expect(redirectDestination(() => requireRoutePermission('/purchases'))).toBe('/');

    useAuthStore.getState().setSession(session(UserRole.ADMINISTRADOR));
    expect(redirectDestination(() => requireRoutePermission('/purchases'))).toBeUndefined();

    // /admin/users route permission
    useAuthStore.getState().setSession(session(UserRole.VENDEDOR));
    expect(redirectDestination(() => requireRoutePermission('/admin/users'))).toBe('/');

    useAuthStore.getState().setSession(session(UserRole.ADMINISTRADOR));
    expect(redirectDestination(() => requireRoutePermission('/admin/users'))).toBeUndefined();
  });

  it('requireRole redirects non-admin users to /products', () => {
    useAuthStore.getState().setSession(session(UserRole.VENDEDOR));
    expect(redirectDestination(() => requireRole(UserRole.ADMINISTRADOR))).toBe('/products');

    useAuthStore.getState().setSession(session(UserRole.ADMINISTRADOR));
    expect(redirectDestination(() => requireRole(UserRole.ADMINISTRADOR))).toBeUndefined();
  });
});

describe('validateUserSearchParams', () => {
  it('defaults invalid or empty search params to clean page 1 and limit 10', () => {
    const result = validateUserSearchParams({
      page: -5,
      limit: 999,
      role: 'INVALID_ROLE',
      isActive: 'maybe',
      search: '   ',
    });

    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.role).toBeUndefined();
    expect(result.isActive).toBeUndefined();
    expect(result.search).toBeUndefined();
  });

  it('correctly parses valid search params and tri-state isActive', () => {
    const resultTrue = validateUserSearchParams({
      page: 2,
      limit: 25,
      role: UserRole.VENDEDOR,
      isActive: 'true',
      search: '  carlos  ',
    });

    expect(resultTrue.page).toBe(2);
    expect(resultTrue.limit).toBe(25);
    expect(resultTrue.role).toBe(UserRole.VENDEDOR);
    expect(resultTrue.isActive).toBe(true);
    expect(resultTrue.search).toBe('carlos');

    const resultFalse = validateUserSearchParams({
      isActive: 'false',
    });
    expect(resultFalse.isActive).toBe(false);
  });
});

describe('validateProductSearchParams', () => {
  it('defaults invalid search params to page 1 and limit 10', () => {
    const result = validateProductSearchParams({
      page: -2,
      limit: 80,
      status: 'INVALID_STATUS',
      notice: 'unknown_notice',
    });

    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.status).toBeUndefined();
    expect(result.notice).toBeUndefined();
  });

  it('correctly parses valid product search params, category, search text, and notices', () => {
    const categoryId = '51b94ef4-4bac-44d0-8cd6-9b5124928c65';
    const result = validateProductSearchParams({
      page: 3,
      limit: 50,
      search: '  Amoxicilina  ',
      category: categoryId,
      status: ProductStatus.ACTIVE,
      notice: 'created',
    });

    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
    expect(result.search).toBe('Amoxicilina');
    expect(result.category).toBe(categoryId);
    expect(result.status).toBe(ProductStatus.ACTIVE);
    expect(result.notice).toBe('created');
  });

  it('discards malformed category identifiers before calling the API', () => {
    const result = validateProductSearchParams({ category: 'not-a-uuid' });

    expect(result.category).toBeUndefined();
  });
});
