import { Link } from '@tanstack/react-router';
import { Banknote, Landmark, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TreasuryNavigationTabsProps {
  active: 'treasury' | 'cash-register' | 'checks';
}

const tabClass =
  'inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors';
const activeClass = 'border-blue-600 text-blue-700';
const idleClass = 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800';

const tabs = [
  { id: 'treasury', to: '/treasury', label: 'Movimientos', icon: Landmark },
  { id: 'cash-register', to: '/treasury/cash-register', label: 'Caja diaria', icon: Wallet },
  { id: 'checks', to: '/treasury/checks', label: 'Cheques', icon: Banknote },
] as const;

export function TreasuryNavigationTabs({ active }: TreasuryNavigationTabsProps) {
  return (
    <nav aria-label="Secciones de tesorería" className="border-b border-slate-200">
      <div className="flex gap-1">
        {tabs.map(({ id, to, label, icon: Icon }) => (
          <Link
            key={id}
            to={to}
            className={cn(tabClass, active === id ? activeClass : idleClass)}
            aria-current={active === id ? 'page' : undefined}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
