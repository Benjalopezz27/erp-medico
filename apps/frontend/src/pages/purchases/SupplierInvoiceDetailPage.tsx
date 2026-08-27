import { useState } from 'react';
import Decimal from 'decimal.js';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  ReceiptText,
  Settings2,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SupplierInvoiceDecisionModal } from '@/features/supplier-invoices/components/SupplierInvoiceDecisionModal';
import type { SupplierInvoiceDecisionMode } from '@/features/supplier-invoices/components/SupplierInvoiceDecisionModal';
import { SupplierInvoiceStatusBadge } from '@/features/supplier-invoices/components/SupplierInvoiceStatusBadge';
import { supplierInvoicesKeys } from '@/features/supplier-invoices/hooks/supplier-invoices-keys';
import {
  useAuthorizeSupplierInvoiceMutation,
  useRejectSupplierInvoiceMutation,
  useSupplierInvoiceQuery,
} from '@/features/supplier-invoices/hooks/use-supplier-invoices';
import {
  SupplierInvoiceAdjustmentMode,
  SupplierInvoiceCostStatus,
  SupplierInvoiceDecisionAction,
  SupplierInvoiceObservationReason,
  SupplierInvoiceStatus,
  type ISupplierInvoiceDetail,
  type ISupplierInvoiceItemDetail,
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
  new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(value));

export function SupplierInvoiceDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const valid = UUID.test(id);
  const query = useSupplierInvoiceQuery(valid ? id : '');
  const authorize = useAuthorizeSupplierInvoiceMutation();
  const reject = useRejectSupplierInvoiceMutation();
  const [decisionMode, setDecisionMode] = useState<SupplierInvoiceDecisionMode | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [decisionError, setDecisionError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const pending = authorize.isPending || reject.isPending;

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
  const isObserved = invoice.status === SupplierInvoiceStatus.OBSERVADA;

  const closeDecision = () => {
    if (pending) return;
    setDecisionMode(null);
    setDecisionError(undefined);
  };

  const refreshAfterConflict = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: supplierInvoicesKeys.lists() }),
      queryClient.invalidateQueries({
        queryKey: supplierInvoicesKeys.pendingReceipts(),
      }),
    ]);
    await query.refetch();
  };

  const confirmDecision = async () => {
    if (!decisionMode || pending) return;
    setDecisionError(undefined);
    try {
      const result =
        decisionMode === 'authorize'
          ? await authorize.mutateAsync(id)
          : await reject.mutateAsync({
              id,
              payload: { reason: rejectionReason.trim() },
            });
      setDecisionMode(null);
      setRejectionReason('');
      setNotice(
        result.status === SupplierInvoiceStatus.RECHAZADA
          ? 'Factura rechazada. El saldo facturable reservado fue liberado.'
          : 'Factura autorizada. Ya puede continuar al flujo de confirmación.',
      );
    } catch (caught) {
      const parsed = parseSupplierInvoiceError(caught);
      if (
        parsed.kind === 'DECISION_CONFLICT' ||
        parsed.kind === 'CONCURRENCY' ||
        parsed.kind === 'NOT_FOUND'
      ) {
        setDecisionMode(null);
        setRejectionReason('');
        setNotice(`${parsed.message} Se actualizó el estado autoritativo.`);
        await refreshAfterConflict();
        return;
      }
      setDecisionError(parsed.message);
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
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
        <div className="flex flex-wrap gap-2">
          {isObserved && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDecisionError(undefined);
                  setDecisionMode('reject');
                }}
                disabled={pending}
              >
                <XCircle className="mr-1.5 h-4 w-4" /> Rechazar
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setDecisionError(undefined);
                  setDecisionMode('authorize');
                }}
                disabled={pending}
              >
                <ShieldCheck className="mr-1.5 h-4 w-4" /> Autorizar
              </Button>
            </>
          )}
          <Link to="/purchases/supplier-invoices">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Volver al listado
            </Button>
          </Link>
        </div>
      </header>

      {notice && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl bg-blue-50 p-4 text-sm text-blue-800"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {notice}
        </div>
      )}

      {isObserved && <ObservedBanner invoice={invoice} />}
      {!isObserved && <DecisionEvidence invoice={invoice} />}

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
        <Card title="Tolerancia aplicada">
          <strong className="font-mono">
            {formatDecimalAr(invoice.costTolerancePercentageSnapshot)}%
          </strong>
          <p className="text-xs">Snapshot inmutable</p>
        </Card>
      </section>

      <InvoiceComparisonTable
        items={invoice.items}
        tolerance={invoice.costTolerancePercentageSnapshot}
      />

      <section className="ml-auto grid max-w-md gap-2 rounded-xl border bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
        <Row label="Neto" value={formatMoneyAr(invoice.netTotal)} />
        <Row
          label="IVA"
          value={adjustmentLabel(invoice.taxTotal, invoice.taxMode, invoice.taxPercentage)}
        />
        <Row label="Total" value={formatMoneyAr(invoice.totalAmount)} strong />
      </section>

      <SupplierInvoiceDecisionModal
        mode={decisionMode}
        invoiceNumber={invoice.invoiceNumber}
        reason={rejectionReason}
        onReasonChange={(value) => {
          setRejectionReason(value);
          setDecisionError(undefined);
        }}
        onClose={closeDecision}
        onConfirm={confirmDecision}
        pending={pending}
        error={decisionError}
      />
    </div>
  );
}

