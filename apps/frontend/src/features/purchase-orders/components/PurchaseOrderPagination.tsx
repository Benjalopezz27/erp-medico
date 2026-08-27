import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

export interface PurchaseOrderPaginationProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export const PurchaseOrderPagination: React.FC<PurchaseOrderPaginationProps> = ({
  page,
  limit,
  total,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
  onLimitChange,
}) => {
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 rounded-b-xl">
      {/* Items count info */}
      <div className="flex items-center gap-2">
        <span>
          Mostrando <strong className="text-slate-900 dark:text-white">{startItem}</strong> a{' '}
          <strong className="text-slate-900 dark:text-white">{endItem}</strong> de{' '}
          <strong className="text-slate-900 dark:text-white">{total}</strong> órdenes
        </span>
      </div>

      {/* Page controls and limit selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <label htmlFor="po-page-limit" className="text-slate-500 shrink-0">
            Filas por página:
          </label>
          <Select
            id="po-page-limit"
            value={String(limit)}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="h-8 text-xs w-16"
            aria-label="Filas por página"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <span className="mr-2 text-slate-500">
            Página {page} de {Math.max(totalPages, 1)}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPreviousPage}
            className="h-8 w-8 p-0"
            aria-label="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNextPage}
            className="h-8 w-8 p-0"
            aria-label="Página siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
