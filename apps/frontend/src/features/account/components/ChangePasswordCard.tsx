import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { PasswordInput } from '@/features/auth/components/PasswordInput';
import { changePasswordApi } from '../api/account.api';
import { getAccountErrorMessage } from '../account.errors';
import { changePasswordSchema, type ChangePasswordFormValues } from '../account.schema';

const fields = [
  { name: 'currentPassword', label: 'Contraseña actual', autoComplete: 'current-password' },
  { name: 'newPassword', label: 'Nueva contraseña', autoComplete: 'new-password' },
  { name: 'confirmPassword', label: 'Confirmar nueva contraseña', autoComplete: 'new-password' },
] as const;

export const ChangePasswordCard: React.FC = () => {
  const mutation = useMutation({ mutationFn: changePasswordApi });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async ({ currentPassword, newPassword }: ChangePasswordFormValues) => {
    try {
      await mutation.mutateAsync({ currentPassword, newPassword });
      reset();
      toast.success('Contraseña actualizada');
    } catch (error) {
      toast.error(getAccountErrorMessage(error, 'No se pudo cambiar la contraseña.'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Cambiar contraseña</CardTitle>
        <CardDescription>
          8 a 128 caracteres, con mayúscula, minúscula y un dígito o símbolo.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4">
          {fields.map(({ name, label, autoComplete }) => (
            <div key={name} className="space-y-1.5">
              <label htmlFor={`account-${name}`} className="text-sm font-medium">
                {label}
              </label>
              <PasswordInput
                id={`account-${name}`}
                autoComplete={autoComplete}
                className="border-input bg-background text-foreground placeholder:text-muted-foreground"
                aria-invalid={Boolean(errors[name])}
                {...register(name)}
              />
              {errors[name] && (
                <p role="alert" className="text-xs text-red-600">
                  {errors[name]?.message}
                </p>
              )}
            </div>
          ))}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando...' : 'Cambiar contraseña'}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
};
