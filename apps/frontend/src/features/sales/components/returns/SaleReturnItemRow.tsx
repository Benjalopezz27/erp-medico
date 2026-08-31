import React from 'react';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { SaleReturnItemQuality } from '@erp/shared-types';
import { Badge } from '@/components/ui/badge';
import { formatDecimal } from '@/features/products/utils/products.math';
import type { ISaleReturnLineForm } from '../../types/sales.types';

interface SaleReturnItemRowProps {
  item: ISaleReturnLineForm;
  disabled: boolean;
  onToggleSelect: (selected: boolean) => void;
  onQuantityChange: (quantity: number) => void;
  onQualityChange: (quality: SaleReturnItemQuality) => void;
  onNotesChange: (notes: string) => void;
}

export const SaleReturnItemRow: React.FC<SaleReturnItemRowProps> = ({
  item,
  disabled,
  onToggleSelect,
  onQuantityChange,
  onQualityChange,
  onNotesChange,
}) => {
  const isFullyReturned = item.remainingQuantity <= 0;

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        item.selected
          ? 'border-blue-300 bg-blue-50/40'
          : isFullyReturned
            ? 'border-slate-200 bg-slate-50/70 opacity-60'
            : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={item.selected}
            disabled={disabled || isFullyReturned}
            onChange={(e) => onToggleSelect(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
            aria-label={`Seleccionar ${item.productName} para devolución`}
          />
          <div>
            <span className="text-sm font-semibold text-slate-900">{item.productName}</span>
            <p className="font-mono text-xs text-slate-500">{item.internalCode}</p>
          </div>
        </label>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-600">
            Vendido: <strong>{formatDecimal(item.soldQuantity)}</strong>
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-600">
            Devuelto: <strong>{formatDecimal(item.returnedQuantity)}</strong>
          </span>
          <span className="text-slate-400">|</span>
          <Badge variant={isFullyReturned ? 'secondary' : 'info'}>
            Restante: {formatDecimal(item.remainingQuantity)}
          </Badge>
        </div>
      </div>

      {item.selected && (
        <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor={`qty-${item.saleItemId}`}
              className="block text-xs font-semibold text-slate-700"
            >
              Cantidad a devolver *
            </label>
            <input
              id={`qty-${item.saleItemId}`}
              type="number"
              min="0.01"
              max={item.remainingQuantity}
              step="0.01"
              disabled={disabled}
              value={item.quantityBase || ''}
              onChange={(e) => onQuantityChange(Number(e.target.value))}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
            />
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700">Estado de calidad *</span>
            <div className="mt-1.5 flex gap-2">
              <label
                className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all ${
                  item.quality === SaleReturnItemQuality.APTO
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
              >
                <input
                  type="radio"
                  name={`quality-${item.saleItemId}`}
                  value={SaleReturnItemQuality.APTO}
                  checked={item.quality === SaleReturnItemQuality.APTO}
                  disabled={disabled}
                  onChange={() => onQualityChange(SaleReturnItemQuality.APTO)}
                  className="sr-only"
                />
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>APTO (Stock)</span>
              </label>

              <label
                className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all ${
                  item.quality === SaleReturnItemQuality.NO_APTO
                    ? 'border-amber-600 bg-amber-50 text-amber-800 ring-1 ring-amber-600'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
              >
                <input
                  type="radio"
                  name={`quality-${item.saleItemId}`}
                  value={SaleReturnItemQuality.NO_APTO}
                  checked={item.quality === SaleReturnItemQuality.NO_APTO}
                  disabled={disabled}
                  onChange={() => onQualityChange(SaleReturnItemQuality.NO_APTO)}
                  className="sr-only"
                />
                <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                <span>NO APTO (Cuarentena)</span>
              </label>
            </div>
          </div>

          <div>
            <label
              htmlFor={`notes-${item.saleItemId}`}
              className="block text-xs font-semibold text-slate-700"
            >
              Observación (opcional)
            </label>
            <input
              id={`notes-${item.saleItemId}`}
              type="text"
              maxLength={500}
              disabled={disabled}
              placeholder="Ej. empaque dañado"
              value={item.notes || ''}
              onChange={(e) => onNotesChange(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
            />
          </div>
        </div>
      )}
    </div>
  );
};
