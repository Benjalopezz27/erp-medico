import React from 'react';
import { Link } from '@tanstack/react-router';
import { CheckCircle2, ExternalLink, Loader2, RotateCcw, ShieldAlert } from 'lucide-react';
import { SaleReturnItemQuality, UserRole, type ISale, type ISaleReturn } from '@erp/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDecimal } from '@/features/products/utils/products.math';
import { useAuthStore } from '@/stores/authStore';

interface SaleReturnsHistoryTableProps {
  sale: ISale;
  returns: ISaleReturn[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export const SaleReturnsHistoryTable: React.FC<SaleReturnsHistoryTableProps> = ({
  returns,
  isLoading,
  isError,
  onRetry,
}) => {
  const hasAdminRole = useAuthStore((state) => state.hasRole(UserRole.ADMINISTRADOR));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-xs text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Cargando historial de devoluciones…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
        <p>No fue posible cargar el historial de devoluciones.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-2 text-xs"
        >
          Reintentar
        </Button>
      </div>
    );
  }

  if (returns.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
        <RotateCcw className="mx-auto mb-2 h-6 w-6 text-slate-300" />
        No hay devoluciones registradas para esta venta.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {returns.map((ret) => (
        <div
          key={ret.id}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-900">
                Devolución #{ret.id.slice(0, 8)}
              </span>
              <span className="text-slate-500">
                {new Intl.DateTimeFormat('es-AR', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(ret.createdAt))}
              </span>
              <span className="text-slate-500">
                Por: <strong>{ret.user?.name ?? '—'}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              {ret.fiscalDocument && (
                <Badge variant="outline">
                  Nota de Crédito ({ret.fiscalDocument.arcaStatus.replace('_', ' ')})
                </Badge>
              )}
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(ret.totalGross)}
              </span>
            </div>
          </div>

          <div className="px-4 py-3 text-xs">
            <p className="text-slate-600 mb-3">
              <span className="font-semibold text-slate-700">Motivo:</span> {ret.reason}
            </p>

            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 font-semibold border-b border-slate-100 pb-1">
                <tr>
                  <th className="pb-2">Producto</th>
                  <th className="pb-2 text-right">Cantidad</th>
                  <th className="pb-2 text-right">Total bruto</th>
                  <th className="pb-2">Destino / Calidad</th>
                  <th className="pb-2">Observación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ret.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2">
                      <span className="font-medium text-slate-800">{item.product?.name ?? '—'}</span>
                      <span className="block font-mono text-[10px] text-slate-400">
                        {item.product?.internalCode ?? '—'}
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono font-semibold">
                      {formatDecimal(item.quantityBase)}
                    </td>
                    <td className="py-2 text-right font-mono">
                      {formatCurrency(item.subtotalGross)}
                    </td>
                    <td className="py-2">
                      {item.quality === SaleReturnItemQuality.APTO ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Stock disponible
                        </span>
                      ) : (
                        <div className="inline-flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            Cuarentena
                          </span>
                          {hasAdminRole ? (
                            <Link
                              to="/stock/quarantine"
                              search={{ productId: item.productId, page: 1, limit: 20 }}
                              className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-blue-600 hover:underline"
                            >
                              Ver lote <ExternalLink className="h-2.5 w-2.5" />
                            </Link>
                          ) : (
                            <span className="text-[10px] text-slate-400">(Aislado)</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-2 text-slate-500 italic">
                      {item.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};
