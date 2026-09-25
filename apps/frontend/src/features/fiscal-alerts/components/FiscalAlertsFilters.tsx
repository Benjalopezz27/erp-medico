import { RotateCcw } from 'lucide-react';
import { FiscalDocumentType } from '@erp/shared-types';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { FiscalAlertTab, IFiscalAlertsSearchParams } from '../types/fiscal-alerts.types';

const TABS: { value: FiscalAlertTab; label: string }[] = [
  { value: 'PENDIENTE_FACTURACION', label: 'Pendientes' },
  { value: 'RECHAZADO', label: 'Rechazados' },
];

export function FiscalAlertsFilters({
  params,
  onChange,
  onReset,
}: {
  params: IFiscalAlertsSearchParams;
  onChange: (changes: Partial<IFiscalAlertsSearchParams>) => void;
  onReset: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div
        role="tablist"
        aria-label="Filtrar alertas fiscales por estado"
        className="mb-3 flex gap-2 border-b border-slate-200 pb-3"
      >
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={params.tab === tab.value}
            onClick={() => onChange({ tab: tab.value, page: 1 })}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
              params.tab === tab.value
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-600">Desde</label>
          <Input
            aria-label="Fecha desde"
            type="date"
            value={params.dateFrom ?? ''}
            onChange={(event) => onChange({ dateFrom: event.target.value || undefined, page: 1 })}
            className="h-9 text-xs"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-600">Hasta</label>
          <Input
            aria-label="Fecha hasta"
            type="date"
            value={params.dateTo ?? ''}
            onChange={(event) => onChange({ dateTo: event.target.value || undefined, page: 1 })}
            className="h-9 text-xs"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-600">
            Tipo de comprobante
          </label>
          <Select
            aria-label="Tipo de comprobante"
            value={params.documentType ?? ''}
            onChange={(event) =>
              onChange({
                documentType: (event.target.value || undefined) as FiscalDocumentType | undefined,
                page: 1,
              })
            }
            className="h-9 text-xs"
          >
            <option value="">Todos</option>
            {Object.values(FiscalDocumentType).map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, ' ')}
              </option>
            ))}
          </Select>
        </div>
        <div className="lg:col-span-2">
          <label className="mb-1 block text-[11px] font-semibold text-slate-600">
            Buscar por N° de venta o cliente
          </label>
          <Input
            aria-label="Buscar por número de venta o cliente"
            type="text"
            value={params.search ?? ''}
            onChange={(event) => onChange({ search: event.target.value || undefined, page: 1 })}
            className="h-9 text-xs"
          />
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
