import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createUnitSchema, type CreateUnitFormData } from '../schemas/units.schema';
import { useCreateUnitMutation, useUpdateUnitMutation } from '../hooks/use-unit-mutations';
import type { IUnit, UpdateUnitPayload } from '../types/units.types';

interface UnitFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitToEdit?: IUnit | null;
  onSuccessNotice?: (message: string) => void;
}

export const UnitFormModal: React.FC<UnitFormModalProps> = ({
  isOpen,
  onClose,
  unitToEdit,
  onSuccessNotice,
}) => {
  const isEditing = Boolean(unitToEdit);
  const [serverError, setServerError] = useState<string | null>(null);

  const createMutation = useCreateUnitMutation();
  const updateMutation = useUpdateUnitMutation();

  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUnitFormData>({
    resolver: zodResolver(createUnitSchema),
    defaultValues: {
      name: '',
      symbol: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      setServerError(null);
      if (unitToEdit) {
        reset({
          name: unitToEdit.name,
          symbol: unitToEdit.symbol,
        });
      } else {
        reset({
          name: '',
          symbol: '',
        });
      }
    }
  }, [isOpen, unitToEdit, reset]);

  const onSubmit = async (data: CreateUnitFormData) => {
    setServerError(null);

    if (isEditing && unitToEdit) {
      const delta: UpdateUnitPayload = {};
      const trimmedName = data.name.trim();
      const trimmedSymbol = data.symbol.trim();

      if (trimmedName !== unitToEdit.name) {
        delta.name = trimmedName;
      }
      if (trimmedSymbol !== unitToEdit.symbol) {
        delta.symbol = trimmedSymbol;
      }

      if (Object.keys(delta).length === 0) {
        setServerError('No se detectaron modificaciones en los datos de la unidad de medida.');
        return;
      }

      try {
        await updateMutation.mutateAsync({
          id: unitToEdit.id,
          payload: delta,
        });
        onSuccessNotice?.('Unidad de medida actualizada exitosamente.');
        onClose();
      } catch (err: any) {
        const errorMsg =
          err?.response?.data?.message || 'Ocurrió un error al actualizar la unidad de medida.';
        setServerError(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg);
      }
    } else {
      try {
        await createMutation.mutateAsync({
          name: data.name.trim(),
          symbol: data.symbol.trim(),
        });
        onSuccessNotice?.('Unidad de medida creada exitosamente.');
        onClose();
      } catch (err: any) {
        const errorMsg =
          err?.response?.data?.message || 'Ocurrió un error al crear la unidad de medida.';
        setServerError(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg);
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Unidad de Medida' : 'Nueva Unidad de Medida'}
      description={
        isEditing
          ? 'Modifique el nombre o símbolo de la unidad de medida.'
          : 'Complete los datos para dar de alta una nueva unidad de medida en el catálogo.'
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs animate-in fade-in duration-150">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{serverError}</div>
          </div>
        )}

        {/* Unit Name */}
        <div className="space-y-1.5">
          <label htmlFor="unit-name" className="block text-xs font-semibold text-slate-700">
            Nombre de la unidad <span className="text-red-500">*</span>
          </label>
          <Input
            id="unit-name"
            placeholder="Ej. Unidad, Caja, Frasco, Litro, Kilogramo"
            maxLength={50}
            disabled={isPending}
            className="h-9 text-xs"
            {...register('name')}
          />
          {errors.name && (
            <p className="text-[11px] font-medium text-red-600">{errors.name.message}</p>
          )}
        </div>

        {/* Unit Symbol */}
        <div className="space-y-1.5">
          <label htmlFor="unit-symbol" className="block text-xs font-semibold text-slate-700">
            Símbolo de la unidad <span className="text-red-500">*</span>
          </label>
          <Input
            id="unit-symbol"
            placeholder="Ej. u, cj, fr, l, kg, ml"
            maxLength={20}
            disabled={isPending}
            className="h-9 text-xs font-mono"
            {...register('symbol')}
          />
          {errors.symbol && (
            <p className="text-[11px] font-medium text-red-600">{errors.symbol.message}</p>
          )}
          <p className="text-[11px] text-slate-400">
            Abreviatura representativa utilizada en comprobantes y reportes.
          </p>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isPending}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isPending}
            className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isEditing ? 'Guardar Cambios' : 'Crear Unidad'}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
