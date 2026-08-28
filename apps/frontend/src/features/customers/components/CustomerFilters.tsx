import { useEffect, useState } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import { TaxCondition } from '@erp/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { taxConditionLabel } from './CustomerBadges';

interface Props {
  search?: string;
  taxCondition?: TaxCondition;
  isActive?: boolean;
  onSearchChange: (value?: string) => void;
  onTaxConditionChange: (value?: TaxCondition) => void;
  onStatusChange: (value: boolean) => void;
  onReset: () => void;
}

export function CustomerFilters({
  search: searchParam,
  taxCondition,
  isActive,
  onSearchChange,
  onTaxConditionChange,
  onStatusChange,
  onReset,
}: Props) {
  const [search, setSearch] = useState(searchParam ?? '');
  useEffect(() => setSearch(searchParam ?? ''), [searchParam]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const normalized = search.trim() || undefined;
      if (normalized !== searchParam) onSearchChange(normalized);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search, searchParam, onSearchChange]);

  return (
    <section
      aria-label="Filtros de clientes"
      className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(220px,1fr)_220px_220px_auto] dark:border-slate-800 dark:bg-slate-900"
    >
      <label className="relative">
        <span className="sr-only">Buscar clientes</span>
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nombre, DNI o CUIT"
          className="pl-9"
        />
      </label>
      <label>
        <span className="sr-only">Condición fiscal</span>
        <Select
          value={taxCondition ?? ''}
          onChange={(event) =>
            onTaxConditionChange((event.target.value || undefined) as TaxCondition | undefined)
          }
        >
          <option value="">Todas las condiciones</option>
          {Object.values(TaxCondition).map((value) => (
            <option key={value} value={value}>
              {taxConditionLabel(value)}
            </option>
          ))}
        </Select>
      </label>
      <fieldset className="flex rounded-lg border border-slate-200 p-1 dark:border-slate-700">
        <legend className="sr-only">Estado</legend>
        {[true, false].map((value) => (
          <button
            key={String(value)}
            type="button"
            aria-pressed={(isActive ?? true) === value}
            onClick={() => onStatusChange(value)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold ${(isActive ?? true) === value ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
          >
            {value ? 'Activos' : 'Inactivos'}
          </button>
        ))}
      </fieldset>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onReset}
        aria-label="Limpiar filtros"
      >
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Limpiar
      </Button>
    </section>
  );
}
