import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Loader2, DollarSign, Package, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { productFormSchema, type ProductFormSchemaValues } from '../schemas/product.schema';
import { calculateSuggestedPrice, formatCurrency } from '../utils/products.math';
import { ProductConversionsGrid, type ConversionRowItem } from './ProductConversionsGrid';
import type { ICategory, IProduct, IUnit, ProductFormValues } from '../types/products.types';

interface ProductFormProps {
  mode: 'create' | 'edit';
  initialProduct?: IProduct | null;
  categories: ICategory[];
  units: IUnit[];
  onSubmit: (values: ProductFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  errorMessage?: string | null;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  mode,
  initialProduct,
  categories,
  units,
  onSubmit,
  onCancel,
  isSubmitting,
  errorMessage,
}) => {
  const isEdit = mode === 'edit';
  const hasExistingConversions = Boolean(
    isEdit && initialProduct?.conversions && initialProduct.conversions.length > 0,
  );

  const [localConversions, setLocalConversions] = useState<ConversionRowItem[]>([]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ProductFormSchemaValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      description: null,
      categoryId: '',
      baseUnitId: '',
      minStock: 0,
      costNet: 0,
      markupPercentage: null,
      activePriceNet: 0,
      conversions: [],
    },
  });

  // Populate form with initialProduct data in edit mode
  useEffect(() => {
    if (initialProduct) {
      const convs: ConversionRowItem[] = (initialProduct.conversions || []).map((c) => ({
        id: c.id,
        presentationUnitId: c.presentationUnitId,
        conversionFactor: c.conversionFactor,
      }));

      setLocalConversions(convs);

      reset({
        name: initialProduct.name,
        description: initialProduct.description || null,
        categoryId: initialProduct.categoryId,
        baseUnitId: initialProduct.baseUnitId,
        minStock: initialProduct.minStock,
        costNet: initialProduct.costNet,
        markupPercentage: initialProduct.markupPercentage ?? null,
        activePriceNet: initialProduct.activePriceNet,
        conversions: convs.map((c) => ({
          id: c.id,
          presentationUnitId: c.presentationUnitId,
          conversionFactor: Number(c.conversionFactor),
        })),
      });
    }
  }, [initialProduct, reset]);

  // Keep form state conversions in sync with localConversions
  const updateConversionsState = (updated: ConversionRowItem[]) => {
    setLocalConversions(updated);
    setValue(
      'conversions',
      updated.map((c) => ({
        id: c.id,
        presentationUnitId: c.presentationUnitId,
        conversionFactor: Number(c.conversionFactor) || 0,
      })),
      { shouldValidate: true, shouldDirty: true },
    );
  };

  const handleAddConversion = () => {
    updateConversionsState([...localConversions, { presentationUnitId: '', conversionFactor: '' }]);
  };

  const handleRemoveConversion = (index: number) => {
    const next = [...localConversions];
    next.splice(index, 1);
    updateConversionsState(next);
  };

  const handleUpdateConversion = (
    index: number,
    field: 'presentationUnitId' | 'conversionFactor',
    value: string | number,
  ) => {
    const next = [...localConversions];
    next[index] = { ...next[index], [field]: value };
    updateConversionsState(next);
  };

  // Watch fields for live suggested price feedback calculation
  const watchedCost = watch('costNet');
  const watchedMarkup = watch('markupPercentage');
  const watchedBaseUnitId = watch('baseUnitId');

  const liveSuggestedPrice = calculateSuggestedPrice(watchedCost, watchedMarkup);

  const handleFormSubmit = async (data: ProductFormSchemaValues) => {
    await onSubmit({
      ...data,
      conversions: localConversions.map((c) => ({
        id: c.id,
        presentationUnitId: c.presentationUnitId,
        conversionFactor: Number(c.conversionFactor),
      })),
    });
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-6 animate-in fade-in duration-200"
      noValidate
    >
      {errorMessage && (
        <div
          role="alert"
          className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center gap-2.5"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* SECTION 1: DATOS GENERALES */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Package className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Datos Generales
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Automatic Internal Code */}
          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-1">Código Interno</span>
            <div className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center gap-2 text-xs">
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {isEdit ? (
                <span className="font-mono font-semibold text-slate-700">
                  {initialProduct?.internalCode}
                </span>
              ) : (
                <span className="text-slate-500">
                  Se asignará automáticamente al guardar (P0001–P9999)
                </span>
              )}
            </div>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre Comercial *
            </label>
            <Input
              id="name"
              {...register('name')}
              disabled={isSubmitting}
              placeholder="Ej: Ibuprofeno 400mg x 10 comp"
              aria-invalid={Boolean(errors.name)}
              className="text-xs"
            />
            {errors.name && <p className="text-[11px] text-red-600 mt-1">{errors.name.message}</p>}
          </div>

          {/* Category */}
          <div>
            <label htmlFor="categoryId" className="block text-xs font-semibold text-slate-700 mb-1">
              Categoría *
            </label>
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <Select
                  id="categoryId"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors.categoryId)}
                  className="text-xs h-9"
                >
                  <option value="">Seleccionar categoría...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </Select>
              )}
            />
            {errors.categoryId && (
              <p className="text-[11px] text-red-600 mt-1">{errors.categoryId.message}</p>
            )}
          </div>

          {/* Base Unit */}
          <div>
            <label htmlFor="baseUnitId" className="block text-xs font-semibold text-slate-700 mb-1">
              Unidad Base *
            </label>
            <Controller
              name="baseUnitId"
              control={control}
              render={({ field }) => (
                <Select
                  id="baseUnitId"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={hasExistingConversions || isSubmitting}
                  aria-invalid={Boolean(errors.baseUnitId)}
                  className={`text-xs h-9 ${
                    hasExistingConversions ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="">Seleccionar unidad base...</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.symbol})
                    </option>
                  ))}
                </Select>
              )}
            />
            {hasExistingConversions ? (
              <p className="text-[10px] text-amber-700 mt-1">
                🔒 Para modificar la unidad base, primero elimina todas las conversiones registradas
                y guarda los cambios.
              </p>
            ) : errors.baseUnitId ? (
              <p className="text-[11px] text-red-600 mt-1">{errors.baseUnitId.message}</p>
            ) : null}
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-xs font-semibold text-slate-700 mb-1">
            Descripción / Indicación Clínica
          </label>
          <textarea
            id="description"
            {...register('description')}
            rows={2}
            disabled={isSubmitting}
            placeholder="Indicaciones terapéuticas, posología o detalles comerciales (opcional)"
            className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors placeholder:text-slate-400"
          />
          {errors.description && (
            <p className="text-[11px] text-red-600 mt-1">{errors.description.message}</p>
          )}
        </div>
      </div>

      {/* SECTION 2: CONFIGURACIÓN DE PRECIOS */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <DollarSign className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Configuración de Precios
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Cost Net */}
          <div>
            <label htmlFor="costNet" className="block text-xs font-semibold text-slate-700 mb-1">
              Costo Neto ($) *
            </label>
            <Input
              id="costNet"
              type="number"
              step="any"
              min="0"
              {...register('costNet')}
              disabled={isSubmitting}
              placeholder="0.00"
              aria-invalid={Boolean(errors.costNet)}
              className="text-xs font-mono"
            />
            {errors.costNet && (
              <p className="text-[11px] text-red-600 mt-1">{errors.costNet.message}</p>
            )}
          </div>

          {/* Markup Percentage */}
          <div>
            <label
              htmlFor="markupPercentage"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Markup (%) <span className="text-slate-400 font-normal">(Opcional)</span>
            </label>
            <Input
              id="markupPercentage"
              type="number"
              step="any"
              min="0"
              max="1000"
              {...register('markupPercentage')}
              disabled={isSubmitting}
              placeholder="Ej: 35.0"
              aria-invalid={Boolean(errors.markupPercentage)}
              className="text-xs font-mono"
            />
            {errors.markupPercentage && (
              <p className="text-[11px] text-red-600 mt-1">{errors.markupPercentage.message}</p>
            )}
          </div>

          {/* Suggested Price (Read Only Feedback) */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Precio Sugerido <span className="font-normal text-slate-400">(Feedback)</span>
            </label>
            <div className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center font-mono font-bold text-slate-700 text-xs select-none">
              {formatCurrency(liveSuggestedPrice)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Costo × (1 + Markup/100)</p>
          </div>

          {/* Active Selling Price */}
          <div>
            <label
              htmlFor="activePriceNet"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Precio Activo ($) *
            </label>
            <Input
              id="activePriceNet"
              type="number"
              step="any"
              min="0"
              {...register('activePriceNet')}
              disabled={isSubmitting}
              placeholder="0.00"
              aria-invalid={Boolean(errors.activePriceNet)}
              className="text-xs font-mono font-semibold text-slate-900 border-blue-300"
            />
            {errors.activePriceNet && (
              <p className="text-[11px] text-red-600 mt-1">{errors.activePriceNet.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3: STOCK */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Stock de Seguridad
          </h3>
        </div>

        <div className="max-w-xs">
          <label htmlFor="minStock" className="block text-xs font-semibold text-slate-700 mb-1">
            Stock Mínimo (Alerta de Reposición) *
          </label>
          <Input
            id="minStock"
            type="number"
            step="any"
            min="0"
            {...register('minStock')}
            disabled={isSubmitting}
            placeholder="0"
            aria-invalid={Boolean(errors.minStock)}
            className="text-xs font-mono"
          />
          {errors.minStock && (
            <p className="text-[11px] text-red-600 mt-1">{errors.minStock.message}</p>
          )}
        </div>
      </div>

      {/* SECTION 4: CONVERSIONES DE UNIDADES */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <ProductConversionsGrid
          conversions={localConversions}
          availableUnits={units}
          baseUnitId={watchedBaseUnitId}
          onAddRow={handleAddConversion}
          onRemoveRow={handleRemoveConversion}
          onUpdateRow={handleUpdateConversion}
          errors={errors}
          disabled={isSubmitting}
        />
        {errors.conversions && (
          <p className="text-xs text-red-600 mt-1">
            {(errors.conversions as any).message || 'Existen errores en la grilla de conversiones.'}
          </p>
        )}
      </div>

      {/* Form Submit & Cancel Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="text-xs text-slate-700"
        >
          Cancelar
        </Button>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
        >
          {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          <span>{isEdit ? 'Guardar Cambios' : 'Guardar Producto'}</span>
        </Button>
      </div>
    </form>
  );
};
