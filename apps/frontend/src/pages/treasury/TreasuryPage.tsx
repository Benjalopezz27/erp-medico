import { useState } from 'react';
import { AlertCircle, Plus } from 'lucide-react';
import { TreasuryAccountType, TreasuryMovementType } from '@erp/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { SortableTh } from '@/components/ui/sortable-th';
import { nextSort, type SortState } from '@/lib/sorting';
import type { TreasurySortField } from '@/features/treasury/api/treasury.api';
import { TreasuryNavigationTabs } from '@/features/treasury/components/TreasuryNavigationTabs';
import { NewMovementModal } from '@/features/treasury/components/NewMovementModal';
import {
  useTreasuryMovementsQuery,
  useTreasurySummaryQuery,
} from '@/features/treasury/hooks/use-treasury';
import {
  ACCOUNT_LABELS,
  ACCOUNT_ORDER,
  MOVEMENT_TYPE_LABELS,
  formatDateTime,
} from '@/features/treasury/utils/treasury.labels';
import { parseApiError } from '@/lib/errors/parse-api-error';
import { formatCurrency } from '@/lib/money';

const LIMIT = 20;

export function TreasuryPage() {
  const [accountType, setAccountType] = useState<TreasuryAccountType | ''>('');
  const [movementType, setMovementType] = useState<TreasuryMovementType | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState<TreasurySortField>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);

  const summary = useTreasurySummaryQuery();
  const movements = useTreasuryMovementsQuery({
    page,
    limit: LIMIT,
    ...(accountType ? { accountType } : {}),
    ...(movementType ? { movementType } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...sort,
  });
  const filter = (apply: () => void) => {
    apply();
    setPage(1);
  };
  const onSort = (field: TreasurySortField) => {
    setSort(nextSort(sort, field));
    setPage(1);
  };
  const sortProps = { ...sort, onSort };
  const meta = movements.data?.meta;
  const balances = new Map(summary.data?.accounts.map((a) => [a.accountType, a.balance]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tesorería</h1>
          <p className="text-xs text-slate-500">Saldos consolidados por canal y movimientos.</p>
        </div>
        <Button size="sm" onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Movimiento manual
        </Button>
      </div>

      <TreasuryNavigationTabs active="treasury" />

      {summary.isError && (
        <p role="alert" className="flex items-center gap-2 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4" />
          {parseApiError(summary.error).message}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        {ACCOUNT_ORDER.map((type) => (
          <section key={type} className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-xs font-semibold uppercase text-slate-500">
              {ACCOUNT_LABELS[type]}
            </h2>
            <p className="mt-1 font-mono text-2xl font-bold text-slate-900">
              {balances.has(type) ? formatCurrency(balances.get(type)) : '—'}
            </p>
          </section>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-xs">
          Cuenta
          <Select
            aria-label="Filtrar cuenta"
            value={accountType}
            onChange={(e) =>
              filter(() => setAccountType(e.target.value as TreasuryAccountType | ''))
            }
          >
            <option value="">Todas</option>
            {ACCOUNT_ORDER.map((value) => (
              <option key={value} value={value}>
                {ACCOUNT_LABELS[value]}
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-1 text-xs">
          Tipo
          <Select
            aria-label="Filtrar tipo"
            value={movementType}
            onChange={(e) =>
              filter(() => setMovementType(e.target.value as TreasuryMovementType | ''))
            }
          >
            <option value="">Todos</option>
            {Object.values(TreasuryMovementType).map((value) => (
              <option key={value} value={value}>
                {MOVEMENT_TYPE_LABELS[value]}
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-1 text-xs">
          Desde
          <Input
            aria-label="Desde"
            type="date"
            value={from}
            onChange={(e) => filter(() => setFrom(e.target.value))}
          />
        </label>
        <label className="space-y-1 text-xs">
          Hasta
          <Input
            aria-label="Hasta"
            type="date"
            value={to}
            onChange={(e) => filter(() => setTo(e.target.value))}
          />
        </label>
      </div>

      {movements.isError && (
        <p role="alert" className="flex items-center gap-2 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4" />
          {parseApiError(movements.error).message}
        </p>
      )}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <SortableTh field="createdAt" {...sortProps} className="px-3 py-2">
                Fecha
              </SortableTh>
              <SortableTh field="account" {...sortProps} className="px-3 py-2">
                Cuenta
              </SortableTh>
              <SortableTh field="movementType" {...sortProps} className="px-3 py-2">
                Tipo
              </SortableTh>
              <SortableTh field="amount" {...sortProps} right className="px-3 py-2">
                Monto
              </SortableTh>
              <SortableTh field="concept" {...sortProps} className="px-3 py-2">
                Concepto
              </SortableTh>
              <SortableTh field="user" {...sortProps} className="px-3 py-2">
                Usuario
              </SortableTh>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {movements.data?.data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                  No hay movimientos para los filtros elegidos.
                </td>
              </tr>
            )}
            {movements.data?.data.map((m) => (
              <tr key={m.id}>
                <td className="px-3 py-2">{formatDateTime(m.createdAt)}</td>
                <td className="px-3 py-2">{ACCOUNT_LABELS[m.accountType]}</td>
                <td className="px-3 py-2">{MOVEMENT_TYPE_LABELS[m.movementType]}</td>
                <td
                  className={`px-3 py-2 text-right font-mono ${
                    m.movementType === TreasuryMovementType.INGRESO
                      ? 'text-emerald-700'
                      : 'text-rose-700'
                  }`}
                >
                  {m.movementType === TreasuryMovementType.INGRESO ? '+' : '−'}
                  {formatCurrency(m.amount)}
                </td>
                <td className="px-3 py-2">{m.concept}</td>
                <td className="px-3 py-2">{m.user?.name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-xs">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <span>
            Página {meta.page} de {meta.totalPages}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page >= meta.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}

      <NewMovementModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
