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
import { SettingsPage } from '@/pages/SettingsPage';
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
import {
  StockStatus,
  StockMovementType,
  type IStockSearchParams,
  type IStockMovementsSearchParams,
} from '@/features/stock/types/stock.types';

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
  component: () => (
    <PlaceholderPage
      title="Carga Masiva de Stock"
      description="Importación por lote mediante archivo Excel / CSV"
      sprint="Sprint 2 — US-08"
    />
  ),
});

const stockQuarantineRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/stock/quarantine',
  beforeLoad: () => requireRole(UserRole.ADMINISTRADOR),
  component: () => (
    <PlaceholderPage
      title="Cuarentena de Stock"
      description="Gestión y resolución de mercadería en cuarentena"
      sprint="Sprint 2 — US-07"
    />
  ),
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
  beforeLoad: () => requireRoutePermission('/purchases'),
  component: () => (
    <PlaceholderPage
      title="Compras y Recepción"
      description="Emisión de órdenes de compra, recepciones parciales y backorders"
      sprint="Sprint 4 — US-15"
    />
  ),
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
  beforeLoad: () => requireRoutePermission('/suppliers'),
  component: () => (
    <PlaceholderPage
      title="Proveedores y Catálogos"
      description="Diccionario de códigos de producto y asistente de importación Excel"
      sprint="Sprint 3 — US-11"
    />
  ),
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
  component: () => <SettingsPage />,
});

const adminUsersRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/admin/users',
  validateSearch: validateUserSearchParams,
  beforeLoad: () => requireRoutePermission('/admin/users'),
  component: () => <UsersPage />,
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
    salesRoute,
    customersRoute,
    suppliersRoute,
    receivablesRoute,
    treasuryRoute,
    reportsRoute,
    settingsRoute,
    adminUsersRoute,
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
