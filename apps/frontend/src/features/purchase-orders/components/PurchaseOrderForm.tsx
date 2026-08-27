import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, Send, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ActiveSupplierSelector } from './ActiveSupplierSelector';
import { SupplierProductSearchInput } from './SupplierProductSearchInput';
import { SupplierChangeConfirmModal } from './SupplierChangeConfirmModal';
import { PurchaseOrderItemsTable } from './PurchaseOrderItemsTable';
import { purchaseOrderFormSchema } from '../schemas/purchase-order.schema';
import type { IPurchaseOrderFormData } from '../types/purchase-orders.types';
import type { ISupplierProduct } from '@/features/supplier-products/types/supplier-products.types';

import type { ISupplier } from '@/features/suppliers/types/suppliers.types';

export interface PurchaseOrderFormProps {
  initialData?: Partial<IPurchaseOrderFormData>;
  currentSupplier?: {
    id: string;
    businessName: string;
    cuit: string;
    isActive: boolean;
  } | null;
  onSaveDraft: (data: IPurchaseOrderFormData) => void;
  onSaveAndEmit?: (data: IPurchaseOrderFormData) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  isSavingAndEmitting?: boolean;
  showSaveAndEmit?: boolean;
  isEditMode?: boolean;
}

export const PurchaseOrderForm: React.FC<PurchaseOrderFormProps> = ({
  initialData,
  currentSupplier,
  onSaveDraft,
  onSaveAndEmit,
  onCancel,
  isSubmitting = false,
  isSavingAndEmitting = false,
  showSaveAndEmit = true,
  isEditMode = false,
}) => {
  const [pendingSupplier, setPendingSupplier] = useState<{
    id: string;
    supplier: ISupplier;
  } | null>(null);
  const [isConfirmSupplierOpen, setIsConfirmSupplierOpen] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<IPurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderFormSchema) as any,
    defaultValues: {
      supplierId: initialData?.supplierId || '',
      expectedDeliveryDate: initialData?.expectedDeliveryDate || '',
      notes: initialData?.notes || '',
      items: initialData?.items || [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'items',
  });

  const selectedSupplierId = watch('supplierId');
  const watchItems = watch('items') || [];

  // Protect against accidental navigation with dirty form
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !isSubmitting && !isSavingAndEmitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, isSubmitting, isSavingAndEmitting]);

  const handleSupplierSelect = (supplierId: string, supplier: ISupplier) => {
    if (supplierId === selectedSupplierId) return;

    if (fields.length > 0) {
      setPendingSupplier({ id: supplierId, supplier });
      setIsConfirmSupplierOpen(true);
    } else {
      setValue('supplierId', supplierId, { shouldDirty: true, shouldValidate: true });
    }
  };

  const handleConfirmSupplierChange = () => {
    if (pendingSupplier) {
      setValue('supplierId', pendingSupplier.id, {
        shouldDirty: true,
        shouldValidate: true,
      });
      replace([]); // Clear all lines
      setPendingSupplier(null);
    }
    setIsConfirmSupplierOpen(false);
  };

  const handleCancelSupplierChange = () => {
    setPendingSupplier(null);
    setIsConfirmSupplierOpen(false);
  };

  const handleProductSelect = (sp: ISupplierProduct) => {
    const existingIndex = fields.findIndex((f: any) => f.supplierProductId === sp.id);
    if (existingIndex >= 0) return;

    const usualCostString =
      sp.usualCostNet !== null && sp.usualCostNet !== undefined ? String(sp.usualCostNet) : '';

    append({
      supplierProductId: sp.id,
      productId: sp.productId,
      productInternalCode: sp.product?.internalCode || '',
      productName: sp.product?.name || '',
      supplierSku: sp.supplierExternalCode,
      purchaseUnitName: sp.purchaseUnit?.name || '',
      purchaseUnitSymbol: sp.purchaseUnit?.symbol || 'UN',
      conversionFactorToBase: Number(sp.conversionFactorToBase) || 1,
      baseUnitSymbol: sp.product?.baseUnit?.symbol || 'UN',
      usualCostNet: sp.usualCostNet,
      orderedQty: '1',
      expectedCostUnitNet: usualCostString,
    });
  };

  const disabledSupplierProductIds = fields.map((f: any) => f.supplierProductId);

  const isBusy = isSubmitting || isSavingAndEmitting;

  return (
    <form className="space-y-6">
      {/* Header Fields Card */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
          Datos Principales
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Active Supplier Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Proveedor <span className="text-rose-500">*</span>
            </label>
            <ActiveSupplierSelector
              value={selectedSupplierId}
              currentSupplier={currentSupplier}
              onChange={handleSupplierSelect}
              disabled={isBusy}
              error={errors.supplierId?.message}
            />
          </div>

          {/* Expected Delivery Date */}
          <div>
            <label
              htmlFor="expectedDeliveryDate"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Fecha esperada de entrega (opcional)
            </label>
            <Input
              id="expectedDeliveryDate"
              type="date"
              {...register('expectedDeliveryDate')}
              disabled={isBusy}
              className="h-9 text-xs"
              aria-label="Fecha esperada de entrega"
            />
            {errors.expectedDeliveryDate && (
              <p className="text-[11px] text-red-600 font-medium mt-1">
                {errors.expectedDeliveryDate.message}
              </p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="order-notes"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Notas u Observaciones (opcional)
          </label>
          <textarea
            id="order-notes"
            {...register('notes')}
            disabled={isBusy}
            placeholder="Instrucciones de entrega, observaciones sobre embalaje, etc..."
            rows={2}
            className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400"
          />
          {errors.notes && (
            <p className="text-[11px] text-red-600 font-medium mt-1">{errors.notes.message}</p>
          )}
        </div>
      </div>

      {/* Catalog Search & Order Items Card */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Detalle de Ítems
            </h3>
            <p className="text-xs text-slate-400">
              Busque y agregue productos del catálogo del proveedor seleccionado.
            </p>
          </div>
        </div>

        {/* Catalog Selector */}
        <div>
          <SupplierProductSearchInput
            supplierId={selectedSupplierId}
            onSelect={handleProductSelect}
            disabledSupplierProductIds={disabledSupplierProductIds}
            disabled={isBusy}
          />
        </div>

        {/* Form Validation Errors for Items Array */}
        {errors.items?.root && (
          <p className="text-xs text-red-600 font-medium">{errors.items.root.message}</p>
        )}
        {errors.items?.message && (
          <p className="text-xs text-red-600 font-medium">{errors.items.message}</p>
        )}

        {/* Items Table */}
        <PurchaseOrderItemsTable
          fields={fields as any}
          remove={remove}
          register={register}
          errors={errors}
          watchItems={watchItems}
          disabled={isBusy}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isBusy}
              className="text-xs flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{isEditMode ? 'Cancelar Edición' : 'Volver'}</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleSubmit(onSaveDraft)}
            disabled={isBusy}
            className="text-xs flex items-center gap-1.5 font-semibold"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>
              {isSubmitting ? 'Guardando...' : isEditMode ? 'Guardar Cambios' : 'Guardar Borrador'}
            </span>
          </Button>

          {showSaveAndEmit && onSaveAndEmit && (
            <Button
              type="button"
              variant="default"
              onClick={handleSubmit(onSaveAndEmit)}
              disabled={isBusy}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 font-semibold shadow-sm"
            >
              {isSavingAndEmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{isSavingAndEmitting ? 'Guardando y emitiendo...' : 'Guardar y Emitir'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Supplier Change */}
      <SupplierChangeConfirmModal
        isOpen={isConfirmSupplierOpen}
        onConfirm={handleConfirmSupplierChange}
        onCancel={handleCancelSupplierChange}
      />
    </form>
  );
};
