import React, { useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, SlidersHorizontal } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StockMovementType } from '@erp/shared-types';
import {
  stockAdjustmentSchema,
  type StockAdjustmentFormValues,
} from '../schemas/stock-adjustment.schema';
import { useStockAdjustmentMutation } from '../hooks/use-stock-adjustment-mutation';
import { parseStockApiError } from '../utils/stock.errors';

export interface StockAdjustmentModalProduct {
  productId: string;
  internalCode: string;
  productName: string;
  baseUnit: {
    id: string;
    name: string;
    symbol: string;
  };
  currentBaseStock: number;
}

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: StockAdjustmentModalProduct;
  onSuccess?: () => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  product,
  onSuccess,
}) => {
  const submittingRef = useRef(false);
  const {
    mutateAsync,
    reset: resetMutation,
    isPending,
    isError,
    error,
  } = useStockAdjustmentMutation();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<StockAdjustmentFormValues>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      productId: product.productId,
      movementType: StockMovementType.AJUSTE_ENTRADA,
      quantityBase: undefined,
      reason: '',
      documentReference: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      submittingRef.current = false;
      resetMutation();
      reset({
        productId: product.productId,
        movementType: StockMovementType.AJUSTE_ENTRADA,
        quantityBase: undefined,
        reason: '',
        documentReference: '',
      });
    }
  }, [isOpen, product.productId, reset, resetMutation]);

  const movementType = watch('movementType');
  const quantityBase = watch('quantityBase');

  const onSubmit = async (values: StockAdjustmentFormValues) => {
    if (submittingRef.current || isPending) {
      return;
    }

    submittingRef.current = true;

    try {
      await mutateAsync({
        productId: values.productId,
        movementType: values.movementType,
        quantityBase: Number(values.quantityBase),
        reason: values.reason.trim(),
        documentReference: values.documentReference ? values.documentReference.trim() : undefined,
      });

      onSuccess?.();
      onClose();
    } catch {
      // Error handled by mutation state and displayed in UI
    } finally {
      submittingRef.current = false;
    }
  };

  const isEntry = movementType === StockMovementType.AJUSTE_ENTRADA;
  const numQty = typeof quantityBase === 'number' && !isNaN(quantityBase) ? quantityBase : 0;
  const projectedStock = isEntry
    ? product.currentBaseStock + numQty
    : product.currentBaseStock - numQty;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isPending) {
          onClose();
        }
      }}
      title="Registrar Ajuste Manual de Stock"
      description={`Realiza un ajuste de inventario para ${product.productName} (${product.internalCode}).`}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
        {/* Product summary card */}
        <div className="bg-muted/40 rounded-lg p-3 border border-border flex items-center justify-between text-xs sm:text-sm">
          <div>
            <div className="font-semibold text-foreground">{product.productName}</div>
            <div className="text-muted-foreground font-mono text-xs">
              {product.internalCode} &bull; Unidad: {product.baseUnit.name} (
              {product.baseUnit.symbol})
            </div>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground text-xs block">Stock actual</span>
            <span className="font-bold text-foreground">
              {product.currentBaseStock.toLocaleString('es-AR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              {product.baseUnit.symbol}
            </span>
          </div>
        </div>

        {/* Mutation error banner */}
        {isError && (
          <div
            role="alert"
            data-testid="stock-adjustment-error-banner"
            className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-xs font-medium"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{parseStockApiError(error)}</span>
          </div>
        )}

        <input type="hidden" {...register('productId')} />

        {/* Movement type selector */}
        <div>
          <label
            htmlFor="adjustment-movementType"
            className="block text-xs font-medium text-foreground mb-1"
          >
            Tipo de Movimiento <span className="text-destructive">*</span>
          </label>
          <Select
            id="adjustment-movementType"
            {...register('movementType')}
            aria-label="Tipo de Movimiento"
            className="text-sm"
          >
            <option value={StockMovementType.AJUSTE_ENTRADA}>
              Ajuste de Entrada (+) — Incrementa saldo
            </option>
            <option value={StockMovementType.AJUSTE_SALIDA}>
              Ajuste de Salida (-) — Descuenta saldo
            </option>
            <option value={StockMovementType.MERMA}>
              Merma / Pérdida (-) — Descuenta por daño o vencimiento
            </option>
          </Select>
          {errors.movementType && (
            <p className="text-xs text-destructive mt-1">{errors.movementType.message}</p>
          )}
        </div>

        {/* Quantity */}
        <div>
          <label
            htmlFor="adjustment-quantity"
            className="block text-xs font-medium text-foreground mb-1"
          >
            Cantidad ({product.baseUnit.symbol}) <span className="text-destructive">*</span>
          </label>
          <Input
            id="adjustment-quantity"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            {...register('quantityBase', { valueAsNumber: true })}
            aria-label="Cantidad a ajustar"
            className="text-sm"
          />
          {errors.quantityBase && (
            <p className="text-xs text-destructive mt-1">{errors.quantityBase.message}</p>
          )}
        </div>

        {/* Calculation helper note */}
        {numQty > 0 && (
          <div
            data-testid="stock-adjustment-calc-helper"
            className="text-xs p-2.5 rounded bg-muted/60 text-muted-foreground border border-border"
          >
            {isEntry ? (
              <span>
                Se sumarán{' '}
                <strong>
                  {numQty.toLocaleString('es-AR', { minimumFractionDigits: 2 })}{' '}
                  {product.baseUnit.symbol}
                </strong>{' '}
                al stock actual. Nuevo saldo proyectado:{' '}
                <strong>
                  {projectedStock.toLocaleString('es-AR', { minimumFractionDigits: 2 })}{' '}
                  {product.baseUnit.symbol}
                </strong>
                .
              </span>
            ) : (
              <span>
                Se descontarán{' '}
                <strong>
                  {numQty.toLocaleString('es-AR', { minimumFractionDigits: 2 })}{' '}
                  {product.baseUnit.symbol}
                </strong>{' '}
                del stock disponible. Nuevo saldo proyectado:{' '}
                <strong>
                  {projectedStock.toLocaleString('es-AR', { minimumFractionDigits: 2 })}{' '}
                  {product.baseUnit.symbol}
                </strong>
                .
              </span>
            )}
          </div>
        )}

        {/* Reason / Justification */}
        <div>
          <label
            htmlFor="adjustment-reason"
            className="block text-xs font-medium text-foreground mb-1"
          >
            Motivo / Justificación <span className="text-destructive">*</span>
          </label>
          <textarea
            id="adjustment-reason"
            rows={3}
            maxLength={500}
            placeholder="Describe el motivo del ajuste (ej. corrección por conteo físico)..."
            {...register('reason')}
            aria-label="Motivo del ajuste"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {errors.reason && (
            <p className="text-xs text-destructive mt-1">{errors.reason.message}</p>
          )}
        </div>

        {/* Document reference */}
        <div>
          <label
            htmlFor="adjustment-docRef"
            className="block text-xs font-medium text-foreground mb-1"
          >
            Referencia Documental (Opcional)
          </label>
          <Input
            id="adjustment-docRef"
            type="text"
            maxLength={100}
            placeholder="Ej. ACTA-2026-001, INFORME-DAÑO"
            {...register('documentReference')}
            aria-label="Referencia documental opcional"
            className="text-sm"
          />
          {errors.documentReference && (
            <p className="text-xs text-destructive mt-1">{errors.documentReference.message}</p>
          )}
        </div>

        {/* Modal actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="text-xs h-9"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending} className="text-xs h-9 font-semibold">
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
            {isPending ? 'Registrando...' : 'Confirmar ajuste'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
