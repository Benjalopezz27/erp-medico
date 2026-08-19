import { describe, expect, it } from 'vitest';
import { UserRole } from '@erp/shared-types';
import { isRouteAllowed } from './permissions.config';

describe('route permissions', () => {
  it('allows both roles on common authenticated routes', () => {
    expect(isRouteAllowed('/products', UserRole.ADMINISTRADOR)).toBe(true);
    expect(isRouteAllowed('/products', UserRole.VENDEDOR)).toBe(true);
  });

  it('allows only administrators on administrative routes and descendants', () => {
    expect(isRouteAllowed('/settings', UserRole.ADMINISTRADOR)).toBe(true);
    expect(isRouteAllowed('/settings', UserRole.VENDEDOR)).toBe(false);
    expect(isRouteAllowed('/settings/users', UserRole.VENDEDOR)).toBe(false);
  });
});
