import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { MarkupLevel, type ICategory } from '@erp/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ProductSearchInput } from '@/features/products/components/ProductSearchInput';
import type { IProductSummary } from '@/features/products/types/products.types';
import { useCreateMarkupMutation, useUpdateMarkupMutation } from '../hooks/use-markup-mutations';
import type { IMarkupConfiguration } from '../types/markups.types';
import { parseMarkupError } from '../utils/markups.errors';
import { normalizeMarkupPercentage } from '../utils/markups.validation';

interface MarkupFormModalProps {
  isOpen: boolean;
  level: MarkupLevel;
  configuration?: IMarkupConfiguration | null;
  configurations: IMarkupConfiguration[];
  categories: ICategory[];
  onClose: () => void;
  onSuccess: (message: string) => void;
  onRefresh: () => void;
}

const levelName: Record<MarkupLevel, string> = {
  [MarkupLevel.GLOBAL]: 'global',
  [MarkupLevel.CATEGORY]: 'por categoría',
  [MarkupLevel.PRODUCT]: 'por producto',
};

export function MarkupFormModal({
  isOpen,
  level,
  configuration,
  configurations,
  categories,
  onClose,
  onSuccess,
  onRefresh,
}: MarkupFormModalProps) {
  const createMutation = useCreateMarkupMutation();
  const updateMutation = useUpdateMarkupMutation();
  const [percentage, setPercentage] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [product, setProduct] = useState<IProductSummary | null>(null);
  const [serverError, setServerError] = useState<string>();
  const [canRefresh, setCanRefresh] = useState(false);
  const isEditing = Boolean(configuration);
  const isPending = createMutation.isPending || updateMutation.isPending;
  const validation = useMemo(() => normalizeMarkupPercentage(percentage), [percentage]);
  const configuredCategoryIds = useMemo(
    () =>
      new Set(
        configurations
          .filter((row) => row.level === MarkupLevel.CATEGORY && row.id !== configuration?.id)
          .map((row) => row.categoryId)
          .filter((id): id is string => Boolean(id)),
      ),
    [configuration?.id, configurations],
  );
  const configuredProductIds = useMemo(
    () =>
      configurations
        .filter((row) => row.level === MarkupLevel.PRODUCT && row.id !== configuration?.id)
        .map((row) => row.productId)
        .filter((id): id is string => Boolean(id)),
    [configuration?.id, configurations],
  );

  useEffect(() => {
    if (!isOpen) return;
    setPercentage(configuration?.percentage ?? '');
    setCategoryId(configuration?.categoryId ?? '');
    setProduct(null);
    setServerError(undefined);
    setCanRefresh(false);
  }, [configuration, isOpen]);

  const close = () => {
    if (!isPending) onClose();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isPending) return;
    setServerError(undefined);
    setCanRefresh(false);
    if (!validation.success || !validation.value) {
      setServerError(validation.message);
      return;
    }
    if (!isEditing && level === MarkupLevel.CATEGORY && !categoryId) {
      setServerError('Seleccione una categoría.');
      return;
    }
    if (!isEditing && level === MarkupLevel.PRODUCT && !product) {
      setServerError('Seleccione un producto activo.');
      return;
    }
    try {
      if (configuration) {
        await updateMutation.mutateAsync({
          id: configuration.id,
          payload: { percentage: validation.value },
        });
      } else {
        await createMutation.mutateAsync({
          level,
          percentage: validation.value,
          ...(level === MarkupLevel.CATEGORY ? { categoryId } : {}),
          ...(level === MarkupLevel.PRODUCT ? { productId: product!.id } : {}),
        });
      }
      onSuccess(
        configuration
          ? `Markup ${levelName[level]} actualizado correctamente.`
          : `Excepción ${levelName[level]} creada correctamente.`,
      );
      onClose();
    } catch (error) {
      const parsed = parseMarkupError(error);
      setServerError(parsed.message);
      setCanRefresh(parsed.shouldRefresh);
    }
  };

  const targetName =
    configuration?.categoryName ?? configuration?.productName ?? 'Configuración global';

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={`${isEditing ? 'Editar' : 'Nueva'} configuración ${levelName[level]}`}
      description="El cambio actualiza precios sugeridos, pero nunca modifica precios activos de venta."
    >
      <form className="space-y-4" onSubmit={submit} noValidate>
        {serverError && (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{serverError}</span>
            </div>
            {canRefresh && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={onRefresh}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Actualizar configuraciones
              </Button>
            )}
          </div>
        )}

        {isEditing ? (
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <span className="block text-xs font-semibold text-slate-500">Objetivo</span>
            <span className="font-medium text-slate-900">{targetName}</span>
          </div>
        ) : level === MarkupLevel.CATEGORY ? (
          <div>
            <label htmlFor="markup-category" className="mb-1.5 block text-xs font-semibold">
              Categoría
            </label>
            <select
              id="markup-category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              disabled={isPending}
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Seleccione una categoría</option>
              {categories
                .filter((category) => !configuredCategoryIds.has(category.id))
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
          </div>
        ) : level === MarkupLevel.PRODUCT ? (
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Producto activo</label>
            <ProductSearchInput
              value={product}
              onSelect={setProduct}
              excludeIds={configuredProductIds}
              disabled={isPending}
              autoFocus
              ariaLabel="Buscar producto para excepción de markup"
            />
          </div>
        ) : null}

        <div>
          <label htmlFor="markup-percentage" className="mb-1.5 block text-xs font-semibold">
            Porcentaje de markup
          </label>
          <div className="relative">
            <Input
              id="markup-percentage"
              value={percentage}
              onChange={(event) => {
                setPercentage(event.target.value);
                setServerError(undefined);
              }}
              inputMode="decimal"
              disabled={isPending}
              aria-invalid={percentage.length > 0 && !validation.success}
              aria-describedby="markup-percentage-help"
              className="pr-9 font-mono"
              autoFocus={level !== MarkupLevel.PRODUCT}
            />
            <span className="pointer-events-none absolute right-3 top-2 text-sm text-slate-500">
              %
            </span>
          </div>
          <p id="markup-percentage-help" className="mt-1 text-[11px] text-slate-500">
            Entre 0 y 1000, con hasta cuatro decimales y punto decimal.
          </p>
          {percentage && !validation.success && (
            <p className="mt-1 text-[11px] font-medium text-rose-600">{validation.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" size="sm" onClick={close} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={isPending || !validation.success}>
            {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {isEditing ? 'Guardar cambios' : 'Crear excepción'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
