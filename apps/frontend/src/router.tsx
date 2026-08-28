import {
  createRouter,
  createRoute,
  createRootRoute,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { UsersPage } from '@/pages/admin/UsersPage';
import { MarkupsPage } from '@/pages/admin/MarkupsPage';
import { SettingsPage, type SettingsTab } from '@/pages/SettingsPage';
import { ProductsListPage } from '@/pages/products/ProductsListPage';
import { ProductCreatePage } from '@/pages/products/ProductCreatePage';
import { ProductEditPage } from '@/pages/products/ProductEditPage';
import { useAuthStore } from '@/stores/authStore';
import { isRouteAllowed } from '@/config/permissions.config';
import { UserRole, type UserSearchParams } from '@/features/users/types/users.types';
import {
  ProductStatus,
  type ProductSearchParams,
  type ProductNoticeType,
} from '@/features/products/types/products.types';

export function validateUserSearchParams(search: Record<string, unknown>): UserSearchParams {
  const page = Number(search.page);
  const limit = Number(search.limit);
  const validLimits = [10, 25, 50];

  const rawRole = search.role as string | undefined;
  const role =
    rawRole && (rawRole === UserRole.ADMINISTRADOR || rawRole === UserRole.VENDEDOR)
      ? (rawRole as UserRole)
      : undefined;

  let isActive: boolean | undefined = undefined;
  if (search.isActive === 'true' || search.isActive === true) isActive = true;
  else if (search.isActive === 'false' || search.isActive === false) isActive = false;

  const rawSearch = typeof search.search === 'string' ? search.search.trim() : undefined;
  const searchParam = rawSearch && rawSearch.length > 0 ? rawSearch : undefined;

  return {
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    limit: validLimits.includes(limit) ? limit : 10,
    search: searchParam,
    role,
    isActive,
  };
}

export function validateProductSearchParams(search: Record<string, unknown>): ProductSearchParams {
  const page = Number(search.page);
  const limit = Number(search.limit);
  const validLimits = [10, 25, 50];

  const rawStatus = search.status as string | undefined;
  const status =
    rawStatus === ProductStatus.ACTIVE || rawStatus === ProductStatus.INACTIVE
      ? (rawStatus as ProductStatus)
      : undefined;

  const rawCategory = typeof search.category === 'string' ? search.category.trim() : undefined;
  const category =
    rawCategory &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawCategory)
      ? rawCategory
      : undefined;

  const rawSearch = typeof search.search === 'string' ? search.search.trim() : undefined;
  const searchParam = rawSearch && rawSearch.length > 0 ? rawSearch : undefined;

  const rawNotice = search.notice as string | undefined;
  const validNotices: ProductNoticeType[] = ['created', 'updated', 'deactivated', 'reactivated'];
  const notice =
    rawNotice && validNotices.includes(rawNotice as ProductNoticeType)
      ? (rawNotice as ProductNoticeType)
      : undefined;

  return {
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    limit: validLimits.includes(limit) ? limit : 10,
    search: searchParam,
    category,
    status,
    notice,
  };
}

export function validateSettingsSearchParams(search: Record<string, unknown>): {
  tab?: SettingsTab;
} {
  const tab = search.tab;
  return tab === 'units' || tab === 'purchases' ? { tab } : {};
}

export function requireAuthentication(): void {
  if (!useAuthStore.getState().isAuthenticated) throw redirect({ to: '/login' });
}

export function redirectAuthenticatedUser(): void {
  if (useAuthStore.getState().isAuthenticated) throw redirect({ to: '/' });
}

export function requireRoutePermission(pathname: string): void {
  requireAuthentication();
  if (!isRouteAllowed(pathname, useAuthStore.getState().user?.role)) {
    throw redirect({ to: '/' });
  }
}

export function requireRole(allowedRole: UserRole): void {
  requireAuthentication();
  if (useAuthStore.getState().user?.role !== allowedRole) {
    throw redirect({ to: '/products', search: { page: 1, limit: 10 } });
  }
}

