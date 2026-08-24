import React, { useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Package } from 'lucide-react';
import { StockOverviewFilters } from '@/features/stock/components/StockOverviewFilters';
import { StockOverviewTable } from '@/features/stock/components/StockOverviewTable';
import { StockPagination } from '@/features/stock/components/StockPagination';
import {
  StockAdjustmentModal,
  type StockAdjustmentModalProduct,
} from '@/features/stock/components/StockAdjustmentModal';
import { useStockQuery } from '@/features/stock/hooks/use-stock-query';
import { parseStockApiError } from '@/features/stock/utils/stock.errors';
import type { IStockSearchParams, IStockOverviewItem } from '@/features/stock/types/stock.types';

export const StockOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as IStockSearchParams;
  const [selectedProductForAdjustment, setSelectedProductForAdjustment] =
    useState<StockAdjustmentModalProduct | null>(null);

  const currentFilters: IStockSearchParams = {
    page: Number(searchParams?.page) || 1,
    limit: Number(searchParams?.limit) || 10,
    search: searchParams?.search || undefined,
    category: searchParams?.category || undefined,
    stockStatus: searchParams?.stockStatus || undefined,
    alertsOnly:
      searchParams?.alertsOnly === true ||
      (searchParams?.alertsOnly as unknown as string) === 'true'
        ? true
        : undefined,
  };

  const { data, isLoading, isError, error, refetch } = useStockQuery(currentFilters);

  const updateSearch = (newParams: Partial<IStockSearchParams>) => {
    navigate({
      to: '/stock',
      search: (prev: any) => ({
        ...prev,
        ...newParams,
      }),
    });
  };

  const handleResetFilters = () => {
    navigate({
      to: '/stock',
      search: {
        page: 1,
        limit: currentFilters.limit || 10,
      } as any,
    });
  };

  const handleViewLedger = (productId: string) => {
    navigate({
      to: '/stock/$productId',
      params: { productId },
      search: {
        page: 1,
        limit: 10,
      } as any,
    });
  };

  const handleOpenAdjustment = (item: IStockOverviewItem) => {
    setSelectedProductForAdjustment({
      productId: item.productId,
      internalCode: item.internalCode,
      productName: item.productName,
      baseUnit: item.baseUnit,
      currentBaseStock: item.currentBaseStock,
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
      data-testid="stock-overview-page"
      className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Control de Stock</h1>
            <p className="text-sm text-muted-foreground">
              Consulta de saldos consolidados por producto y estado de inventario
            </p>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <StockOverviewFilters
        filters={currentFilters}
        onFilterChange={(f) => updateSearch(f)}
        onResetFilters={handleResetFilters}
      />

      {/* Overview Table */}
      <StockOverviewTable
        items={items}
        isLoading={isLoading}
        isError={isError}
        errorMessage={parseStockApiError(error)}
        onRetry={() => refetch()}
        onViewLedger={handleViewLedger}
        onOpenAdjustment={handleOpenAdjustment}
      />

      {/* Pagination */}
      {!isLoading && !isError && items.length > 0 && (
        <StockPagination
          meta={meta}
          onPageChange={(p) => updateSearch({ page: p })}
          onLimitChange={(l) => updateSearch({ limit: l, page: 1 })}
          entityName="productos"
        />
      )}

      {/* Stock Adjustment Modal */}
      {selectedProductForAdjustment && (
        <StockAdjustmentModal
          isOpen={Boolean(selectedProductForAdjustment)}
          onClose={() => setSelectedProductForAdjustment(null)}
          product={selectedProductForAdjustment}
        />
      )}
    </div>
  );
};
