import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createCategorySchema, type CreateCategoryFormData } from '../schemas/categories.schema';
import {
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
} from '../hooks/use-category-mutations';
import type { ICategory, UpdateCategoryPayload } from '../types/categories.types';

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: ICategory | null;
  onSuccessNotice?: (message: string) => void;
}

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  isOpen,
  onClose,
  categoryToEdit,
  onSuccessNotice,
}) => {
  const isEditing = Boolean(categoryToEdit);
  const [serverError, setServerError] = useState<string | null>(null);

  const createMutation = useCreateCategoryMutation();
  const updateMutation = useUpdateCategoryMutation();

  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCategoryFormData>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      setServerError(null);
      if (categoryToEdit) {
        reset({
          name: categoryToEdit.name,
          description: categoryToEdit.description || '',
        });
      } else {
        reset({
          name: '',
          description: '',
        });
      }
    }
  }, [isOpen, categoryToEdit, reset]);

  const onSubmit = async (data: CreateCategoryFormData) => {
    setServerError(null);

    if (isEditing && categoryToEdit) {
      const delta: UpdateCategoryPayload = {};
      const trimmedName = data.name.trim();
      const currentDesc = categoryToEdit.description || null;
      const newDesc = data.description?.trim() ? data.description.trim() : null;

      if (trimmedName !== categoryToEdit.name) {
        delta.name = trimmedName;
      }
      if (newDesc !== currentDesc) {
        delta.description = newDesc;
      }

      if (Object.keys(delta).length === 0) {
        setServerError('No se detectaron modificaciones en los datos de la categoría.');
        return;
      }

      try {
        await updateMutation.mutateAsync({
          id: categoryToEdit.id,
          payload: delta,
        });
        onSuccessNotice?.('Categoría actualizada exitosamente.');
        onClose();
      } catch (err: any) {
        const errorMsg =
          err?.response?.data?.message || 'Ocurrió un error al actualizar la categoría.';
        setServerError(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg);
      }
    } else {
      try {
        await createMutation.mutateAsync({
          name: data.name.trim(),
          description: data.description?.trim() || null,
        });
        onSuccessNotice?.('Categoría creada exitosamente.');
        onClose();
      } catch (err: any) {
        const errorMsg = err?.response?.data?.message || 'Ocurrió un error al crear la categoría.';
        setServerError(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg);
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Categoría' : 'Nueva Categoría'}
      description={
        isEditing
          ? 'Modifique el nombre o la descripción de la categoría.'
          : 'Complete los datos para dar de alta una nueva categoría en el catálogo.'
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs animate-in fade-in duration-150">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{serverError}</div>
          </div>
        )}

        {/* Category Name */}
        <div className="space-y-1.5">
          <label htmlFor="category-name" className="block text-xs font-semibold text-slate-700">
            Nombre de la categoría <span className="text-red-500">*</span>
          </label>
          <Input
            id="category-name"
            placeholder="Ej. Analgésicos, Descartables, Cirugía"
            maxLength={100}
            disabled={isPending}
            className="h-9 text-xs"
            {...register('name')}
          />
          {errors.name && (
            <p className="text-[11px] font-medium text-red-600">{errors.name.message}</p>
          )}
        </div>

        {/* Category Description */}
        <div className="space-y-1.5">
          <label
            htmlFor="category-description"
            className="block text-xs font-semibold text-slate-700"
          >
            Descripción <span className="text-slate-400 font-normal">(Opcional)</span>
          </label>
          <Input
            id="category-description"
            placeholder="Descripción o alcance de la categoría"
            maxLength={255}
            disabled={isPending}
            className="h-9 text-xs"
            {...register('description')}
          />
          {errors.description && (
            <p className="text-[11px] font-medium text-red-600">{errors.description.message}</p>
          )}
          <p className="text-[11px] text-slate-400">
            Máximo 255 caracteres. Deje en blanco para eliminar la descripción.
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
            <span>{isEditing ? 'Guardar Cambios' : 'Crear Categoría'}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