import { StockOverviewPage } from '@/pages/stock/StockOverviewPage';
import { StockDetailPage } from '@/pages/stock/StockDetailPage';
import { StockBulkLoadPage } from '@/pages/stock/StockBulkLoadPage';
import { StockQuarantinePage } from '@/pages/stock/StockQuarantinePage';
import {
  StockStatus,
  StockMovementType,
  QuarantineStatus,
  type IStockSearchParams,
  type IStockMovementsSearchParams,
  type IQuarantineSearchParams,
} from '@/features/stock/types/stock.types';
import { SuppliersPage } from '@/pages/suppliers/SuppliersPage';
import { SupplierCatalogPage } from '@/pages/suppliers/SupplierCatalogPage';
import { ImporterWizardPage } from '@/pages/importer/ImporterWizardPage';
import { PurchaseOrdersListPage } from '@/pages/purchases/PurchaseOrdersListPage';
import { PurchaseOrderCreatePage } from '@/pages/purchases/PurchaseOrderCreatePage';
import { PurchaseOrderDetailPage } from '@/pages/purchases/PurchaseOrderDetailPage';
import { PurchaseOrderReceivePage } from '@/pages/purchases/PurchaseOrderReceivePage';
import { PurchaseBackordersPage } from '@/pages/purchases/PurchaseBackordersPage';
import { SupplierInvoicesListPage } from '@/pages/purchases/SupplierInvoicesListPage';
import { SupplierInvoiceCreatePage } from '@/pages/purchases/SupplierInvoiceCreatePage';
import { SupplierInvoiceDetailPage } from '@/pages/purchases/SupplierInvoiceDetailPage';
import {
  PurchaseOrderStatus,
  type IBackorderSearchParams,
  type IPurchaseOrderSearchParams,
} from '@/features/purchase-orders/types/purchase-orders.types';
import {
  SupplierInvoiceStatus,
  type ISupplierInvoiceSearchParams,
} from '@/features/supplier-invoices/types/supplier-invoices.types';
import type {
  ISupplierSearchParams,
  SupplierSortField,
} from '@/features/suppliers/types/suppliers.types';
import type {
  ISupplierProductSearchParams,
  SupplierProductSortField,
} from '@/features/supplier-products/types/supplier-products.types';

export function validatePurchaseOrderSearchParams(
  search: Record<string, unknown>,
): IPurchaseOrderSearchParams {
  const page = Number(search.page);
  const limit = Number(search.limit);
  const validLimits = [10, 20, 50];

  const rawStatus = search.status as string | undefined;
  const status =
    rawStatus && Object.values(PurchaseOrderStatus).includes(rawStatus as PurchaseOrderStatus)
      ? (rawStatus as PurchaseOrderStatus)
      : undefined;

  const rawSupplierId =
    typeof search.supplierId === 'string' ? search.supplierId.trim() : undefined;
  const supplierId =
    rawSupplierId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawSupplierId)
      ? rawSupplierId
      : undefined;

  const rawSearch = typeof search.search === 'string' ? search.search.trim() : undefined;
  const searchParam = rawSearch && rawSearch.length > 0 ? rawSearch : undefined;

  // Strict Calendar Date Validation (YYYY-MM-DD)
  const isValidCalendarDate = (val?: string): boolean => {
    if (!val || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
    const [y, m, d] = val.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
  };

  let dateFrom =
    typeof search.dateFrom === 'string' && isValidCalendarDate(search.dateFrom)
      ? search.dateFrom
      : undefined;
  let dateTo =
    typeof search.dateTo === 'string' && isValidCalendarDate(search.dateTo)
      ? search.dateTo
      : undefined;

  // Ensure dateFrom <= dateTo
  if (dateFrom && dateTo && dateFrom > dateTo) {
    dateFrom = undefined;
    dateTo = undefined;
  }

  return {
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    limit: validLimits.includes(limit) ? limit : 10,
    search: searchParam,
    supplierId,
    status,
    dateFrom,
    dateTo,
  };
}

export function validateBackorderSearchParams(
  search: Record<string, unknown>,
): IBackorderSearchParams {
  const rawSearch = typeof search.search === 'string' ? search.search.trim() : '';
  const rawSupplierId = typeof search.supplierId === 'string' ? search.supplierId.trim() : '';
  const supplierId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawSupplierId)
      ? rawSupplierId
      : undefined;
  const urgentOnly = search.urgentOnly === true || search.urgentOnly === 'true' ? true : undefined;

  return {
    search: rawSearch.length > 0 && rawSearch.length <= 100 ? rawSearch : undefined,
    supplierId,
    urgentOnly,
  };
}

