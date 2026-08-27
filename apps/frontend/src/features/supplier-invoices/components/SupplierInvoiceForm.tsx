import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { AlertTriangle, ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  buildSupplierInvoiceDefaults,
  createSupplierInvoiceSchema,
  mapSupplierInvoiceFormToPayload,
} from '../schemas/supplier-invoice.schema';
import { useCreateSupplierInvoiceMutation } from '../hooks/use-supplier-invoices';
import {
  SupplierInvoiceErrorCode,
  SupplierInvoiceAdjustmentMode,
  SupplierInvoiceQuantityStatus,
  type ICreateSupplierInvoicePayload,
  type IPendingInvoiceReceipt,
  type ISupplierInvoiceDetail,
  type SupplierInvoiceFormData,
} from '../types/supplier-invoices.types';
import {
  calculateInvoiceLine,
  calculateInvoiceTotals,
  formatDecimalAr,
  formatMoneyAr,
} from '../utils/supplier-invoices.math';
import { parseSupplierInvoiceError } from '../utils/supplier-invoices.errors';

export function SupplierInvoiceForm({
  receipt,
  onCreated,
  onChangeReceipt,
  onRefreshReceipt,
  onReceiptUpdated,
}: {
  receipt: IPendingInvoiceReceipt;
  onCreated: (invoice: ISupplierInvoiceDetail) => void;
  onChangeReceipt: () => void;
  onRefreshReceipt: () => Promise<IPendingInvoiceReceipt | null>;
  onReceiptUpdated: (receipt: IPendingInvoiceReceipt) => void;
}) {
  const schema = useMemo(() => createSupplierInvoiceSchema(receipt), [receipt]);
  const mutation = useCreateSupplierInvoiceMutation();
  const [prepared, setPrepared] = useState<ICreateSupplierInvoicePayload | null>(null);
  const [generalError, setGeneralError] = useState<string>();
  const {
    register,
    control,
    handleSubmit,
    setError,
    setFocus,
    getValues,
    reset,
    formState: { errors, isDirty },
  } = useForm<SupplierInvoiceFormData>({
    resolver: zodResolver(schema) as Resolver<SupplierInvoiceFormData>,
    defaultValues: buildSupplierInvoiceDefaults(receipt),
    mode: 'onSubmit',
  });
  const values = useWatch({ control }) as SupplierInvoiceFormData;
  const receiptMap = new Map(receipt.items.map((item) => [item.goodsReceiptItemId, item]));
  const calculations = (values.items ?? []).map((line) => {
    const source = receiptMap.get(line?.goodsReceiptItemId ?? '');
    return calculateInvoiceLine({
      quantity: line?.invoicedQtyPurchaseUnit ?? '',
      available: source?.availableQtyPurchaseUnit ?? '0',
      unitPrice: line?.unitPriceNet ?? '0',
      discount: line?.discountNet ?? '0',
      bonus: line?.bonusNet ?? '0',
      surcharge: line?.surchargeNet ?? '0',
      discountMode: line?.discountMode,
      bonusMode: line?.bonusMode,
      surchargeMode: line?.surchargeMode,
    });
  });
  const selectedCalculations = calculations.filter((_, index) =>
    Boolean(values.items?.[index]?.invoicedQtyPurchaseUnit?.trim()),
  );
  const totals = calculateInvoiceTotals(
    selectedCalculations.map((item) => item.net),
    values.taxTotal ?? '0',
    values.taxMode,
  );
  const hasExcess = selectedCalculations.some(
    (item) => item.quantityStatus === SupplierInvoiceQuantityStatus.EXCEDIDA,
  );

  const prepare = (data: SupplierInvoiceFormData) => {
    setGeneralError(undefined);
    setPrepared(mapSupplierInvoiceFormToPayload(receipt, data));
  };

  const submit = async () => {
    if (!prepared || mutation.isPending) return;
    try {
      const invoice = await mutation.mutateAsync(prepared);
      onCreated(invoice);
    } catch (error) {
      setPrepared(null);
      const parsed = parseSupplierInvoiceError(error);
      if (parsed.kind === 'DUPLICATE_NUMBER') {
        setError('invoiceNumber', { type: 'server', message: parsed.message });
        setFocus('invoiceNumber');
        return;
      }
      if (parsed.kind === 'FIELD') {
        if (parsed.code === SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_DATE)
          setError('invoiceDate', { type: 'server', message: parsed.message });
        else if (parsed.code === SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_TAX)
          setError('taxTotal', { type: 'server', message: parsed.message });
        else setGeneralError(parsed.message);
        return;
      }
      if (parsed.kind === 'CONCURRENCY' || parsed.kind === 'RECEIPT_STALE') {
        const previous = getValues();
        const refreshed = await onRefreshReceipt();
        if (!refreshed) {
          setGeneralError(
            `${parsed.message} La recepción ya no tiene saldo facturable; seleccione otra.`,
          );
          onChangeReceipt();
          return;
        }
        const defaults = buildSupplierInvoiceDefaults(refreshed);
        const priorLines = new Map(previous.items.map((line) => [line.goodsReceiptItemId, line]));
        reset({
          invoiceNumber: previous.invoiceNumber,
          invoiceDate: previous.invoiceDate,
          taxTotal: previous.taxTotal,
          taxMode: previous.taxMode,
          items: defaults.items.map((line) => ({
            ...line,
            ...priorLines.get(line.goodsReceiptItemId),
          })),
        });
        onReceiptUpdated(refreshed);
        setGeneralError(`${parsed.message} Actualizamos los saldos; revise y confirme nuevamente.`);
        return;
      }
      setGeneralError(parsed.message);
    }
  };

  const requestChange = () => {
    if (
      !isDirty ||
      window.confirm('Cambiar de recepción descartará los datos ingresados. ¿Continuar?')
    )
      onChangeReceipt();
  };

  return (
    <>
      <form onSubmit={handleSubmit(prepare)} noValidate className="space-y-6">
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
          <div>
            <p className="font-semibold">
              {receipt.receiptNumber} · Remito {receipt.deliveryNoteNumber}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {receipt.supplier.businessName} · {receipt.purchaseOrder.orderNumber}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={requestChange}
            disabled={mutation.isPending}
          >
            Cambiar recepción
          </Button>
        </section>
        {generalError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            {generalError}
          </div>
        )}
        <section className="grid gap-4 rounded-xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3">
          <Field label="Número de comprobante" error={errors.invoiceNumber?.message}>
            <Input
              maxLength={50}
              autoComplete="off"
              disabled={mutation.isPending}
              {...register('invoiceNumber')}
            />
          </Field>
          <Field label="Fecha de factura" error={errors.invoiceDate?.message}>
            <Input type="date" disabled={mutation.isPending} {...register('invoiceDate')} />
          </Field>
          <Field label="IVA" error={errors.taxTotal?.message}>
            <div className="flex gap-2">
              <select
                aria-label="Modo de IVA"
                className="h-10 rounded-md border bg-background px-2 text-xs"
                disabled={mutation.isPending}
                {...register('taxMode')}
              >
                <option value={SupplierInvoiceAdjustmentMode.AMOUNT}>Importe</option>
                <option value={SupplierInvoiceAdjustmentMode.PERCENTAGE}>Porcentaje</option>
              </select>
              <Input
                aria-label="Valor de IVA"
                inputMode="decimal"
                disabled={mutation.isPending}
                {...register('taxTotal')}
              />
            </div>
          </Field>
        </section>
        <section className="space-y-3">
          <div>
            <h2 className="font-semibold">Líneas de factura</h2>
            <p className="text-xs text-slate-500">
              Deje vacía la cantidad de las líneas que no pertenecen a este comprobante.
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full min-w-[1450px] text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2 text-right">Recibida</th>
                  <th className="px-3 py-2 text-right">Facturada antes</th>
                  <th className="px-3 py-2 text-right">Disponible</th>
                  <th className="px-3 py-2">Cantidad actual</th>
                  <th className="px-3 py-2">Precio unit.</th>
                  <th className="px-3 py-2">Descuento</th>
                  <th className="px-3 py-2">Bonificación</th>
                  <th className="px-3 py-2">Recargo</th>
                  <th className="px-3 py-2 text-right">Neto</th>
                  <th className="px-3 py-2">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {receipt.items.map((item, index) => {
                  const calculation = calculations[index];
                  const selected = Boolean(values.items?.[index]?.invoicedQtyPurchaseUnit?.trim());
                  return (
                    <tr
                      key={item.goodsReceiptItemId}
                      className={
                        selected && calculation.excess.gt(0)
                          ? 'bg-amber-50 dark:bg-amber-950/20'
                          : ''
                      }
                    >
                      <td className="px-3 py-3">
                        <input type="hidden" {...register(`items.${index}.goodsReceiptItemId`)} />
                        <strong>{item.productName}</strong>
                        <p className="font-mono text-[10px] text-slate-400">
                          {item.productCode} · SKU {item.supplierSku} · {item.purchaseUnitSymbol}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right font-mono">
                        {formatDecimalAr(item.receivedQtyPurchaseUnit)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono">
                        {formatDecimalAr(item.previouslyAllocatedQtyPurchaseUnit)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold">
                        {formatDecimalAr(item.availableQtyPurchaseUnit)}
                      </td>
                      {(
                        [
                          'invoicedQtyPurchaseUnit',
                          'unitPriceNet',
                          'discountNet',
                          'bonusNet',
                          'surchargeNet',
                        ] as const
                      ).map((field) => {
                        const modeField =
                          field === 'discountNet'
                            ? 'discountMode'
                            : field === 'bonusNet'
                              ? 'bonusMode'
                              : field === 'surchargeNet'
                                ? 'surchargeMode'
                                : null;
                        return (
                          <td key={field} className="px-2 py-2 align-top">
                            {modeField && (
                              <select
                                aria-label={`Modo ${field} ${item.productName}`}
                                className="mb-1 h-7 w-28 rounded-md border bg-background px-1 text-[10px]"
                                disabled={mutation.isPending}
                                {...register(`items.${index}.${modeField}`)}
                              >
                                <option value={SupplierInvoiceAdjustmentMode.AMOUNT}>
                                  Importe
                                </option>
                                <option value={SupplierInvoiceAdjustmentMode.PERCENTAGE}>
                                  Porcentaje
                                </option>
                              </select>
                            )}
                            <Input
                              inputMode="decimal"
                              className="w-28 font-mono"
                              aria-label={`${field} ${item.productName}`}
                              disabled={mutation.isPending}
                              {...register(`items.${index}.${field}`)}
                            />
                            {errors.items?.[index]?.[field]?.message && (
                              <p className="mt-1 w-28 text-[10px] text-rose-600">
                                {errors.items[index]?.[field]?.message}
                              </p>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-3 text-right font-mono font-bold">
                        {selected ? formatMoneyAr(calculation.net) : '—'}
                      </td>
                      <td className="px-3 py-3">
                        {selected ? (
                          calculation.excess.gt(0) ? (
                            <span className="font-semibold text-amber-700">
                              Exceso {formatDecimalAr(calculation.excess.toFixed(4))}
                            </span>
                          ) : (
                            <span className="text-slate-600">
                              Saldo {formatDecimalAr(calculation.pending.toFixed(4))}
                            </span>
                          )
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {typeof errors.items?.message === 'string' && (
            <p role="alert" className="text-sm text-rose-600">
              {errors.items.message}
            </p>
          )}
        </section>
        <section className="ml-auto grid max-w-xl gap-2 rounded-xl border bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
          <Total label="Neto" value={formatMoneyAr(totals.netTotal)} />
          <Total label="IVA" value={formatMoneyAr(totals.taxTotal)} />
          <Total label="Total" value={formatMoneyAr(totals.totalAmount)} strong />
          {hasExcess && (
            <p className="mt-2 flex gap-2 rounded-lg bg-amber-100 p-3 text-xs text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              La factura quedará OBSERVADA porque una o más cantidades superan el saldo disponible.
            </p>
          )}
        </section>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={requestChange}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            <ReceiptText className="mr-1.5 h-4 w-4" />
            Revisar factura
          </Button>
        </div>
      </form>
      {prepared && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invoice-confirm-title"
        >
          <div className="w-full max-w-lg space-y-4 rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div>
              <h2 id="invoice-confirm-title" className="text-lg font-bold">
                Confirmar factura
              </h2>
              <p className="text-xs text-slate-500">
                {receipt.supplier.businessName} · {receipt.receiptNumber}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt>Comprobante</dt>
              <dd className="text-right font-mono">{prepared.invoiceNumber}</dd>
              <dt>Líneas</dt>
              <dd className="text-right">{prepared.items.length}</dd>
              <dt>Neto</dt>
              <dd className="text-right font-mono">{formatMoneyAr(totals.netTotal)}</dd>
              <dt>IVA</dt>
              <dd className="text-right font-mono">{formatMoneyAr(totals.taxTotal)}</dd>
              <dt className="font-bold">Total</dt>
              <dd className="text-right font-mono font-bold">
                {formatMoneyAr(totals.totalAmount)}
              </dd>
            </dl>
            {hasExcess && (
              <div
                role="alert"
                className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
              >
                <strong>Resultado esperado: OBSERVADA.</strong> El backend reservará solo las
                cantidades disponibles.
              </div>
            )}{' '}
            {!hasExcess && (
              <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                Resultado esperado: <strong>AUTORIZADA</strong> si los costos están dentro de la
                tolerancia vigente; de lo contrario quedará <strong>OBSERVADA</strong>.
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setPrepared(null)}
                disabled={mutation.isPending}
              >
                Volver
              </Button>
              <Button onClick={submit} disabled={mutation.isPending}>
                {mutation.isPending ? 'Registrando…' : 'Registrar factura'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1 text-xs font-semibold">
      {label}
      {children}
      {error && <span className="block font-normal text-rose-600">{error}</span>}
    </label>
  );
}
function Total({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? 'border-t pt-2 text-base font-bold' : ''}`}>
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
