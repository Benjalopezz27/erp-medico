import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { UserRole } from '@erp/shared-types';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { updateProfileApi } from '../api/account.api';
import { getAccountErrorMessage } from '../account.errors';
import { profileSchema, type ProfileFormValues } from '../account.schema';

export const ProfileCard: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const mutation = useMutation({ mutationFn: updateProfileApi });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '' },
  });

  const onSubmit = async ({ name }: ProfileFormValues) => {
    if (name === user?.name) {
      toast.info('No hay cambios para guardar');
      return;
    }
    try {
      const updated = await mutation.mutateAsync({ name });
      useAuthStore.setState((s) => ({ user: s.user ? { ...s.user, name: updated.name } : s.user }));
      toast.success('Datos actualizados');
    } catch (error) {
      toast.error(getAccountErrorMessage(error, 'No se pudieron guardar los cambios.'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Datos personales</CardTitle>
        <CardDescription>El correo y el rol los gestiona un administrador.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="account-name" className="text-sm font-medium">
              Nombre
            </label>
            <Input
              id="account-name"
              autoComplete="name"
              aria-invalid={Boolean(errors.name)}
              {...register('name')}
            />
            {errors.name && (
              <p role="alert" className="text-xs text-red-600">
                {errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="account-email" className="text-sm font-medium">
              Correo electrónico
            </label>
            <Input id="account-email" value={user?.email ?? ''} readOnly disabled />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="account-role" className="text-sm font-medium">
              Rol
            </label>
            <Input
              id="account-role"
              value={user?.role === UserRole.ADMINISTRADOR ? 'Administrador' : 'Vendedor'}
              readOnly
              disabled
            />
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
};
