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
import { useAuthStore } from '@/stores/authStore';
import { isRouteAllowed } from '@/config/permissions.config';

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
  component: () => (
    <PlaceholderPage
      title="Catálogo de Productos"
      description="Gestión de catálogo, unidades base y factores de conversión"
      sprint="Sprint 1 — US-04"
    />
  ),
});

const stockRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/stock',
  component: () => (
    <PlaceholderPage
      title="Stock e Inventario Ledger"
      description="Control transaccional inmutable de stock y rechazo de stock negativo"
      sprint="Sprint 2 — US-06"
    />
  ),
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
      sprint="Sprint 8 — US-29"
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
      sprint="Sprint 9 — US-33"
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
      sprint="Sprint 9 — US-37"
    />
  ),
});

const settingsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/settings',
  beforeLoad: () => requireRoutePermission('/settings'),
  component: () => (
    <PlaceholderPage
      title="Configuración del Sistema"
      description="Gestión de usuarios, auditoría, parámetros de ARCA y tolerancias"
      sprint="Sprint 10 — US-46"
    />
  ),
});

// 4. Build Route Tree
const routeTree = rootRoute.addChildren([
  authLayoutRoute.addChildren([loginRoute]),
  appShellRoute.addChildren([
    indexRoute,
    productsRoute,
    stockRoute,
    purchasesRoute,
    salesRoute,
    customersRoute,
    suppliersRoute,
    receivablesRoute,
    treasuryRoute,
    reportsRoute,
    settingsRoute,
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
