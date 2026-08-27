import { Link } from '@tanstack/react-router';
import { ClipboardList, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PurchasesNavigationTabsProps {
  active: 'orders' | 'backorders';
}

const tabClass =
  'inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors';

export function PurchasesNavigationTabs({ active }: PurchasesNavigationTabsProps) {
  return (
    <nav
      aria-label="Secciones de compras"
      className="border-b border-slate-200 dark:border-slate-800"
    >
      <div className="flex gap-1">
        <Link
          to="/purchases/orders"
          className={cn(
            tabClass,
            active === 'orders'
              ? 'border-blue-600 text-blue-700 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:hover:text-slate-200',
          )}
          aria-current={active === 'orders' ? 'page' : undefined}
        >
          <ClipboardList className="h-4 w-4" />
          Órdenes de compra
        </Link>
        <Link
          to="/purchases/backorders"
          className={cn(
            tabClass,
            active === 'backorders'
              ? 'border-blue-600 text-blue-700 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:hover:text-slate-200',
          )}
          aria-current={active === 'backorders' ? 'page' : undefined}
        >
          <Clock3 className="h-4 w-4" />
          Mercadería pendiente
        </Link>
      </div>
    </nav>
  );
}