function ObservedBanner({ invoice }: { invoice: ISupplierInvoiceDetail }) {
  return (
    <section
      role="alert"
      className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">Factura observada: requiere una decisión</h2>
          <p className="mt-1">
            Se evaluó con una tolerancia de{' '}
            <strong>{formatDecimalAr(invoice.costTolerancePercentageSnapshot)}%</strong> y contiene{' '}
            {invoice.observedLineCount} línea(s) observada(s).
          </p>
        </div>
        <Link
          to="/settings"
          search={{ tab: 'purchases' }}
          className="inline-flex items-center rounded-md border border-amber-400 bg-white px-3 py-2 text-xs font-semibold hover:bg-amber-100"
        >
          <Settings2 className="mr-1.5 h-4 w-4" /> Configurar tolerancia futura
        </Link>
      </div>
      <ul className="mt-3 space-y-2">
        {invoice.items
          .filter((item) => item.observationReasons.length > 0)
          .map((item) => (
            <li key={item.id} className="rounded-lg bg-white/70 p-3">
              <strong>{item.productName}</strong>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {item.observationReasons.map((reason) => (
                  <li key={reason}>{observationDescription(item, reason)}</li>
                ))}
              </ul>
            </li>
          ))}
      </ul>
    </section>
  );
}

function DecisionEvidence({ invoice }: { invoice: ISupplierInvoiceDetail }) {
  if (invoice.decision) {
    const authorized = invoice.decision.action === SupplierInvoiceDecisionAction.AUTHORIZE;
    return (
      <section
        className={`rounded-xl border p-4 text-sm ${
          authorized
            ? 'border-cyan-200 bg-cyan-50 text-cyan-900'
            : 'border-rose-200 bg-rose-50 text-rose-900'
        }`}
      >
        <h2 className="font-bold">
          {authorized ? 'Autorización manual registrada' : 'Rechazo registrado'}
        </h2>
        <p className="mt-1">
          {invoice.decision.user.name} · {dateTime(invoice.decision.decidedAt)}
        </p>
        {invoice.decision.reason && <p className="mt-2">Motivo: {invoice.decision.reason}</p>}
      </section>
    );
  }
  if (
    invoice.status === SupplierInvoiceStatus.AUTORIZADA ||
    invoice.status === SupplierInvoiceStatus.CONFIRMADA
  ) {
    return (
      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <h2 className="font-bold">Autorización automática</h2>
        <p className="mt-1">La factura no superó la tolerancia ni presentó exceso de cantidad.</p>
      </section>
    );
  }
  return null;
}

