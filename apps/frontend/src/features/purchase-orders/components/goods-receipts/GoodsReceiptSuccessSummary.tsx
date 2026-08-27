import React, { useEffect, useRef } from 'react';
import { ArrowLeft, CheckCircle2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PurchaseOrderStatusBadge } from '../PurchaseOrderStatusBadge';
import type { ICreateGoodsReceiptResponse } from '../../types/purchase-orders.types';
import { PurchaseOrderStatus } from '../../types/purchase-orders.types';
import { formatCurrency, formatQuantity } from '../../utils/purchase-orders.math';

interface GoodsReceiptSuccessSummaryProps {
  response: ICreateGoodsReceiptResponse;
  onViewOrder: () => void;
  onReceiveAgain: () => void;
}

export const GoodsReceiptSuccessSummary: React.FC<GoodsReceiptSuccessSummaryProps> = ({
  response,
  onViewOrder,
  onReceiveAgain,
}) => {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const { receipt, resultingPurchaseOrder } = response;

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <section className="space-y-6" aria-live="polite">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-800 dark:bg-emerald-950/30">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-600" />
          <div>
            <h2
              ref={titleRef}
              tabIndex={-1}
              className="text-xl font-bold text-emerald-900 outline-none dark:text-emerald-100"
            >
              Recepción registrada correctamente
            </h2>
            <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
              Se generó el comprobante{' '}
              <strong className="font-mono">{receipt.receiptNumber}</strong> para el remito{' '}
              <strong className="font-mono">{receipt.deliveryNoteNumber}</strong>.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Recepción
          </p>
          <p className="mt-1 font-mono text-lg font-bold">{receipt.receiptNumber}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Orden</p>
          <p className="mt-1 font-mono text-lg font-bold">{receipt.orderNumber}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Estado resultante
          </p>
          <div className="mt-2">
            <PurchaseOrderStatusBadge status={resultingPurchaseOrder.status} />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[900px] text-left text-xs">
          <caption className="sr-only">Movimientos generados por la recepción</caption>
          <thead className="bg-slate-50 dark:bg-slate-800/60">
            <tr>
              <th className="px-3 py-3">Producto</th>
              <th className="px-3 py-3 text-right">Recibido</th>
              <th className="px-3 py-3 text-right">Entrada base</th>
              <th className="px-3 py-3 text-right">Costo provisional</th>
              <th className="px-3 py-3 text-right">Subtotal</th>
              <th className="px-3 py-3 text-right">Stock anterior</th>
              <th className="px-3 py-3 text-right">Stock posterior</th>
              <th className="px-3 py-3">Movimiento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {receipt.items.map((item) => (
              <tr key={item.id}>
                <td className="px-3 py-3">
                  <p className="font-semibold">{item.productName}</p>
                  <p className="font-mono text-[11px] text-slate-400">{item.productCode}</p>
                </td>
                <td className="px-3 py-3 text-right font-mono">
                  {formatQuantity(item.receivedQtyPurchaseUnit)} {item.purchaseUnitSymbol}
                </td>
                <td className="px-3 py-3 text-right font-mono font-semibold text-blue-600">
                  {formatQuantity(item.receivedQtyBase)}
                </td>
                <td className="px-3 py-3 text-right font-mono">
                  {formatCurrency(item.provisionalCostUnitNet)}
                </td>
                <td className="px-3 py-3 text-right font-mono">
                  {formatCurrency(item.provisionalSubtotalNet)}
                </td>
                <td className="px-3 py-3 text-right font-mono">
                  {formatQuantity(item.previousStock)}
                </td>
                <td className="px-3 py-3 text-right font-mono font-semibold text-emerald-600">
                  {formatQuantity(item.subsequentStock)}
                </td>
                <td className="px-3 py-3 font-mono text-[10px] text-slate-500">
                  {item.stockMovementId}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        {resultingPurchaseOrder.status === PurchaseOrderStatus.PARCIAL && (
          <Button type="button" variant="outline" onClick={onReceiveAgain}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Registrar otra recepción
          </Button>
        )}
        <Button type="button" onClick={onViewOrder}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Ver detalle de la orden
        </Button>
      </div>
    </section>
  );
};
