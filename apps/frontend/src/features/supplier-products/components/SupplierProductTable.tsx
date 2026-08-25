import React from 'react';
import { Edit2, Trash2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PrimarySupplierBadge } from './PrimarySupplierBadge';
import { formatCurrency } from '@/features/products/utils/products.math';
import type { ISupplierProduct } from '../types/supplier-products.types';

interface SupplierProductTableProps {
  items: ISupplierProduct[];
  onEdit: (item: ISupplierProduct) => void;
  onDelete: (item: ISupplierProduct) => void;
  isSupplierActive: boolean;
  isLoading?: boolean;
  isMutating?: boolean;
}

export const SupplierProductTable: React.FC<SupplierProductTableProps> = ({
  items,
  onEdit,
  onDelete,
  isSupplierActive,
  isLoading = false,
  isMutating = false,
}) => {
  if (items.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
          <Layers className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          No se encontraron productos en el catálogo
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1">
          {isSupplierActive
            ? 'Comienza asociando productos del catálogo interno a este proveedor usando el botón superior.'
            : 'Este proveedor no tiene productos asociados en su catálogo.'}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3.5 px-4">SKU Proveedor</th>
              <th className="py-3.5 px-4">Descripción Externa</th>
              <th className="py-3.5 px-4">Producto Interno</th>
              <th className="py-3.5 px-4">Unidad Compra</th>
              <th className="py-3.5 px-4 text-center">Factor a Base</th>
              <th className="py-3.5 px-4 text-right">Costo Habitual</th>
              <th className="py-3.5 px-4 text-center">Habitual</th>
              <th className="py-3.5 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item) => {
              const baseSymbol = item.product?.baseUnit?.symbol || 'u';
              const purchaseSymbol = item.purchaseUnit?.symbol || 'u';

              return (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* SKU */}
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-900 dark:text-slate-100 text-xs">
                    {item.supplierExternalCode}
                  </td>

                  {/* Supplier Description */}
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 text-xs max-w-xs truncate">
                    {item.supplierDescription || (
                      <span className="text-slate-400 dark:text-slate-600 italic">
                        Sin descripción
                      </span>
                    )}
                  </td>

                  {/* Internal Product */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                        {item.product?.internalCode} — {item.product?.name}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Unidad base: {item.product?.baseUnit?.name} ({baseSymbol})
                      </span>
                    </div>
                  </td>

                  {/* Purchase Unit */}
                  <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 text-xs">
                    {item.purchaseUnit?.name} ({purchaseSymbol})
                  </td>

                  {/* Conversion Factor */}
                  <td className="py-3.5 px-4 text-center text-xs text-slate-700 dark:text-slate-300">
                    <span className="font-semibold">{Number(item.conversionFactorToBase)}</span>{' '}
                    <span className="text-slate-400 text-[11px]">
                      {baseSymbol} / {purchaseSymbol}
                    </span>
                  </td>

                  {/* Usual Cost */}
                  <td className="py-3.5 px-4 text-right font-medium text-slate-800 dark:text-slate-200 text-xs">
                    {item.usualCostNet !== null && item.usualCostNet !== undefined ? (
                      formatCurrency(Number(item.usualCostNet))
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>

                  {/* Primary Status */}
                  <td className="py-3.5 px-4 text-center">
                    <PrimarySupplierBadge isPrimary={item.isPrimarySupplier} />
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(item)}
                        disabled={!isSupplierActive || isMutating}
                        className="h-8 px-2 text-xs text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                        title={
                          !isSupplierActive
                            ? 'No se puede editar el catálogo de un proveedor inactivo'
                            : 'Editar asociación'
                        }
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" />
                        Editar
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(item)}
                        disabled={isMutating}
                        className="h-8 px-2 text-xs text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                        title="Eliminar asociación"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
