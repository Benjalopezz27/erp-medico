import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import Decimal from 'decimal.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useUpdateCustomerMutation } from '@/features/customers/hooks/use-customer-mutations';
import type { ICustomer } from '@/features/customers/types/customers.types';
import { parseCustomerError } from '@/features/customers/utils/customers.errors';
import { customerGeneralDiscountSchema } from '../schemas/customer-pricing.schema';

interface Values {
  percentage: string;
}

export function CustomerGeneralDiscountModal({
  customer,
  isOpen,
  onClose,
  onSuccess,
}: {
  customer: ICustomer;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const mutation = useUpdateCustomerMutation();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(customerGeneralDiscountSchema),
    defaultValues: { percentage: customer.generalDiscountPercentage },
  });
  useEffect(() => {
    if (isOpen) reset({ percentage: customer.generalDiscountPercentage });
  }, [customer.generalDiscountPercentage, isOpen, reset]);
  const submit = async (values: Values) => {
    if (mutation.isPending) return;
    const percentage = new Decimal(values.percentage).toFixed(4);
    if (new Decimal(percentage).eq(customer.generalDiscountPercentage)) {
      setError('root', { message: 'No se detectaron cambios para guardar.' });
      return;
    }
    try {
      await mutation.mutateAsync({
        id: customer.id,
        payload: { generalDiscountPercentage: percentage },
      });
      onSuccess(`Descuento general actualizado a ${percentage}%.`);
      onClose();
    } catch (cause) {
      setError('root', { message: parseCustomerError(cause).message });
    }
  };
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !mutation.isPending && onClose()}
      showCloseButton={!mutation.isPending}
      title="Modificar descuento general"
      description="Confirmá el cambio en la condición comercial"
    >
      <form
        className="space-y-4"
        onSubmit={handleSubmit((values) => void submit(values))}
        noValidate
      >
        {errors.root?.message && (
          <div role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
            {errors.root.message}
          </div>
        )}
        <div>
          <label
            htmlFor="general-discount"
            className="mb-1 block text-xs font-semibold text-slate-700"
          >
            Descuento general (%)
          </label>
          <Input
            id="general-discount"
            inputMode="decimal"
            {...register('percentage')}
            disabled={mutation.isPending}
            aria-invalid={Boolean(errors.percentage)}
          />
          {errors.percentage?.message && (
            <p role="alert" className="mt-1 text-xs text-red-600">
              {errors.percentage.message}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
          Este descuento se aplica a productos sin una excepción específica. No modifica el catálogo
          ni reemplaza precios fijos o descuentos por producto.
        </div>
        <div className="flex justify-end gap-2 border-t pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={mutation.isPending}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Confirmar
            cambio
          </Button>
        </div>
      </form>
    </Modal>
  );
}
