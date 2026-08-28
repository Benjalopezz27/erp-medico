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
  Receipt,
  Landmark,
  FileBarChart2,
  Settings,
  UserCog,
  X,
  HeartPulse,
  FileUp,
  Tags,
  ChevronDown,
} from 'lucide-react';
import { UserRole } from '@erp/shared-types';
import { useAuthStore } from '@/stores/authStore';
import { useStockAlertsCountQuery } from '@/features/stock/hooks/use-stock-alerts-count-query';
import { usePriceReviewPendingCountQuery } from '@/features/price-reviews/hooks/use-price-reviews-query';
import { cn } from '@/lib/utils';
import { isRouteAllowed } from '@/config/permissions.config';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  matchPrefixes?: string[];
}

interface NavGroup {
  id: string;
  name: string;
  icon: React.ElementType;
  children: NavItem[];
}

type NavigationEntry = NavItem | NavGroup;

const navigationEntries: NavigationEntry[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  {
    id: 'products-prices',
    name: 'Productos y precios',
    icon: Package,
    children: [
      { name: 'Productos', href: '/products', icon: Package },
      { name: 'Revisión Precios', href: '/prices/review', icon: Tags },
    ],
  },
  { name: 'Stock', href: '/stock', icon: Boxes },
  {
    id: 'supply',
    name: 'Abastecimiento',
    icon: Truck,
    children: [
      {
        name: 'Compras',
        href: '/purchases/orders',
        icon: Truck,
        matchPrefixes: ['/purchases'],
      },
      { name: 'Proveedores', href: '/suppliers', icon: Factory },
      { name: 'Importador', href: '/importer', icon: FileUp },
    ],
  },
  {
    id: 'sales-customers',
    name: 'Ventas y clientes',
    icon: ShoppingCart,
    children: [
      { name: 'Ventas', href: '/sales', icon: ShoppingCart },
      { name: 'Clientes', href: '/customers', icon: Users },
      { name: 'Cta Cte', href: '/receivables', icon: Receipt },
    ],
  },
  {
    id: 'management',
    name: 'Gestión',
    icon: Landmark,
    children: [
      { name: 'Tesorería', href: '/treasury', icon: Landmark },
      { name: 'Reportes', href: '/reports', icon: FileBarChart2 },
    ],
  },
  {
    id: 'administration',
    name: 'Administración',
    icon: Settings,
    children: [
      { name: 'Usuarios', href: '/admin/users', icon: UserCog },
      { name: 'Configuración', href: '/settings', icon: Settings },
    ],
  },
];

function isNavGroup(entry: NavigationEntry): entry is NavGroup {
  return 'children' in entry;
}

function isItemActive(item: NavItem, pathname: string): boolean {
  if (item.href === '/') return pathname === '/';
  return [item.href, ...(item.matchPrefixes ?? [])].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const { data: stockAlertCount } = useStockAlertsCountQuery();
  const isAdmin = user?.role === UserRole.ADMINISTRADOR;
  const { data: pendingPriceReviews } = usePriceReviewPendingCountQuery(isAdmin);
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const visibleEntries = React.useMemo(
    () =>
      navigationEntries.flatMap<NavigationEntry>((entry) => {
        if (!isNavGroup(entry)) {
          return isRouteAllowed(entry.href, user?.role) ? [entry] : [];
        }
        const children = entry.children.filter((item) => isRouteAllowed(item.href, user?.role));
        if (children.length === 0) return [];
        if (children.length === 1) return children;
        return [{ ...entry, children }];
      }),
    [user?.role],
  );
  const activeGroupId = visibleEntries.find(
    (entry): entry is NavGroup =>
      isNavGroup(entry) && entry.children.some((item) => isItemActive(item, currentPath)),
  )?.id;
  const [expandedGroupId, setExpandedGroupId] = React.useState<string | null>(
    activeGroupId ?? null,
  );

  React.useEffect(() => {
    if (activeGroupId) setExpandedGroupId(activeGroupId);
  }, [activeGroupId]);

  const renderBadge = (item: NavItem) => {
    if (item.href === '/stock' && stockAlertCount !== undefined && stockAlertCount > 0) {
      return (
        <span
          data-testid="stock-alerts-badge"
          aria-label={`${stockAlertCount} productos bajo stock mínimo`}
          className="ml-auto rounded-full border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-400"
        >
          {stockAlertCount}
        </span>
      );
    }
    return null;
  };

  const renderNavItem = (item: NavItem, nested = false) => {
    const Icon = item.icon;
    const active = isItemActive(item, currentPath);
    return (
      <Link
        key={item.href}
        to={item.href}
        onClick={onClose}
        className={cn(
          'flex items-center rounded-lg text-sm font-medium transition-colors',
          nested ? 'ml-3 gap-2.5 px-3 py-2 text-xs' : 'gap-3 px-3 py-2',
          active
            ? 'bg-blue-600 text-white shadow-sm'
            : nested
              ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white',
        )}
      >
        <Icon
          className={cn(
            nested ? 'h-3.5 w-3.5' : 'h-4 w-4',
            active ? 'text-white' : 'text-slate-400',
          )}
        />
        <span>{item.name}</span>
        {renderBadge(item)}
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

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-200 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950/50">
          <Link to="/" className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block">ERP Médica</span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider block">
                DISTRIBUIDORA
              </span>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Menú Principal
          </div>

          <nav aria-label="Navegación principal">
            <ul className="space-y-1">
              {visibleEntries.map((entry) => {
                if (!isNavGroup(entry)) {
                  return <li key={entry.href}>{renderNavItem(entry)}</li>;
                }
                const expanded = expandedGroupId === entry.id;
                const groupActive = entry.children.some((item) => isItemActive(item, currentPath));
                const Icon = entry.icon;
                const showsPendingPriceCount =
                  entry.id === 'products-prices' &&
                  isAdmin &&
                  pendingPriceReviews !== undefined &&
                  pendingPriceReviews.count > 0;
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={`sidebar-group-${entry.id}`}
                      onClick={() => setExpandedGroupId(expanded ? null : entry.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        groupActive
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                      )}
                    >
                      <Icon
                        className={cn('h-4 w-4', groupActive ? 'text-blue-400' : 'text-slate-400')}
                      />
                      <span>{entry.name}</span>
                      {showsPendingPriceCount && (
                        <span
                          data-testid="price-reviews-pending-badge"
                          aria-label={`${pendingPriceReviews.count} revisiones de precio pendientes`}
                          className="ml-auto rounded-full border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-400"
                        >
                          {pendingPriceReviews.count}
                        </span>
                      )}
                      <ChevronDown
                        aria-hidden="true"
                        className={cn(
                          'h-4 w-4 text-slate-500 transition-transform',
                          !showsPendingPriceCount && 'ml-auto',
                          expanded && 'rotate-180',
                        )}
                      />
                    </button>
                    {expanded && (
                      <ul
                        id={`sidebar-group-${entry.id}`}
                        className="mt-1 space-y-1 border-l border-slate-700 pl-1"
                      >
                        {entry.children.map((item) => (
                          <li key={item.href}>{renderNavItem(item, true)}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/30 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Sprint 0 • v0.1.0</span>
          <span className="font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
            {user?.role || 'INVITADO'}
          </span>
        </div>
      </aside>
    </>
  );
};
