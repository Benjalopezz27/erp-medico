import React from 'react';
import { Link } from '@tanstack/react-router';
import { Eye, Edit3, PackageX, FileText } from 'lucide-react';
import { PurchaseOrderStatusBadge } from './PurchaseOrderStatusBadge';
import { formatCurrency } from '../utils/purchase-orders.math';
import { type IPurchaseOrderSummary, PurchaseOrderStatus } from '../types/purchase-orders.types';

export interface PurchaseOrderTableProps {
  orders: IPurchaseOrderSummary[];
  isLoading?: boolean;
}

export const PurchaseOrderTable: React.FC<PurchaseOrderTableProps> = ({
  orders,
  isLoading = false,
}) => {
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
        <p className="text-sm text-slate-500 font-medium">Cargando órdenes de compra...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
        <PackageX className="w-10 h-10 text-slate-400 mx-auto stroke-1" />
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          No se encontraron órdenes de compra
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          No hay órdenes que coincidan con los filtros aplicados o aún no se han creado órdenes de
          compra.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-t-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 font-semibold text-slate-700 dark:text-slate-300">
              <th className="py-3 px-4">N° OC</th>
              <th className="py-3 px-4">Proveedor</th>
              <th className="py-3 px-4">Fecha Creación</th>
              <th className="py-3 px-4">Fecha Emisión</th>
              <th className="py-3 px-4 text-center">Estado</th>
              <th className="py-3 px-4 text-center">Ítems</th>
              <th className="py-3 px-4 text-right">Total Neto</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {orders.map((order) => {
              const isDraft = order.status === PurchaseOrderStatus.BORRADOR;

              return (
                <tr
                  key={order.id}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  {/* Order Number */}
                  <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                    <Link
                      to="/purchases/orders/$id"
                      params={{ id: order.id }}
                      className="hover:underline flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {order.orderNumber}
                    </Link>
                  </td>

                  {/* Supplier */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {order.supplier.businessName}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      CUIT: {order.supplier.cuit}
                    </div>
                  </td>

                  {/* Created At */}
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                    {formatDate(order.createdAt)}
                  </td>

                  {/* Emitted At */}
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                    {formatDate(order.emittedAt)}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3 px-4 text-center">
                    <PurchaseOrderStatusBadge status={order.status} />
                  </td>

                  {/* Items Count */}
                  <td className="py-3 px-4 text-center font-mono font-medium text-slate-700 dark:text-slate-300">
                    {order.itemsCount}
                  </td>

                  {/* Total Net */}
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                    {formatCurrency(order.totalNet)}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        to="/purchases/orders/$id"
                        params={{ id: order.id }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors"
                        aria-label={`Ver orden ${order.orderNumber}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver</span>
                      </Link>

                      {isDraft && (
                        <Link
                          to="/purchases/orders/$id"
                          params={{ id: order.id }}
                          search={{ edit: true } as any}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium transition-colors"
                          aria-label={`Editar orden ${order.orderNumber}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
