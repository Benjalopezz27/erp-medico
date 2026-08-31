import { PaymentMethod, type ICustomer } from '@erp/shared-types';
import { CustomerSearchInput } from '@/features/customers/components/CustomerSearchInput';
import { Select } from '@/components/ui/select';

const cashMethods = [
  PaymentMethod.EFECTIVO,
  PaymentMethod.TRANSFERENCIA,
  PaymentMethod.DEBITO,
  PaymentMethod.CREDITO,
  PaymentMethod.QR,
  PaymentMethod.CHEQUE,
];

export function PosCommercialConditions({
  customer,
  isCreditSale,
  requiresFiscalInvoice,
  paymentMethod,
  disabled,
  customerError,
  onCustomerChange,
  onCreditChange,
  onInvoiceChange,
  onPaymentMethodChange,
}: {
  customer: ICustomer | null;
  isCreditSale: boolean;
  requiresFiscalInvoice: boolean;
  paymentMethod: PaymentMethod;
  disabled: boolean;
  customerError?: string;
  onCustomerChange: (customer: ICustomer | null) => void;
  onCreditChange: (checked: boolean) => void;
  onInvoiceChange: (checked: boolean) => void;
  onPaymentMethodChange: (method: PaymentMethod) => void;
}) {
  return (
    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-700">Cliente</label>
        <CustomerSearchInput value={customer} onSelect={onCustomerChange} disabled={disabled} />
        {!customer && !isCreditSale && (
          <p className="mt-1 text-[10px] text-slate-500">
            Sin cliente se registra como consumidor final.
          </p>
        )}
        {customerError && (
          <p role="alert" className="mt-1 text-xs text-rose-600">
            {customerError}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="sale-payment-method"
          className="mb-1.5 block text-xs font-semibold text-slate-700"
        >
          Medio de pago
        </label>
        <Select
          id="sale-payment-method"
          value={paymentMethod}
          disabled={disabled || isCreditSale}
          onChange={(event) => onPaymentMethodChange(event.target.value as PaymentMethod)}
          className="h-9 text-xs"
        >
          {(isCreditSale ? [PaymentMethod.CTA_CTE] : cashMethods).map((method) => (
            <option key={method} value={method}>
              {method.replace('_', ' ')}
            </option>
          ))}
        </Select>
      </div>

      <fieldset className="space-y-3 border-t border-slate-100 pt-4">
        <legend className="text-xs font-semibold text-slate-700">Opciones de venta</legend>
        <label className="flex items-start gap-2 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={requiresFiscalInvoice}
            disabled={disabled || isCreditSale}
            onChange={(event) => onInvoiceChange(event.target.checked)}
            className="mt-0.5"
          />
          <span>
            Requiere factura
            {isCreditSale && (
              <span className="block text-[10px] text-amber-700">
                Obligatoria para ventas a crédito.
              </span>
            )}
          </span>
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={isCreditSale}
            disabled={disabled}
            onChange={(event) => onCreditChange(event.target.checked)}
          />
          Venta a crédito
        </label>
      </fieldset>
    </div>
  );
}
