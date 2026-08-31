import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { CustomerPricingRuleApplied, ProductTaxTreatment } from '@erp/shared-types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/features/products/utils/products.math';
import type { PosPreviewLine, StockErrorDetails } from '../../types/sales.types';

const pricingLabels: Record<CustomerPricingRuleApplied, string> = {
  [CustomerPricingRuleApplied.FIXED_PRICE]: 'Precio fijo especial',
  [CustomerPricingRuleApplied.PRODUCT_DISCOUNT]: 'Descuento por producto',
  [CustomerPricingRuleApplied.GENERAL_DISCOUNT]: 'Descuento general',
  [CustomerPricingRuleApplied.CATALOG_PRICE]: 'Precio de catálogo',
};

export function PosCart({
  lines,
  disabled,
  stockError,
  onQuantityChange,
  onRemove,
  onRetryPricing,
}: {
  lines: PosPreviewLine[];
  disabled: boolean;
  stockError?: StockErrorDetails;
  onQuantityChange: (productId: string, value: number) => void;
  onRemove: (productId: string) => void;
  onRetryPricing: (productId: string) => void;
}) {
  if (lines.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
        El carrito está vacío. Buscá un producto para comenzar.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-3 py-2.5">Producto</th>
            <th className="px-3 py-2.5">Cantidad</th>
            <th className="px-3 py-2.5 text-right">Stock</th>
            <th className="px-3 py-2.5 text-right">Catálogo</th>
            <th className="px-3 py-2.5">Condición</th>
            <th className="px-3 py-2.5 text-right">Final</th>
            <th className="px-3 py-2.5 text-right">Subtotal</th>
            <th className="w-12 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {lines.map((line) => {
            const currentError = stockError?.productId === line.product.id ? stockError : undefined;
            const exceedsVisibleStock =
              line.product.currentStock !== null && line.quantityBase > line.product.currentStock;
            return (
              <tr key={line.product.id} className={currentError ? 'bg-rose-50' : undefined}>
                <td className="px-3 py-3">
                  <p className="font-semibold text-slate-900">{line.product.name}</p>
                  <p className="font-mono text-[10px] text-slate-500">
                    {line.product.internalCode}
                  </p>
                </td>
                <td className="px-3 py-3">
                  <Input
                    aria-label={`Cantidad de ${line.product.name}`}
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={line.quantityBase}
                    disabled={disabled}
                    onChange={(event) =>
                      onQuantityChange(line.product.id, Number(event.target.value))
                    }
                    className="h-8 w-24 text-xs"
                  />
                  <span className="mt-1 block text-[10px] text-slate-400">
                    {line.product.baseUnit.symbol}
                  </span>
                </td>
                <td className="px-3 py-3 text-right font-mono">
                  {line.product.currentStock === null ? 'Sin datos' : line.product.currentStock}
                  {exceedsVisibleStock && (
                    <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-amber-700">
                      <AlertTriangle className="h-3 w-3" /> Supera el stock visible
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-right font-mono">
                  {formatCurrency(line.catalogPriceNet)}
                </td>
                <td className="px-3 py-3">
                  {line.isResolving ? (
                    <span className="flex items-center gap-1 text-slate-500">
                      <Loader2 className="h-3 w-3 animate-spin" /> Resolviendo…
                    </span>
                  ) : line.hasPricingError ? (
                    <button
                      type="button"
                      onClick={() => onRetryPricing(line.product.id)}
                      className="font-semibold text-rose-600 underline"
                    >
                      Reintentar precio
                    </button>
                  ) : (
                    <span className="font-medium text-emerald-700">
                      {
                        pricingLabels[
                          line.pricing?.ruleApplied ?? CustomerPricingRuleApplied.CATALOG_PRICE
                        ]
                      }
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-right font-mono font-semibold">
                  {formatCurrency(line.finalPriceNet)}
                  <span className="block text-[10px] font-normal text-slate-400">
                    {line.taxTreatment === ProductTaxTreatment.GRAVADO
                      ? `IVA ${line.ivaPercentage}%`
                      : line.taxTreatment === ProductTaxTreatment.EXENTO
                        ? 'Exento'
                        : 'No gravado'}
                  </span>
                </td>
                <td className="px-3 py-3 text-right font-mono font-bold">
                  {formatCurrency(line.subtotalGross)}
                </td>
                <td className="px-3 py-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={disabled}
                    onClick={() => onRemove(line.product.id)}
                    aria-label={`Quitar ${line.product.name}`}
                    className="h-8 w-8 text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {stockError && (
        <p
          role="alert"
          className="border-t border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
        >
          Stock insuficiente para el producto señalado. Disponible: {stockError.available};
          solicitado: {stockError.requested}.
        </p>
      )}
    </div>
  );
}
