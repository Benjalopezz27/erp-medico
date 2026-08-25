import React, { useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { ShieldAlert, Plus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuarantineFilters } from '@/features/stock/components/quarantine/QuarantineFilters';
import { QuarantineTable } from '@/features/stock/components/quarantine/QuarantineTable';
import { QuarantineCreateModal } from '@/features/stock/components/quarantine/QuarantineCreateModal';
import { QuarantineResolveModal } from '@/features/stock/components/quarantine/QuarantineResolveModal';
import { StockPagination } from '@/features/stock/components/StockPagination';
import { useQuarantineListQuery } from '@/features/stock/hooks/use-quarantine';
import { parseQuarantineApiError } from '@/features/stock/utils/quarantine.errors';
import type {
  IQuarantineSearchParams,
  IQuarantineStock,
} from '@/features/stock/types/quarantine.types';

export const StockQuarantinePage: React.FC = () => {
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as IQuarantineSearchParams;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedItemForResolve, setSelectedItemForResolve] = useState<IQuarantineStock | null>(
    null,
  );

  const currentFilters: IQuarantineSearchParams = {
    page: Number(searchParams?.page) || 1,
    limit: Number(searchParams?.limit) || 10,
    search: searchParams?.search || undefined,
    productId: searchParams?.productId || undefined,
    status: searchParams?.status || undefined,
  };

  const { data, isLoading, isError, error, refetch } = useQuarantineListQuery(currentFilters);

  const updateSearch = (newParams: Partial<IQuarantineSearchParams>) => {
    navigate({
      to: '/stock/quarantine',
      search: (prev: any) => ({
        ...prev,
        ...newParams,
        page: newParams.page !== undefined ? newParams.page : 1,
      }),
    });
  };

  const handleResetFilters = () => {
    navigate({
      to: '/stock/quarantine',
      search: {
        page: 1,
        limit: currentFilters.limit || 10,
      } as any,
    });
  };

  const items = data?.items || [];
  const meta = data?.meta || {
    total: 0,
    page: currentFilters.page || 1,
    limit: currentFilters.limit || 10,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  };

  return (
    <div
      data-testid="stock-quarantine-page"
      className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-in fade-in duration-200"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <button
                type="button"
                onClick={() => navigate({ to: '/stock' as any })}
                className="hover:text-foreground transition-colors"
              >
                Control de Stock
              </button>
              <span>/</span>
              <span className="text-foreground font-medium">Cuarentena</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight mt-0.5">
              Gestión de Stock en Cuarentena
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: '/stock' as any })}
            className="text-xs gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver a Stock
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
            data-testid="open-quarantine-create-modal-btn"
          >
            <Plus className="w-3.5 h-3.5" />
            Ingresar a Cuarentena
          </Button>
        </div>
      </div>

      {/* Filters */}
      <QuarantineFilters
        filters={currentFilters}
        onFilterChange={updateSearch}
        onResetFilters={handleResetFilters}
      />

      {/* Table */}
      <QuarantineTable
        items={items}
        isLoading={isLoading}
        isError={isError}
        errorMessage={parseQuarantineApiError(error)}
        onRetry={() => refetch()}
        onOpenResolve={(item) => setSelectedItemForResolve(item)}
      />

      {/* Pagination */}
      {!isLoading && !isError && meta.total > 0 && (
        <StockPagination
          meta={meta}
          onPageChange={(page) => updateSearch({ page })}
          onLimitChange={(limit) => updateSearch({ limit, page: 1 })}
        />
      )}

      {/* Create Modal */}
      <QuarantineCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Resolve Modal */}
      <QuarantineResolveModal
        isOpen={Boolean(selectedItemForResolve)}
        onClose={() => setSelectedItemForResolve(null)}
        item={selectedItemForResolve}
      />
    </div>
  );
};
