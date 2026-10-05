import { AlertCircle } from 'lucide-react';
import { TreasuryMovementType } from '@erp/shared-types';
import { CloseCashForm } from '@/features/cash-register/components/CloseCashForm';
import { OpenCashForm } from '@/features/cash-register/components/OpenCashForm';
import { useCashRegisterQuery } from '@/features/cash-register/hooks/use-cash-register';
import { formatCurrency } from '@/features/products/utils/products.math';
import { MOVEMENT_TYPE_LABELS, formatDateTime } from '@/features/treasury/utils/treasury.labels';
import { parseApiError } from '@/lib/errors/parse-api-error';

export function CashRegisterPage() {
  const { data, isError, error, isLoading } = useCashRegisterQuery();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Caja diaria</h1>
        <p className="text-xs text-slate-500">Apertura, movimientos de efectivo y arqueo.</p>
      </div>

      {isError && (
        <p role="alert" className="flex items-center gap-2 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4" />
          {parseApiError(error).message}
        </p>
      )}
      {isLoading && <p className="text-sm text-slate-500">Cargando…</p>}

      {data && !data.open && (
        <>
          <p className="text-sm font-semibold text-slate-700">La caja está cerrada.</p>
          {data.lastClosed && (
            <p className="text-xs text-slate-500">
              Último cierre: {formatDateTime(data.lastClosed.closedAt!)} (saldo contado:{' '}
              {formatCurrency(data.lastClosed.actualBalance)})
            </p>
          )}
          <OpenCashForm />
        </>
      )}

      {data?.open && (
        <>
          <p className="text-sm text-slate-700">
            <span className="font-semibold">Caja abierta</span> desde{' '}
            {formatDateTime(data.open.openedAt)} · Saldo inicial{' '}
            <span className="font-mono">{formatCurrency(data.open.openingBalance)}</span>
          </p>
          <section className="rounded-xl border border-slate-200 bg-white">
            <h2 className="border-b border-slate-100 p-3 text-sm font-semibold text-slate-900">
              Movimientos del turno
            </h2>
            {data.movements.length === 0 ? (
              <p className="p-3 text-xs text-slate-500">Sin movimientos de efectivo todavía.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-xs">
                {data.movements.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 p-3">
                    <span className="text-slate-500">{formatDateTime(m.createdAt)}</span>
                    <span className="flex-1">{m.concept}</span>
                    <span className="font-semibold">{MOVEMENT_TYPE_LABELS[m.movementType]}</span>
                    <span className="font-mono">
                      {m.movementType === TreasuryMovementType.EGRESO ? '-' : ''}
                      {formatCurrency(m.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <CloseCashForm expectedBalance={data.open.expectedBalance} />
        </>
      )}
    </div>
  );
}
