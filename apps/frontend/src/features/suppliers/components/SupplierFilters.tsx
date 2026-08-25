import React, { useState, useEffect } from 'react';
import { Search, X, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export interface SupplierFiltersProps {
  search?: string;
  isActive?: boolean;
  onSearchChange: (search?: string) => void;
  onStatusChange: (isActive?: boolean) => void;
  onResetFilters: () => void;
}

export const SupplierFilters: React.FC<SupplierFiltersProps> = ({
  search = '',
  isActive,
  onSearchChange,
  onStatusChange,
  onResetFilters,
}) => {
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  useEffect(() => {
    const handler = setTimeout(() => {
      const trimmed = localSearch.trim();
      const nextSearch = trimmed.length > 0 ? trimmed : undefined;
      if (nextSearch !== search) {
        onSearchChange(nextSearch);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [localSearch, search, onSearchChange]);

  const hasActiveFilters = Boolean(search || isActive !== undefined);

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <Input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Buscar por razón social o CUIT..."
          className="pl-9 pr-8 h-9 text-sm"
          aria-label="Buscar proveedores"
        />
        {localSearch && (
          <button
            type="button"
            onClick={() => {
              setLocalSearch('');
              onSearchChange(undefined);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
            aria-label="Limpiar búsqueda"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Status Filter */}
      <div className="w-full sm:w-48">
        <Select
          value={isActive === undefined ? '' : isActive ? 'true' : 'false'}
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'true') onStatusChange(true);
            else if (val === 'false') onStatusChange(false);
            else onStatusChange(undefined);
          }}
          className="h-9 text-xs"
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </Select>
      </div>

      {/* Reset Filters */}
      {hasActiveFilters && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setLocalSearch('');
            onResetFilters();
          }}
          className="h-9 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Restablecer
        </Button>
      )}
    </div>
  );
};
