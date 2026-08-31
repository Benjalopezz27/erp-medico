import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Info, Loader2, Package } from 'lucide-react';
import { ProductSearchInput } from '@/features/products/components/ProductSearchInput';
import { useUnitsQuery } from '@/features/units/hooks/use-units-query';
import {
  supplierProductFormSchema,
  type SupplierProductFormData,
} from '../schemas/supplier-product.schema';
import type { IProductSummary } from '@/features/products/types/products.types';
import type { ISupplierProduct } from '../types/supplier-products.types';
import { ProductTaxTreatment } from '@erp/shared-types';

interface SupplierProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SupplierProductFormData) => void;
  supplierProduct: ISupplierProduct | null; // null for Create, populated for Edit
  isLoading: boolean;
  errorMessage?: string | null;
}

export const SupplierProductFormModal: React.FC<SupplierProductFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  supplierProduct,
  isLoading,
  errorMessage,
}) => {
  const isEditMode = Boolean(supplierProduct);
  const { data: units = [], isLoading: isLoadingUnits } = useUnitsQuery();

  const [selectedProduct, setSelectedProduct] = useState<IProductSummary | null>(
    supplierProduct?.product
      ? {
          id: supplierProduct.product.id,
          internalCode: supplierProduct.product.internalCode,
          name: supplierProduct.product.name,
          baseUnit: supplierProduct.product.baseUnit,
          currentStock: null,
          activePriceNet: 0,
          taxTreatment: ProductTaxTreatment.GRAVADO,
          ivaPercentage: 21,
        }
      : null,
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<SupplierProductFormData>({
    resolver: zodResolver(supplierProductFormSchema),
    defaultValues: {
      productId: supplierProduct?.productId ?? '',
      baseUnitId: supplierProduct?.product?.baseUnit?.id ?? '',
      supplierExternalCode: supplierProduct?.supplierExternalCode ?? '',
      supplierDescription: supplierProduct?.supplierDescription ?? '',
      purchaseUnitId: supplierProduct?.purchaseUnitId ?? '',
      conversionFactorToBase: supplierProduct ? Number(supplierProduct.conversionFactorToBase) : 1,
      usualCostNet:
        supplierProduct?.usualCostNet !== null && supplierProduct?.usualCostNet !== undefined
          ? Number(supplierProduct.usualCostNet)
          : null,
      isPrimarySupplier: supplierProduct?.isPrimarySupplier ?? false,
    },
  });

  const watchPurchaseUnitId = watch('purchaseUnitId');
  const watchConversionFactor = watch('conversionFactorToBase');
  const watchIsPrimary = watch('isPrimarySupplier');

  // Synchronize initial form values on open / change of entity
  useEffect(() => {
    if (isOpen) {
      if (supplierProduct) {
        const prodSummary: IProductSummary = {
          id: supplierProduct.productId,
          internalCode: supplierProduct.product?.internalCode || '',
          name: supplierProduct.product?.name || '',
          baseUnit: supplierProduct.product?.baseUnit || {
            id: '',
            name: '',
            symbol: '',
          },
          currentStock: null,
          activePriceNet: 0,
          taxTreatment: ProductTaxTreatment.GRAVADO,
          ivaPercentage: 21,
        };
        setSelectedProduct(prodSummary);
        reset({
          productId: supplierProduct.productId,
          baseUnitId: supplierProduct.product?.baseUnit?.id || '',
          supplierExternalCode: supplierProduct.supplierExternalCode,
          supplierDescription: supplierProduct.supplierDescription ?? '',
          purchaseUnitId: supplierProduct.purchaseUnitId,
          conversionFactorToBase: Number(supplierProduct.conversionFactorToBase),
          usualCostNet:
            supplierProduct.usualCostNet !== null && supplierProduct.usualCostNet !== undefined
              ? Number(supplierProduct.usualCostNet)
              : null,
          isPrimarySupplier: supplierProduct.isPrimarySupplier,
        });
      } else {
        setSelectedProduct(null);
        reset({
          productId: '',
          baseUnitId: '',
          supplierExternalCode: '',
          supplierDescription: '',
          purchaseUnitId: '',
          conversionFactorToBase: 1,
          usualCostNet: null,
          isPrimarySupplier: false,
        });
      }
    }
  }, [isOpen, supplierProduct, reset]);

  // Handle product selection change in Create mode
  const handleProductSelect = (product: IProductSummary | null) => {
    setSelectedProduct(product);
    if (product) {
      setValue('productId', product.id, { shouldValidate: true });
      setValue('baseUnitId', product.baseUnit.id);
      // Default purchase unit to product base unit if not set
      if (!watchPurchaseUnitId) {
        setValue('purchaseUnitId', product.baseUnit.id, {
          shouldValidate: true,
        });
        setValue('conversionFactorToBase', 1, { shouldValidate: true });
      } else if (watchPurchaseUnitId === product.baseUnit.id) {
        setValue('conversionFactorToBase', 1, { shouldValidate: true });
      }
    } else {
      setValue('productId', '', { shouldValidate: true });
      setValue('baseUnitId', '');
    }
  };

  // Effect: When purchaseUnit matches product base unit, force and lock factor to 1
  const isBaseUnitSelected =
    Boolean(selectedProduct?.baseUnit?.id) && watchPurchaseUnitId === selectedProduct?.baseUnit?.id;

  useEffect(() => {
    if (isBaseUnitSelected) {
      setValue('conversionFactorToBase', 1, { shouldValidate: true });
    }
  }, [isBaseUnitSelected, setValue]);

  const selectedPurchaseUnitObj = units.find((u) => u.id === watchPurchaseUnitId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Editar Asociación de Catálogo' : 'Asociar Producto al Catálogo'}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Product selection (Autocomplete in Create, Readonly in Edit) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Producto Interno <span className="text-rose-500">*</span>
          </label>
          {isEditMode ? (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {selectedProduct?.internalCode}
                </span>
                <span className="text-slate-600 dark:text-slate-300">
                  — {selectedProduct?.name}
                </span>
              </div>
              <span className="text-xs px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-300">
                Unidad Base: {selectedProduct?.baseUnit.name} ({selectedProduct?.baseUnit.symbol})
              </span>
            </div>
          ) : (
            <div>
              <ProductSearchInput
                value={selectedProduct}
                onSelect={handleProductSelect}
                placeholder="Buscar por código (ej: P0001) o nombre del producto..."
                disabled={isLoading}
              />
              {selectedProduct && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-blue-500" />
                  Unidad base interna:{' '}
                  <strong>
                    {selectedProduct.baseUnit.name} ({selectedProduct.baseUnit.symbol})
                  </strong>
                </p>
              )}
              {errors.productId && (
                <p className="mt-1 text-xs text-rose-500">{errors.productId.message}</p>
              )}
            </div>
          )}
        </div>

        {/* SKU and External Description */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="supplierExternalCode"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Código / SKU de Proveedor <span className="text-rose-500">*</span>
            </label>
            <Input
              id="supplierExternalCode"
              placeholder="ej: PROV-MED-009"
              {...register('supplierExternalCode')}
              disabled={isLoading}
            />
            {errors.supplierExternalCode && (
              <p className="text-xs text-rose-500">{errors.supplierExternalCode.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="supplierDescription"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Descripción del Proveedor (Opcional)
            </label>
            <Input
              id="supplierDescription"
              placeholder="ej: Presentación Caja x 10 ampollas"
              {...register('supplierDescription')}
              disabled={isLoading}
            />
            {errors.supplierDescription && (
              <p className="text-xs text-rose-500">{errors.supplierDescription.message}</p>
            )}
          </div>
        </div>

        {/* Purchase Unit and Conversion Factor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="purchaseUnitId"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Unidad de Compra <span className="text-rose-500">*</span>
            </label>
            <Controller
              name="purchaseUnitId"
              control={control}
              render={({ field }) => (
                <select
                  id="purchaseUnitId"
                  value={field.value}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                    if (selectedProduct && e.target.value === selectedProduct.baseUnit.id) {
                      setValue('conversionFactorToBase', 1, {
                        shouldValidate: true,
                      });
                    }
                  }}
                  disabled={isLoading || isLoadingUnits}
                  className="w-full h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccione una unidad...</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.symbol})
                      {selectedProduct && unit.id === selectedProduct.baseUnit.id
                        ? ' — Unidad Base'
                        : ''}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.purchaseUnitId && (
              <p className="text-xs text-rose-500">{errors.purchaseUnitId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="conversionFactorToBase"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Factor de Conversión a Unidad Base <span className="text-rose-500">*</span>
            </label>
            <Input
              id="conversionFactorToBase"
              type="number"
              step="0.0001"
              placeholder="ej: 10"
              disabled={isLoading || isBaseUnitSelected}
              {...register('conversionFactorToBase', { valueAsNumber: true })}
            />
            {isBaseUnitSelected ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Fijado en 1 porque coincide con la unidad base del producto.
              </p>
            ) : selectedProduct && selectedPurchaseUnitObj ? (
              <p className="text-xs text-blue-600 dark:text-blue-400">
                1 {selectedPurchaseUnitObj.name} = {watchConversionFactor || 1}{' '}
                {selectedProduct.baseUnit.symbol}
              </p>
            ) : null}
            {errors.conversionFactorToBase && (
              <p className="text-xs text-rose-500">{errors.conversionFactorToBase.message}</p>
            )}
          </div>
        </div>

        {/* Usual Cost */}
        <div className="space-y-1.5">
          <label
            htmlFor="usualCostNet"
            className="text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Costo Neto Habitual (Opcional)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              $
            </span>
            <Input
              id="usualCostNet"
              type="number"
              step="0.0001"
              placeholder="ej: 1500.50"
              className="pl-7"
              disabled={isLoading}
              {...register('usualCostNet', {
                setValueAs: (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
              })}
            />
          </div>
          {errors.usualCostNet && (
            <p className="text-xs text-rose-500">{errors.usualCostNet.message}</p>
          )}
        </div>

        {/* Primary Supplier Checkbox */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPrimarySupplier"
              disabled={isLoading}
              {...register('isPrimarySupplier')}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <label
              htmlFor="isPrimarySupplier"
              className="text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              Marcar como Proveedor Habitual de este producto
            </label>
          </div>
          {watchIsPrimary && (
            <p className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1.5 pl-6">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                Si ya existe otro proveedor habitual asignado a este producto, será desmarcado
                automáticamente y se registrará en la auditoría.
              </span>
            </p>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading} className="gap-2">
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEditMode ? 'Guardar Cambios' : 'Asociar Producto'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
