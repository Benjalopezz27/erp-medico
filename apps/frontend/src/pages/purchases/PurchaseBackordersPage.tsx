import { useCallback } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { AlertCircle, PackageCheck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PurchasesNavigationTabs } from '@/features/purchase-orders/components/PurchasesNavigationTabs';
import { BackorderFilters } from '@/features/purchase-orders/components/backorders/BackorderFilters';
import { BackorderSummaryCards } from '@/features/purchase-orders/components/backorders/BackorderSummaryCards';
import { BackorderSupplierGroups } from '@/features/purchase-orders/components/backorders/BackorderSupplierGroups';
import { useBackordersQuery } from '@/features/purchase-orders/hooks/use-backorders-query';
import { getPurchaseOrderErrorMessage } from '@/features/purchase-orders/utils/purchase-orders.errors';
import type { IBackorderSearchParams } from '@/features/purchase-orders/types/purchase-orders.types';

const emptySummary = {
  supplierCount: 0,
  orderCount: 0,
  pendingProductCount: 0,
  pendingLineCount: 0,
  urgentOrderCount: 0,
};

export function PurchaseBackordersPage() {
  const navigate = useNavigate();
  const filters = useSearch({ from: '/app/purchases/backorders' });
  const { data, isLoading, isFetching, isError, error, refetch } = useBackordersQuery(filters);

  const updateFilters = useCallback(
    (next: Partial<IBackorderSearchParams>) => {
      navigate({
        to: '/purchases/backorders',
        search: (previous) => ({ ...previous, ...next }),
        replace: true,
      });
    },
    [navigate],
  );

  const hasFilters = Boolean(filters.search || filters.supplierId || filters.urgentOnly);
  const groups = data?.groups ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav className="mb-1 flex items-center gap-1.5 text-xs text-slate-400">
            <Link to="/">Inicio</Link>
            <span>/</span>
            <span>Compras</span>
            <span>/</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              Mercadería pendiente
            </span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Mercadería pendiente
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Seguimiento de órdenes emitidas y parcialmente recibidas por proveedor.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Actualizar pendientes"
          className="text-xs"
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <PurchasesNavigationTabs active="backorders" />

      <BackorderSummaryCards summary={data?.summary ?? emptySummary} />

      <BackorderFilters
        search={filters.search}
        supplierId={filters.supplierId}
        urgentOnly={filters.urgentOnly}
        onSearchChange={(search) => updateFilters({ search })}
        onSupplierChange={(supplierId) => updateFilters({ supplierId })}
        onUrgentOnlyChange={(urgentOnly) => updateFilters({ urgentOnly })}
        onReset={() => navigate({ to: '/purchases/backorders', search: {}, replace: true })}
      />

      {isError && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
          <div className="flex gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Error al cargar la mercadería pendiente</p>
              <p className="mt-0.5">{getPurchaseOrderErrorMessage(error)}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="shrink-0 text-xs"
          >
            Reintentar
          </Button>
        </div>
      )}

      {!isError && isLoading && (
        <div aria-label="Cargando mercadería pendiente" className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900"
            />
          ))}
        </div>
      )}

      {!isError && !isLoading && groups.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
          <PackageCheck className="mx-auto h-9 w-9 text-emerald-500" />
          <h2 className="mt-3 font-semibold text-slate-900 dark:text-white">
            {hasFilters ? 'No hay coincidencias' : 'No hay mercadería pendiente'}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
            {hasFilters
              ? 'No encontramos órdenes pendientes con los filtros seleccionados.'
              : 'Todas las órdenes emitidas fueron completadas o canceladas.'}
          </p>
        </div>
      )}

      {!isError && !isLoading && groups.length > 0 && <BackorderSupplierGroups groups={groups} />}
    </div>
  );
}
