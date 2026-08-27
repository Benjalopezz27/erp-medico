import React, { useEffect, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, History, PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGoodsReceiptsQuery } from '../../hooks/use-goods-receipts-query';
import { parseGoodsReceiptApiError } from '../../utils/goods-receipt.errors';
import { formatCurrency, formatQuantity } from '../../utils/purchase-orders.math';

interface GoodsReceiptsHistoryProps {
  purchaseOrderId: string;
  enabled?: boolean;
}

export const GoodsReceiptsHistory: React.FC<GoodsReceiptsHistoryProps> = ({
  purchaseOrderId,
  enabled = true,
}) => {
  const [page, setPage] = useState(1);
  const query = useGoodsReceiptsQuery(purchaseOrderId, { page, limit: 10 }, { enabled });

  useEffect(() => setPage(1), [purchaseOrderId]);

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));

  return (
    <section
      className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
      aria-labelledby="goods-receipts-history-title"
    >
      <div className="flex items-center gap-2 border-b border-slate-100 p-4 dark:border-slate-800">
        <History className="h-4 w-4 text-blue-600" />
        <div>
          <h3
            id="goods-receipts-history-title"
            className="text-sm font-semibold text-slate-900 dark:text-white"
          >
            Historial de recepciones
          </h3>
          <p className="text-[11px] text-slate-400">
            Remitos y movimientos inmutables de esta orden.
          </p>
        </div>
      </div>

      {!enabled ? (
        <div className="p-8 text-center text-sm text-slate-500">
          Las órdenes en borrador todavía no tienen recepciones.
        </div>
      ) : query.isLoading ? (
        <div className="space-y-3 p-4" aria-label="Cargando historial de recepciones">
          {[0, 1].map((item) => (
            <div
              key={item}
              className="h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800"
            />
          ))}
        </div>
      ) : query.isError ? (
        <div className="p-8 text-center" role="alert">
          <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
          <p className="mt-2 text-sm font-semibold">No se pudo cargar el historial</p>
          <p className="mt-1 text-xs text-slate-500">
            {parseGoodsReceiptApiError(query.error).message}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => query.refetch()}
          >
            Reintentar
          </Button>
        </div>
      ) : !query.data?.data.length ? (
        <div className="p-8 text-center">
          <PackageOpen className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">
            No se registran recepciones para esta orden.
          </p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {query.data.data.map((receipt) => (
              <details key={receipt.id} className="group p-4">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                  <div>
                    <p className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                      {receipt.receiptNumber}
                    </p>
                    <p className="text-xs text-slate-500">Remito {receipt.deliveryNoteNumber}</p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>{formatDate(receipt.createdAt)}</p>
                    <p>
                      {receipt.user.name} · {receipt.items.length} línea(s)
                    </p>
                  </div>
                </summary>
                <div className="mt-3 overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <caption className="sr-only">Ítems de {receipt.receiptNumber}</caption>
                    <thead className="bg-slate-50 dark:bg-slate-800/60">
                      <tr>
                        <th className="px-3 py-2">Producto</th>
                        <th className="px-3 py-2 text-right">Cantidad</th>
                        <th className="px-3 py-2 text-right">Factor</th>
                        <th className="px-3 py-2 text-right">Entrada base</th>
                        <th className="px-3 py-2 text-right">Subtotal</th>
                        <th className="px-3 py-2">Movimiento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {receipt.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2">
                            <strong>{item.productName}</strong>
                            <br />
                            <span className="font-mono text-[10px] text-slate-400">
                              {item.productCode}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            {formatQuantity(item.receivedQtyPurchaseUnit)} {item.purchaseUnitSymbol}
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            {formatQuantity(item.conversionFactorUsed)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-blue-600">
                            {formatQuantity(item.receivedQtyBase)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            {formatCurrency(item.provisionalSubtotalNet)}
                          </td>
                          <td className="px-3 py-2 font-mono text-[10px] text-slate-500">
                            {item.stockMovementId}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
          </div>
          {query.data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 p-3 text-xs dark:border-slate-800">
              <span>
                Página {query.data.meta.page} de {query.data.meta.totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Página anterior"
                  disabled={!query.data.meta.hasPreviousPage}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Página siguiente"
                  disabled={!query.data.meta.hasNextPage}
                  onClick={() => setPage((current) => current + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};
