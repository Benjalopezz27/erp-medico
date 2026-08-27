import { AlertTriangle, Boxes, PackageSearch, Truck } from 'lucide-react';
import type { IBackordersResponse } from '../../types/purchase-orders.types';

interface BackorderSummaryCardsProps {
  summary: IBackordersResponse['summary'];
}

export function BackorderSummaryCards({ summary }: BackorderSummaryCardsProps) {
  const cards = [
    { label: 'Proveedores', value: summary.supplierCount, icon: Truck, color: 'text-blue-600' },
    {
      label: 'Órdenes pendientes',
      value: summary.orderCount,
      icon: PackageSearch,
      color: 'text-violet-600',
    },
    {
      label: 'Productos distintos',
      value: summary.pendingProductCount,
      icon: Boxes,
      color: 'text-emerald-600',
    },
    {
      label: 'Órdenes urgentes',
      value: summary.urgentOrderCount,
      icon: AlertTriangle,
      color: 'text-amber-600',
    },
  ];

  return (
    <section
      aria-label="Resumen de mercadería pendiente"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {cards.map(({ label, value, icon: Icon, color }) => (
        <div
          key={label}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
            </div>
            <Icon className={`h-5 w-5 ${color}`} aria-hidden="true" />
          </div>
        </div>
      ))}
    </section>
  );
}