export function validateSupplierInvoiceSearchParams(
  search: Record<string, unknown>,
): ISupplierInvoiceSearchParams {
  const page = Number(search.page);
  const limit = Number(search.limit);
  const rawSearch = typeof search.search === 'string' ? search.search.trim() : '';
  const rawSupplierId = typeof search.supplierId === 'string' ? search.supplierId.trim() : '';
  const supplierId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawSupplierId)
      ? rawSupplierId
      : undefined;
  const rawStatus = search.status as string | undefined;
  const status =
    rawStatus && Object.values(SupplierInvoiceStatus).includes(rawStatus as SupplierInvoiceStatus)
      ? (rawStatus as SupplierInvoiceStatus)
      : undefined;
  const validDate = (value: unknown): value is string => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  let dateFrom = validDate(search.dateFrom) ? search.dateFrom : undefined;
  let dateTo = validDate(search.dateTo) ? search.dateTo : undefined;
  if (dateFrom && dateTo && dateFrom > dateTo) {
    dateFrom = undefined;
    dateTo = undefined;
  }
  return {
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    limit: [10, 20, 50].includes(limit) ? limit : 10,
    search: rawSearch && rawSearch.length <= 100 ? rawSearch : undefined,
    supplierId,
    status,
    dateFrom,
    dateTo,
  };
}

export function validateSupplierCatalogSearchParams(
  search: Record<string, unknown>,
): ISupplierProductSearchParams {
  const page = Number(search.page);
  const limit = Number(search.limit);
  const validLimits = [10, 25, 50];

  const rawSortBy = search.sortBy as SupplierProductSortField | undefined;
  const validSortFields: SupplierProductSortField[] = [
    'supplierExternalCode',
    'productInternalCode',
    'productName',
    'isPrimarySupplier',
    'createdAt',
    'updatedAt',
  ];
  const sortBy = rawSortBy && validSortFields.includes(rawSortBy) ? rawSortBy : undefined;

  const rawSortOrder = search.sortOrder as 'ASC' | 'DESC' | undefined;
  const sortOrder = rawSortOrder === 'ASC' || rawSortOrder === 'DESC' ? rawSortOrder : undefined;

  const rawSearch = typeof search.search === 'string' ? search.search.trim() : undefined;
  const searchParam = rawSearch && rawSearch.length > 0 ? rawSearch : undefined;

  return {
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    limit: validLimits.includes(limit) ? limit : 10,
    search: searchParam,
    sortBy,
    sortOrder,
  };
}

export function validateSuppliersSearchParams(
  search: Record<string, unknown>,
): ISupplierSearchParams {
  const page = Number(search.page);
  const limit = Number(search.limit);
  const validLimits = [10, 25, 50];

  const rawIsActive = search.isActive;
  let isActive: boolean | undefined;
  if (rawIsActive === true || rawIsActive === 'true') isActive = true;
  else if (rawIsActive === false || rawIsActive === 'false') isActive = false;

  const rawSortBy = search.sortBy as SupplierSortField | undefined;
  const validSortFields: SupplierSortField[] = [
    'businessName',
    'cuit',
    'taxCondition',
    'createdAt',
    'updatedAt',
  ];
  const sortBy = rawSortBy && validSortFields.includes(rawSortBy) ? rawSortBy : undefined;

  const rawSortOrder = search.sortOrder as 'ASC' | 'DESC' | undefined;
  const sortOrder = rawSortOrder === 'ASC' || rawSortOrder === 'DESC' ? rawSortOrder : undefined;

  const rawSearch = typeof search.search === 'string' ? search.search.trim() : undefined;
  const searchParam = rawSearch && rawSearch.length > 0 ? rawSearch : undefined;

  return {
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    limit: validLimits.includes(limit) ? limit : 10,
    search: searchParam,
    isActive,
    sortBy,
    sortOrder,
  };
}

export function validateQuarantineSearchParams(
  search: Record<string, unknown>,
): IQuarantineSearchParams {
  const page = Number(search.page);
  const limit = Number(search.limit);
  const validLimits = [10, 25, 50, 100];

  const rawStatus = search.status as string | undefined;
  const status =
    rawStatus && Object.values(QuarantineStatus).includes(rawStatus as QuarantineStatus)
      ? (rawStatus as QuarantineStatus)
      : undefined;

  const rawProduct = typeof search.productId === 'string' ? search.productId.trim() : undefined;
  const productId =
    rawProduct &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawProduct)
      ? rawProduct
      : undefined;

  const rawSearch = typeof search.search === 'string' ? search.search.trim() : undefined;
  const searchParam = rawSearch && rawSearch.length > 0 ? rawSearch : undefined;

  return {
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    limit: validLimits.includes(limit) ? limit : 10,
    productId,
    search: searchParam,
    status,
  };
}

