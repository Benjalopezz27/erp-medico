import { useEffect, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { DebtorStatus } from '@erp/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DebtorsTable } from '@/features/receivables/components/DebtorsTable';
import type { DebtorSearchParams } from '@/features/receivables/api/receivables.api';
import { useDebtorsQuery } from '@/features/receivables/hooks/use-receivables-query';
import { parseApiError } from '@/lib/errors/parse-api-error';

const SEARCH_DEBOUNCE_MS = 300;

export function ReceivablesPage() {
  const navigate = useNavigate();
  const params = useSearch({ strict: false }) as DebtorSearchParams;
  const query = useDebtorsQuery(params);
  const [text, setText] = useState(params.search ?? '');

  const update = (changes: Partial<DebtorSearchParams>, resetPage = false) =>
    navigate({
      to: '/receivables',
      search: ((previous: DebtorSearchParams) => ({
        ...previous,
        ...changes,
        ...(resetPage ? { page: 1 } : {}),
      })) as never,
    });

  useEffect(() => {
    if (text === (params.search ?? '')) return;
    const timer = setTimeout(
      () => update({ search: text.trim() || undefined }, true),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const meta = query.data?.meta;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cuentas Corrientes</h1>
          <p className="text-xs text-slate-500">
            Clientes con deuda pendiente, saldo por antigüedad y estado de morosidad.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${query.isFetching ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="mb-1 block text-[11px] font-semibold text-slate-600">Cliente</label>
          <Input
            aria-label="Buscar cliente"
            placeholder="Nombre o documento"
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="h-9 text-xs"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-600">Estado</label>
          <Select
            aria-label="Estado de deuda"
            value={params.status ?? ''}
            onChange={(event) =>
              update(
                { status: (event.target.value || undefined) as DebtorStatus | undefined },
                true,
              )
            }
            className="h-9 text-xs"
          >
            <option value="">Todos</option>
            <option value={DebtorStatus.MOROSO}>Moroso</option>
            <option value={DebtorStatus.AL_DIA}>Al día</option>
          </Select>
        </div>
      </div>

      {query.isError && (
        <div
          role="alert"
          className="flex items-start justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700"
        >
          <span className="flex gap-2">
            <AlertCircle className="h-4 w-4" />
            {parseApiError(query.error).message}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={() => query.refetch()}>
            Reintentar
          </Button>
        </div>
      )}
      {!query.isError && <DebtorsTable rows={query.data?.data ?? []} loading={query.isLoading} />}

      {meta && meta.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span>{meta.total} clientes</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => update({ page: meta.page - 1 })}
            >
              Anterior
            </Button>
            <span>
              Página {meta.page} de {Math.max(meta.totalPages, 1)}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={meta.page >= meta.totalPages}
              onClick={() => update({ page: meta.page + 1 })}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
