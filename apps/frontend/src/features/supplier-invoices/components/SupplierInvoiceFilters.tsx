import { useEffect, useState } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useSuppliersQuery } from '@/features/suppliers/hooks/use-suppliers-query';
import {
  SupplierInvoiceStatus,
  type ISupplierInvoiceSearchParams,
} from '../types/supplier-invoices.types';

export function SupplierInvoiceFilters({
  filters,
  onChange,
  onReset,
}: {
  filters: ISupplierInvoiceSearchParams;
  onChange: (next: Partial<ISupplierInvoiceSearchParams>) => void;
  onReset: () => void;
}) {
  const [search, setSearch] = useState(filters.search ?? '');
  const suppliers = useSuppliersQuery({
    page: 1,
    limit: 100,
    sortBy: 'businessName',
    sortOrder: 'ASC',
  });
  useEffect(() => setSearch(filters.search ?? ''), [filters.search]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const value = search.trim() || undefined;
      if (value !== filters.search) onChange({ search: value });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, filters.search, onChange]);

  const active = Boolean(
    filters.search || filters.supplierId || filters.status || filters.dateFrom || filters.dateTo,
  );
  return (
    <section
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      aria-label="Filtros de facturas"
    >
      <div className="grid gap-3 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
            placeholder="Comprobante, proveedor, remito, OC o producto"
            aria-label="Buscar facturas"
          />
        </div>
        <Select
          value={filters.supplierId ?? ''}
          onChange={(event) => onChange({ supplierId: event.target.value || undefined })}
          aria-label="Filtrar por proveedor"
        >
          <option value="">Todos los proveedores</option>
          {suppliers.data?.data.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.businessName}
              {supplier.isActive ? '' : ' (inactivo)'}
            </option>
          ))}
        </Select>
        <Select
          value={filters.status ?? ''}
          onChange={(event) =>
            onChange({ status: (event.target.value as SupplierInvoiceStatus) || undefined })
          }
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          {Object.values(SupplierInvoiceStatus).map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
        <span className="font-medium text-slate-500">Fecha de factura:</span>
        <Input
          type="date"
          value={filters.dateFrom ?? ''}
          onChange={(event) => onChange({ dateFrom: event.target.value || undefined })}
          className="w-40"
          aria-label="Fecha desde"
        />
        <Input
          type="date"
          value={filters.dateTo ?? ''}
          onChange={(event) => onChange({ dateTo: event.target.value || undefined })}
          className="w-40"
          aria-label="Fecha hasta"
        />
        {active && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch('');
              onReset();
            }}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Restablecer
          </Button>
        )}
      </div>
    </section>
  );
}
