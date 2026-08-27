import React from 'react';
import { useWatch, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import Decimal from 'decimal.js';
import { AlertCircle } from 'lucide-react';
import type {
  IGoodsReceiptFormData,
  IPurchaseOrderItemDetail,
} from '../../types/purchase-orders.types';
import {
  calculateGoodsReceiptBaseMovement,
  calculateGoodsReceiptSubtotal,
} from '../../utils/goods-receipt.math';
import { formatCurrency, formatQuantity } from '../../utils/purchase-orders.math';

interface GoodsReceiptLinesTableProps {
  orderItems: IPurchaseOrderItemDetail[];
  control: Control<IGoodsReceiptFormData>;
  register: UseFormRegister<IGoodsReceiptFormData>;
  errors: FieldErrors<IGoodsReceiptFormData>;
  disabled?: boolean;
}

export const GoodsReceiptLinesTable: React.FC<GoodsReceiptLinesTableProps> = ({
  orderItems,
  control,
  register,
  errors,
  disabled = false,
}) => {
  const formItems = useWatch({ control, name: 'items' }) ?? [];
  const pendingItems = orderItems.filter((item) => new Decimal(item.pendingQty).gt(0));
  const orderItemsById = new Map(orderItems.map((item) => [item.id, item]));

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="w-full min-w-[1050px] text-left text-xs">
        <caption className="sr-only">Líneas pendientes de la orden y cantidades a recibir</caption>
        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
          <tr>
            <th className="px-3 py-3">Producto</th>
            <th className="px-3 py-3">Unidad / factor</th>
            <th className="px-3 py-3 text-right">Ordenado</th>
            <th className="px-3 py-3 text-right">Recibido</th>
            <th className="px-3 py-3 text-right">Pendiente</th>
            <th className="px-3 py-3 w-44">Recibir ahora</th>
            <th className="px-3 py-3 text-right">Entrada base</th>
            <th className="px-3 py-3 w-44">Costo provisional</th>
            <th className="px-3 py-3 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {formItems.map((formItem, index) => {
            const item = orderItemsById.get(formItem.purchaseOrderItemId);
            if (!item) return null;

            const quantity = formItem.receivedQtyPurchaseUnit?.trim() ?? '';
            const calculation =
              quantity === ''
                ? null
                : calculateGoodsReceiptBaseMovement({
                    orderedQty: item.orderedQty,
                    conversionFactor: item.conversionFactor,
                    previousReceivedPurchaseQty: item.receivedQty,
                    deltaPurchaseQty: quantity,
                  });
            const subtotal =
              quantity === ''
                ? null
                : calculateGoodsReceiptSubtotal(quantity, formItem.provisionalCostUnitNet);
            const quantityError = errors.items?.[index]?.receivedQtyPurchaseUnit?.message;
            const costError = errors.items?.[index]?.provisionalCostUnitNet?.message;

            return (
              <tr key={item.id} className="align-top bg-white dark:bg-slate-900">
                <td className="px-3 py-3">
                  <input type="hidden" {...register(`items.${index}.purchaseOrderItemId`)} />
                  <p className="font-semibold text-slate-900 dark:text-white">{item.productName}</p>
                  <p className="font-mono text-[11px] text-slate-400">
                    {item.productCode} · SKU {item.supplierSku}
                  </p>
                </td>
                <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                  <p>
                    {item.purchaseUnitName} ({item.purchaseUnitSymbol})
                  </p>
                  <p className="text-[11px] text-slate-400">
                    1 × {formatQuantity(item.conversionFactor)} base
                  </p>
                </td>
                <td className="px-3 py-3 text-right font-mono">
                  {formatQuantity(item.orderedQty)}
                </td>
                <td className="px-3 py-3 text-right font-mono text-emerald-600">
                  {formatQuantity(item.receivedQty)}
                </td>
                <td className="px-3 py-3 text-right font-mono font-semibold text-amber-600">
                  {formatQuantity(item.pendingQty)}
                </td>
                <td className="px-3 py-3">
                  <label htmlFor={`receipt-quantity-${item.id}`} className="sr-only">
                    Cantidad a recibir de {item.productName}
                  </label>
                  <input
                    id={`receipt-quantity-${item.id}`}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    disabled={disabled}
                    aria-invalid={Boolean(quantityError)}
                    aria-describedby={
                      quantityError ? `receipt-quantity-error-${item.id}` : undefined
                    }
                    placeholder="0,0000"
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 font-mono text-right text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    {...register(`items.${index}.receivedQtyPurchaseUnit`)}
                  />
                  {quantityError && (
                    <p
                      id={`receipt-quantity-error-${item.id}`}
                      className="mt-1 flex items-start gap-1 text-[11px] text-rose-600"
                    >
                      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                      {quantityError}
                    </p>
                  )}
                </td>
                <td className="px-3 py-3 text-right font-mono font-semibold text-blue-600">
                  {calculation?.valid ? formatQuantity(calculation.movementQtyBase) : '—'}
                </td>
                <td className="px-3 py-3">
                  <label htmlFor={`receipt-cost-${item.id}`} className="sr-only">
                    Costo provisional de {item.productName}
                  </label>
                  <input
                    id={`receipt-cost-${item.id}`}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    disabled={disabled || quantity === ''}
                    aria-invalid={Boolean(costError)}
                    aria-describedby={costError ? `receipt-cost-error-${item.id}` : undefined}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 font-mono text-right text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-800"
                    {...register(`items.${index}.provisionalCostUnitNet`)}
                  />
                  {costError && (
                    <p
                      id={`receipt-cost-error-${item.id}`}
                      className="mt-1 text-[11px] text-rose-600"
                    >
                      {costError}
                    </p>
                  )}
                </td>
                <td className="px-3 py-3 text-right font-mono font-semibold">
                  {subtotal ? formatCurrency(subtotal) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {pendingItems.length === 0 && (
        <div className="p-8 text-center text-sm text-slate-500">No hay líneas pendientes.</div>
      )}
    </div>
  );
};
