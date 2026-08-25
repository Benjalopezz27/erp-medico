import React, { useState, useEffect } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuarantineStatus, type IQuarantineSearchParams } from '../../types/quarantine.types';

interface QuarantineFiltersProps {
  filters: IQuarantineSearchParams;
  onFilterChange: (newFilters: Partial<IQuarantineSearchParams>) => void;
  onResetFilters: () => void;
}

export const QuarantineFilters: React.FC<QuarantineFiltersProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
}) => {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  useEffect(() => {
    setSearchTerm(filters.search || '');
  }, [filters.search]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if ((filters.search || '') !== searchTerm.trim()) {
        onFilterChange({
          search: searchTerm.trim() ? searchTerm.trim() : undefined,
          page: 1,
        });
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  const hasActiveFilters = Boolean(
    filters.search || filters.status || filters.productId,
  );

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            data-testid="quarantine-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código interno o nombre de producto..."
            className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
          />
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-2">
          <select
            data-testid="quarantine-status-select"
            value={filters.status || ''}
            onChange={(e) =>
              onFilterChange({
                status: (e.target.value as QuarantineStatus) || undefined,
                page: 1,
              })
            }
            className="px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          >
            <option value="">Todos los Estados</option>
            <option value={QuarantineStatus.EN_CUARENTENA}>En Cuarentena</option>
            <option value={QuarantineStatus.MERMA_CONFIRMADA}>Merma Confirmada</option>
            <option value={QuarantineStatus.DEVOLUCION_PROVEEDOR}>Devuelto a Proveedor</option>
            <option value={QuarantineStatus.REINGRESADO_STOCK}>Reingresado a Stock</option>
          </select>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onResetFilters}
              className="text-xs gap-1.5 h-9"
              data-testid="quarantine-reset-filters-btn"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpiar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
