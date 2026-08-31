import { Link } from '@tanstack/react-router';
import type { ISale } from '@erp/shared-types';
import { Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { FiscalStatusBadge } from './FiscalStatusBadge';
import { formatCurrency } from '@/features/products/utils/products.math';

export function SalesTable({ sales, loading }: { sales: ISale[]; loading: boolean }) {
  if (loading)
    return (
      <div
        className="h-64 animate-pulse rounded-xl border border-slate-200 bg-slate-100"
        aria-label="Cargando ventas"
      />
    );
  if (sales.length === 0)
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white py-14 text-center text-sm text-slate-500">
        No se encontraron ventas con los filtros aplicados.
      </div>
    );

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[850px] text-left text-xs">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-4 py-3">N° Venta</th>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Ítems</th>
            <th className="px-4 py-3">Medio</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Factura</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sales.map((sale) => (
            <tr key={sale.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-mono font-bold text-blue-700">{sale.saleNumber}</td>
              <td className="px-4 py-3">
                {new Intl.DateTimeFormat('es-AR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                }).format(new Date(sale.createdAt))}
              </td>
              <td className="px-4 py-3 font-medium">
                {sale.customer?.businessName ?? 'Consumidor final'}
              </td>
              <td className="px-4 py-3 text-center">{sale.items.length}</td>
              <td className="px-4 py-3">{sale.paymentMethod.replace('_', ' ')}</td>
              <td className="px-4 py-3">
                <Badge variant="info">{sale.status}</Badge>
              </td>
              <td className="px-4 py-3">
                <FiscalStatusBadge document={sale.fiscalDocument} />
              </td>
              <td className="px-4 py-3 text-right font-mono font-bold">
                {formatCurrency(sale.totalGross)}
              </td>
              <td className="px-4 py-3">
                <Link
                  to="/sales/$id"
                  params={{ id: sale.id }}
                  aria-label={`Ver ${sale.saleNumber}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Eye className="h-4 w-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
