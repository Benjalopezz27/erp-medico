import React from 'react';
import { Construction, ArrowLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PlaceholderPageProps {
  title: string;
  description: string;
  sprint: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  description,
  sprint,
}) => {
  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-in fade-in duration-200">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-slate-900">{title}</CardTitle>
              <p className="text-xs text-slate-500 mt-1">{description}</p>
            </div>
            <span className="text-xs font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md font-semibold">
              {sprint}
            </span>
          </div>
        </CardHeader>
        <CardContent className="py-12 text-center space-y-4">
          <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto text-amber-600">
            <Construction className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-semibold text-slate-800">
              Módulo en Desarrollo
            </h3>
            <p className="text-xs text-slate-500">
              La funcionalidad para este módulo se implementará en el sprint correspondiente según el plan de arquitectura.
            </p>
          </div>
          <div className="pt-2">
            <Link to="/">
              <Button variant="outline" size="sm" className="text-xs text-slate-700">
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Volver al Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
