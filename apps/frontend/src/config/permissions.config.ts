import { UserRole } from '@erp/shared-types';

export const ADMIN_ROUTES = [
  '/admin',
  '/purchases',
  '/suppliers',
  '/receivables',
  '/treasury',
  '/reports',
  '/importer',
  '/prices',
] as const;

export function isRouteAllowed(pathname: string, role: UserRole | null | undefined): boolean {
  const requiresAdmin = ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  return !requiresAdmin || role === UserRole.ADMINISTRADOR;
}
