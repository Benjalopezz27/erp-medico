import { describe, expect, it } from 'vitest';
import { UserRole } from '@erp/shared-types';
import { isRouteAllowed } from './permissions.config';

describe('route permissions', () => {
  it('allows both roles on common authenticated routes including settings', () => {
    expect(isRouteAllowed('/products', UserRole.ADMINISTRADOR)).toBe(true);
    expect(isRouteAllowed('/products', UserRole.VENDEDOR)).toBe(true);
    expect(isRouteAllowed('/settings', UserRole.ADMINISTRADOR)).toBe(true);
    expect(isRouteAllowed('/settings', UserRole.VENDEDOR)).toBe(true);
  });

  it('allows only administrators on administrative routes and descendants', () => {
    expect(isRouteAllowed('/admin', UserRole.ADMINISTRADOR)).toBe(true);
    expect(isRouteAllowed('/admin', UserRole.VENDEDOR)).toBe(false);
    expect(isRouteAllowed('/admin/users', UserRole.ADMINISTRADOR)).toBe(true);
    expect(isRouteAllowed('/admin/users', UserRole.VENDEDOR)).toBe(false);
    expect(isRouteAllowed('/admin/markups', UserRole.ADMINISTRADOR)).toBe(true);
    expect(isRouteAllowed('/admin/markups', UserRole.VENDEDOR)).toBe(false);
    expect(isRouteAllowed('/purchases', UserRole.ADMINISTRADOR)).toBe(true);
    expect(isRouteAllowed('/purchases', UserRole.VENDEDOR)).toBe(false);
    expect(isRouteAllowed('/purchases/orders', UserRole.ADMINISTRADOR)).toBe(true);
    expect(isRouteAllowed('/purchases/orders', UserRole.VENDEDOR)).toBe(false);
    expect(isRouteAllowed('/purchases/orders/new', UserRole.ADMINISTRADOR)).toBe(true);
    expect(isRouteAllowed('/purchases/orders/new', UserRole.VENDEDOR)).toBe(false);
    expect(isRouteAllowed('/importer', UserRole.ADMINISTRADOR)).toBe(true);
    expect(isRouteAllowed('/importer', UserRole.VENDEDOR)).toBe(false);
  });
});
