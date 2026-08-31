import { RotateCcw } from 'lucide-react';
import { SaleStatus, type ICustomer, type ISaleSearchParams } from '@erp/shared-types';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CustomerSearchInput } from '@/features/customers/components/CustomerSearchInput';

export function SalesFilters({
  params,
  customer,
  onCustomerLoaded,
  onChange,
  onReset,
}: {
  params: ISaleSearchParams;
  customer: ICustomer | null;
  onCustomerLoaded: (customer: ICustomer | null) => void;
  onChange: (values: Partial<ISaleSearchParams>) => void;
  onReset: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-600">Desde</label>
          <Input
            aria-label="Fecha desde"
            type="date"
            value={params.from ?? ''}
            onChange={(event) => onChange({ from: event.target.value || undefined })}
            className="h-9 text-xs"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-600">Hasta</label>
          <Input
            aria-label="Fecha hasta"
            type="date"
            value={params.to ?? ''}
            onChange={(event) => onChange({ to: event.target.value || undefined })}
            className="h-9 text-xs"
          />
        </div>
        <div className="lg:col-span-2">
          <label className="mb-1 block text-[11px] font-semibold text-slate-600">Cliente</label>
          <CustomerSearchInput
            value={customer}
            onSelect={(selected) => {
              onCustomerLoaded(selected);
              onChange({ customerId: selected?.id });
            }}
            allowAnonymous={false}
            ariaLabel="Filtrar por cliente"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-600">Estado</label>
          <Select
            aria-label="Estado de venta"
            value={params.status ?? ''}
            onChange={(event) =>
              onChange({ status: (event.target.value || undefined) as SaleStatus | undefined })
            }
            className="h-9 text-xs"
          >
            <option value="">Todos</option>
            {Object.values(SaleStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onReset} className="text-xs">
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Limpiar filtros
        </Button>
      </div>
    </div>
  );
}
