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
  validateStockSearchParams,
  validateStockMovementsSearchParams,
  validateQuarantineSearchParams,
  validateSuppliersSearchParams,
  validateSupplierCatalogSearchParams,
  validatePurchaseOrderSearchParams,
  validateBackorderSearchParams,
  validateSupplierInvoiceSearchParams,
  router,
} from './router';
import { PurchaseOrderStatus } from '@/features/purchase-orders/types/purchase-orders.types';

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

    useAuthStore.getState().setSession(session(UserRole.VENDEDOR));
    expect(redirectDestination(() => requireRoutePermission('/importer'))).toBe('/');

    useAuthStore.getState().setSession(session(UserRole.ADMINISTRADOR));
    expect(redirectDestination(() => requireRoutePermission('/importer'))).toBeUndefined();
  });

  it('requireRole redirects non-admin users to /products', () => {
    useAuthStore.getState().setSession(session(UserRole.VENDEDOR));
    expect(redirectDestination(() => requireRole(UserRole.ADMINISTRADOR))).toBe('/products');

    useAuthStore.getState().setSession(session(UserRole.ADMINISTRADOR));
    expect(redirectDestination(() => requireRole(UserRole.ADMINISTRADOR))).toBeUndefined();
  });

  it('registers the administrative goods receipt route', () => {
    expect(router.routesByPath['/purchases/orders/$id/receive']).toBeDefined();
  });

  it('registers the administrative backorders route', () => {
    expect(router.routesByPath['/purchases/backorders']).toBeDefined();
  });

  it('registers all administrative supplier invoice routes', () => {
    expect(router.routesByPath['/purchases/supplier-invoices']).toBeDefined();
    expect(router.routesByPath['/purchases/supplier-invoices/new']).toBeDefined();
    expect(router.routesByPath['/purchases/supplier-invoices/$id']).toBeDefined();
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

describe('validateStockSearchParams', () => {
  it('defaults invalid search params to page 1 and limit 10', () => {
    const result = validateStockSearchParams({
      page: -1,
      limit: 100,
      stockStatus: 'INVALID_STATUS',
      category: 'invalid-category',
      search: '   ',
    });

    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.stockStatus).toBeUndefined();
    expect(result.category).toBeUndefined();
    expect(result.search).toBeUndefined();
  });

  it('correctly parses valid stock search params, category UUID, and status', () => {
    const categoryId = '51b94ef4-4bac-44d0-8cd6-9b5124928c65';
    const result = validateStockSearchParams({
      page: 2,
      limit: 25,
      search: '  Catéter  ',
      category: categoryId,
      stockStatus: 'CRITICAL',
    });

    expect(result.page).toBe(2);
    expect(result.limit).toBe(25);
    expect(result.search).toBe('Catéter');
    expect(result.category).toBe(categoryId);
    expect(result.stockStatus).toBe('CRITICAL');
  });
});

describe('validateStockMovementsSearchParams', () => {
  it('defaults invalid search params to page 1 and limit 10', () => {
    const result = validateStockMovementsSearchParams({
      page: 0,
      limit: 75,
      movementType: 'INVALID_TYPE',
    });

    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.movementType).toBeUndefined();
    expect(result.from).toBeUndefined();
    expect(result.to).toBeUndefined();
  });

  it('correctly parses valid movementType and ISO date range strings', () => {
    const result = validateStockMovementsSearchParams({
      page: 3,
      limit: 50,
      movementType: 'ENTRADA_COMPRA',
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-08-31T23:59:59.999Z',
    });

    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
    expect(result.movementType).toBe('ENTRADA_COMPRA');
    expect(result.from).toBe('2026-08-01T00:00:00.000Z');
    expect(result.to).toBe('2026-08-31T23:59:59.999Z');
  });
});

describe('validateQuarantineSearchParams', () => {
  it('defaults invalid search params to page 1 and limit 10', () => {
    const result = validateQuarantineSearchParams({
      page: -5,
      limit: 999,
      status: 'INVALID_STATUS',
      productId: 'invalid-uuid',
    });

    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.status).toBeUndefined();
    expect(result.productId).toBeUndefined();
    expect(result.search).toBeUndefined();
  });

  it('correctly parses valid quarantine search params', () => {
    const validProductId = '123e4567-e89b-12d3-a456-426614174000';
    const result = validateQuarantineSearchParams({
      page: 2,
      limit: 25,
      search: '  Amoxicilina  ',
      productId: validProductId,
      status: 'EN_CUARENTENA',
    });

    expect(result.page).toBe(2);
    expect(result.limit).toBe(25);
    expect(result.search).toBe('Amoxicilina');
    expect(result.productId).toBe(validProductId);
    expect(result.status).toBe('EN_CUARENTENA');
  });
});

