import React, { useState } from 'react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { StockDetailHeader } from '@/features/stock/components/StockDetailHeader';
import { StockEvolutionChart } from '@/features/stock/components/StockEvolutionChart';
import { StockMovementsFilters } from '@/features/stock/components/StockMovementsFilters';
import { StockMovementsTable } from '@/features/stock/components/StockMovementsTable';
import { StockPagination } from '@/features/stock/components/StockPagination';
import { StockAdjustmentModal } from '@/features/stock/components/StockAdjustmentModal';
import { useStockMovementsQuery } from '@/features/stock/hooks/use-stock-movements-query';
import { useStockEvolutionQuery } from '@/features/stock/hooks/use-stock-evolution-query';
import { parseStockApiError } from '@/features/stock/utils/stock.errors';
import type { IStockMovementsSearchParams } from '@/features/stock/types/stock.types';

export const StockDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { productId?: string };
  const productId = params.productId || '';
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);

  const searchParams = useSearch({
    strict: false,
  }) as IStockMovementsSearchParams;

  const currentFilters: IStockMovementsSearchParams = {
    page: Number(searchParams?.page) || 1,
    limit: Number(searchParams?.limit) || 10,
    movementType: searchParams?.movementType || undefined,
    from: searchParams?.from || undefined,
    to: searchParams?.to || undefined,
  };

  const {
    data: movementsData,
    isLoading: isLoadingMovements,
    isError: isErrorMovements,
    error: movementsError,
    refetch: refetchMovements,
  } = useStockMovementsQuery(productId, currentFilters);

  const { data: evolutionData, isLoading: isLoadingEvolution } = useStockEvolutionQuery(productId, {
    limit: 50,
    from: currentFilters.from,
    to: currentFilters.to,
  });

  const updateSearch = (newParams: Partial<IStockMovementsSearchParams>) => {
    navigate({
      to: '/stock/$productId',
      params: { productId },
      search: (prev: any) => ({
        ...prev,
        ...newParams,
      }),
    });
  };

  const handleResetFilters = () => {
    navigate({
      to: '/stock/$productId',
      params: { productId },
      search: {
        page: 1,
        limit: currentFilters.limit || 10,
      } as any,
    });
  };

  const handleBack = () => {
    navigate({
      to: '/stock',
      search: {
        page: 1,
        limit: 10,
      } as any,
    });
  };

  const product = movementsData?.product;
  const items = movementsData?.items || [];
  const meta = movementsData?.meta || {
    total: 0,
    page: currentFilters.page || 1,
    limit: currentFilters.limit || 10,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  };

  const baseUnitSymbol = product?.baseUnit?.symbol || '';
  const minStock = product?.minStock || 0;
  const currentStock = product?.currentBaseStock || 0;

  return (
    <div
      data-testid="stock-detail-page"
      className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
    >
      {/* Product Summary Header */}
      {product && (
        <StockDetailHeader
          product={product}
          onBack={handleBack}
          onOpenAdjustment={() => setIsAdjustmentModalOpen(true)}
        />
      )}

      {/* Evolution Chart */}
      <StockEvolutionChart
        points={evolutionData?.points || []}
        minStock={minStock}
        truncated={Boolean(evolutionData?.truncated)}
        baseUnitSymbol={baseUnitSymbol}
        currentStock={currentStock}
        isLoading={isLoadingEvolution}
      />

      {/* Ledger Movements Filter Section */}
      <StockMovementsFilters
        filters={currentFilters}
        onFilterChange={(f) => updateSearch(f)}
        onResetFilters={handleResetFilters}
      />

      {/* Movements Table */}
      <StockMovementsTable
        items={items}
        baseUnitSymbol={baseUnitSymbol}
        isLoading={isLoadingMovements}
        isError={isErrorMovements}
        errorMessage={parseStockApiError(movementsError)}
        onRetry={() => refetchMovements()}
      />

      {/* Pagination */}
      {!isLoadingMovements && !isErrorMovements && items.length > 0 && (
        <StockPagination
          meta={meta}
          onPageChange={(p) => updateSearch({ page: p })}
          onLimitChange={(l) => updateSearch({ limit: l, page: 1 })}
          entityName="movimientos"
        />
      )}

      {/* Stock Adjustment Modal */}
      {product && isAdjustmentModalOpen && (
        <StockAdjustmentModal
          isOpen={isAdjustmentModalOpen}
          onClose={() => setIsAdjustmentModalOpen(false)}
          product={{
            productId: product.productId,
            internalCode: product.internalCode,
            productName: product.productName,
            baseUnit: product.baseUnit,
            currentBaseStock: product.currentBaseStock,
          }}
        />
      )}
    </div>
  );
};
