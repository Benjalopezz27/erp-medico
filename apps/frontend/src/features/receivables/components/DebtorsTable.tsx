import { Link } from '@tanstack/react-router';
import type { IReceivableDebtorRow } from '@erp/shared-types';
import { formatCurrency } from '@/features/products/utils/products.math';
import { formatDate } from '../utils/receivables.format';
import { DebtorStatusBadge } from './DebtorStatusBadge';

export function DebtorsTable({
  rows,
  loading,
}: {
  rows: IReceivableDebtorRow[];
  loading: boolean;
}) {
  if (loading)
    return (
      <div
        className="h-64 animate-pulse rounded-xl border border-slate-200 bg-slate-100"
        aria-label="Cargando deudores"
      />
    );
  if (rows.length === 0)
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white py-14 text-center text-sm text-slate-500">
        No hay clientes con deuda para los filtros aplicados.
      </div>
    );

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[900px] text-left text-xs">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3 text-right">Fact. pend.</th>
            <th className="px-4 py-3 text-right">0-30 días</th>
            <th className="px-4 py-3 text-right">31-60 días</th>
            <th className="px-4 py-3 text-right">+60 días</th>
            <th className="px-4 py-3 text-right">Saldo total</th>
            <th className="px-4 py-3">Deuda más antigua</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.customerId} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <Link
                  to="/customers/$id"
                  params={{ id: row.customerId }}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {row.customerName}
                </Link>
                <p className="text-[11px] text-slate-500">{row.customerDocument}</p>
              </td>
              <td className="px-4 py-3 text-right">{row.pendingCount}</td>
              <td className="px-4 py-3 text-right">{formatCurrency(row.aging.days0to30)}</td>
              <td className="px-4 py-3 text-right">{formatCurrency(row.aging.days31to60)}</td>
              <td className="px-4 py-3 text-right">{formatCurrency(row.aging.days61plus)}</td>
              <td className="px-4 py-3 text-right font-semibold">
                {formatCurrency(row.totalBalance)}
              </td>
              <td className="px-4 py-3">{formatDate(row.oldestDebtDate)}</td>
              <td className="px-4 py-3">
                <DebtorStatusBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
