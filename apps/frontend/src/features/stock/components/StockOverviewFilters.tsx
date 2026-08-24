import React, { useState, useEffect } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useCategoriesQuery } from '@/features/categories/hooks/use-categories-query';
import { StockStatus, type IStockSearchParams } from '../types/stock.types';

interface StockOverviewFiltersProps {
  filters: IStockSearchParams;
  onFilterChange: (newFilters: Partial<IStockSearchParams>) => void;
  onResetFilters: () => void;
}

export const StockOverviewFilters: React.FC<StockOverviewFiltersProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
}) => {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const { data: categories = [], isLoading: isLoadingCategories } = useCategoriesQuery();

  useEffect(() => {
    setSearchTerm(filters.search || '');
  }, [filters.search]);

  // Debounced search handler
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm !== (filters.search || '')) {
        onFilterChange({ search: searchTerm || undefined, page: 1 });
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [searchTerm, filters.search, onFilterChange]);

  const hasActiveFilters = Boolean(
    filters.search ||
    (filters.category && filters.category !== 'ALL') ||
    (filters.stockStatus && filters.stockStatus !== ('ALL' as any)),
  );

  return (
    <div
      data-testid="stock-overview-filters"
      className="p-4 bg-card rounded-lg border border-border space-y-4"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Filter className="w-4 h-4 text-primary" />
          <span>Filtros de Búsqueda</span>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="text-xs h-7 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Limpiar filtros
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Text Search */}
        <div className="relative">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código o nombre..."
            className="pl-9 text-sm"
            aria-label="Buscar producto por código o nombre"
          />
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Borrar término de búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Select */}
        <div>
          <Select
            value={filters.category || ''}
            onChange={(e) =>
              onFilterChange({
                category: e.target.value || undefined,
                page: 1,
              })
            }
            disabled={isLoadingCategories}
            aria-label="Filtrar por categoría"
            className="text-sm"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Stock Status Select */}
        <div>
          <Select
            value={filters.stockStatus || ''}
            onChange={(e) =>
              onFilterChange({
                stockStatus: e.target.value ? (e.target.value as StockStatus) : undefined,
                page: 1,
              })
            }
            aria-label="Filtrar por estado de stock"
            className="text-sm"
          >
            <option value="">Todos los estados</option>
            <option value={StockStatus.CRITICAL}>Crítico (Sin Stock)</option>
            <option value={StockStatus.LOW}>Bajo (Bajo Mínimo)</option>
            <option value={StockStatus.NORMAL}>Normal (Óptimo)</option>
          </Select>
        </div>
      </div>
    </div>
  );
};
