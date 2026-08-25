import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SupplierProductPaginationProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export const SupplierProductPagination: React.FC<SupplierProductPaginationProps> = ({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  isLoading = false,
}) => {
  if (total === 0) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-400">
      <div>
        Mostrando <span className="font-medium text-slate-900 dark:text-slate-100">{start}</span> a{' '}
        <span className="font-medium text-slate-900 dark:text-slate-100">{end}</span> de{' '}
        <span className="font-medium text-slate-900 dark:text-slate-100">{total}</span> asociaciones
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 mr-2">
          Página {page} de {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isLoading}
          className="h-8 px-2"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || isLoading}
          className="h-8 px-2"
        >
          Siguiente
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};
