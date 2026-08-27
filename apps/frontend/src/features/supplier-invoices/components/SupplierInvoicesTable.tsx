import { Link } from '@tanstack/react-router';
import { ReceiptText } from 'lucide-react';
import type { ISupplierInvoiceSummary } from '../types/supplier-invoices.types';
import { formatMoneyAr } from '../utils/supplier-invoices.math';
import { SupplierInvoiceStatusBadge } from './SupplierInvoiceStatusBadge';

const date = (value: string) =>
  new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));

export function SupplierInvoicesTable({
  invoices,
  loading,
  hasFilters = false,
}: {
  invoices: ISupplierInvoiceSummary[];
  loading: boolean;
  hasFilters?: boolean;
}) {
  if (loading)
    return (
      <div aria-label="Cargando facturas" className="space-y-2">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800"
          />
        ))}
      </div>
    );
  if (!invoices.length)
    return (
      <div className="rounded-xl border border-dashed p-12 text-center">
        <ReceiptText className="mx-auto h-9 w-9 text-slate-300" />
        <h2 className="mt-2 font-semibold">
          {hasFilters
            ? 'No hay facturas que coincidan con los filtros'
            : 'No hay facturas registradas'}
        </h2>
      </div>
    );
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full min-w-[1050px] text-left text-xs">
        <thead className="bg-slate-50 dark:bg-slate-800/70">
          <tr>
            <th className="px-4 py-3">Comprobante</th>
            <th className="px-4 py-3">Proveedor</th>
            <th className="px-4 py-3">Recepción / OC</th>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3 text-right">Neto</th>
            <th className="px-4 py-3 text-right">IVA</th>
            <th className="px-4 py-3 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <td className="px-4 py-3">
                <Link
                  to="/purchases/supplier-invoices/$id"
                  params={{ id: invoice.id }}
                  className="font-mono font-bold text-blue-700 hover:underline"
                >
                  {invoice.invoiceNumber}
                </Link>
                <p className="text-[10px] text-slate-400">{invoice.itemCount} línea(s)</p>
              </td>
              <td className="px-4 py-3">
                <strong>{invoice.supplier.businessName}</strong>
                <p className="font-mono text-[10px] text-slate-400">{invoice.supplier.cuit}</p>
              </td>
              <td className="px-4 py-3">
                <p>
                  {invoice.goodsReceipt.receiptNumber} · {invoice.goodsReceipt.deliveryNoteNumber}
                </p>
                <p className="font-mono text-[10px] text-slate-400">
                  {invoice.purchaseOrder.orderNumber}
                </p>
              </td>
              <td className="px-4 py-3">{date(invoice.invoiceDate)}</td>
              <td className="px-4 py-3">
                <SupplierInvoiceStatusBadge status={invoice.status} />
              </td>
              <td className="px-4 py-3 text-right font-mono">{formatMoneyAr(invoice.netTotal)}</td>
              <td className="px-4 py-3 text-right font-mono">{formatMoneyAr(invoice.taxTotal)}</td>
              <td className="px-4 py-3 text-right font-mono font-bold">
                {formatMoneyAr(invoice.totalAmount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
