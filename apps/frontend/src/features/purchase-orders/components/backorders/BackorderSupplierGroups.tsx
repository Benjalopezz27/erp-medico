import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { AlertTriangle, ChevronDown, PackageCheck } from 'lucide-react';
import { formatCuit } from '@erp/shared-types';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatQuantity } from '../../utils/purchase-orders.math';
import { PurchaseOrderStatusBadge } from '../PurchaseOrderStatusBadge';
import type { IBackorderSupplierGroup } from '../../types/purchase-orders.types';

interface BackorderSupplierGroupsProps {
  groups: IBackorderSupplierGroup[];
}

export function BackorderSupplierGroups({ groups }: BackorderSupplierGroupsProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const toggle = (supplierId: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(supplierId)) next.delete(supplierId);
      else next.add(supplierId);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const contentId = `backorders-supplier-${group.supplier.id}`;
        const isExpanded = !collapsed.has(group.supplier.id);

        return (
          <section
            key={group.supplier.id}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <button
              type="button"
              onClick={() => toggle(group.supplier.id)}
              aria-expanded={isExpanded}
              aria-controls={contentId}
              className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">
                  {group.supplier.businessName}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  CUIT {formatCuit(group.supplier.cuit)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden text-right text-xs text-slate-500 sm:block">
                  <p>
                    {group.orderCount} órdenes · {group.pendingProductCount} productos
                  </p>
                  <p>{group.pendingLineCount} renglones pendientes</p>
                </div>
                {group.urgentOrderCount > 0 && (
                  <Badge variant="warning">{group.urgentOrderCount} urgentes</Badge>
                )}
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-slate-400 transition-transform',
                    isExpanded && 'rotate-180',
                  )}
                />
              </div>
            </button>

            {isExpanded && (
              <div
                id={contentId}
                className="space-y-3 border-t border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/30"
              >
                {group.orders.map((order) => (
                  <article
                    key={order.id}
                    className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                  >
                    <header className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to="/purchases/orders/$id"
                          params={{ id: order.id }}
                          className="font-mono text-sm font-semibold text-blue-700 hover:underline dark:text-blue-400"
                        >
                          {order.orderNumber}
                        </Link>
                        <PurchaseOrderStatusBadge status={order.status} />
                        {order.isUrgent && (
                          <Badge variant="warning" className="gap-1">
                            <AlertTriangle className="h-3 w-3" /> Urgente
                          </Badge>
                        )}
                        <span className="text-xs text-slate-500">
                          {order.ageDays} días desde emisión
                        </span>
                      </div>
                      <Link
                        to="/purchases/orders/$id/receive"
                        params={{ id: order.id }}
                        className={cn(
                          buttonVariants({ size: 'sm' }),
                          'gap-1.5 bg-blue-600 text-xs text-white hover:bg-blue-700',
                        )}
                      >
                        <PackageCheck className="h-3.5 w-3.5" />
                        Registrar recepción
                      </Link>
                    </header>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px] text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/50">
                          <tr>
                            <th className="px-3 py-2 font-medium">Producto</th>
                            <th className="px-3 py-2 font-medium">SKU proveedor</th>
                            <th className="px-3 py-2 text-right font-medium">Pedido</th>
                            <th className="px-3 py-2 text-right font-medium">Recibido</th>
                            <th className="px-3 py-2 text-right font-medium">Pendiente</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {order.items.map((item) => (
                            <tr key={item.purchaseOrderItemId}>
                              <td className="px-3 py-2.5">
                                <p className="font-medium text-slate-900 dark:text-white">
                                  {item.productName}
                                </p>
                                <p className="font-mono text-[11px] text-slate-500">
                                  {item.productCode}
                                </p>
                              </td>
                              <td className="px-3 py-2.5 font-mono text-slate-600 dark:text-slate-300">
                                {item.supplierSku}
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                {formatQuantity(item.orderedQty)} {item.purchaseUnitSymbol}
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                {formatQuantity(item.receivedQty)} {item.purchaseUnitSymbol}
                              </td>
                              <td className="px-3 py-2.5 text-right font-semibold text-amber-700 dark:text-amber-400">
                                {formatQuantity(item.pendingQty)} {item.purchaseUnitSymbol}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
