import React, { useState, useEffect } from 'react';
import { RotateCcw, Filter, Search, X } from 'lucide-react';
import { ProductStatus } from '@erp/shared-types';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { ICategory } from '../types/products.types';

interface ProductFiltersProps {
  search?: string;
  onSearchChange: (search?: string) => void;
  category?: string;
  onCategoryChange: (category?: string) => void;
  status?: ProductStatus;
  onStatusChange: (status?: ProductStatus) => void;
  categories?: ICategory[];
  onResetFilters: () => void;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  search = '',
  onSearchChange,
  category = '',
  onCategoryChange,
  status,
  onStatusChange,
  categories = [],
  onResetFilters,
}) => {
  const [localSearch, setLocalSearch] = useState(search);

  // Synchronize local search if external prop changes
  useEffect(() => {
    setLocalSearch(search || '');
  }, [search]);

  // Debounce search input to parent by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = localSearch.trim();
      if (trimmed !== (search || '').trim()) {
        onSearchChange(trimmed.length > 0 ? trimmed : undefined);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, search, onSearchChange]);

  const hasActiveFilters = Boolean(search || category || status);

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3 flex-1">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium shrink-0">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>Filtros:</span>
        </div>

        {/* Text Search Filter */}
        <div className="relative w-full sm:w-64">
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Buscar por código o nombre..."
            aria-label="Buscar en el catálogo"
            className="w-full h-9 pl-8 pr-7 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors text-slate-900 placeholder:text-slate-400"
          />
          {localSearch.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setLocalSearch('');
                onSearchChange(undefined);
              }}
              aria-label="Borrar texto de búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="w-full sm:w-48">
          <Select
            value={category || ''}
            onChange={(e) => onCategoryChange(e.target.value || undefined)}
            aria-label="Filtrar por categoría"
            className="text-xs h-9"
          >
            <option value="">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Status Filter */}
        <div className="w-full sm:w-40">
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
          className="text-xs text-slate-600 hover:text-slate-900 border-slate-200 self-start md:self-auto gap-1.5 shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Limpiar filtros</span>
        </Button>
      )}
    </div>
  );
};
