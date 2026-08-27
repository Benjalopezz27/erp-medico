import React from 'react';
import { Trash2, AlertTriangle, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  calculateItemSubtotal,
  calculateItemBaseQty,
  calculateOrderTotalNet,
  formatCurrency,
} from '../utils/purchase-orders.math';
import type { IPurchaseOrderFormItem } from '../types/purchase-orders.types';
import type { UseFieldArrayRemove, UseFormRegister, FieldErrors } from 'react-hook-form';

export interface PurchaseOrderItemsTableProps {
  fields: Array<IPurchaseOrderFormItem & { id: string }>;
  remove: UseFieldArrayRemove;
  register: UseFormRegister<any>;
  errors?: FieldErrors<any>;
  watchItems: IPurchaseOrderFormItem[];
  disabled?: boolean;
}

export const PurchaseOrderItemsTable: React.FC<PurchaseOrderItemsTableProps> = ({
  fields,
  remove,
  register,
  errors,
  watchItems = [],
  disabled = false,
}) => {
  if (fields.length === 0) {
    return (
      <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center space-y-2 bg-slate-50/50 dark:bg-slate-900/50">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          No hay ítems en la orden de compra
        </p>
        <p className="text-xs text-slate-400">
          Use el buscador de catálogo superior para agregar productos de este proveedor.
        </p>
      </div>
    );
  }

  const orderTotal = calculateOrderTotalNet(watchItems);

  return (
    <div className="space-y-3">
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 font-semibold text-slate-700 dark:text-slate-300">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Producto / Catálogo</th>
                <th className="py-2.5 px-3">U. Compra</th>
                <th className="py-2.5 px-3 w-32">Cantidad</th>
                <th className="py-2.5 px-3 w-36">Costo Unit. Neto</th>
                <th className="py-2.5 px-3 w-32 text-right">Subtotal Neto</th>
                <th className="py-2.5 px-3 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {fields.map((field, index) => {
                const itemValues = watchItems[index] || field;
                const subtotal = calculateItemSubtotal(
                  itemValues.orderedQty,
                  itemValues.expectedCostUnitNet,
                );
                const baseQty = calculateItemBaseQty(
                  itemValues.orderedQty,
                  itemValues.conversionFactorToBase,
                );

                const itemError = (errors?.items as any)?.[index];
                const hasDeletedError = field.isDeletedAssociation;
                const hasDriftWarning = field.driftWarning;

                return (
                  <tr
                    key={field.id}
                    className={
                      hasDeletedError
                        ? 'bg-rose-50/40 dark:bg-rose-950/20'
                        : hasDriftWarning
                          ? 'bg-amber-50/30 dark:bg-amber-950/20'
                          : undefined
                    }
                  >
                    {/* Index */}
                    <td className="py-3 px-3 text-center text-slate-400 font-mono">{index + 1}</td>

                    {/* Product & SKU */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {field.productName}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                        <span>Cód: {field.productInternalCode}</span>
                        <span>•</span>
                        <span>SKU: {field.supplierSku}</span>
                      </div>

                      {/* Deleted Association Warning */}
                      {hasDeletedError && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            Este producto ya no existe en el catálogo. Elimínelo para continuar.
                          </span>
                        </div>
                      )}

                      {/* Drift Warning Banner */}
                      {hasDriftWarning && !hasDeletedError && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                          <span>{field.driftWarning}</span>
                        </div>
                      )}
                    </td>

                    {/* Unit & Factor */}
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      <div>
                        {field.purchaseUnitName}{' '}
                        <span className="font-mono text-slate-400">
                          ({field.purchaseUnitSymbol})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Factor: {field.conversionFactorToBase}
                      </div>
                    </td>

                    {/* Quantity Input & Equivalence */}
                    <td className="py-3 px-3">
                      <Input
                        type="text"
                        {...register(`items.${index}.orderedQty` as const)}
                        disabled={disabled}
                        placeholder="0.00"
                        className="h-8 text-xs font-mono text-right"
                        aria-label={`Cantidad para ${field.productName}`}
                      />
                      {itemError?.orderedQty && (
                        <p className="text-[10px] text-red-600 font-medium mt-0.5">
                          {itemError.orderedQty.message}
                        </p>
                      )}

                      {/* Base Unit Equivalence */}
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">
                        = {baseQty.toString()} {field.baseUnitSymbol || 'UN'}
                      </div>
                    </td>

                    {/* Expected Unit Cost Input */}
                    <td className="py-3 px-3">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                          $
                        </span>
                        <Input
                          type="text"
                          {...register(`items.${index}.expectedCostUnitNet` as const)}
                          disabled={disabled}
                          placeholder="0.00"
                          className="h-8 pl-5 text-xs font-mono text-right"
                          aria-label={`Costo unitario para ${field.productName}`}
                        />
                      </div>
                      {itemError?.expectedCostUnitNet && (
                        <p className="text-[10px] text-red-600 font-medium mt-0.5">
                          {itemError.expectedCostUnitNet.message}
                        </p>
                      )}
                    </td>

                    {/* Subtotal */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(subtotal)}
                    </td>

                    {/* Remove Action */}
                    <td className="py-3 px-3 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        disabled={disabled}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded"
                        aria-label={`Eliminar ítem ${field.productName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Total Summary Footer */}
        <div className="p-4 bg-slate-50/75 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500">
            Total de líneas: <strong>{fields.length}</strong>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-600 dark:text-slate-400 font-semibold">
              Total Neto Estimado:
            </span>
            <span
              data-testid="purchase-order-total-net"
              className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400"
            >
              {formatCurrency(orderTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
