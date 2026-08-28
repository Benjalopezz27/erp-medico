import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Loader2, RefreshCw } from 'lucide-react';
import { CustomerSpecialPriceMode, type ICustomerSpecialPrice } from '@erp/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ProductSearchInput } from '@/features/products/components/ProductSearchInput';
import type { IProductSummary } from '@/features/products/types/products.types';
import {
  useCreateCustomerSpecialPriceMutation,
  useUpdateCustomerSpecialPriceMutation,
} from '../hooks/use-customer-pricing-mutations';
import {
  customerSpecialPriceFormSchema,
  normalizePricingValue,
} from '../schemas/customer-pricing.schema';
import { parseCustomerPricingError } from '../utils/customer-pricing.errors';

interface FormValues {
  mode: CustomerSpecialPriceMode;
  value: string;
}

export function CustomerSpecialPriceFormModal({
  customerId,
  rule,
  isOpen,
  excludeProductIds,
  onClose,
  onSuccess,
  onRefresh,
}: {
  customerId: string;
  rule: ICustomerSpecialPrice | null;
  isOpen: boolean;
  excludeProductIds: readonly string[];
  onClose: () => void;
  onSuccess: (message: string) => void;
  onRefresh: () => void;
}) {
  const create = useCreateCustomerSpecialPriceMutation(customerId);
  const update = useUpdateCustomerSpecialPriceMutation(customerId);
  const pending = create.isPending || update.isPending;
  const [product, setProduct] = useState<IProductSummary | null>(null);
  const [canRefresh, setCanRefresh] = useState(false);
  const [expectedVersion, setExpectedVersion] = useState(1);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(customerSpecialPriceFormSchema),
    defaultValues: { mode: CustomerSpecialPriceMode.FIXED_PRICE, value: '' },
  });
  const mode = watch('mode');

  useEffect(() => {
    if (!isOpen) return;
    setProduct(null);
    setCanRefresh(false);
    setExpectedVersion(rule?.version ?? 1);
    reset({
      mode: rule?.mode ?? CustomerSpecialPriceMode.FIXED_PRICE,
      value: rule
        ? rule.mode === CustomerSpecialPriceMode.FIXED_PRICE
          ? (rule.specialPriceNet ?? '')
          : (rule.discountPercentage ?? '')
        : '',
    });
  }, [isOpen, reset, rule]);

  const close = () => {
    if (!pending) onClose();
  };
  const submit = async (values: FormValues) => {
    if (pending) return;
    if (!rule && !product) {
      setError('root', { message: 'Seleccioná un producto activo.' });
      return;
    }
    const value = normalizePricingValue(values.mode, values.value);
    const exclusiveValue =
      values.mode === CustomerSpecialPriceMode.FIXED_PRICE
        ? { specialPriceNet: value }
        : { discountPercentage: value };
    try {
      if (rule) {
        await update.mutateAsync({
          id: rule.id,
          payload: { mode: values.mode, expectedVersion, ...exclusiveValue },
        });
      } else {
        await create.mutateAsync({ productId: product!.id, mode: values.mode, ...exclusiveValue });
      }
      onSuccess(rule ? 'Excepción actualizada correctamente.' : 'Excepción creada correctamente.');
      onClose();
    } catch (cause) {
      const parsed = parseCustomerPricingError(cause);
      if (parsed.currentRule) {
        setExpectedVersion(parsed.currentRule.version);
        reset({
          mode: parsed.currentRule.mode,
          value:
            parsed.currentRule.mode === CustomerSpecialPriceMode.FIXED_PRICE
              ? (parsed.currentRule.specialPriceNet ?? '')
              : (parsed.currentRule.discountPercentage ?? ''),
        });
      }
      setError('root', { message: parsed.message });
      setCanRefresh(parsed.shouldRefresh);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      showCloseButton={!pending}
      title={rule ? 'Editar excepción' : 'Nueva excepción por producto'}
      description="El resultado definitivo se mostrará después de que el backend guarde la regla."
    >
      <form
        className="space-y-4"
        onSubmit={handleSubmit((values) => void submit(values))}
        noValidate
      >
        {errors.root?.message && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            {errors.root.message}
            {canRefresh && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 block"
                onClick={onRefresh}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Actualizar reglas
              </Button>
            )}
          </div>
        )}
        {rule ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
            <span className="font-mono font-semibold">{rule.productCode}</span> · {rule.productName}
          </div>
        ) : (
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Producto *</label>
            <ProductSearchInput
              value={product}
              onSelect={setProduct}
              excludeIds={excludeProductIds}
              disabled={pending}
              autoFocus
              ariaLabel="Buscar producto para precio especial"
            />
          </div>
        )}
        <fieldset disabled={pending} className="space-y-2">
          <legend className="mb-1 text-xs font-semibold text-slate-700">Modalidad *</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-xs">
              <input
                type="radio"
                value={CustomerSpecialPriceMode.FIXED_PRICE}
                {...register('mode')}
              />
              Precio fijo
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-xs">
              <input
                type="radio"
                value={CustomerSpecialPriceMode.DISCOUNT_PERCENTAGE}
                {...register('mode')}
              />
              Descuento porcentual
            </label>
          </div>
        </fieldset>
        <div>
          <label
            htmlFor="customer-pricing-value"
            className="mb-1 block text-xs font-semibold text-slate-700"
          >
            {mode === CustomerSpecialPriceMode.FIXED_PRICE ? 'Precio neto fijo' : 'Descuento (%)'} *
          </label>
          <Input
            id="customer-pricing-value"
            inputMode="decimal"
            {...register('value')}
            disabled={pending}
            aria-invalid={Boolean(errors.value)}
            aria-describedby={errors.value ? 'customer-pricing-value-error' : undefined}
          />
          {errors.value?.message && (
            <p id="customer-pricing-value-error" role="alert" className="mt-1 text-xs text-red-600">
              {errors.value.message}
            </p>
          )}
        </div>
        <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
          La interfaz no calcula el precio final. Al guardar se mostrará el resultado autoritativo
          del catálogo activo.
        </p>
        <div className="flex justify-end gap-2 border-t pt-3">
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={close}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={pending}>
            {pending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Guardar excepción
          </Button>
        </div>
      </form>
    </Modal>
  );
}
