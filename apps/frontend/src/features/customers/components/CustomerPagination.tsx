import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import type { IPaginatedCustomersResponse } from '../types/customers.types';

export function CustomerPagination({
  meta,
  disabled,
  onPageChange,
  onLimitChange,
}: {
  meta: IPaginatedCustomersResponse['meta'];
  disabled?: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}) {
  return (
    <nav
      aria-label="Paginación de clientes"
      className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900"
    >
      <span>
        {meta.total} cliente{meta.total === 1 ? '' : 's'} · Página {meta.page} de {meta.totalPages}
      </span>
      <div className="flex items-center gap-2">
        <Select
          aria-label="Clientes por página"
          value={meta.limit}
          onChange={(event) => onLimitChange(Number(event.target.value))}
          disabled={disabled}
          className="w-20"
        >
          {[10, 25, 50].map((limit) => (
            <option key={limit} value={limit}>
              {limit}
            </option>
          ))}
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Página anterior"
          disabled={disabled || !meta.hasPreviousPage}
          onClick={() => onPageChange(meta.page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Página siguiente"
          disabled={disabled || !meta.hasNextPage}
          onClick={() => onPageChange(meta.page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}
