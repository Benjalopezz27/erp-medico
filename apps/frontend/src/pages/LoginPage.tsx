import React, { useState } from 'react';
import axios from 'axios';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from '@tanstack/react-router';
import { Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { loginSchema, type LoginCredentials } from '@/features/auth/auth.schema';
import { useLoginMutation } from '@/features/auth/hooks/use-login-mutation';
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

export function getLoginErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) return 'Credenciales inválidas';
    if (error.response?.status === 400) return 'Datos de inicio de sesión inválidos';
    if (!error.response) return 'No se pudo conectar con el servidor. Intente nuevamente.';
  }
  return 'No se pudo iniciar sesión. Intente nuevamente.';
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const loginMutation = useLoginMutation();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (credentials: LoginCredentials) => {
    if (loginMutation.isPending) return;
    setServerError(null);
    try {
      const session = await loginMutation.mutateAsync(credentials);
      setSession(session);
      await navigate({ to: '/', replace: true });
    } catch (error) {
      setServerError(getLoginErrorMessage(error));
      setFocus('password');
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-950/90 text-white shadow-2xl backdrop-blur-md">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-xl font-bold tracking-tight text-center text-white">
          Iniciar Sesión
        </CardTitle>
        <CardDescription className="text-xs text-slate-400 text-center">
          Ingrese sus credenciales corporativas para acceder
        </CardDescription>
      </CardHeader>

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
            <label htmlFor="login-email" className="text-xs font-medium text-slate-300">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" aria-hidden="true" />
              <Input
                id="login-email"
                type="email"
                autoComplete="username"
                placeholder="usuario@empresa.com"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'login-email-error' : undefined}
                disabled={loginMutation.isPending}
                className="pl-9 bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-blue-500"
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p id="login-email-error" role="alert" className="text-xs text-red-300">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="login-password" className="text-xs font-medium text-slate-300">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" aria-hidden="true" />
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••••••"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'login-password-error' : undefined}
                disabled={loginMutation.isPending}
                className="pl-9 bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-blue-500"
                {...register('password')}
              />
            </div>
            {errors.password && (
              <p id="login-password-error" role="alert" className="text-xs text-red-300">
                {errors.password.message}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="pt-2">
          <Button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center justify-center space-x-2"
          >
            <span>{loginMutation.isPending ? 'Ingresando...' : 'Iniciar sesión'}</span>
            {!loginMutation.isPending && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
