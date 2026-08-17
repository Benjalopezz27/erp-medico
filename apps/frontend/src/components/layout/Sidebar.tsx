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
  X,
  HeartPulse,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Productos', href: '/products', icon: Package },
  { name: 'Stock', href: '/stock', icon: Boxes },
  { name: 'Compras', href: '/purchases', icon: Truck, adminOnly: true },
  { name: 'Ventas', href: '/sales', icon: ShoppingCart },
  { name: 'Clientes', href: '/customers', icon: Users },
  { name: 'Proveedores', href: '/suppliers', icon: Factory, adminOnly: true },
  { name: 'Cta Cte', href: '/receivables', icon: Receipt, adminOnly: true },
  { name: 'Tesorería', href: '/treasury', icon: Landmark, adminOnly: true },
  { name: 'Reportes', href: '/reports', icon: FileBarChart2, adminOnly: true },
  { name: 'Configuración', href: '/settings', icon: Settings, adminOnly: true },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const filteredNavItems = navItems.filter((item) => {
    if (item.adminOnly && user?.role !== 'ADMINISTRADOR') {
      return false;
    }
    return true;
  });

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
              <span className="font-bold text-sm tracking-tight text-white block">
                ERP Médica
              </span>
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

          <nav className="space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/'
                  ? currentPath === '/'
                  : currentPath.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => onClose()}
                  className={cn(
                    'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                  )}
                >
                  <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-slate-400')} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
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
