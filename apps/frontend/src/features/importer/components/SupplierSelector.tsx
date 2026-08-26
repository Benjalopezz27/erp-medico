import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useSuppliersQuery } from '@/features/suppliers/hooks/use-suppliers-query';
import type { ISupplier } from '@/features/suppliers/types/suppliers.types';

interface SupplierSelectorProps {
  value: ISupplier | null;
  onChange: (supplier: ISupplier | null) => void;
  disabled?: boolean;
}

export function SupplierSelector({ value, onChange, disabled }: SupplierSelectorProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError } = useSuppliersQuery({
    page: 1,
    limit: 25,
    isActive: true,
    search: debouncedSearch || undefined,
    sortBy: 'businessName',
    sortOrder: 'ASC',
  });
  const suppliers = data?.data ?? [];

  return (
    <div className="space-y-2">
      <label htmlFor="supplier-search" className="text-sm font-medium">
        Proveedor activo
      </label>
      <Input
        id="supplier-search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar por razón social o CUIT"
        disabled={disabled}
      />
      <Select
        aria-label="Seleccionar proveedor"
        value={value?.id ?? ''}
        disabled={disabled || isLoading || isError}
        onChange={(event) => {
          const supplier = suppliers.find((item) => item.id === event.target.value) ?? null;
          onChange(supplier);
        }}
      >
        <option value="">{isLoading ? 'Cargando proveedores…' : 'Seleccione un proveedor'}</option>
        {value && !suppliers.some((item) => item.id === value.id) && (
          <option value={value.id}>
            {value.businessName} · {value.cuit}
          </option>
        )}
        {suppliers.map((supplier) => (
          <option key={supplier.id} value={supplier.id}>
            {supplier.businessName} · {supplier.cuit}
          </option>
        ))}
      </Select>
      {isError && (
        <p role="alert" className="text-xs text-destructive">
          No se pudieron cargar los proveedores.
        </p>
      )}
    </div>
  );
}
