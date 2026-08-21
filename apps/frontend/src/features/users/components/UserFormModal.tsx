import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { UserRole } from '@erp/shared-types';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserFormData,
  type UpdateUserFormData,
} from '../schemas/users.schema';
import { useCreateUserMutation, useUpdateUserMutation } from '../hooks/use-user-mutations';
import { parseUserApiError } from '../utils/users.errors';
import type { IUser, UpdateUserPayload } from '../types/users.types';

export interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initialUser?: IUser | null;
  onSuccess?: () => void;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  mode,
  initialUser,
  onSuccess,
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createMutation = useCreateUserMutation();
  const updateMutation = useUpdateUserMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;

  // React Hook Form for Create Mode
  const createForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: UserRole.VENDEDOR,
    },
  });

  // React Hook Form for Edit Mode
  const editForm = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: initialUser?.name || '',
      email: initialUser?.email || '',
      role: initialUser?.role || UserRole.VENDEDOR,
    },
  });

  // Reset form when modal opens or initialUser changes
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      if (mode === 'create') {
        createForm.reset({
          name: '',
          email: '',
          password: '',
          role: UserRole.VENDEDOR,
        });
      } else if (mode === 'edit' && initialUser) {
        editForm.reset({
          name: initialUser.name,
          email: initialUser.email,
          role: initialUser.role,
        });
      }
    }
  }, [isOpen, mode, initialUser, createForm, editForm]);

  const handleClose = () => {
    if (isPending) return;
    setErrorMessage(null);
    onClose();
  };

  const handleCreateSubmit = async (values: CreateUserFormData) => {
    setErrorMessage(null);
    try {
      await createMutation.mutateAsync({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        role: values.role,
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      setErrorMessage(parseUserApiError(error));
    }
  };

  const handleEditSubmit = async (values: UpdateUserFormData) => {
    if (!initialUser) return;
    setErrorMessage(null);

    const trimmedName = values.name.trim();
    const normalizedEmail = values.email.trim().toLowerCase();

    // Delta-only payload construction
    const payload: UpdateUserPayload = {};
    if (trimmedName !== initialUser.name) payload.name = trimmedName;
    if (normalizedEmail !== initialUser.email) payload.email = normalizedEmail;
    if (values.role !== initialUser.role) payload.role = values.role;

    if (Object.keys(payload).length === 0) {
      setErrorMessage('No se detectaron modificaciones en los datos del usuario.');
      return;
    }

    try {
      await updateMutation.mutateAsync({ id: initialUser.id, payload });
      onSuccess?.();
      onClose();
    } catch (error) {
      setErrorMessage(parseUserApiError(error));
    }
  };

  const isCreate = mode === 'create';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isCreate ? 'Nuevo Usuario' : 'Editar Usuario'}
      description={
        isCreate
          ? 'Cree una nueva cuenta de acceso al sistema con rol y credenciales'
          : 'Modifique el nombre, correo electrónico o rol del usuario'
      }
    >
      <form
        onSubmit={
          isCreate
            ? createForm.handleSubmit(handleCreateSubmit)
            : editForm.handleSubmit(handleEditSubmit)
        }
        className="space-y-4"
        noValidate
      >
        {/* Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs"
          >
            {errorMessage}
          </div>
        )}

        {/* Nombre Field */}
        <div className="space-y-1">
          <label htmlFor="user-name-input" className="block text-xs font-semibold text-slate-700">
            Nombre Completo <span className="text-red-500">*</span>
          </label>
          <Input
            id="user-name-input"
            type="text"
            placeholder="Ej. Carlos Gomez"
            disabled={isPending}
            className="h-9 text-sm"
            {...(isCreate ? createForm.register('name') : editForm.register('name'))}
            aria-invalid={
              isCreate
                ? Boolean(createForm.formState.errors.name)
                : Boolean(editForm.formState.errors.name)
            }
          />
          {isCreate && createForm.formState.errors.name && (
            <p className="text-xs text-red-600 font-medium">
              {createForm.formState.errors.name.message}
            </p>
          )}
          {!isCreate && editForm.formState.errors.name && (
            <p className="text-xs text-red-600 font-medium">
              {editForm.formState.errors.name.message}
            </p>
          )}
        </div>

        {/* Email Field */}
        <div className="space-y-1">
          <label htmlFor="user-email-input" className="block text-xs font-semibold text-slate-700">
            Correo Electrónico <span className="text-red-500">*</span>
          </label>
          <Input
            id="user-email-input"
            type="email"
            placeholder="usuario@erp.com"
            disabled={isPending}
            className="h-9 text-sm"
            {...(isCreate ? createForm.register('email') : editForm.register('email'))}
            aria-invalid={
              isCreate
                ? Boolean(createForm.formState.errors.email)
                : Boolean(editForm.formState.errors.email)
            }
          />
          {isCreate && createForm.formState.errors.email && (
            <p className="text-xs text-red-600 font-medium">
              {createForm.formState.errors.email.message}
            </p>
          )}
          {!isCreate && editForm.formState.errors.email && (
            <p className="text-xs text-red-600 font-medium">
              {editForm.formState.errors.email.message}
            </p>
          )}
        </div>

        {/* Password Field (Create mode ONLY) */}
        {isCreate && (
          <div className="space-y-1">
            <label
              htmlFor="user-password-input"
              className="block text-xs font-semibold text-slate-700"
            >
              Contraseña Inicial <span className="text-red-500">*</span>
            </label>
            <Input
              id="user-password-input"
              type="password"
              placeholder="••••••••"
              disabled={isPending}
              className="h-9 text-sm font-mono"
              {...createForm.register('password')}
              aria-invalid={Boolean(createForm.formState.errors.password)}
            />
            <p className="text-[11px] text-slate-500 leading-tight">
              Mínimo 8 caracteres, incluyendo mayúsculas, minúsculas y números o símbolos.
            </p>
            {createForm.formState.errors.password && (
              <p className="text-xs text-red-600 font-medium">
                {createForm.formState.errors.password.message}
              </p>
            )}
          </div>
        )}

        {/* Rol Field */}
        <div className="space-y-1">
          <label htmlFor="user-role-select" className="block text-xs font-semibold text-slate-700">
            Rol en el Sistema <span className="text-red-500">*</span>
          </label>
          <Select
            id="user-role-select"
            disabled={isPending}
            className="h-9 text-sm"
            {...(isCreate ? createForm.register('role') : editForm.register('role'))}
          >
            <option value={UserRole.VENDEDOR}>VENDEDOR (Operación de ventas y stock)</option>
            <option value={UserRole.ADMINISTRADOR}>ADMINISTRADOR (Acceso total al sistema)</option>
          </Select>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={isPending}
            className="text-xs"
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            size="sm"
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {isCreate ? 'Creando...' : 'Guardando...'}
              </>
            ) : isCreate ? (
              'Crear Usuario'
            ) : (
              'Guardar Cambios'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