describe('validateSuppliersSearchParams', () => {
  it('defaults invalid search params to page 1 and limit 10', () => {
    const result = validateSuppliersSearchParams({
      page: -1,
      limit: 1000,
      sortBy: 'invalid_field',
      sortOrder: 'INVALID',
    });

    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.sortBy).toBeUndefined();
    expect(result.sortOrder).toBeUndefined();
    expect(result.search).toBeUndefined();
    expect(result.isActive).toBeUndefined();
  });

  it('correctly parses valid suppliers search params', () => {
    const result = validateSuppliersSearchParams({
      page: 2,
      limit: 25,
      search: '  Droguería  ',
      isActive: 'true',
      sortBy: 'businessName',
      sortOrder: 'ASC',
    });

    expect(result.page).toBe(2);
    expect(result.limit).toBe(25);
    expect(result.search).toBe('Droguería');
    expect(result.isActive).toBe(true);
    expect(result.sortBy).toBe('businessName');
    expect(result.sortOrder).toBe('ASC');
  });
});

describe('validateSupplierCatalogSearchParams', () => {
  it('defaults invalid search params to page 1 and limit 10', () => {
    const result = validateSupplierCatalogSearchParams({
      page: -5,
      limit: 999,
      sortBy: 'invalid_col',
      sortOrder: 'random',
    });

    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.sortBy).toBeUndefined();
    expect(result.sortOrder).toBeUndefined();
    expect(result.search).toBeUndefined();
  });

  it('correctly parses valid catalog search params', () => {
    const result = validateSupplierCatalogSearchParams({
      page: 3,
      limit: 50,
      search: '  MED-99  ',
      sortBy: 'supplierExternalCode',
      sortOrder: 'ASC',
    });

    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
    expect(result.search).toBe('MED-99');
    expect(result.sortBy).toBe('supplierExternalCode');
    expect(result.sortOrder).toBe('ASC');
  });
});

describe('validatePurchaseOrderSearchParams', () => {
  it('defaults invalid search params to page 1 and limit 10', () => {
    const result = validatePurchaseOrderSearchParams({
      page: -5,
      limit: 999,
      status: 'INVALID_STATUS',
      supplierId: 'not-a-uuid',
      dateFrom: 'invalid-date',
      dateTo: '2026-02-31', // Nonexistent calendar date
      search: '   ',
    });

    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.status).toBeUndefined();
    expect(result.supplierId).toBeUndefined();
    expect(result.dateFrom).toBeUndefined();
    expect(result.dateTo).toBeUndefined();
    expect(result.search).toBeUndefined();
  });

  it('correctly parses valid purchase order search params', () => {
    const result = validatePurchaseOrderSearchParams({
      page: 2,
      limit: 20,
      search: '  OC-0001  ',
      supplierId: '4659b877-d975-4d1e-bcf4-94c80efa2c4c',
      status: PurchaseOrderStatus.EMITIDA,
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
    });

    expect(result.page).toBe(2);
    expect(result.limit).toBe(20);
    expect(result.search).toBe('OC-0001');
    expect(result.supplierId).toBe('4659b877-d975-4d1e-bcf4-94c80efa2c4c');
    expect(result.status).toBe(PurchaseOrderStatus.EMITIDA);
    expect(result.dateFrom).toBe('2026-08-01');
    expect(result.dateTo).toBe('2026-08-31');
  });

  it('clears dates when dateFrom is after dateTo', () => {
    const result = validatePurchaseOrderSearchParams({
      dateFrom: '2026-08-31',
      dateTo: '2026-08-01',
    });

    expect(result.dateFrom).toBeUndefined();
    expect(result.dateTo).toBeUndefined();
  });
});

describe('validateBackorderSearchParams', () => {
  it('normalizes valid filters', () => {
    expect(
      validateBackorderSearchParams({
        search: '  Gasa  ',
        supplierId: '4659b877-d975-4d1e-bcf4-94c80efa2c4c',
        urgentOnly: 'true',
      }),
    ).toEqual({
      search: 'Gasa',
      supplierId: '4659b877-d975-4d1e-bcf4-94c80efa2c4c',
      urgentOnly: true,
    });
  });

  it('discards invalid and overlong filters', () => {
    expect(
      validateBackorderSearchParams({
        search: 'x'.repeat(101),
        supplierId: 'invalid',
        urgentOnly: 'false',
      }),
    ).toEqual({ search: undefined, supplierId: undefined, urgentOnly: undefined });
  });
});

describe('validateSupplierInvoiceSearchParams', () => {
  it('normalizes valid filters', () => {
    expect(
      validateSupplierInvoiceSearchParams({
        page: '2',
        limit: '20',
        search: '  factura  ',
        supplierId: '4659b877-d975-4d1e-bcf4-94c80efa2c4c',
        status: 'OBSERVADA',
        dateFrom: '2026-08-01',
        dateTo: '2026-08-31',
      }),
    ).toEqual({
      page: 2,
      limit: 20,
      search: 'factura',
      supplierId: '4659b877-d975-4d1e-bcf4-94c80efa2c4c',
      status: 'OBSERVADA',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
    });
  });

  it('discards malformed, overlong and inverted filters', () => {
    expect(
      validateSupplierInvoiceSearchParams({
        page: -1,
        limit: 100,
        search: 'x'.repeat(101),
        supplierId: 'bad',
        status: 'INVALID',
        dateFrom: '2026-09-01',
        dateTo: '2026-08-01',
      }),
    ).toEqual({
      page: 1,
      limit: 10,
      search: undefined,
      supplierId: undefined,
      status: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    });
  });
});
