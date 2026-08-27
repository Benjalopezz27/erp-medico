import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { AlertCircle, ArrowLeft, ExternalLink, ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SupplierInvoiceStatusBadge } from '@/features/supplier-invoices/components/SupplierInvoiceStatusBadge';
import { useSupplierInvoiceQuery } from '@/features/supplier-invoices/hooks/use-supplier-invoices';
import {
  SupplierInvoiceQuantityStatus,
  SupplierInvoiceAdjustmentMode,
  SupplierInvoiceStatus,
} from '@/features/supplier-invoices/types/supplier-invoices.types';
import { parseSupplierInvoiceError } from '@/features/supplier-invoices/utils/supplier-invoices.errors';
import {
  formatDecimalAr,
  formatMoneyAr,
} from '@/features/supplier-invoices/utils/supplier-invoices.math';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const calendarDate = (value: string) =>
  new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
const dateTime = (value: string) =>
  new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  );

export function SupplierInvoiceDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();
  const valid = UUID.test(id);
  const query = useSupplierInvoiceQuery(valid ? id : '');
  if (!valid)
    return (
      <State
        title="Identificador inválido"
        message="La dirección no contiene un identificador válido."
        onBack={() => navigate({ to: '/purchases/supplier-invoices' })}
      />
    );
  if (query.isLoading)
    return (
      <div
        aria-label="Cargando factura"
        className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
      />
    );
  if (query.isError || !query.data)
    return (
      <State
        title="No se pudo cargar la factura"
        message={parseSupplierInvoiceError(query.error).message}
        onBack={() => navigate({ to: '/purchases/supplier-invoices' })}
        onRetry={() => query.refetch()}
      />
    );
  const invoice = query.data;
  const excessLines = invoice.items.filter(
    (item) => item.quantityStatus === SupplierInvoiceQuantityStatus.EXCEDIDA,
  );
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <nav className="mb-1 text-xs text-slate-400">
            <Link to="/purchases/supplier-invoices">Facturas de proveedores</Link> /{' '}
            {invoice.invoiceNumber}
          </nav>
          <div className="flex items-center gap-3">
            <ReceiptText className="h-7 w-7 text-blue-600" />
            <h1 className="font-mono text-2xl font-bold">{invoice.invoiceNumber}</h1>
            <SupplierInvoiceStatusBadge status={invoice.status} />
          </div>
        </div>
        <Link to="/purchases/supplier-invoices">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Volver al listado
          </Button>
        </Link>
      </header>
      {invoice.status === SupplierInvoiceStatus.OBSERVADA && (
        <section
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <h2 className="font-bold">Factura observada</h2>
          {excessLines.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {excessLines.map((item) => (
                <li key={item.id}>
                  {item.productName}: se facturaron {formatDecimalAr(item.invoicedQtyPurchaseUnit)}{' '}
                  {item.purchaseUnitSymbol}, había {formatDecimalAr(item.availableQtyBefore)}{' '}
                  disponibles y el exceso es {formatDecimalAr(item.quantityExcess)}.
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1">
              La factura requiere revisión. Los motivos de costo serán incorporados por el flujo de
              tolerancias.
            </p>
          )}
        </section>
      )}
      <section className="grid gap-4 md:grid-cols-3">
        <Card title="Proveedor">
          <strong>{invoice.supplier.businessName}</strong>
          <p className="font-mono text-xs">CUIT {invoice.supplier.cuit}</p>
        </Card>
        <Card title="Recepción">
          <strong>{invoice.goodsReceipt.receiptNumber}</strong>
          <p>Remito {invoice.goodsReceipt.deliveryNoteNumber}</p>
          <Link
            to="/purchases/orders/$id"
            params={{ id: invoice.purchaseOrder.id }}
            className="mt-2 inline-flex items-center text-xs font-semibold text-blue-700 hover:underline"
          >
            Ver recepción en el historial de la OC <ExternalLink className="ml-1 h-3 w-3" />
          </Link>
        </Card>
        <Card title="Orden de compra">
          <Link
            to="/purchases/orders/$id"
            params={{ id: invoice.purchaseOrder.id }}
            className="font-mono font-bold text-blue-700 hover:underline"
          >
            {invoice.purchaseOrder.orderNumber}
          </Link>
          <p className="text-xs text-slate-500">
            Recepción: {dateTime(invoice.goodsReceipt.createdAt)}
          </p>
        </Card>
      </section>
      <section className="grid gap-4 md:grid-cols-4">
        <Card title="Fecha de factura">
          <strong>{calendarDate(invoice.invoiceDate)}</strong>
        </Card>
        <Card title="Registrada por">
          <strong>{invoice.user.name}</strong>
          <p className="text-xs">{invoice.user.email}</p>
        </Card>
        <Card title="Creación">
          <strong>{dateTime(invoice.createdAt)}</strong>
        </Card>
        <Card title="Líneas">
          <strong>{invoice.itemCount}</strong>
          <p className="text-xs">{invoice.observedLineCount} observada(s)</p>
        </Card>
      </section>
      <div className="overflow-x-auto rounded-xl border bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[1450px] text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="px-3 py-2">Producto</th>
              <th className="px-3 py-2 text-right">Recibida</th>
              <th className="px-3 py-2 text-right">Anterior</th>
              <th className="px-3 py-2 text-right">Disponible</th>
              <th className="px-3 py-2 text-right">Facturada</th>
              <th className="px-3 py-2 text-right">Asignada</th>
              <th className="px-3 py-2 text-right">Saldo</th>
              <th className="px-3 py-2 text-right">Exceso</th>
              <th className="px-3 py-2 text-right">Costo prov.</th>
              <th className="px-3 py-2 text-right">Costo real</th>
              <th className="px-3 py-2 text-right">Desc./Bonif./Recargo</th>
              <th className="px-3 py-2 text-right">Neto</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-slate-800">
            {invoice.items.map((item) => (
              <tr
                key={item.id}
                className={
                  item.quantityStatus === SupplierInvoiceQuantityStatus.EXCEDIDA
                    ? 'bg-amber-50 dark:bg-amber-950/20'
                    : ''
                }
              >
                <td className="px-3 py-3">
                  <strong>{item.productName}</strong>
                  <p className="font-mono text-[10px] text-slate-400">
                    {item.productCode} · {item.purchaseUnitSymbol}
                  </p>
                </td>
                {[
                  item.receivedQtyPurchaseUnit,
                  item.previouslyAllocatedQtyPurchaseUnit,
                  item.availableQtyBefore,
                  item.invoicedQtyPurchaseUnit,
                  item.allocatedReceivedQtyPurchaseUnit,
                  item.pendingQtyAfter,
                  item.quantityExcess,
                ].map((value, index) => (
                  <td key={index} className="px-3 py-3 text-right font-mono">
                    {formatDecimalAr(value)}
                  </td>
                ))}
                <td className="px-3 py-3 text-right font-mono">
                  {formatMoneyAr(item.provisionalCostUnitNet)}
                </td>
                <td className="px-3 py-3 text-right font-mono font-semibold">
                  {formatMoneyAr(item.realCostUnitNet)}
                </td>
                <td className="px-3 py-3 text-right font-mono">
                  {adjustmentLabel(item.discountNet, item.discountMode, item.discountPercentage)} /{' '}
                  {adjustmentLabel(item.bonusNet, item.bonusMode, item.bonusPercentage)} /{' '}
                  {adjustmentLabel(item.surchargeNet, item.surchargeMode, item.surchargePercentage)}
                </td>
                <td className="px-3 py-3 text-right font-mono font-bold">
                  {formatMoneyAr(item.lineNetTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="ml-auto grid max-w-md gap-2 rounded-xl border bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
        <Row label="Neto" value={formatMoneyAr(invoice.netTotal)} />
        <Row
          label="IVA"
          value={adjustmentLabel(invoice.taxTotal, invoice.taxMode, invoice.taxPercentage)}
        />
        <Row label="Total" value={formatMoneyAr(invoice.totalAmount)} strong />
      </section>
    </div>
  );
}

function adjustmentLabel(
  amount: string,
  mode: SupplierInvoiceAdjustmentMode,
  percentage: string | null,
): string {
  return mode === SupplierInvoiceAdjustmentMode.PERCENTAGE && percentage
    ? `${formatMoneyAr(amount)} (${formatDecimalAr(percentage)}%)`
    : formatMoneyAr(amount);
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-xl border bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="mb-1 text-[11px] font-semibold uppercase text-slate-400">{title}</p>
      {children}
    </article>
  );
}
function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? 'border-t pt-2 text-lg font-bold' : ''}`}>
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
function State({
  title,
  message,
  onBack,
  onRetry,
}: {
  title: string;
  message: string;
  onBack: () => void;
  onRetry?: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-xl border p-10 text-center">
      <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
      <h1 className="mt-3 font-bold">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">{message}</p>
      <div className="mt-4 flex justify-center gap-2">
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            Reintentar
          </Button>
        )}
        <Button onClick={onBack}>Volver</Button>
      </div>
    </div>
  );
}
