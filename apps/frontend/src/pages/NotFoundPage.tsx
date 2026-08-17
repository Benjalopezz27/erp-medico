import React from 'react';
import { Link } from '@tanstack/react-router';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-slate-800">
      <Card className="max-w-md w-full border-slate-200 shadow-sm text-center p-8 space-y-4">
        <CardContent className="space-y-4 pt-4">
          <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto text-slate-500">
            <FileQuestion className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <span className="text-4xl font-black text-slate-900 font-mono">404</span>
            <h2 className="text-lg font-bold text-slate-800">Página no encontrada</h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              La ruta a la que intenta acceder no existe o no tiene permisos suficientes para visualizarla.
            </p>
          </div>
          <div className="pt-2">
            <Link to="/">
              <Button className="bg-blue-600 hover:bg-blue-500 text-white text-xs">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Volver al Inicio
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
