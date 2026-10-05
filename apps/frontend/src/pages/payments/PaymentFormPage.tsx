import { useMemo, useState } from 'react';
import { BackLink } from '@/components/ui/back-link';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import {
  PaymentAllocationType,
  PaymentMethod,
  type IRegisterPaymentRequest,
} from '@erp/shared-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { CustomerSearchInput } from '@/features/customers/components/CustomerSearchInput';
import { formatCurrency } from '@/features/products/utils/products.math';
import { useRegisterPaymentMutation } from '@/features/payments/hooks/use-payments';
import { MONEY_PATTERN, allocateByAge, sumAmounts } from '@/features/payments/utils/allocation';
import { useCustomerAccountQuery } from '@/features/receivables/hooks/use-receivables-query';
import { formatDate } from '@/features/receivables/utils/receivables.format';
import { parseApiError } from '@/lib/errors/parse-api-error';

type Method = PaymentMethod.EFECTIVO | PaymentMethod.TRANSFERENCIA | PaymentMethod.CHEQUE;

const EMPTY_CHECK = { bankName: '', checkNumber: '', drawerName: '', dueDate: '', issueDate: '' };

export function PaymentFormPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { customerId?: string };
  const [customerId, setCustomerId] = useState(search.customerId ?? '');
  const [mode, setMode] = useState<PaymentAllocationType>(PaymentAllocationType.GLOBAL_AGE);
  const [method, setMethod] = useState<Method>(PaymentMethod.EFECTIVO);
  const [collected, setCollected] = useState('');
  const [manual, setManual] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [check, setCheck] = useState(EMPTY_CHECK);

  const account = useCustomerAccountQuery(customerId, 1, 1);
  const register = useRegisterPaymentMutation();
  const invoices = useMemo(() => account.data?.pendingInvoices ?? [], [account.data]);

  const byAge = mode === PaymentAllocationType.GLOBAL_AGE;
  const applied = useMemo(
    () => (byAge ? allocateByAge(invoices, collected) : manual),
    [byAge, invoices, collected, manual],
  );
  const appliedTotal = sumAmounts(Object.values(applied));
  const collectedTotal = sumAmounts([collected]);
  const collectedValid = MONEY_PATTERN.test(collected) && collectedTotal.greaterThan(0);
  const manualOverBalance = invoices.some(
    (invoice) =>
      !byAge &&
      applied[invoice.id] &&
      (!MONEY_PATTERN.test(applied[invoice.id]) ||
        sumAmounts([applied[invoice.id]]).greaterThan(invoice.currentBalance)),
  );
  const balanced = collectedValid && appliedTotal.equals(collectedTotal);
  const isCheck = method === PaymentMethod.CHEQUE;
  const checkComplete =
    !isCheck ||
    (check.bankName.trim() !== '' &&
      check.checkNumber.trim() !== '' &&
      check.drawerName.trim() !== '' &&
      check.dueDate !== '');
  const canSubmit =
    Boolean(customerId) && balanced && !manualOverBalance && checkComplete && !register.isPending;
  const setCheckField = (field: keyof typeof EMPTY_CHECK, value: string) =>
    setCheck((previous) => ({ ...previous, [field]: value }));

  const submit = () => {
    const base = {
      customerId,
      paymentMethod: method,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(isCheck
        ? {
            check: {
              bankName: check.bankName.trim(),
              checkNumber: check.checkNumber.trim(),
              drawerName: check.drawerName.trim(),
              dueDate: check.dueDate,
              ...(check.issueDate ? { issueDate: check.issueDate } : {}),
            },
          }
        : {}),
    };
    const payload: IRegisterPaymentRequest = byAge
      ? { ...base, mode: PaymentAllocationType.GLOBAL_AGE, totalAmount: collectedTotal.toFixed(2) }
      : {
          ...base,
          mode: PaymentAllocationType.DIRECTED,
          allocations: Object.entries(applied)
            .filter(([, amount]) => amount !== '' && sumAmounts([amount]).greaterThan(0))
            .map(([accountReceivableId, amount]) => ({ accountReceivableId, amount })),
        };
    register.mutate(payload, {
      onSuccess: ({ receipt }) =>
        void navigate({ to: '/receipts/$id', params: { id: receipt.id } }),
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <BackLink
          to={customerId ? '/customers/$id' : '/receivables'}
          params={customerId ? { id: customerId } : undefined}
          search={customerId ? undefined : { page: 1, limit: 20 }}
          className="mb-3"
        >
          {customerId ? 'Volver al cliente' : 'Volver a Cuentas corrientes'}
        </BackLink>
        <h1 className="text-2xl font-bold text-slate-900">Registrar cobro</h1>
        <p className="text-xs text-slate-500">
          Aplicá el cobro a facturas específicas o por antigüedad. Se emite un recibo.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 pt-6">
          {search.customerId ? (
            <p className="text-sm">
              Cliente: <strong>{account.data?.summary.customerName ?? '…'}</strong>
            </p>
          ) : (
            <CustomerSearchInput
              value={null}
              allowAnonymous={false}
              onSelect={(customer) => {
                setCustomerId(customer?.id ?? '');
                setManual({});
              }}
            />
          )}
          {account.isError && (
            <p role="alert" className="flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4" />
              {parseApiError(account.error).message}
            </p>
          )}
          {account.data && (
            <p className="text-xs text-slate-500">
              Saldo actual: <strong>{formatCurrency(account.data.summary.totalBalance)}</strong>
            </p>
          )}
        </CardContent>
      </Card>

      {customerId && account.data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Facturas a cancelar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-4 text-xs">
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="mode"
                    checked={byAge}
                    onChange={() => setMode(PaymentAllocationType.GLOBAL_AGE)}
                  />
                  Aplicar por antigüedad
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="mode"
                    checked={!byAge}
                    onChange={() => setMode(PaymentAllocationType.DIRECTED)}
                  />
                  Selección manual
                </label>
              </div>
              {invoices.length === 0 ? (
                <p className="text-xs text-slate-500">El cliente no tiene facturas pendientes.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-xs">
                    <thead className="text-slate-600">
                      <tr>
                        <th className="py-2">Factura</th>
                        <th className="py-2">Fecha</th>
                        <th className="py-2 text-right">Saldo</th>
                        <th className="py-2 text-right">A aplicar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoices.map((invoice) => (
                        <tr key={invoice.id}>
                          <td className="py-2">{invoice.documentReference}</td>
                          <td className="py-2">{formatDate(invoice.createdAt)}</td>
                          <td className="py-2 text-right">
                            {formatCurrency(invoice.currentBalance)}
                          </td>
                          <td className="py-2 text-right">
                            <Input
                              aria-label={`Monto a aplicar ${invoice.documentReference}`}
                              className="ml-auto h-8 w-32 text-right"
                              inputMode="decimal"
                              placeholder="0.00"
                              readOnly={byAge}
                              value={applied[invoice.id] ?? ''}
                              onChange={(event) =>
                                setManual((previous) => ({
                                  ...previous,
                                  [invoice.id]: event.target.value,
                                }))
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-right text-xs">
                Total a aplicar: <strong>{formatCurrency(appliedTotal.toFixed(2))}</strong>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Cobro</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <label className="space-y-1 text-xs">
                Medio de cobro
                <Select
                  aria-label="Medio de cobro"
                  value={method}
                  onChange={(event) => setMethod(event.target.value as Method)}
                >
                  <option value={PaymentMethod.EFECTIVO}>Efectivo</option>
                  <option value={PaymentMethod.TRANSFERENCIA}>Transferencia</option>
                  <option value={PaymentMethod.CHEQUE}>Cheque</option>
                </Select>
              </label>
              <label className="space-y-1 text-xs">
                Total cobrado
                <Input
                  aria-label="Total cobrado"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={collected}
                  onChange={(event) => setCollected(event.target.value)}
                />
              </label>
              <label className="space-y-1 text-xs">
                Observaciones
                <Input
                  aria-label="Observaciones"
                  maxLength={500}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </label>
              {isCheck && (
                <fieldset className="grid gap-3 md:col-span-3 md:grid-cols-5">
                  <legend className="mb-1 text-xs font-semibold">
                    Datos del cheque (por el total cobrado)
                  </legend>
                  <label className="space-y-1 text-xs">
                    Banco
                    <Input
                      aria-label="Banco"
                      maxLength={100}
                      value={check.bankName}
                      onChange={(event) => setCheckField('bankName', event.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-xs">
                    N° de cheque
                    <Input
                      aria-label="N° de cheque"
                      maxLength={30}
                      value={check.checkNumber}
                      onChange={(event) => setCheckField('checkNumber', event.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-xs">
                    Librador
                    <Input
                      aria-label="Librador"
                      maxLength={150}
                      value={check.drawerName}
                      onChange={(event) => setCheckField('drawerName', event.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-xs">
                    Fecha de vencimiento
                    <Input
                      aria-label="Fecha de vencimiento"
                      type="date"
                      value={check.dueDate}
                      onChange={(event) => setCheckField('dueDate', event.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-xs">
                    Fecha de emisión (opcional)
                    <Input
                      aria-label="Fecha de emisión"
                      type="date"
                      value={check.issueDate}
                      onChange={(event) => setCheckField('issueDate', event.target.value)}
                    />
                  </label>
                </fieldset>
              )}
              <div className="md:col-span-3 text-xs">
                {collected !== '' && !collectedValid && (
                  <p role="alert" className="text-rose-700">
                    Ingresá un importe mayor a 0 con hasta 2 decimales.
                  </p>
                )}
                {collectedValid && !balanced && (
                  <p role="alert" className="text-amber-700">
                    {byAge
                      ? 'El monto supera la deuda del cliente.'
                      : `El total aplicado (${formatCurrency(appliedTotal.toFixed(2))}) no coincide con el cobrado.`}
                  </p>
                )}
                {manualOverBalance && (
                  <p role="alert" className="text-rose-700">
                    Un monto excede el saldo de su factura.
                  </p>
                )}
                {balanced && !manualOverBalance && (
                  <p className="flex items-center gap-1 text-emerald-700">
                    <Check className="h-3.5 w-3.5" /> Diferencia: {formatCurrency('0.00')}
                  </p>
                )}
                {register.isError && (
                  <p role="alert" className="text-rose-700">
                    {parseApiError(register.error).message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="button" disabled={!canSubmit} onClick={submit}>
              {register.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Registrar cobro y emitir recibo
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
