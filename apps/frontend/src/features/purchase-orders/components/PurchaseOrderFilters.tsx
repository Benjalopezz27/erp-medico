import React, { useState, useEffect } from 'react';
import { Search, X, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PurchaseOrderStatus } from '../types/purchase-orders.types';
import { useSuppliersQuery } from '@/features/suppliers/hooks/use-suppliers-query';

export interface PurchaseOrderFiltersProps {
  search?: string;
  supplierId?: string;
  status?: PurchaseOrderStatus;
  dateFrom?: string;
  dateTo?: string;
  onSearchChange: (search?: string) => void;
  onSupplierChange: (supplierId?: string) => void;
  onStatusChange: (status?: PurchaseOrderStatus) => void;
  onDateFromChange: (dateFrom?: string) => void;
  onDateToChange: (dateTo?: string) => void;
  onResetFilters: () => void;
}

export const PurchaseOrderFilters: React.FC<PurchaseOrderFiltersProps> = ({
  search = '',
  supplierId,
  status,
  dateFrom = '',
  dateTo = '',
  onSearchChange,
  onSupplierChange,
  onStatusChange,
  onDateFromChange,
  onDateToChange,
  onResetFilters,
}) => {
  const [localSearch, setLocalSearch] = useState(search);

  // Fetch active suppliers for filter dropdown
  const { data: suppliersResponse } = useSuppliersQuery({
    limit: 50,
  });

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

  const hasActiveFilters = Boolean(search || supplierId || status || dateFrom || dateTo);

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search Input */}
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Buscar por N° OC o proveedor..."
            className="pl-9 pr-8 h-9 text-xs"
            aria-label="Buscar órdenes de compra"
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

        {/* Supplier Filter */}
        <div>
          <Select
            value={supplierId || ''}
            onChange={(e) => onSupplierChange(e.target.value || undefined)}
            className="h-9 text-xs"
            aria-label="Filtrar por proveedor"
          >
            <option value="">Todos los proveedores</option>
            {suppliersResponse?.data.map((sup) => (
              <option key={sup.id} value={sup.id}>
                {sup.businessName}
              </option>
            ))}
          </Select>
        </div>

        {/* Status Filter */}
        <div>
          <Select
            value={status || ''}
            onChange={(e) => onStatusChange((e.target.value as PurchaseOrderStatus) || undefined)}
            className="h-9 text-xs"
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>
            <option value={PurchaseOrderStatus.BORRADOR}>Borrador</option>
            <option value={PurchaseOrderStatus.EMITIDA}>Emitida</option>
            <option value={PurchaseOrderStatus.PARCIAL}>Parcial</option>
            <option value={PurchaseOrderStatus.COMPLETADA}>Completada</option>
            <option value={PurchaseOrderStatus.CANCELADA}>Cancelada</option>
          </Select>
        </div>

        {/* Reset Filters */}
        <div className="flex items-center justify-end">
          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setLocalSearch('');
                onResetFilters();
              }}
              className="h-9 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white shrink-0 w-full sm:w-auto"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Restablecer
            </Button>
          )}
        </div>
      </div>

      {/* Date Range Filters */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs">
        <span className="text-slate-500 font-medium">Fecha de creación:</span>
        <div className="flex items-center gap-2">
          <label htmlFor="dateFrom" className="text-slate-400">
            Desde:
          </label>
          <Input
            id="dateFrom"
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value || undefined)}
            className="h-8 text-xs w-36"
            aria-label="Fecha de creación desde"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="dateTo" className="text-slate-400">
            Hasta:
          </label>
          <Input
            id="dateTo"
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value || undefined)}
            className="h-8 text-xs w-36"
            aria-label="Fecha de creación hasta"
          />
        </div>
      </div>
    </div>
  );
};
