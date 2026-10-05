import React from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import {
  LayoutDashboard,
  Package,
  Boxes,
  Truck,
  ShoppingCart,
  Users,
  Factory,
  Landmark,
  FileBarChart2,
  Settings,
  UserCog,
  X,
  HeartPulse,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  FileWarning,
  CircleHelp,
} from 'lucide-react';
import { UserRole } from '@erp/shared-types';
import { useAuthStore } from '@/stores/authStore';
import { sessionTerminator } from '@/services/session-terminator';
import { useStockAlertsCountQuery } from '@/features/stock/hooks/use-stock-alerts-count-query';
import { useFiscalAlertsCountQuery } from '@/features/fiscal-alerts/hooks/use-fiscal-alerts-query';
import { cn } from '@/lib/utils';
import { isRouteAllowed } from '@/config/permissions.config';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  matchPrefixes?: string[];
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navigationSections: NavSection[] = [
  {
    label: 'Plataforma',
    items: [
      { name: 'Inicio', href: '/', icon: LayoutDashboard },
      { name: 'Ventas', href: '/sales', icon: ShoppingCart },
      { name: 'Productos', href: '/products', icon: Package, matchPrefixes: ['/prices'] },
      { name: 'Stock', href: '/stock', icon: Boxes },
      {
        name: 'Clientes',
        href: '/customers',
        icon: Users,
        matchPrefixes: ['/receivables', '/payments', '/receipts'],
      },
    ],
  },
  {
    label: 'Abastecimiento',
    items: [
      { name: 'Compras', href: '/purchases/orders', icon: Truck, matchPrefixes: ['/purchases'] },
      { name: 'Proveedores', href: '/suppliers', icon: Factory, matchPrefixes: ['/importer'] },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { name: 'Tesorería', href: '/treasury', icon: Landmark },
      { name: 'Reportes', href: '/reports', icon: FileBarChart2 },
    ],
  },
  {
    label: 'Administración',
    items: [
      { name: 'Usuarios', href: '/admin/users', icon: UserCog },
      { name: 'Alertas fiscales', href: '/admin/fiscal-alerts', icon: FileWarning },
      {
        name: 'Configuración',
        href: '/settings',
        icon: Settings,
        matchPrefixes: ['/admin/markups'],
      },
    ],
  },
  { label: 'Soporte', items: [{ name: 'Ayuda', href: '/help', icon: CircleHelp }] },
];

