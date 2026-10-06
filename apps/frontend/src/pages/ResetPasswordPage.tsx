import React, { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from '@tanstack/react-router';
import { AlertCircle } from 'lucide-react';
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/features/auth/auth.schema';
import { getResetPasswordErrorMessage, INVALID_RESET_TOKEN } from '@/features/auth/auth.errors';
import { PasswordInput } from '@/features/auth/components/PasswordInput';
import { useResetPasswordMutation } from '@/features/auth/hooks/use-password-recovery-mutations';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// The token travels in the URL: stop it from leaking via Referer on any outbound request.
function useNoReferrer() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'referrer';
    meta.content = 'no-referrer';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
}

function InvalidToken() {
  return (
    <Card className="border-slate-800 bg-slate-950/90 text-white shadow-2xl backdrop-blur-md">
      <CardHeader className="space-y-1 pb-4 items-center">
        <AlertCircle className="w-10 h-10 text-red-400" aria-hidden="true" />
        <CardTitle className="text-xl font-bold text-center text-white">Link inválido</CardTitle>
        <CardDescription className="text-xs text-slate-400 text-center" role="alert">
          El link venció, ya fue usado o no es válido.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Link
          to="/forgot-password"
          className="w-full text-center text-sm text-blue-400 hover:underline"
        >
          Pedir un link nuevo
        </Link>
      </CardFooter>
    </Card>
  );
}

export const ResetPasswordPage: React.FC<{ token?: string }> = ({ token }) => {
  useNoReferrer();
  const navigate = useNavigate();
  const mutation = useResetPasswordMutation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [tokenInvalid, setTokenInvalid] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  if (!token || tokenInvalid) return <InvalidToken />;

  const onSubmit = async ({ newPassword }: ResetPasswordFormValues) => {
    if (mutation.isPending) return;
    setServerError(null);
    try {
      await mutation.mutateAsync({ token, newPassword });
      await navigate({ to: '/login' });
    } catch (error) {
      const message = getResetPasswordErrorMessage(error);
      if (message === INVALID_RESET_TOKEN) setTokenInvalid(true);
      else setServerError(message);
    }
  };

  const pending = mutation.isPending;

  return (
    <Card className="border-slate-800 bg-slate-950/90 text-white shadow-2xl backdrop-blur-md">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-xl font-bold tracking-tight text-center text-white">
          Nueva contraseña
        </CardTitle>
        <CardDescription className="text-xs text-slate-400 text-center">
          Elegí una contraseña nueva para tu cuenta
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate autoComplete="off">
        <CardContent className="space-y-4">
          {serverError && (
            <div
              role="alert"
              className="p-3 bg-red-950/50 border border-red-800 rounded-lg flex items-center space-x-2 text-red-300 text-xs"
            >
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" aria-hidden="true" />
              <span>{serverError}</span>
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="reset-password" className="text-xs font-medium text-slate-300">
              Contraseña nueva
            </label>
            <PasswordInput
              id="reset-password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.newPassword)}
              aria-describedby="reset-password-hint reset-password-error"
              disabled={pending}
              {...register('newPassword')}
            />
            <p id="reset-password-hint" className="text-xs text-slate-500">
              8 a 128 caracteres, con mayúscula, minúscula y un dígito o símbolo.
            </p>
            {errors.newPassword && (
              <p id="reset-password-error" role="alert" className="text-xs text-red-300">
                {errors.newPassword.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="reset-confirm" className="text-xs font-medium text-slate-300">
              Confirmar contraseña
            </label>
            <PasswordInput
              id="reset-confirm"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={errors.confirmPassword ? 'reset-confirm-error' : undefined}
              disabled={pending}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p id="reset-confirm-error" role="alert" className="text-xs text-red-300">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-2">
          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium"
          >
            {pending ? 'Guardando...' : 'Cambiar contraseña'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
