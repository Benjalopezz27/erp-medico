import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Lock, Mail, AlertCircle, ArrowRight, Shield, User as UserIcon } from 'lucide-react';
import { useAuthStore, UserRole } from '@/stores/authStore';
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

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [email, setEmail] = useState('admin@erp.com');
  const [password, setPassword] = useState('Admin1234!');
  const [role, setRole] = useState<UserRole>(UserRole.ADMINISTRADOR);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleQuickPreset = (presetRole: UserRole) => {
    setRole(presetRole);
    if (presetRole === UserRole.ADMINISTRADOR) {
      setEmail('admin@erp.com');
      setPassword('Admin1234!');
    } else {
      setEmail('vendedor@erp.com');
      setPassword('Vendedor1234!');
    }
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      if (!email || !password) {
        setError('Por favor complete todos los campos.');
        return;
      }
      if (password.length < 6) {
        setError('Credenciales inválidas. Verifique su contraseña.');
        return;
      }

      login(email, role);
      navigate({ to: '/' });
    }, 400);
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

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-800 rounded-lg flex items-center space-x-2 text-red-300 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Role selector chips for testing */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-slate-300">
              Acceso rápido de prueba (Sprint 0):
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickPreset(UserRole.ADMINISTRADOR)}
                className={`p-2 rounded-lg border text-xs font-medium flex items-center justify-center space-x-1.5 transition-all ${
                  role === UserRole.ADMINISTRADOR
                    ? 'border-blue-500 bg-blue-600/20 text-blue-300'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickPreset(UserRole.VENDEDOR)}
                className={`p-2 rounded-lg border text-xs font-medium flex items-center justify-center space-x-1.5 transition-all ${
                  role === UserRole.VENDEDOR
                    ? 'border-blue-500 bg-blue-600/20 text-blue-300'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Vendedor</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300">Correo Electrónico</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <Input
                type="email"
                placeholder="usuario@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <Input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-blue-500"
                required
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-2">
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center justify-center space-x-2"
          >
            <span>{isLoading ? 'Ingresando...' : 'Iniciar Sesión'}</span>
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
