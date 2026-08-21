import React from 'react';
import { Pencil, Trash2, Scale, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { IUnit } from '../types/units.types';

interface UnitsTableProps {
  units?: IUnit[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onEdit: (unit: IUnit) => void;
  onDelete: (unit: IUnit) => void;
  isAdmin: boolean;
}

export const UnitsTable: React.FC<UnitsTableProps> = ({
  units = [],
  isLoading,
  isError,
  onRetry,
  onEdit,
  onDelete,
  isAdmin,
}) => {
  const formatDate = (dateValue: Date | string) => {
    try {
      const d = new Date(dateValue);
      return new Intl.DateTimeFormat('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(d);
    } catch {
      return String(dateValue);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center space-y-3">
        <div className="flex items-center justify-center gap-2 text-red-700 font-semibold text-sm">
          <AlertCircle className="w-5 h-5" />
          <span>No se pudieron cargar las unidades de medida</span>
        </div>
        <p className="text-xs text-red-600">
          Ocurrió un error al obtener el listado. Por favor intente nuevamente.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="text-xs gap-1.5 border-red-300 text-red-700 hover:bg-red-100"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reintentar
        </Button>
      </div>
    );
  }

  if (units.length === 0) {
    return (
      <div className="p-8 bg-white border border-slate-200 rounded-xl text-center space-y-2">
        <div className="w-10 h-10 mx-auto bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
          <Scale className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900">
          No hay unidades de medida registradas
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          {isAdmin
            ? 'Cree su primera unidad de medida (ej. Unidad, Caja, Frasco, Litro) para los productos del catálogo.'
            : 'Actualmente no existen unidades de medida configuradas en el sistema.'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Nombre</th>
              <th className="py-3 px-4">Símbolo</th>
              <th className="py-3 px-4">Fecha de Alta</th>
              {isAdmin && <th className="py-3 px-4 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {units.map((unit) => (
              <tr key={unit.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 font-medium text-slate-900">
                  <div className="flex items-center gap-2">
                    <Scale className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>{unit.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-mono text-xs border border-slate-200">
                    {unit.symbol}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-500 font-mono">{formatDate(unit.createdAt)}</td>
                {isAdmin && (
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(unit)}
                        className="h-8 px-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 text-xs gap-1"
                        aria-label={`Editar unidad ${unit.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(unit)}
                        className="h-8 px-2 text-slate-600 hover:text-red-600 hover:bg-red-50 text-xs gap-1"
                        aria-label={`Eliminar unidad ${unit.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
