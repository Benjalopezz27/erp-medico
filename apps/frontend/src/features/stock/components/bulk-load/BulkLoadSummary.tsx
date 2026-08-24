import React from 'react';
import { Layers, CheckCircle2, AlertTriangle, Boxes, Info } from 'lucide-react';
import type { IStockBulkLoadSummary } from '../../types/stock.types';

interface BulkLoadSummaryProps {
  summary: IStockBulkLoadSummary;
  isValid: boolean;
}

export const BulkLoadSummary: React.FC<BulkLoadSummaryProps> = ({ summary, isValid }) => {
  return (
    <div className="space-y-4">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Filas</span>
            <Layers className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{summary.totalRows}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Filas Válidas
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            {summary.validRows}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-destructive">Filas con Error</span>
            <AlertTriangle className="w-4 h-4 text-destructive" />
          </div>
          <p className="text-2xl font-bold text-destructive mt-2">{summary.invalidRows}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-primary">Total Unidades</span>
            <Boxes className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-primary mt-2">
            {summary.totalQuantityBase.toLocaleString('es-AR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      {/* Validation Status Banner */}
      {!isValid ? (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs leading-relaxed"
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">El archivo contiene errores de validación</p>
            <p className="mt-0.5">
              Por política de integridad estricta (todo o nada), no es posible aplicar la carga
              hasta corregir todas las filas observadas en tu archivo y volver a subirlo.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs leading-relaxed">
          <Info className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="font-semibold text-sm">Validación satisfactoria</p>
            <p className="mt-0.5">
              Todas las filas son válidas y están listas para ser confirmadas. Los saldos
              proyectados reflejan la suma del stock actual más la cantidad a cargar al momento del
              preview.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
