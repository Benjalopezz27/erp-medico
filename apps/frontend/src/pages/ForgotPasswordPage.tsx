import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from '@tanstack/react-router';
import { Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/features/auth/auth.schema';
import { getForgotPasswordErrorMessage } from '@/features/auth/auth.errors';
import { useForgotPasswordMutation } from '@/features/auth/hooks/use-password-recovery-mutations';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export const ForgotPasswordPage: React.FC = () => {
  const mutation = useForgotPasswordMutation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async ({ email }: ForgotPasswordFormValues) => {
    if (mutation.isPending) return;
    setServerError(null);
    try {
      await mutation.mutateAsync(email);
      setDone(true);
    } catch (error) {
      setServerError(getForgotPasswordErrorMessage(error));
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-950/90 text-white shadow-2xl backdrop-blur-md">
      <CardHeader className="space-y-1 pb-4 items-center">
        {done && <CheckCircle2 className="w-10 h-10 text-emerald-400" aria-hidden="true" />}
        <CardTitle className="text-xl font-bold tracking-tight text-center text-white">
          Recuperar contraseña
        </CardTitle>
        <CardDescription className="text-xs text-slate-400 text-center" role="status">
          {done
            ? 'Si el email existe, te enviamos un link para restablecer tu contraseña. Vence en 30 minutos.'
            : 'Ingresá tu correo y te enviamos un link para elegir una contraseña nueva.'}
        </CardDescription>
      </CardHeader>

      {!done && (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
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
              <label htmlFor="forgot-email" className="text-xs font-medium text-slate-300">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" aria-hidden="true" />
                <Input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  placeholder="usuario@empresa.com"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'forgot-email-error' : undefined}
                  disabled={mutation.isPending}
                  className="pl-9 bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-blue-500"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p id="forgot-email-error" role="alert" className="text-xs text-red-300">
                  {errors.email.message}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium"
            >
              {mutation.isPending ? 'Enviando...' : 'Enviar link'}
            </Button>
          </CardFooter>
        </form>
      )}

      <p className="py-4 text-center text-xs text-slate-400">
        <Link to="/login" className="text-blue-400 hover:text-blue-300 underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </Card>
  );
};
