import { cn } from '@/lib/utils';
import { SupplierInvoiceStatus } from '../types/supplier-invoices.types';

const config: Record<SupplierInvoiceStatus, { label: string; className: string }> = {
  [SupplierInvoiceStatus.BORRADOR]: {
    label: 'Borrador',
    className: 'border-slate-200 bg-slate-100 text-slate-700',
  },
  [SupplierInvoiceStatus.VALIDANDO]: {
    label: 'Validando',
    className: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  [SupplierInvoiceStatus.OBSERVADA]: {
    label: 'Observada',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  [SupplierInvoiceStatus.AUTORIZADA]: {
    label: 'Autorizada',
    className: 'border-cyan-200 bg-cyan-50 text-cyan-800',
  },
  [SupplierInvoiceStatus.RECHAZADA]: {
    label: 'Rechazada',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
  },
  [SupplierInvoiceStatus.CONFIRMADA]: {
    label: 'Confirmada',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
};

export function SupplierInvoiceStatusBadge({ status }: { status: SupplierInvoiceStatus }) {
  const value = config[status] ?? {
    label: status,
    className: 'border-slate-200 bg-slate-50 text-slate-700',
  };
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold dark:bg-slate-900',
        value.className,
      )}
    >
      {value.label}
    </span>
  );
}
