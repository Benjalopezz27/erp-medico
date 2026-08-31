import React, { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import { SaleReturnItemQuality, type ISale, type ISaleReturn } from '@erp/shared-types';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useCreateSaleReturnMutation } from '../../hooks/use-create-sale-return-mutation';
import { saleReturnSchema } from '../../schemas/sales-returns.schema';
import type { ISaleReturnLineForm, ParsedSaleReturnError } from '../../types/sales.types';
import {
  calculateRemainingQuantities,
  summarizeReturnDestinations,
} from '../../utils/sales-returns-math.utils';
import { parseSaleReturnError } from '../../utils/sales-returns.errors';
import { SaleReturnItemRow } from './SaleReturnItemRow';

interface SaleReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: ISale;
  returns: ISaleReturn[];
  onRefetchSaleAndReturns?: () => Promise<void>;
}

export const SaleReturnModal: React.FC<SaleReturnModalProps> = ({
  isOpen,
  onClose,
  sale,
  returns,
  onRefetchSaleAndReturns,
}) => {
  const [items, setItems] = useState<ISaleReturnLineForm[]>([]);
  const [reason, setReason] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [mutationError, setMutationError] = useState<ParsedSaleReturnError | null>(null);

  const mutation = useCreateSaleReturnMutation(sale.id);

  // Initialize or update items when modal opens or sale/returns changes
  useEffect(() => {
    if (isOpen) {
      setItems(calculateRemainingQuantities(sale, returns));
      setReason('');
      setIdempotencyKey(crypto.randomUUID());
      setFieldErrors({});
      setMutationError(null);
    }
  }, [isOpen, sale, returns]);

  const summary = summarizeReturnDestinations(items);
  const selectedCount = items.filter((i) => i.selected).length;

  const handleToggleSelect = (index: number, selected: boolean) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], selected };
      return next;
    });
    setIdempotencyKey(crypto.randomUUID());
    setFieldErrors({});
    setMutationError(null);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], quantityBase: quantity };
      return next;
    });
    setIdempotencyKey(crypto.randomUUID());
    setFieldErrors({});
    setMutationError(null);
  };

  const handleQualityChange = (index: number, quality: SaleReturnItemQuality) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], quality };
      return next;
    });
    setIdempotencyKey(crypto.randomUUID());
    setFieldErrors({});
    setMutationError(null);
  };

  const handleNotesChange = (index: number, notes: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], notes };
      return next;
    });
    setIdempotencyKey(crypto.randomUUID());
    setFieldErrors({});
    setMutationError(null);
  };

  const handleReasonChange = (value: string) => {
    setReason(value);
    setIdempotencyKey(crypto.randomUUID());
    setFieldErrors({});
    setMutationError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setMutationError(null);

    const validation = saleReturnSchema.safeParse({
      reason,
      items,
    });

    if (!validation.success) {
      const errors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const path = issue.path.join('.');
        errors[path] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    const selectedItems = items.filter((i) => i.selected);

    try {
      await mutation.mutateAsync({
        reason: reason.trim(),
        idempotencyKey,
        items: selectedItems.map((it) => ({
          saleItemId: it.saleItemId,
          quantityBase: it.quantityBase,
          quality: it.quality,
          notes: it.notes?.trim() || undefined,
        })),
      });
      onClose();
    } catch (err) {
      const parsed = parseSaleReturnError(err);
      setMutationError(parsed);
      if (parsed.isConflict && onRefetchSaleAndReturns) {
        await onRefetchSaleAndReturns();
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!mutation.isPending) onClose();
      }}
      title="Registrar devolución de venta"
      description={`Comprobante: ${sale.saleNumber}`}
      showCloseButton={!mutation.isPending}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="return-reason" className="block text-xs font-semibold text-slate-800">
            Motivo general de la devolución *
          </label>
          <textarea
            id="return-reason"
            rows={2}
            disabled={mutation.isPending}
            placeholder="Ingresá el motivo de la devolución (entre 3 y 255 caracteres)..."
            value={reason}
            onChange={(e) => handleReasonChange(e.target.value)}
            className="mt-1.5 block w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
          />
          {fieldErrors.reason && <p className="mt-1 text-xs text-rose-600">{fieldErrors.reason}</p>}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Seleccionar ítems a devolver
            </span>
            <span className="text-xs text-slate-500">
              {selectedCount} de {items.length} seleccionados
            </span>
          </div>

          {fieldErrors.items && (
            <p className="mb-2 text-xs font-semibold text-rose-600">{fieldErrors.items}</p>
          )}

          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {items.map((item, idx) => (
              <React.Fragment key={item.saleItemId}>
                <SaleReturnItemRow
                  item={item}
                  disabled={mutation.isPending}
                  onToggleSelect={(sel) => handleToggleSelect(idx, sel)}
                  onQuantityChange={(qty) => handleQuantityChange(idx, qty)}
                  onQualityChange={(q) => handleQualityChange(idx, q)}
                  onNotesChange={(n) => handleNotesChange(idx, n)}
                />
                {fieldErrors[`items.${idx}.quantityBase`] && (
                  <p className="px-2 text-xs text-rose-600">
                    {fieldErrors[`items.${idx}.quantityBase`]}
                  </p>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Destination & Summary explanation */}
        {selectedCount > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-2">
            <p className="font-semibold text-slate-800">Resumen de destinos:</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>{summary.aptoUnits}</strong> unidades ingresan a{' '}
                  <strong>stock disponible</strong>.
                </span>
              </div>
              <div className="flex items-center gap-2 text-amber-800">
                <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  <strong>{summary.noAptoUnits}</strong> unidades pasan a{' '}
                  <strong>cuarentena (no vendible)</strong>.
                </span>
              </div>
            </div>
            {sale.requiresFiscalInvoice && (
              <p className="text-slate-500 pt-1 border-t border-slate-200">
                * Se generará la Nota de Crédito correspondiente en estado pendiente de emisión.
              </p>
            )}
          </div>
        )}

        {/* Inline Error Display */}
        {mutationError && (
          <div
            role="alert"
            className={`rounded-xl border p-3 text-xs flex items-start gap-2.5 ${
              mutationError.isConflict
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            {mutationError.isConflict ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            )}
            <div>
              <p className="font-medium">{mutationError.message}</p>
              {mutationError.isAmbiguousNetworkError && (
                <p className="mt-1 text-[11px] text-slate-600">
                  Podés reintentar la operación de forma segura.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" disabled={mutation.isPending} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={mutation.isPending || selectedCount === 0}
            className="min-w-[160px]"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registrando…
              </>
            ) : (
              'Confirmar devolución'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