function isItemActive(item: NavItem, pathname: string): boolean {
  if (item.href === '/') return pathname === '/';
  return [item.href, ...(item.matchPrefixes ?? [])].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function getInitials(label: string): string {
  const parts = label
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2);
  return parts.map((part) => part[0]!.toUpperCase()).join('') || '?';
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  collapsed = false,
  onToggleCollapsed,
}) => {
  const { user } = useAuthStore();
  const { data: stockAlertCount } = useStockAlertsCountQuery();
  const isAdmin = user?.role === UserRole.ADMINISTRADOR;
  const { data: pendingFiscalAlerts } = useFiscalAlertsCountQuery(isAdmin);
  const currentPath = useRouterState().location.pathname;

  const visibleSections = React.useMemo(
    () =>
      navigationSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => isRouteAllowed(item.href, user?.role)),
        }))
        .filter((section) => section.items.length > 0),
    [user?.role],
  );

  // Collapse only applies on desktop (lg+); the mobile drawer is always expanded.
  const hideWhenCollapsed = collapsed && 'lg:hidden';

  const badgeCount = (item: NavItem): { count: number; testId: string; label: string } | null => {
    if (item.href === '/stock' && stockAlertCount !== undefined && stockAlertCount > 0) {
      return {
        count: stockAlertCount,
        testId: 'stock-alerts-badge',
        label: `${stockAlertCount} productos bajo stock mínimo`,
      };
    }
    if (
      item.href === '/admin/fiscal-alerts' &&
      isAdmin &&
      pendingFiscalAlerts !== undefined &&
      pendingFiscalAlerts > 0
    ) {
      return {
        count: pendingFiscalAlerts,
        testId: 'fiscal-alerts-badge',
        label: `${pendingFiscalAlerts} comprobantes fiscales pendientes o rechazados`,
      };
    }
    return null;
  };

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isItemActive(item, currentPath);
    const badge = badgeCount(item);
    return (
      <Link
        key={item.href}
        to={item.href}
        onClick={onClose}
        title={collapsed ? item.name : undefined}
        aria-label={collapsed ? item.name : undefined}
        className={cn(
          'relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
          collapsed && 'lg:justify-center lg:px-0',
          active
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
        )}
      >
        <Icon
          className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-white' : 'text-slate-500')}
        />
        <span className={cn('truncate', hideWhenCollapsed)}>{item.name}</span>
        {badge && (
          <>
            <span
              data-testid={badge.testId}
              aria-label={badge.label}
              className={cn(
                'ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold',
                active ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700',
                hideWhenCollapsed,
              )}
            >
              {badge.count}
            </span>
            {collapsed && (
              <span
                aria-hidden="true"
                className="absolute right-3 top-2 hidden h-2 w-2 rounded-full bg-amber-500 lg:block"
              />
            )}
          </>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        data-collapsed={collapsed}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white text-slate-800 transition-[transform,width] duration-200 ease-in-out',
          'lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:translate-x-0',
          collapsed && 'lg:w-[72px]',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Collapse toggle on the header edge (desktop only) */}
        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
            aria-expanded={!collapsed}
            className="absolute -right-[12.5px] top-[66px] z-10 -translate-y-1/2 hidden h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:text-slate-900 lg:flex"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-3.5 w-3.5" />
            ) : (
              <PanelLeftClose className="h-3.5 w-3.5" />
            )}
          </button>
        )}

        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4">
          <Link
            to="/"
            onClick={onClose}
            className={cn('flex items-center gap-2.5 overflow-hidden', collapsed && 'lg:mx-auto')}
          >
            <div className="shrink-0 rounded-xl bg-blue-600 p-2 text-white shadow-sm">
              <HeartPulse className="h-5 w-5" />
            </div>
            <span
              className={cn(
                'whitespace-nowrap text-sm font-bold tracking-tight text-slate-900',
                hideWhenCollapsed,
              )}
            >
              Distribuidora Médica
            </span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav aria-label="Navegación principal" className="flex-1 space-y-3 px-3 py-3">
          {visibleSections.map((section) => (
            <div key={section.label}>
              <div
                className={cn(
                  'px-3 pb-2 text-xs font-medium text-slate-400',
                  collapsed && 'lg:hidden',
                )}
              >
                {section.label}
              </div>
              {collapsed && <div className="mx-3 mb-2 hidden border-t border-slate-200 lg:block" />}
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={item.href}>{renderNavItem(item)}</li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* User + logout */}
        <div
          className={cn(
            'flex shrink-0 items-center gap-3 border-t border-slate-200 p-3',
            collapsed && 'lg:flex-col lg:gap-2',
          )}
        >
          <Link
            to="/account"
            onClick={onClose}
            title="Mi cuenta"
            aria-label="Mi cuenta"
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl transition-colors hover:bg-slate-100"
          >
            <div
              title={collapsed ? (user?.name ?? undefined) : undefined}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-800"
            >
              {getInitials(user?.name || user?.email || 'Usuario')}
            </div>
            <div className={cn('min-w-0 flex-1', hideWhenCollapsed)}>
              <div className="truncate text-sm font-semibold text-slate-900">
                {user?.name || 'Usuario'}
              </div>
              <div className="truncate text-xs text-slate-500">{user?.email}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {isAdmin ? 'Administrador' : 'Vendedor'}
              </div>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => void sessionTerminator.terminate('user_logout')}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>
    </>
  );
};
