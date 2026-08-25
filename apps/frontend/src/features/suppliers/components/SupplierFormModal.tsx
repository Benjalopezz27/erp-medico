import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { TaxCondition, formatCuit } from '@erp/shared-types';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supplierFormSchema, type SupplierFormValues } from '../schemas/suppliers.schema';
import {
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
} from '../hooks/use-supplier-mutations';
import { parseSupplierApiError } from '../utils/suppliers.errors';
import type { ISupplier } from '../types/suppliers.types';

export interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initialSupplier?: ISupplier | null;
  onSuccess?: () => void;
}

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  isOpen,
  onClose,
  mode,
  initialSupplier,
  onSuccess,
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createMutation = useCreateSupplierMutation();
  const updateMutation = useUpdateSupplierMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      businessName: '',
      cuit: '',
      taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
      email: '',
      phone: '',
      whatsapp: '',
      address: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      if (mode === 'edit' && initialSupplier) {
        reset({
          businessName: initialSupplier.businessName,
          cuit: formatCuit(initialSupplier.cuit),
          taxCondition: initialSupplier.taxCondition,
          email: initialSupplier.email || '',
          phone: initialSupplier.phone || '',
          whatsapp: initialSupplier.whatsapp || '',
          address: initialSupplier.address || '',
        });
      } else {
        reset({
          businessName: '',
          cuit: '',
          taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
          email: '',
          phone: '',
          whatsapp: '',
          address: '',
        });
      }
    }
  }, [isOpen, mode, initialSupplier, reset]);

  const onSubmit = async (values: SupplierFormValues) => {
    setErrorMessage(null);

    if (mode === 'create') {
      try {
        await createMutation.mutateAsync({
          businessName: values.businessName,
          cuit: values.cuit,
          taxCondition: values.taxCondition,
          email: values.email || null,
          phone: values.phone || null,
          whatsapp: values.whatsapp || null,
          address: values.address || null,
        });
        onSuccess?.();
        onClose();
      } catch (err) {
        setErrorMessage(parseSupplierApiError(err));
      }
    } else if (mode === 'edit' && initialSupplier) {
      try {
        await updateMutation.mutateAsync({
          id: initialSupplier.id,
          payload: {
            businessName: values.businessName,
            cuit: values.cuit,
            taxCondition: values.taxCondition,
            email: values.email || null,
            phone: values.phone || null,
            whatsapp: values.whatsapp || null,
            address: values.address || null,
          },
        });
        onSuccess?.();
        onClose();
      } catch (err) {
        setErrorMessage(parseSupplierApiError(err));
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isPending) onClose();
      }}
      title={mode === 'create' ? 'Nuevo Proveedor' : 'Editar Proveedor'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {errorMessage && (
          <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900">
            {errorMessage}
          </div>
        )}

        {/* Razón Social */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Razón Social <span className="text-rose-500">*</span>
          </label>
          <Input
            type="text"
            placeholder="Ej: Droguería del Sol S.A."
            {...register('businessName')}
            disabled={isPending}
            className={errors.businessName ? 'border-rose-400 focus:ring-rose-400' : ''}
          />
          {errors.businessName && (
            <p className="text-xs text-rose-500 mt-1">{errors.businessName.message}</p>
          )}
        </div>

        {/* CUIT & Condición Fiscal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              CUIT <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="30-50001091-2"
              {...register('cuit')}
              disabled={isPending}
              className={errors.cuit ? 'border-rose-400 focus:ring-rose-400' : ''}
            />
            {errors.cuit && <p className="text-xs text-rose-500 mt-1">{errors.cuit.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Condición Fiscal <span className="text-rose-500">*</span>
            </label>
            <Select
              {...register('taxCondition')}
              disabled={isPending}
              className={errors.taxCondition ? 'border-rose-400 focus:ring-rose-400' : ''}
            >
              <option value={TaxCondition.RESPONSABLE_INSCRIPTO}>Responsable Inscripto</option>
              <option value={TaxCondition.MONOTRIBUTO}>Monotributo</option>
              <option value={TaxCondition.EXENTO}>Exento</option>
              <option value={TaxCondition.CONSUMIDOR_FINAL}>Consumidor Final</option>
            </Select>
            {errors.taxCondition && (
              <p className="text-xs text-rose-500 mt-1">{errors.taxCondition.message}</p>
            )}
          </div>
        </div>

        {/* Correo Electrónico & Teléfono */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Correo Electrónico
            </label>
            <Input
              type="email"
              placeholder="contacto@empresa.com"
              {...register('email')}
              disabled={isPending}
              className={errors.email ? 'border-rose-400 focus:ring-rose-400' : ''}
            />
            {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Teléfono
            </label>
            <Input
              type="text"
              placeholder="0351-4890123"
              {...register('phone')}
              disabled={isPending}
              className={errors.phone ? 'border-rose-400 focus:ring-rose-400' : ''}
            />
            {errors.phone && <p className="text-xs text-rose-500 mt-1">{errors.phone.message}</p>}
          </div>
        </div>

        {/* WhatsApp & Dirección */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              WhatsApp
            </label>
            <Input
              type="text"
              placeholder="5493514890123"
              {...register('whatsapp')}
              disabled={isPending}
              className={errors.whatsapp ? 'border-rose-400 focus:ring-rose-400' : ''}
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Con código de país (ej. 5493514890123)
            </p>
            {errors.whatsapp && (
              <p className="text-xs text-rose-500 mt-1">{errors.whatsapp.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Dirección
            </label>
            <Input
              type="text"
              placeholder="Av. Colón 1234, Córdoba"
              {...register('address')}
              disabled={isPending}
              className={errors.address ? 'border-rose-400 focus:ring-rose-400' : ''}
            />
            {errors.address && (
              <p className="text-xs text-rose-500 mt-1">{errors.address.message}</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>

          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Guardando...
              </>
            ) : mode === 'create' ? (
              'Crear Proveedor'
            ) : (
              'Guardar Cambios'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
