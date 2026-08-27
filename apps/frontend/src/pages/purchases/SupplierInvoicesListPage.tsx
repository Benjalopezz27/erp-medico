import { useCallback } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { AlertCircle, Eye, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PurchasesNavigationTabs } from '@/features/purchase-orders/components/PurchasesNavigationTabs';
import { PurchaseOrderPagination } from '@/features/purchase-orders/components/PurchaseOrderPagination';
import { SupplierInvoiceFilters } from '@/features/supplier-invoices/components/SupplierInvoiceFilters';
import { SupplierInvoicesTable } from '@/features/supplier-invoices/components/SupplierInvoicesTable';
import { useSupplierInvoicesQuery } from '@/features/supplier-invoices/hooks/use-supplier-invoices';
import {
  SupplierInvoiceStatus,
  type ISupplierInvoiceSearchParams,
} from '@/features/supplier-invoices/types/supplier-invoices.types';
import { parseSupplierInvoiceError } from '@/features/supplier-invoices/utils/supplier-invoices.errors';

export function SupplierInvoicesListPage() {
  const navigate = useNavigate();
  const filters = useSearch({ from: '/app/purchases/supplier-invoices' });
  const query = useSupplierInvoicesQuery(filters);
  const observedQuery = useSupplierInvoicesQuery({
    page: 1,
    limit: 10,
    status: SupplierInvoiceStatus.OBSERVADA,
  });
  const update = useCallback(
    (next: Partial<ISupplierInvoiceSearchParams>, resetPage = true) =>
      navigate({
        to: '/purchases/supplier-invoices',
        search: ((previous: ISupplierInvoiceSearchParams) => ({
          ...previous,
          ...next,
          page: resetPage ? 1 : (next.page ?? previous.page),
        })) as any,
        replace: true,
      }),
    [navigate],
  );
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <nav className="mb-1 text-xs text-slate-400">
            <Link to="/">Inicio</Link> / Compras / Facturas
          </nav>
          <h1 className="text-2xl font-bold">Facturas de proveedores</h1>
          <p className="text-xs text-slate-500">
            Conciliación entre recepciones y comprobantes de proveedor.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw className={`mr-1.5 h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Link to="/purchases/supplier-invoices/new">
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Nueva factura
            </Button>
          </Link>
        </div>
      </header>
      <PurchasesNavigationTabs active="supplier-invoices" />
      <button
        type="button"
        onClick={() => update({ status: SupplierInvoiceStatus.OBSERVADA })}
        aria-pressed={filters.status === SupplierInvoiceStatus.OBSERVADA}
        className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors ${
          filters.status === SupplierInvoiceStatus.OBSERVADA
            ? 'border-amber-400 bg-amber-50'
            : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/50'
        }`}
      >
        <span className="flex items-center gap-3">
          <span className="rounded-lg bg-amber-100 p-2 text-amber-800">
            <Eye className="h-5 w-5" />
          </span>
          <span>
            <strong className="block">Facturas observadas</strong>
            <span className="text-xs text-slate-500">
              Pendientes de una decisión administrativa
            </span>
          </span>
        </span>
        <span className="font-mono text-2xl font-bold text-amber-800">
          {observedQuery.isLoading ? '—' : (observedQuery.data?.meta.total ?? 0)}
        </span>
      </button>
      <SupplierInvoiceFilters
        filters={filters}
        onChange={(next) => update(next)}
        onReset={() =>
          navigate({
            to: '/purchases/supplier-invoices',
            search: { page: 1, limit: filters.limit ?? 10 },
            replace: true,
          })
        }
      />
      {query.isError && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {parseSupplierInvoiceError(query.error).message}
          </span>
          <Button variant="outline" size="sm" onClick={() => query.refetch()}>
            Reintentar
          </Button>
        </div>
      )}
      {!query.isError && (
        <>
          <SupplierInvoicesTable
            invoices={query.data?.data ?? []}
            loading={query.isLoading}
            hasFilters={Boolean(
              filters.search ||
              filters.supplierId ||
              filters.status ||
              filters.dateFrom ||
              filters.dateTo,
            )}
          />
          {Boolean(query.data?.data.length) && (
            <PurchaseOrderPagination
              {...query.data!.meta}
              onPageChange={(page) => update({ page }, false)}
              onLimitChange={(limit) => update({ limit })}
            />
          )}
        </>
      )}
    </div>
  );
}
