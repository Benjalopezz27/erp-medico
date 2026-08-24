import React, { useState, useEffect } from 'react';
import { Filter, X } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StockMovementType, type IStockMovementsSearchParams } from '../types/stock.types';

interface StockMovementsFiltersProps {
  filters: IStockMovementsSearchParams;
  onFilterChange: (newFilters: Partial<IStockMovementsSearchParams>) => void;
  onResetFilters: () => void;
}

/**
 * Converts a local date string (YYYY-MM-DD) to start-of-day or end-of-day ISO-8601 UTC string.
 */
function localDateToIso(dateStr: string, isEndOfDay: boolean): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return '';

  const date = new Date(
    year,
    month - 1,
    day,
    isEndOfDay ? 23 : 0,
    isEndOfDay ? 59 : 0,
    isEndOfDay ? 59 : 0,
    isEndOfDay ? 999 : 0,
  );
  return date.toISOString();
}

/**
 * Extracts YYYY-MM-DD local calendar date string from ISO-8601 UTC string.
 */
function isoToLocalDate(isoStr?: string): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

export const StockMovementsFilters: React.FC<StockMovementsFiltersProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
}) => {
  const [localFrom, setLocalFrom] = useState(isoToLocalDate(filters.from));
  const [localTo, setLocalTo] = useState(isoToLocalDate(filters.to));

  useEffect(() => {
    setLocalFrom(isoToLocalDate(filters.from));
  }, [filters.from]);

  useEffect(() => {
    setLocalTo(isoToLocalDate(filters.to));
  }, [filters.to]);

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalFrom(val);
    onFilterChange({
      from: val ? localDateToIso(val, false) : undefined,
      page: 1,
    });
  };

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalTo(val);
    onFilterChange({
      to: val ? localDateToIso(val, true) : undefined,
      page: 1,
    });
  };

  const hasActiveFilters = Boolean(
    (filters.movementType && filters.movementType !== ('ALL' as any)) || filters.from || filters.to,
  );

  return (
    <div
      data-testid="stock-movements-filters"
      className="p-4 bg-card rounded-lg border border-border space-y-4"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Filter className="w-4 h-4 text-primary" />
          <span>Filtros del Ledger / Kardex</span>
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Movement Type Select */}
        <div>
          <Select
            value={filters.movementType || ''}
            onChange={(e) =>
              onFilterChange({
                movementType: e.target.value ? (e.target.value as StockMovementType) : undefined,
                page: 1,
              })
            }
            aria-label="Filtrar por tipo de movimiento"
            className="text-sm"
          >
            <option value="">Todos los tipos de movimiento</option>
            <option value={StockMovementType.ENTRADA_COMPRA}>Entrada por Compra</option>
            <option value={StockMovementType.SALIDA_VENTA}>Salida por Venta</option>
            <option value={StockMovementType.MERMA}>Merma / Pérdida</option>
            <option value={StockMovementType.AJUSTE_ENTRADA}>Ajuste de Entrada</option>
            <option value={StockMovementType.AJUSTE_SALIDA}>Ajuste de Salida</option>
            <option value={StockMovementType.DEVOLUCION_CLIENTE}>Devolución de Cliente</option>
          </Select>
        </div>

        {/* Date From */}
        <div className="relative">
          <Input
            type="date"
            value={localFrom}
            onChange={handleFromChange}
            placeholder="Desde"
            aria-label="Fecha desde"
            className="text-sm"
          />
        </div>

        {/* Date To */}
        <div className="relative">
          <Input
            type="date"
            value={localTo}
            onChange={handleToChange}
            placeholder="Hasta"
            aria-label="Fecha hasta"
            className="text-sm"
          />
        </div>
      </div>
    </div>
  );
};
