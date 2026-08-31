import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { AlertCircle, Plus, RefreshCw } from 'lucide-react';
import type { ICustomer, ISaleSearchParams } from '@erp/shared-types';
import { Button } from '@/components/ui/button';
import { SalesFilters } from '@/features/sales/components/SalesFilters';
import { SalesTable } from '@/features/sales/components/SalesTable';
import { useSalesQuery } from '@/features/sales/hooks/use-sales-query';
import { useCustomerDetailQuery } from '@/features/customers/hooks/use-customers-query';
import { parseSalesError } from '@/features/sales/utils/sales.errors';

export function SalesListPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as ISaleSearchParams;
  const query = useSalesQuery(search);
  const customerQuery = useCustomerDetailQuery(search.customerId ?? '');
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(null);
  useEffect(() => {
    if (customerQuery.data) setSelectedCustomer(customerQuery.data);
    if (!search.customerId) setSelectedCustomer(null);
  }, [customerQuery.data, search.customerId]);
  const update = (changes: Partial<ISaleSearchParams>, resetPage = false) =>
    navigate({
      to: '/sales',
      search: ((previous: ISaleSearchParams) => ({
        ...previous,
        ...changes,
        ...(resetPage ? { page: 1 } : {}),
      })) as never,
    });
  const meta = query.data?.meta;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Historial de Ventas</h1>
          <p className="text-xs text-slate-500">Consultá ventas confirmadas y su estado fiscal.</p>
        </div>
        <div className="flex gap-2">
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
          <Link to="/sales/new">
            <Button type="button" size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Nueva venta
            </Button>
          </Link>
        </div>
      </div>
      <SalesFilters
        params={search}
        customer={selectedCustomer}
        onCustomerLoaded={setSelectedCustomer}
        onChange={(changes) => update(changes, true)}
        onReset={() => {
          setSelectedCustomer(null);
          navigate({ to: '/sales', search: { page: 1, limit: search.limit ?? 20 } });
        }}
      />
      {query.isError && (
        <div
          role="alert"
          className="flex items-start justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700"
        >
          <span className="flex gap-2">
            <AlertCircle className="h-4 w-4" />
            {parseSalesError(query.error).message}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={() => query.refetch()}>
            Reintentar
          </Button>
        </div>
      )}
      {!query.isError && <SalesTable sales={query.data?.data ?? []} loading={query.isLoading} />}
      {meta && meta.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span>{meta.total} ventas</span>
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
            <select
              aria-label="Ventas por página"
              value={meta.limit}
              onChange={(event) => update({ limit: Number(event.target.value), page: 1 })}
              className="h-9 rounded-md border border-slate-300 bg-white px-2"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
