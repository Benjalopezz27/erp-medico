import React from 'react';
import { useRouterState, Link } from '@tanstack/react-router';
import { Menu, LogOut, User as UserIcon, Shield, ChevronRight } from 'lucide-react';
import { useAuthStore, UserRole } from '@/stores/authStore';
import { sessionTerminator } from '@/services/session-terminator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface TopbarProps {
  onMenuToggle: () => void;
}

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/products': 'Productos',
  '/stock': 'Stock e Inventario',
  '/purchases': 'Compras y Recepción',
  '/sales': 'Ventas y Punto de Venta',
  '/customers': 'Clientes',
  '/suppliers': 'Proveedores',
  '/receivables': 'Cuentas Corrientes',
  '/treasury': 'Tesorería y Caja',
  '/reports': 'Reportes Operativos',
  '/settings': 'Configuración del Sistema',
};

export const Topbar: React.FC<TopbarProps> = ({ onMenuToggle }) => {
  const user = useAuthStore((state) => state.user);
  const routerState = useRouterState();

  const currentPath = routerState.location.pathname;
  const currentTitle = routeTitles[currentPath] || 'Página';

  const handleLogout = () => void sessionTerminator.terminate('user_logout');

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shadow-sm sticky top-0 z-30">
      {/* Left section: mobile button + Breadcrumb */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb */}
        <nav className="flex items-center space-x-1.5 text-sm text-slate-500 font-medium">
          <Link to="/" className="hover:text-blue-600 transition-colors">
            Inicio
          </Link>
          {currentPath !== '/' && (
            <>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <span className="text-slate-900 font-semibold">{currentTitle}</span>
            </>
          )}
        </nav>
      </div>

      {/* Right section: User widget and logout */}
      <div className="flex items-center space-x-3">
        {/* User profile & badge */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
            <UserIcon className="w-4 h-4" />
          </div>

          <div className="hidden md:flex flex-col items-start">
            <span className="text-xs font-semibold text-slate-800 leading-tight">
              {user?.name || 'Usuario'}
            </span>
            <span className="text-[10px] text-slate-500 leading-tight">
              {user?.email || 'usuario@erp.com'}
            </span>
          </div>

          <Badge
            variant={user?.role === UserRole.ADMINISTRADOR ? 'default' : 'secondary'}
            className="text-[10px] uppercase font-bold px-2 py-0.5"
          >
            {user?.role === UserRole.ADMINISTRADOR ? (
              <span className="flex items-center space-x-1">
                <Shield className="w-3 h-3 mr-1" /> ADMIN
              </span>
            ) : (
              'VENDEDOR'
            )}
          </Badge>
        </div>

        {/* Logout button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-slate-500 hover:text-red-600 hover:bg-red-50 text-xs px-2.5"
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Cerrar</span>
        </Button>
      </div>
    </header>
  );
};
