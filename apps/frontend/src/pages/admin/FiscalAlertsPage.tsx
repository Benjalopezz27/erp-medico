import { useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FiscalAlertsFilters } from '@/features/fiscal-alerts/components/FiscalAlertsFilters';
import { FiscalAlertsTable } from '@/features/fiscal-alerts/components/FiscalAlertsTable';
import { RetryFiscalDocumentModal } from '@/features/fiscal-alerts/components/RetryFiscalDocumentModal';
import { useFiscalAlertsQuery } from '@/features/fiscal-alerts/hooks/use-fiscal-alerts-query';
import { parseFiscalRetryError } from '@/features/fiscal-alerts/utils/fiscal-alerts.errors';
import type {
  IFiscalAlertRow,
  IFiscalAlertsSearchParams,
} from '@/features/fiscal-alerts/types/fiscal-alerts.types';

export function FiscalAlertsPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as IFiscalAlertsSearchParams;
  const query = useFiscalAlertsQuery(search);
  const [retryRow, setRetryRow] = useState<IFiscalAlertRow | null>(null);

  const update = (changes: Partial<IFiscalAlertsSearchParams>) =>
    navigate({
      to: '/admin/fiscal-alerts',
      search: ((previous: IFiscalAlertsSearchParams) => ({
        ...previous,
        ...changes,
      })) as never,
    });

  const meta = query.data?.meta;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Alertas Fiscales</h1>
          <p className="text-xs text-slate-500">
            Comprobantes pendientes o rechazados por ARCA/AFIP y su reintento manual.
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

      <FiscalAlertsFilters
        params={search}
        onChange={update}
        onReset={() =>
          navigate({
            to: '/admin/fiscal-alerts',
            search: { tab: search.tab, page: 1, limit: search.limit },
          })
        }
      />

      {query.isError && (
        <div
          role="alert"
          className="flex items-start justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700"
        >
          <span className="flex gap-2">
            <AlertCircle className="h-4 w-4" />
            {parseFiscalRetryError(query.error).message}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={() => query.refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {!query.isError && (
        <FiscalAlertsTable
          rows={query.data?.data ?? []}
          loading={query.isLoading}
          onRetry={setRetryRow}
        />
      )}

      {meta && meta.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span>{meta.total} comprobantes</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!meta.hasPreviousPage}
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
              disabled={!meta.hasNextPage}
              onClick={() => update({ page: meta.page + 1 })}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <RetryFiscalDocumentModal
        isOpen={retryRow !== null}
        onClose={() => setRetryRow(null)}
        row={retryRow}
      />
    </div>
  );
}