export function validateStockSearchParams(search: Record<string, unknown>): IStockSearchParams {
  const page = Number(search.page);
  const limit = Number(search.limit);
  const validLimits = [10, 25, 50];

  const rawStatus = search.stockStatus as string | undefined;
  const stockStatus =
    rawStatus && Object.values(StockStatus).includes(rawStatus as StockStatus)
      ? (rawStatus as StockStatus)
      : undefined;

  const rawCategory = typeof search.category === 'string' ? search.category.trim() : undefined;
  const category =
    rawCategory &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawCategory)
      ? rawCategory
      : undefined;

  const rawSearch = typeof search.search === 'string' ? search.search.trim() : undefined;
  const searchParam = rawSearch && rawSearch.length > 0 ? rawSearch : undefined;

  return {
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    limit: validLimits.includes(limit) ? limit : 10,
    search: searchParam,
    category,
    stockStatus,
  };
}

export function validateStockMovementsSearchParams(
  search: Record<string, unknown>,
): IStockMovementsSearchParams {
  const page = Number(search.page);
  const limit = Number(search.limit);
  const validLimits = [10, 25, 50];

  const rawType = search.movementType as string | undefined;
  const movementType =
    rawType && Object.values(StockMovementType).includes(rawType as StockMovementType)
      ? (rawType as StockMovementType)
      : undefined;

  const rawFrom =
    typeof search.from === 'string' && search.from.trim().length > 0
      ? search.from.trim()
      : undefined;
  const rawTo =
    typeof search.to === 'string' && search.to.trim().length > 0 ? search.to.trim() : undefined;

  return {
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    limit: validLimits.includes(limit) ? limit : 10,
    movementType,
    from: rawFrom,
    to: rawTo,
  };
}

// 1. Root Route
const rootRoute = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: () => <NotFoundPage />,
});

// 2. Auth Routes (Public)
const authLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'auth',
  component: () => <AuthLayout />,
  beforeLoad: redirectAuthenticatedUser,
});

const loginRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/login',
  component: () => <LoginPage />,
});

// 3. App Routes (Protected / Shell)
const appShellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  component: () => <AppShell />,
  beforeLoad: requireAuthentication,
});

const indexRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/',
  component: () => <DashboardPage />,
});

const productsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/products',
  validateSearch: validateProductSearchParams,
  component: () => <ProductsListPage />,
});

const productCreateRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/products/new',
  beforeLoad: () => requireRole(UserRole.ADMINISTRADOR),
  component: () => <ProductCreatePage />,
});

const productEditRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/products/$id/edit',
  beforeLoad: () => requireRole(UserRole.ADMINISTRADOR),
  component: () => <ProductEditPage />,
});

// Static reserved stock subroutes
const stockBulkLoadRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/stock/bulk-load',
  beforeLoad: () => requireRole(UserRole.ADMINISTRADOR),
  component: () => <StockBulkLoadPage />,
});

const stockQuarantineRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/stock/quarantine',
  validateSearch: validateQuarantineSearchParams,
  beforeLoad: () => requireRole(UserRole.ADMINISTRADOR),
  component: () => <StockQuarantinePage />,
});

// Stock overview and detail routes
const stockOverviewRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/stock',
  validateSearch: validateStockSearchParams,
  component: () => <StockOverviewPage />,
});

const stockDetailRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/stock/$productId',
  validateSearch: validateStockMovementsSearchParams,
  component: () => <StockDetailPage />,
});

const purchasesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/purchases',
  beforeLoad: () => {
    requireRoutePermission('/purchases');
    throw redirect({ to: '/purchases/orders' });
  },
  component: () => null,
});

const purchasesOrdersRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/purchases/orders',
  validateSearch: validatePurchaseOrderSearchParams,
  beforeLoad: () => requireRole(UserRole.ADMINISTRADOR),
  component: () => <PurchaseOrdersListPage />,
});

const purchaseBackordersRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/purchases/backorders',
  validateSearch: validateBackorderSearchParams,
  beforeLoad: () => requireRole(UserRole.ADMINISTRADOR),
  component: () => <PurchaseBackordersPage />,
});

const supplierInvoicesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/purchases/supplier-invoices',
  validateSearch: validateSupplierInvoiceSearchParams,
  beforeLoad: () => requireRole(UserRole.ADMINISTRADOR),
  component: () => <SupplierInvoicesListPage />,
});

const supplierInvoiceCreateRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/purchases/supplier-invoices/new',
  beforeLoad: () => requireRole(UserRole.ADMINISTRADOR),
  component: () => <SupplierInvoiceCreatePage />,
});

const supplierInvoiceDetailRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/purchases/supplier-invoices/$id',
  beforeLoad: () => requireRole(UserRole.ADMINISTRADOR),
  component: () => <SupplierInvoiceDetailPage />,
});

const purchaseOrderCreateRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/purchases/orders/new',
  beforeLoad: () => requireRole(UserRole.ADMINISTRADOR),
  component: () => <PurchaseOrderCreatePage />,
});

const purchaseOrderDetailRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/purchases/orders/$id',
  beforeLoad: () => requireRole(UserRole.ADMINISTRADOR),
  component: () => <PurchaseOrderDetailPage />,
});

const purchaseOrderReceiveRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/purchases/orders/$id/receive',
  beforeLoad: () => requireRole(UserRole.ADMINISTRADOR),
  component: () => <PurchaseOrderReceivePage />,
});

const salesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/sales',
  component: () => (
    <PlaceholderPage
      title="Punto de Venta y Facturación"
      description="Registro rápido de ventas, descuento de stock y comprobantes fiscales ARCA"
      sprint="Sprint 7 — US-25"
    />
  ),
});

const customersRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/customers',
  component: () => (
    <PlaceholderPage
      title="Clientes y Precios Especiales"
      description="Administración de cuentas comerciales, límites de crédito y acuerdos"
      sprint="Sprint 6 — US-23"
    />
  ),
});

const suppliersRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/suppliers',
  validateSearch: validateSuppliersSearchParams,
  beforeLoad: () => requireRoutePermission('/suppliers'),
  component: () => <SuppliersPage />,
});

const supplierCatalogRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/suppliers/$supplierId/catalog',
  validateSearch: validateSupplierCatalogSearchParams,
  beforeLoad: () => requireRoutePermission('/suppliers'),
  component: () => <SupplierCatalogPage />,
});

const importerRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/importer',
  beforeLoad: () => requireRoutePermission('/importer'),
  component: () => <ImporterWizardPage />,
});

const receivablesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/receivables',
  beforeLoad: () => requireRoutePermission('/receivables'),
  component: () => (
    <PlaceholderPage
      title="Cuentas Corrientes y Cobranzas"
      description="Ledger de cuentas corrientes, aplicación de recibos y cheques"
      sprint="Sprint 9 — US-29"
    />
  ),
});

const treasuryRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/treasury',
  beforeLoad: () => requireRoutePermission('/treasury'),
  component: () => (
    <PlaceholderPage
      title="Tesorería y Caja"
      description="Control de caja chica, transferencias bancarias y cheques en cartera"
      sprint="Sprint 10 — US-33"
    />
  ),
});

const reportsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/reports',
  beforeLoad: () => requireRoutePermission('/reports'),
  component: () => (
    <PlaceholderPage
      title="Reportes Operativos y Financieros"
      description="Métricas de rentabilidad, rotación de stock y exportaciones Excel/PDF"
      sprint="Sprint 10 — US-37"
    />
  ),
});

const settingsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/settings',
  validateSearch: validateSettingsSearchParams,
  component: () => <SettingsPage />,
});

const adminUsersRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/admin/users',
  validateSearch: validateUserSearchParams,
  beforeLoad: () => requireRoutePermission('/admin/users'),
  component: () => <UsersPage />,
});

const adminMarkupsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/admin/markups',
  beforeLoad: () => requireRole(UserRole.ADMINISTRADOR),
  component: () => <MarkupsPage />,
});

// 4. Build Route Tree
const routeTree = rootRoute.addChildren([
  authLayoutRoute.addChildren([loginRoute]),
  appShellRoute.addChildren([
    indexRoute,
    productsRoute,
    productCreateRoute,
    productEditRoute,
    stockBulkLoadRoute,
    stockQuarantineRoute,
    stockOverviewRoute,
    stockDetailRoute,
    purchasesRoute,
    purchasesOrdersRoute,
    purchaseBackordersRoute,
    supplierInvoicesRoute,
    supplierInvoiceCreateRoute,
    supplierInvoiceDetailRoute,
    purchaseOrderCreateRoute,
    purchaseOrderDetailRoute,
    purchaseOrderReceiveRoute,
    salesRoute,

    customersRoute,
    suppliersRoute,
    supplierCatalogRoute,
    importerRoute,
    receivablesRoute,
    treasuryRoute,
    reportsRoute,
    settingsRoute,
    adminUsersRoute,
    adminMarkupsRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