function InvoiceComparisonTable({
  items,
  tolerance,
}: {
  items: ISupplierInvoiceItemDetail[];
  tolerance: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-white dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full min-w-[1850px] text-left text-xs">
        <thead className="bg-slate-50 dark:bg-slate-800">
          <tr>
            <th className="px-3 py-2">Producto</th>
            <th className="px-3 py-2 text-right">Recibida</th>
            <th className="px-3 py-2 text-right">Disponible</th>
            <th className="px-3 py-2 text-right">Facturada</th>
            <th className="px-3 py-2 text-right">Asignada</th>
            <th className="px-3 py-2 text-right">Exceso</th>
            <th className="px-3 py-2 text-right">Costo provisional</th>
            <th className="px-3 py-2 text-right">Costo real</th>
            <th className="px-3 py-2 text-right">Diferencia</th>
            <th className="px-3 py-2 text-right">Variación / límite</th>
            <th className="px-3 py-2">Motivos</th>
            <th className="px-3 py-2 text-right">Desc./Bonif./Recargo</th>
            <th className="px-3 py-2 text-right">Neto</th>
          </tr>
        </thead>
        <tbody className="divide-y dark:divide-slate-800">
          {items.map((item) => (
            <tr key={item.id} className={item.observationReasons.length ? 'bg-amber-50/70' : ''}>
              <td className="px-3 py-3">
                <strong>{item.productName}</strong>
                <p className="font-mono text-[10px] text-slate-400">
                  {item.productCode} · {item.purchaseUnitSymbol}
                </p>
              </td>
              {[
                item.receivedQtyPurchaseUnit,
                item.availableQtyBefore,
                item.invoicedQtyPurchaseUnit,
                item.allocatedReceivedQtyPurchaseUnit,
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
              <td
                className={`px-3 py-3 text-right font-mono ${costDirectionClass(
                  item.costDifferenceUnitNet,
                )}`}
              >
                {signedMoney(item.costDifferenceUnitNet)}
              </td>
              <td className="px-3 py-3 text-right font-mono">
                {costVariationLabel(item)} / {formatDecimalAr(tolerance)}%
              </td>
              <td className="px-3 py-3">
                {item.observationReasons.length ? (
                  <div className="flex flex-wrap gap-1">
                    {item.observationReasons.map((reason) => (
                      <span
                        key={reason}
                        className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 font-semibold text-amber-900"
                      >
                        {reason === SupplierInvoiceObservationReason.QUANTITY_EXCESS
                          ? 'Exceso de cantidad'
                          : 'Variación de costo'}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-emerald-700">Sin observaciones</span>
                )}
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
  );
}

function observationDescription(
  item: ISupplierInvoiceItemDetail,
  reason: SupplierInvoiceObservationReason,
): string {
  if (reason === SupplierInvoiceObservationReason.QUANTITY_EXCESS) {
    return `Cantidad: se facturaron ${formatDecimalAr(
      item.invoicedQtyPurchaseUnit,
    )} ${item.purchaseUnitSymbol}, había ${formatDecimalAr(
      item.availableQtyBefore,
    )} disponibles y el exceso es ${formatDecimalAr(item.quantityExcess)}.`;
  }
  return `Costo: provisional ${formatMoneyAr(
    item.provisionalCostUnitNet,
  )}, real ${formatMoneyAr(item.realCostUnitNet)}, diferencia ${signedMoney(
    item.costDifferenceUnitNet,
  )} (${costVariationLabel(item)}).`;
}

function costVariationLabel(item: ISupplierInvoiceItemDetail): string {
  if (item.costVariationPercentage !== null) {
    return `${formatDecimalAr(item.costVariationPercentage)}%`;
  }
  return item.costStatus === SupplierInvoiceCostStatus.ZERO_BASELINE_INCREASE
    ? 'Base $0 con costo real positivo'
    : 'Base y costo real en $0';
}

function signedMoney(value: string): string {
  const decimal = new Decimal(value);
  if (decimal.gt(0)) return `+${formatMoneyAr(decimal.toFixed(4))}`;
  return formatMoneyAr(decimal.toFixed(4));
}

function costDirectionClass(value: string): string {
  const decimal = new Decimal(value);
  if (decimal.gt(0)) return 'font-semibold text-rose-700';
  if (decimal.lt(0)) return 'font-semibold text-emerald-700';
  return 'text-slate-500';
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
