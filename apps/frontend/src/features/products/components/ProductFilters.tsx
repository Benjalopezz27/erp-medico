import React from 'react';
import { RotateCcw, Filter } from 'lucide-react';
import { ProductStatus } from '@erp/shared-types';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface ProductFiltersProps {
  status?: ProductStatus;
  onStatusChange: (status?: ProductStatus) => void;
  onResetFilters: () => void;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  status,
  onStatusChange,
  onResetFilters,
}) => {
  const hasActiveFilters = Boolean(status);

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>Filtros:</span>
        </div>

        {/* Status Filter */}
        <div className="w-48">
          <Select
            value={status || ''}
            onChange={(e) => {
              const val = e.target.value;
              onStatusChange(val ? (val as ProductStatus) : undefined);
            }}
            aria-label="Filtrar por estado"
            className="text-xs h-9"
          >
            <option value="">Todos los estados</option>
            <option value={ProductStatus.ACTIVE}>Activos</option>
            <option value={ProductStatus.INACTIVE}>Inactivos</option>
          </Select>
        </div>
      </div>

      {hasActiveFilters && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onResetFilters}
          className="text-xs text-slate-600 hover:text-slate-900 border-slate-200 self-start sm:self-auto gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Limpiar filtros</span>
        </Button>
      )}
    </div>
  );
};
