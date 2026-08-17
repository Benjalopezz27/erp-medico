import React from 'react';
import { Link } from '@tanstack/react-router';
import {
  TrendingUp,
  AlertTriangle,
  FileCheck2,
  Wallet,
  ShoppingCart,
  Boxes,
  PlusCircle,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMINISTRADOR';

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
            Puesto de trabajo único • Operación en tiempo real • {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
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

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Ventas del Día
            </CardTitle>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">$ 0.00</div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center">
              <span className="text-emerald-600 font-semibold mr-1 flex items-center">
                <ArrowUpRight className="w-3 h-3" /> 0%
              </span>
              vs jornada anterior
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Alertas de Stock
            </CardTitle>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">0 ítems</div>
            <p className="text-[11px] text-slate-500 mt-1">Por debajo del stock mínimo</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Facturación ARCA
            </CardTitle>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">Al Día</div>
            <p className="text-[11px] text-slate-500 mt-1">0 comprobantes pendientes</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {isAdmin ? 'Tesorería Total' : 'Turno de Caja'}
            </CardTitle>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Wallet className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">$ 0.00</div>
            <p className="text-[11px] text-slate-500 mt-1">
              {isAdmin ? 'Efectivo + Bancos + Cheques' : 'Saldo inicial registrado'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Operational Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">
              Actividad Reciente del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center text-slate-400 space-y-2">
              <Clock className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-sm">No hay transacciones registradas hoy.</p>
              <p className="text-xs text-slate-400">
                Los movimientos de stock y ventas aparecerán en tiempo real aquí.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">
              Accesos Rápidos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <Link to="/products" className="block">
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
