import React from 'react';
import { Link } from '@tanstack/react-router';
import { ShoppingCart, Boxes, PlusCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { UserRole } from '@erp/shared-types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ActivityFeed } from '@/features/dashboard/components/ActivityFeed';
import { KpiCards } from '@/features/dashboard/components/KpiCards';
import { FirstStepsCard } from '@/features/onboarding/components/FirstStepsCard';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === UserRole.ADMINISTRADOR;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Bienvenido, {user?.name || 'Usuario'}
            </h1>
            <Badge variant={isAdmin ? 'default' : 'secondary'} className="text-xs">
              {user?.role}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Puesto de trabajo único • Operación en tiempo real •{' '}
            {new Date().toLocaleDateString('es-AR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link to="/sales">
            <Button className="bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm flex items-center space-x-1.5 shadow-sm">
              <ShoppingCart className="w-4 h-4" />
              <span>Nueva Venta</span>
            </Button>
          </Link>
          <Link to="/stock">
            <Button variant="outline" className="text-xs sm:text-sm flex items-center space-x-1.5">
              <Boxes className="w-4 h-4 text-slate-500" />
              <span>Consultar Stock</span>
            </Button>
          </Link>
        </div>
      </div>

      {isAdmin && <FirstStepsCard />}

      {isAdmin && <KpiCards />}

      {/* Operational Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">
              Actividad reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed />
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">
              Accesos Rápidos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <Link to="/products" search={{ page: 1, limit: 10 }} className="block">
              <Button variant="outline" className="w-full justify-start text-xs text-slate-700">
                <PlusCircle className="w-4 h-4 mr-2 text-blue-600" />
                Catálogo de Productos
              </Button>
            </Link>
            <Link to="/customers" className="block">
              <Button variant="outline" className="w-full justify-start text-xs text-slate-700">
                <PlusCircle className="w-4 h-4 mr-2 text-emerald-600" />
                Administración de Clientes
              </Button>
            </Link>
            {isAdmin && (
              <>
                <Link to="/purchases" className="block">
                  <Button variant="outline" className="w-full justify-start text-xs text-slate-700">
                    <PlusCircle className="w-4 h-4 mr-2 text-amber-600" />
                    Órdenes de Compra
                  </Button>
                </Link>
                <Link to="/settings" className="block">
                  <Button variant="outline" className="w-full justify-start text-xs text-slate-700">
                    <PlusCircle className="w-4 h-4 mr-2 text-indigo-600" />
                    Configuración General
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
