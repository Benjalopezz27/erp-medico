import { AlertCircle, Loader2, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';
import { formatCurrency } from '@/features/products/utils/products.math';
import type { ParsedSalesError, PosPreviewTotals } from '../../types/sales.types';

export function PosSummary({
  totals,
  disabled,
  pending,
  error,
}: {
  totals: PosPreviewTotals;
  disabled: boolean;
  pending: boolean;
  error: ParsedSalesError | null;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-500">Neto gravado</span>
          <strong className="font-mono">{formatCurrency(totals.taxableNet)}</strong>
        </div>
        {Number(totals.exemptAmount) > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">Exento</span>
            <strong className="font-mono">{formatCurrency(totals.exemptAmount)}</strong>
          </div>
        )}
        {Number(totals.nonTaxedAmount) > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">No gravado</span>
            <strong className="font-mono">{formatCurrency(totals.nonTaxedAmount)}</strong>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-500">IVA estimado</span>
          <strong className="font-mono">{formatCurrency(totals.ivaTotal)}</strong>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
          <span className="font-bold">TOTAL</span>
          <strong className="font-mono text-blue-700">{formatCurrency(totals.totalGross)}</strong>
        </div>
      </div>
      <p className="rounded-lg bg-blue-50 p-2 text-[10px] text-blue-800">
        Estimación preliminar. Los importes definitivos se confirman al registrar la venta.
      </p>
      {error && (
        <div
          role="alert"
          className={`rounded-lg border p-3 text-xs ${error.isAmbiguousNetworkError ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-rose-200 bg-rose-50 text-rose-700'}`}
        >
          <p className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error.message}
          </p>
          {error.requestId && (
            <p className="mt-1 font-mono text-[10px]">Referencia: {error.requestId}</p>
          )}
          {error.isAmbiguousNetworkError && (
            <Link
              to="/sales"
              search={{ page: 1, limit: 20 }}
              className="mt-2 inline-block font-semibold underline"
            >
              Revisar historial antes de reintentar
            </Link>
          )}
        </div>
      )}
      <Button
        type="submit"
        disabled={disabled}
        className="w-full bg-blue-600 text-white hover:bg-blue-700"
      >
        {pending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ShoppingCart className="mr-2 h-4 w-4" />
        )}
        {pending ? 'Confirmando…' : 'Confirmar venta'}
      </Button>
    </div>
  );
}
