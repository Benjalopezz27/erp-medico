import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { PackagePlus, ArrowLeft, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductForm } from '@/features/products/components/ProductForm';
import { useCategoriesQuery } from '@/features/categories/hooks/use-categories-query';
import { useUnitsQuery } from '@/features/units/hooks/use-units-query';
import { useCreateProductMutation } from '@/features/products/hooks/use-product-mutations';
import { parseProductApiError } from '@/features/products/utils/products.errors';
import type {
  CreateProductPayload,
  ProductFormValues,
} from '@/features/products/types/products.types';

export const ProductCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    data: categories = [],
    isLoading: isCategoriesLoading,
    isError: isCategoriesError,
    error: categoriesError,
    refetch: refetchCategories,
  } = useCategoriesQuery();
  const {
    data: units = [],
    isLoading: isUnitsLoading,
    isError: isUnitsError,
    error: unitsError,
    refetch: refetchUnits,
  } = useUnitsQuery();

  const createMutation = useCreateProductMutation();

  const handleCancel = () => {
    navigate({ to: '/products', search: { page: 1, limit: 10 } });
  };

  const handleSubmit = async (values: ProductFormValues) => {
    setErrorMessage(null);
    try {
      const payload: CreateProductPayload = {
        name: values.name.trim(),
        description: values.description || null,
        categoryId: values.categoryId,
        baseUnitId: values.baseUnitId,
        minStock: Number(values.minStock) || 0,
        costNet: Number(values.costNet),
        markupPercentage:
          values.markupPercentage !== null &&
          values.markupPercentage !== undefined &&
          values.markupPercentage !== ('' as any)
            ? Number(values.markupPercentage)
            : null,
        activePriceNet: Number(values.activePriceNet),
        conversions:
          values.conversions && values.conversions.length > 0
            ? values.conversions.map((c) => ({
                presentationUnitId: c.presentationUnitId,
                conversionFactor: Number(c.conversionFactor),
              }))
            : undefined,
      };

      await createMutation.mutateAsync(payload);
      navigate({
        to: '/products',
        search: () => ({ notice: 'created' as const, page: 1, limit: 10 }),
      });
    } catch (err) {
      setErrorMessage(parseProductApiError(err));
    }
  };

  if (isCategoriesLoading || isUnitsLoading) {
    return (
      <div className="max-w-4xl mx-auto p-12 flex flex-col items-center justify-center text-slate-400 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="text-xs">Cargando datos maestros para el formulario...</span>
      </div>
    );
  }

  if (isCategoriesError || isUnitsError) {
    return (
      <div className="max-w-xl mx-auto mt-8 p-6 bg-white rounded-xl border border-red-200 shadow-sm text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
        <div>
          <h2 className="text-sm font-bold text-slate-900">No se pudo preparar el formulario</h2>
          <p className="text-xs text-slate-500 mt-1">
            {parseProductApiError(categoriesError || unitsError)}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            void refetchCategories();
            void refetchUnits();
          }}
          className="text-xs gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg shrink-0">
            <PackagePlus className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Nuevo Producto</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Crea un nuevo producto en el catálogo médico con sus precios y factores de conversión
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCancel}
          className="text-xs text-slate-600 border-slate-200 gap-1.5 self-start sm:self-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al Catálogo</span>
        </Button>
      </div>

      {/* Form */}
      <ProductForm
        mode="create"
        categories={categories}
        units={units}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={createMutation.isPending}
        errorMessage={errorMessage}
      />
    </div>
  );
};
