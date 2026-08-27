import { useEffect, useState } from 'react';
import { RotateCcw, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useSuppliersQuery } from '@/features/suppliers/hooks/use-suppliers-query';

interface BackorderFiltersProps {
  search?: string;
  supplierId?: string;
  urgentOnly?: boolean;
  onSearchChange: (search?: string) => void;
  onSupplierChange: (supplierId?: string) => void;
  onUrgentOnlyChange: (urgentOnly?: boolean) => void;
  onReset: () => void;
}

export function BackorderFilters({
  search = '',
  supplierId,
  urgentOnly = false,
  onSearchChange,
  onSupplierChange,
  onUrgentOnlyChange,
  onReset,
}: BackorderFiltersProps) {
  const [localSearch, setLocalSearch] = useState(search);
  const { data: suppliersResponse } = useSuppliersQuery({
    page: 1,
    limit: 100,
    sortBy: 'businessName',
    sortOrder: 'ASC',
  });

  useEffect(() => setLocalSearch(search), [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSearch = localSearch.trim() || undefined;
      if (nextSearch !== (search || undefined)) onSearchChange(nextSearch);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [localSearch, onSearchChange, search]);

  const hasFilters = Boolean(search || supplierId || urgentOnly);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(12rem,1fr)_auto_auto] md:items-center">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={localSearch}
            onChange={(event) => setLocalSearch(event.target.value)}
            placeholder="Buscar OC, proveedor, producto o SKU..."
            aria-label="Buscar mercadería pendiente"
            className="h-9 pl-9 pr-8 text-xs"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => {
                setLocalSearch('');
                onSearchChange(undefined);
              }}
              aria-label="Limpiar búsqueda"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select
          value={supplierId || ''}
          onChange={(event) => onSupplierChange(event.target.value || undefined)}
          aria-label="Filtrar pendientes por proveedor"
          className="h-9 text-xs"
        >
          <option value="">Todos los proveedores</option>
          {suppliersResponse?.data.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.businessName}
              {!supplier.isActive ? ' (inactivo)' : ''}
            </option>
          ))}
        </Select>

        <label className="flex h-9 cursor-pointer items-center gap-2 whitespace-nowrap rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={urgentOnly}
            onChange={(event) => onUrgentOnlyChange(event.target.checked || undefined)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          Solo urgentes
        </label>

        {hasFilters && (
          <Button type="button" variant="outline" size="sm" onClick={onReset} className="text-xs">
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Restablecer
          </Button>
        )}
      </div>
    </div>
  );
}
