import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

export interface SupplierPaginationProps {
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  disabled?: boolean;
}

export const SupplierPagination: React.FC<SupplierPaginationProps> = ({
  meta,
  onPageChange,
  onLimitChange,
  disabled = false,
}) => {
  const { total, page, limit, totalPages, hasNextPage, hasPreviousPage } = meta;

  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
      {/* Items count & page size */}
      <div className="flex items-center gap-3">
        <span>
          Mostrando <strong className="text-slate-800 dark:text-slate-200">{start}</strong> a{' '}
          <strong className="text-slate-800 dark:text-slate-200">{end}</strong> de{' '}
          <strong className="text-slate-800 dark:text-slate-200">{total}</strong> proveedores
        </span>

        <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 dark:border-slate-800">
          <span className="text-slate-500">Filas:</span>
          <Select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            disabled={disabled}
            className="h-7 text-xs w-16 px-1.5 py-0"
            aria-label="Registros por página"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </Select>
        </div>
      </div>

      {/* Page controls */}
      <div className="flex items-center gap-2">
        <span className="text-slate-500">
          Página <strong className="text-slate-800 dark:text-slate-200">{page}</strong> de{' '}
          <strong className="text-slate-800 dark:text-slate-200">{Math.max(1, totalPages)}</strong>
        </span>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPreviousPage || disabled || page <= 1}
            className="h-7 px-2 text-xs"
            aria-label="Página anterior"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
            Anterior
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNextPage || disabled || page >= totalPages}
            className="h-7 px-2 text-xs"
            aria-label="Página siguiente"
          >
            Siguiente
            <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
