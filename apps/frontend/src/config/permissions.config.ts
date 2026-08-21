import { UserRole } from '@erp/shared-types';

export const ADMIN_ROUTES = [
  '/admin',
  '/purchases',
  '/suppliers',
  '/receivables',
  '/treasury',
  '/reports',
  '/settings',
] as const;

export function isRouteAllowed(pathname: string, role: UserRole | null | undefined): boolean {
  const requiresAdmin = ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  return !requiresAdmin || role === UserRole.ADMINISTRADOR;
}
