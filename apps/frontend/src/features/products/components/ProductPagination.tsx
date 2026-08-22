import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import type { PaginationMeta } from '../types/products.types';

interface ProductPaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  disabled?: boolean;
}

export const ProductPagination: React.FC<ProductPaginationProps> = ({
  meta,
  onPageChange,
  onLimitChange,
  disabled = false,
}) => {
  const { total, page, limit, totalPages, hasNextPage, hasPreviousPage } = meta;

  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="bg-white px-4 py-3 rounded-b-xl border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-600">
      {/* Items count & page size selector */}
      <div className="flex items-center gap-3">
        <span>
          Mostrando <strong className="text-slate-900">{start}</strong> a{' '}
          <strong className="text-slate-900">{end}</strong> de{' '}
          <strong className="text-slate-900">{total}</strong> productos
        </span>

        <div className="flex items-center gap-1.5 ml-2">
          <span className="text-slate-400">Por pág:</span>
          <Select
            value={limit.toString()}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            disabled={disabled}
            aria-label="Productos por página"
            className="w-16 h-8 text-xs py-0 px-2"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </Select>
        </div>
      </div>

      {/* Pagination navigation controls */}
      <div className="flex items-center gap-1.5 self-end sm:self-auto">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPreviousPage || disabled}
          aria-label="Página anterior"
          className="h-8 px-2 text-xs border-slate-200"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <span className="px-3 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-800">
          {page} / {totalPages}
        </span>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage || disabled}
          aria-label="Página siguiente"
          className="h-8 px-2 text-xs border-slate-200"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
