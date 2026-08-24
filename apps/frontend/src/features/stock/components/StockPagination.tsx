import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import type { IStockPaginationMeta } from '../types/stock.types';

interface StockPaginationProps {
  meta: IStockPaginationMeta;
  onPageChange: (newPage: number) => void;
  onLimitChange?: (newLimit: number) => void;
  entityName?: string;
}

export const StockPagination: React.FC<StockPaginationProps> = ({
  meta,
  onPageChange,
  onLimitChange,
  entityName = 'registros',
}) => {
  const { total, page, limit, totalPages, hasNextPage, hasPreviousPage } = meta;

  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div
      data-testid="stock-pagination"
      className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 text-sm text-muted-foreground border-t border-border"
    >
      <div className="flex items-center gap-2">
        <span>
          Mostrando <strong className="text-foreground">{start}</strong> a{' '}
          <strong className="text-foreground">{end}</strong> de{' '}
          <strong className="text-foreground">{total}</strong> {entityName}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {onLimitChange && (
          <div className="flex items-center gap-2">
            <span className="text-xs">Por página:</span>
            <Select
              value={String(limit)}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              aria-label="Seleccionar cantidad por página"
              className="w-20 h-8 text-xs"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPreviousPage}
            aria-label="Página anterior"
            className="h-8 px-2.5"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">Anterior</span>
          </Button>

          <span className="px-3 text-xs font-medium text-foreground">
            Página {page} de {totalPages || 1}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNextPage}
            aria-label="Página siguiente"
            className="h-8 px-2.5"
          >
            <span className="hidden sm:inline mr-1">Siguiente</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
