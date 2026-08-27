import React from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PurchaseOrderFilters } from '@/features/purchase-orders/components/PurchaseOrderFilters';
import { PurchaseOrderTable } from '@/features/purchase-orders/components/PurchaseOrderTable';
import { PurchaseOrderPagination } from '@/features/purchase-orders/components/PurchaseOrderPagination';
import { usePurchaseOrdersListQuery } from '@/features/purchase-orders/hooks/use-purchase-orders-query';
import { getPurchaseOrderErrorMessage } from '@/features/purchase-orders/utils/purchase-orders.errors';
import type {
  IPurchaseOrderSearchParams,
  PurchaseOrderStatus,
} from '@/features/purchase-orders/types/purchase-orders.types';
import { PurchasesNavigationTabs } from '@/features/purchase-orders/components/PurchasesNavigationTabs';

export const PurchaseOrdersListPage: React.FC = () => {
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as IPurchaseOrderSearchParams;

  const {
    data: response,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = usePurchaseOrdersListQuery(searchParams);

  const updateSearch = (newParams: Partial<IPurchaseOrderSearchParams>) => {
    navigate({
      to: '/purchases/orders',
      search: ((prev: any) => ({
        ...prev,
        ...newParams,
      })) as any,
    });
  };

  const handleFilterChange = (filterUpdate: Partial<IPurchaseOrderSearchParams>) => {
    navigate({
      to: '/purchases/orders',
      search: ((prev: any) => ({
        ...prev,
        ...filterUpdate,
        page: 1, // Reset to page 1 on filter change
      })) as any,
    });
  };

  const handleResetFilters = () => {
    navigate({
      to: '/purchases/orders',
      search: (() => ({
        page: 1,
        limit: searchParams.limit || 10,
      })) as any,
    });
  };

  const orders = response?.data || [];
  const meta = response?.meta || {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  };

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Link to="/" className="hover:text-slate-600 dark:hover:text-slate-200">
              Inicio
            </Link>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-300 font-medium">Compras</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-semibold">Órdenes de Compra</span>
          </nav>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Órdenes de Compra
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestión y seguimiento de órdenes de compra emitidas a proveedores.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs"
            aria-label="Actualizar listado"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <Link to="/purchases/orders/new">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Nueva Orden de Compra
            </Button>
          </Link>
        </div>
      </div>

      <PurchasesNavigationTabs active="orders" />

      {/* Filters */}
      <PurchaseOrderFilters
        search={searchParams.search}
        supplierId={searchParams.supplierId}
        status={searchParams.status}
        dateFrom={searchParams.dateFrom}
        dateTo={searchParams.dateTo}
        onSearchChange={(search) => handleFilterChange({ search })}
        onSupplierChange={(supplierId) => handleFilterChange({ supplierId })}
        onStatusChange={(status) => handleFilterChange({ status: status as PurchaseOrderStatus })}
        onDateFromChange={(dateFrom) => handleFilterChange({ dateFrom })}
        onDateToChange={(dateTo) => handleFilterChange({ dateTo })}
        onResetFilters={handleResetFilters}
      />

      {/* Error state */}
      {isError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start justify-between gap-3 text-xs text-rose-800 dark:text-rose-200">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Error al cargar las órdenes de compra</p>
              <p className="mt-0.5">{getPurchaseOrderErrorMessage(error)}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-xs shrink-0 border-rose-300 dark:border-rose-700 hover:bg-rose-100 dark:hover:bg-rose-900/50"
          >
            Reintentar
          </Button>
        </div>
      )}

      {/* Table & Pagination */}
      {!isError && (
        <div>
          <PurchaseOrderTable orders={orders} isLoading={isLoading} />
          {orders.length > 0 && (
            <PurchaseOrderPagination
              page={meta.page}
              limit={meta.limit}
              total={meta.total}
              totalPages={meta.totalPages}
              hasNextPage={meta.hasNextPage}
              hasPreviousPage={meta.hasPreviousPage}
              onPageChange={(page) => updateSearch({ page })}
              onLimitChange={(limit) => handleFilterChange({ limit })}
            />
          )}
        </div>
      )}
    </div>
  );
};
