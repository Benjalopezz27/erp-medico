import { Link, useParams } from '@tanstack/react-router';
import { AlertCircle, ArrowLeft, Download, Printer } from 'lucide-react';
import { PaymentMethod, PaymentStatus } from '@erp/shared-types';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/features/products/utils/products.math';
import { useDownloadReceiptPdf, useReceiptQuery } from '@/features/payments/hooks/use-payments';
import { formatDate } from '@/features/receivables/utils/receivables.format';
import { parseApiError } from '@/lib/errors/parse-api-error';

const METHOD_LABELS: Partial<Record<PaymentMethod, string>> = {
  [PaymentMethod.EFECTIVO]: 'Efectivo',
  [PaymentMethod.TRANSFERENCIA]: 'Transferencia',
  [PaymentMethod.CHEQUE]: 'Cheque',
};

export function ReceiptPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const query = useReceiptQuery(id);
  const download = useDownloadReceiptPdf();

  if (query.isPending)
    return (
      <div aria-label="Cargando recibo" className="h-64 animate-pulse rounded-xl bg-slate-100" />
    );
  if (query.isError)
    return (
      <div
        role="alert"
        className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700"
      >
        <AlertCircle className="h-4 w-4" />
        {parseApiError(query.error).message}
      </div>
    );

  const receipt = query.data;
  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <Link
          to="/customers/$id"
          params={{ id: receipt.customerId }}
          className="mb-2 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al cliente
        </Link>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" /> Imprimir
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={download.isPending}
            onClick={() =>
              download.mutate({ id: receipt.id, receiptNumber: receipt.receiptNumber })
            }
          >
            <Download className="mr-1.5 h-4 w-4" /> Exportar PDF
          </Button>
        </div>
        {download.isError && (
          <p role="alert" className="mt-2 text-xs text-rose-700">
            No se pudo descargar el recibo. Intentá nuevamente.
          </p>
        )}
      </div>

      <article className="mx-auto max-w-2xl space-y-4 rounded-xl border border-slate-300 bg-white p-6 text-sm">
        {receipt.paymentStatus === PaymentStatus.REVERTIDO && (
          <p
            role="status"
            className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
          >
            REVERTIDO — el cheque fue rechazado y la deuda se reabrió en la cuenta corriente.
          </p>
        )}
        <header className="flex items-start justify-between">
          <h1 className="text-lg font-bold">Recibo X</h1>
          <div className="text-right text-xs">
            <p className="font-semibold">N° {receipt.receiptNumber}</p>
            <p>Fecha: {formatDate(receipt.createdAt)}</p>
          </div>
        </header>
        <section className="border-t pt-3 text-xs">
          <p>
            Recibimos de: <strong>{receipt.customerName}</strong>
          </p>
          <p>CUIT/DNI: {receipt.customerDocument}</p>
        </section>
        <section className="border-t pt-3">
          <h2 className="mb-2 text-xs font-semibold">Comprobantes aplicados</h2>
          <table className="w-full text-left text-xs">
            <thead className="text-slate-600">
              <tr>
                <th className="py-1">N° Factura</th>
                <th className="py-1">Fecha</th>
                <th className="py-1 text-right">Monto orig.</th>
                <th className="py-1 text-right">Aplicado</th>
              </tr>
            </thead>
            <tbody>
              {receipt.applied.map((row) => (
                <tr key={row.accountReceivableId}>
                  <td className="py-1">{row.documentReference}</td>
                  <td className="py-1">{formatDate(row.invoiceDate)}</td>
                  <td className="py-1 text-right">{formatCurrency(row.originalAmount)}</td>
                  <td className="py-1 text-right">{formatCurrency(row.amountApplied)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="border-t pt-3 text-xs">
          <p>
            Medio de pago: {METHOD_LABELS[receipt.paymentMethod] ?? receipt.paymentMethod}
            {receipt.check && ` (Banco ${receipt.check.bankName}, N° ${receipt.check.checkNumber})`}
          </p>
          {receipt.notes && <p>Observaciones: {receipt.notes}</p>}
          <p className="mt-2 text-base font-bold">
            Total cobrado: {formatCurrency(receipt.totalAmount)}
          </p>
        </section>
      </article>
    </div>
  );
}
