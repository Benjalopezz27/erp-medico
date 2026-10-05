import React from 'react';
import { useRouterState, Link } from '@tanstack/react-router';
import { Menu, ChevronRight } from 'lucide-react';

interface TopbarProps {
  onMenuToggle: () => void;
}

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/products': 'Productos',
  '/stock': 'Stock e Inventario',
  '/purchases': 'Compras y Recepción',
  '/sales': 'Historial de Ventas',
  '/customers': 'Clientes',
  '/suppliers': 'Proveedores',
  '/importer': 'Importador de Proveedores',
  '/receivables': 'Cuentas Corrientes',
  '/treasury': 'Tesorería y Caja',
  '/treasury/cash-register': 'Caja Diaria',
  '/treasury/checks': 'Gestión de Cheques',
  '/reports': 'Reportes Operativos',
  '/settings': 'Configuración del Sistema',
  '/prices/review': 'Revisión de Precios',
  '/admin/users': 'Usuarios',
  '/admin/markups': 'Márgenes',
  '/admin/fiscal-alerts': 'Alertas Fiscales',
  '/stock/quarantine': 'Cuarentena',
  '/purchases/orders': 'Órdenes de Compra',
  '/purchases/backorders': 'Mercadería Pendiente',
  '/purchases/supplier-invoices': 'Facturas de Proveedores',
  '/payments/new': 'Registrar Cobro',
};

export const Topbar: React.FC<TopbarProps> = ({ onMenuToggle }) => {
  const routerState = useRouterState();

  const currentPath = routerState.location.pathname;
  const currentTitle =
    (currentPath === '/sales/new' ? 'Punto de Venta' : undefined) ||
    (currentPath.startsWith('/sales/') ? 'Detalle de Venta' : undefined) ||
    routeTitles[currentPath] ||
    (currentPath.startsWith('/reports/') ? 'Reportes Operativos' : undefined) ||
    (currentPath.startsWith('/customers/') ? 'Detalle de Cliente' : undefined) ||
    (currentPath.startsWith('/stock/') ? 'Detalle de Stock' : undefined) ||
    (currentPath.startsWith('/purchases/') ? 'Compras y Recepción' : undefined) ||
    (currentPath.startsWith('/products/') ? 'Productos' : undefined) ||
    (currentPath.startsWith('/receipts/') ? 'Recibo' : undefined) ||
    'Página';

  return (
    <header className="h-16 shrink-0 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
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
    </header>
  );
};
