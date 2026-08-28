import { AlertTriangle, Boxes, Calculator, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import type { ISupplierInvoiceDetail } from '../types/supplier-invoices.types';
import {
  formatDecimalAr,
  formatMoneyAr,
  formatSignedMoneyAr,
} from '../utils/supplier-invoices.math';

export function SupplierInvoiceConfirmationModal({
  invoice,
  isOpen,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  invoice: ISupplierInvoiceDetail;
  isOpen: boolean;
  pending: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const productCount = new Set(invoice.items.map((item) => item.productId)).size;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!pending) onClose();
      }}
      title="Confirmar factura y aplicar costos"
      description={`Comprobante ${invoice.invoiceNumber} · ${invoice.supplier.businessName}`}
      showCloseButton={!pending}
      className="max-w-4xl"
    >
      <div className="space-y-5 text-sm">
        <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold">Esta operación es irreversible.</p>
            <p className="mt-1">
              El reparto exacto entre inventario y costo de mercadería vendida (COGS) se calculará
              contra el ledger vigente al confirmar.
            </p>
          </div>
        </div>

        <dl className="grid gap-3 sm:grid-cols-3">
          <Summary label="Recepción" value={invoice.goodsReceipt.receiptNumber} />
          <Summary label="Remito" value={invoice.goodsReceipt.deliveryNoteNumber} />
          <Summary label="Productos" value={String(productCount)} />
        </dl>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-3 py-2">
                  Producto
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  Cantidad asignada
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  Costo provisional
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  Costo real
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  Diferencia
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-3">
                    <strong>{item.productName}</strong>
                    <p className="font-mono text-[10px] text-slate-500">{item.productCode}</p>
                  </td>
                  <td className="px-3 py-3 text-right font-mono">
                    {formatDecimalAr(item.allocatedReceivedQtyBase, 2)} u. base
                  </td>
                  <td className="px-3 py-3 text-right font-mono">
                    {formatMoneyAr(item.provisionalCostUnitNet)} / {item.purchaseUnitSymbol}
                  </td>
                  <td className="px-3 py-3 text-right font-mono">
                    {formatMoneyAr(item.realCostUnitNet)} / {item.purchaseUnitSymbol}
                  </td>
                  <td className="px-3 py-3 text-right font-mono">
                    {formatSignedMoneyAr(item.costDifferenceUnitNet)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="grid gap-2 text-xs sm:grid-cols-3">
          <Effect icon={Calculator} text="Actualiza el costo y el precio sugerido del producto." />
          <Effect
            icon={Tag}
            text="Genera una revisión de precio pendiente; no cambia el precio activo."
          />
          <Effect icon={Boxes} text="No modifica cantidades de stock ni crea movimientos." />
        </ul>

        {error && (
          <div role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={pending}>
            {pending ? 'Confirmando…' : 'Confirmar y aplicar ajustes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <dt className="text-[10px] font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}

function Effect({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  text: string;
}) {
  return (
    <li className="flex gap-2 rounded-lg border p-3">
      <Icon className="h-4 w-4 shrink-0 text-blue-600" aria-hidden={true} />
      <span>{text}</span>
    </li>
  );
}
