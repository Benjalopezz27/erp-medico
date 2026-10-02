import React from 'react';
import { Layers, CheckCircle2, AlertTriangle, Package, Info } from 'lucide-react';
import type { IProductBulkLoadSummary } from '@erp/shared-types';

interface ProductBulkLoadSummaryProps {
  summary: IProductBulkLoadSummary;
  isValid: boolean;
}

export const ProductBulkLoadSummary: React.FC<ProductBulkLoadSummaryProps> = ({
  summary,
  isValid,
}) => {
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
              Productos Válidos
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
            <span className="text-xs font-medium text-primary">Stock Inicial Total</span>
            <Package className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-primary mt-2">
            {summary.totalInitialStock.toLocaleString('es-AR', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      {/* Validation Status Banner */}
      {summary.totalRows === 0 ? (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 rounded-xl text-xs leading-relaxed"
        >
          <Info className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-semibold text-sm">Sin productos para cargar</p>
            <p className="mt-0.5">
              El archivo subido no contiene filas con datos de productos válidos.
            </p>
          </div>
        </div>
      ) : !isValid ? (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs leading-relaxed"
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">El archivo contiene errores de validación</p>
            <p className="mt-0.5">
              Por política de integridad transaccional estricta (todo o nada), no es posible crear
              el catálogo hasta corregir todas las filas observadas y volver a subir el archivo.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs leading-relaxed">
          <Info className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="font-semibold text-sm">Validación satisfactoria</p>
            <p className="mt-0.5">
              {summary.validRows} producto(s) listo(s) para ser creados en el catálogo. Se generarán
              los balances y movimientos de stock inicial correspondientes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
