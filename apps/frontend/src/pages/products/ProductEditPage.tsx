import React, { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Edit3, ArrowLeft, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductForm } from '@/features/products/components/ProductForm';
import { useCategoriesQuery } from '@/features/categories/hooks/use-categories-query';
import { useUnitsQuery } from '@/features/units/hooks/use-units-query';
import { useProductDetailQuery } from '@/features/products/hooks/use-product-detail-query';
import { useReconcileProductEditMutation } from '@/features/products/hooks/use-product-mutations';
import { parseProductApiError } from '@/features/products/utils/products.errors';
import type {
  ProductFormValues,
  UpdateProductPayload,
} from '@/features/products/types/products.types';
import { ProductTaxTreatment } from '@erp/shared-types';

export const ProductEditPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { id?: string };
  const productId = params.id;

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    data: product,
    isLoading: isProductLoading,
    isError: isProductError,
    error: productError,
    refetch: refetchProduct,
  } = useProductDetailQuery(productId);

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

  const reconcileMutation = useReconcileProductEditMutation();

  const handleCancel = () => {
    navigate({ to: '/products', search: { page: 1, limit: 10 } });
  };

  const handleSubmit = async (values: ProductFormValues) => {
    if (!product || !productId) return;

    setErrorMessage(null);

    // 1. Calculate base product delta
    const delta: UpdateProductPayload = {};
    let hasProductChanges = false;

    if (values.name.trim() !== product.name) {
      delta.name = values.name.trim();
      hasProductChanges = true;
    }

    const currentDesc =
      values.description && values.description.trim() !== '' ? values.description.trim() : null;
    const initialDesc =
      product.description && product.description.trim() !== '' ? product.description.trim() : null;
    if (currentDesc !== initialDesc) {
      delta.description = currentDesc;
      hasProductChanges = true;
    }

    if (values.categoryId !== product.categoryId) {
      delta.categoryId = values.categoryId;
      hasProductChanges = true;
    }

    if (values.baseUnitId !== product.baseUnitId) {
      delta.baseUnitId = values.baseUnitId;
      hasProductChanges = true;
    }

    if (Number(values.minStock) !== Number(product.minStock)) {
      delta.minStock = Number(values.minStock);
      hasProductChanges = true;
    }

    if (Number(values.costNet) !== Number(product.costNet)) {
      delta.costNet = Number(values.costNet);
      hasProductChanges = true;
    }

    const currentMarkup =
      values.markupPercentage !== null &&
      values.markupPercentage !== undefined &&
      values.markupPercentage !== ('' as any)
        ? Number(values.markupPercentage)
        : null;
    const initialMarkup =
      product.markupPercentage !== null && product.markupPercentage !== undefined
        ? Number(product.markupPercentage)
        : null;

    if (currentMarkup !== initialMarkup) {
      delta.markupPercentage = currentMarkup;
      hasProductChanges = true;
    }

    if (Number(values.activePriceNet) !== Number(product.activePriceNet)) {
      delta.activePriceNet = Number(values.activePriceNet);
      hasProductChanges = true;
    }

    if (values.taxTreatment !== product.taxTreatment) {
      delta.taxTreatment = values.taxTreatment;
      if (values.taxTreatment === ProductTaxTreatment.GRAVADO) {
        delta.ivaPercentage = values.ivaPercentage;
      }
      hasProductChanges = true;
    } else if (
      values.taxTreatment === ProductTaxTreatment.GRAVADO &&
      Number(values.ivaPercentage) !== Number(product.ivaPercentage)
    ) {
      delta.ivaPercentage = values.ivaPercentage;
      hasProductChanges = true;
    }

    // 2. Check for conversion changes
    const initialConversions = product.conversions || [];
    const currentConversions = values.conversions || [];

    let hasConversionChanges = initialConversions.length !== currentConversions.length;

    if (!hasConversionChanges) {
      for (const current of currentConversions) {
        const matchingInitial = initialConversions.find((i) => i.id === current.id);
        if (
          !matchingInitial ||
          matchingInitial.presentationUnitId !== current.presentationUnitId ||
          Number(matchingInitial.conversionFactor) !== Number(current.conversionFactor)
        ) {
          hasConversionChanges = true;
          break;
        }
      }
    }

    // 3. No-op detection
    if (!hasProductChanges && !hasConversionChanges) {
      setErrorMessage('No se detectaron modificaciones en los datos del producto.');
      return;
    }

    // 4. Execute sequential reconciliation
    try {
      await reconcileMutation.mutateAsync({
        productId,
        productDelta: hasProductChanges ? delta : null,
        initialConversions,
        currentConversions,
      });

      navigate({
        to: '/products',
        search: () => ({ notice: 'updated' as const, page: 1, limit: 10 }),
      });
    } catch (err) {
      setErrorMessage(parseProductApiError(err));
    }
  };

  if (isProductLoading || isCategoriesLoading || isUnitsLoading) {
    return (
      <div className="max-w-4xl mx-auto p-12 flex flex-col items-center justify-center text-slate-400 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="text-xs">Cargando datos del producto...</span>
      </div>
    );
  }

  if (isProductError || isCategoriesError || isUnitsError || !product) {
    return (
      <div className="max-w-xl mx-auto mt-8 p-6 bg-white rounded-xl border border-red-200 shadow-sm text-center space-y-4">
        <div className="p-3 bg-red-50 text-red-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">No se pudo cargar el producto</h2>
          <p className="text-xs text-slate-500 mt-1">
            {parseProductApiError(productError || categoriesError || unitsError)}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (isProductError) void refetchProduct();
            if (isCategoriesError) void refetchCategories();
            if (isUnitsError) void refetchUnits();
          }}
          className="text-xs border-slate-200"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Reintentar
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
          Volver al Catálogo
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
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Editar Producto /{' '}
              <span className="font-mono text-blue-700">{product.internalCode}</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Modifica los datos comerciales, precios y conversiones de este producto
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
        mode="edit"
        initialProduct={product}
        categories={categories}
        units={units}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={reconcileMutation.isPending}
        errorMessage={errorMessage}
      />
    </div>
  );
};
