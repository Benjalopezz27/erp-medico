import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { TermsLink } from '@/features/legal/TermsLink';
import { Link } from '@tanstack/react-router';
import { User, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { signupSchema, type SignupFormValues } from '@/features/auth/auth.schema';
import { getSignupErrorMessage } from '@/features/auth/auth.errors';
import { PasswordInput } from '@/features/auth/components/PasswordInput';
import { useRegisterMutation } from '@/features/auth/hooks/use-register-mutation';
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

const fieldClass =
  'pl-9 bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-blue-500';

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs text-red-300">
      {message}
    </p>
  );
}

export const SignupPage: React.FC = () => {
  const registerMutation = useRegisterMutation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async ({ name, email, password }: SignupFormValues) => {
    if (registerMutation.isPending) return;
    setServerError(null);
    try {
      await registerMutation.mutateAsync({ name, email, password });
      setDone(true);
    } catch (error) {
      setServerError(getSignupErrorMessage(error));
    }
  };

  if (done) {
    return (
      <Card className="border-slate-800 bg-slate-950/90 text-white shadow-2xl backdrop-blur-md">
        <CardHeader className="space-y-1 pb-4 items-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400" aria-hidden="true" />
          <CardTitle className="text-xl font-bold text-center text-white">Cuenta creada</CardTitle>
          <CardDescription className="text-xs text-slate-400 text-center" role="status">
            Tu cuenta fue creada y está pendiente de aprobación del administrador. Podrás iniciar
            sesión cuando sea aprobada.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link to="/login" className="w-full text-center text-sm text-blue-400 hover:underline">
            Volver a iniciar sesión
          </Link>
        </CardFooter>
      </Card>
    );
  }

  const pending = registerMutation.isPending;

  return (
    <Card className="border-slate-800 bg-slate-950/90 text-white shadow-2xl backdrop-blur-md">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-xl font-bold tracking-tight text-center text-white">
          Crear cuenta
        </CardTitle>
        <CardDescription className="text-xs text-slate-400 text-center">
          Un administrador debe aprobar tu cuenta antes de que puedas ingresar
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
            <label htmlFor="signup-name" className="text-xs font-medium text-slate-300">
              Nombre completo
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" aria-hidden="true" />
              <Input
                id="signup-name"
                autoComplete="name"
                placeholder="Carlos Gómez"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'signup-name-error' : undefined}
                disabled={pending}
                className={fieldClass}
                {...register('name')}
              />
            </div>
            <FieldError id="signup-name-error" message={errors.name?.message} />
          </div>

          <div className="space-y-2">
            <label htmlFor="signup-email" className="text-xs font-medium text-slate-300">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" aria-hidden="true" />
              <Input
                id="signup-email"
                type="email"
                autoComplete="email"
                placeholder="usuario@empresa.com"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'signup-email-error' : undefined}
                disabled={pending}
                className={fieldClass}
                {...register('email')}
              />
            </div>
            <FieldError id="signup-email-error" message={errors.email?.message} />
          </div>

          <div className="space-y-2">
            <label htmlFor="signup-password" className="text-xs font-medium text-slate-300">
              Contraseña
            </label>
            <PasswordInput
              id="signup-password"
              autoComplete="new-password"
              placeholder="Ej: MiClave2026!"
              aria-invalid={Boolean(errors.password)}
              aria-describedby="signup-password-hint signup-password-error"
              disabled={pending}
              {...register('password')}
            />
            <p id="signup-password-hint" className="text-xs text-slate-500">
              8 a 128 caracteres, con mayúscula, minúscula y un dígito o símbolo.
            </p>
            <FieldError id="signup-password-error" message={errors.password?.message} />
          </div>

          <div className="space-y-2">
            <label htmlFor="signup-confirm" className="text-xs font-medium text-slate-300">
              Confirmar contraseña
            </label>
            <PasswordInput
              id="signup-confirm"
              autoComplete="new-password"
              placeholder="Repita la contraseña"
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={errors.confirmPassword ? 'signup-confirm-error' : undefined}
              disabled={pending}
              {...register('confirmPassword')}
            />
            <FieldError id="signup-confirm-error" message={errors.confirmPassword?.message} />
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-3 pt-2">
          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium"
          >
            {pending ? 'Creando cuenta...' : 'Crear cuenta'}
          </Button>
          <p className="text-xs text-slate-400">
            Al registrarte aceptás los <TermsLink />.
          </p>
          <p className="text-xs text-slate-400">
            ¿Ya tiene cuenta?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 underline">
              Inicie sesión
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
};
