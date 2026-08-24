import React from 'react';
import { CheckCircle2, Package, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { IStockBulkLoadConfirmResponse } from '../../types/stock.types';

interface BulkLoadSuccessProps {
  result: IStockBulkLoadConfirmResponse;
  onReset: () => void;
  onGoToOverview: () => void;
}

export const BulkLoadSuccess: React.FC<BulkLoadSuccessProps> = ({
  result,
  onReset,
  onGoToOverview,
}) => {
  return (
    <div className="max-w-2xl mx-auto bg-card border border-border rounded-xl p-8 shadow-sm text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
      <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50 dark:ring-emerald-950/20">
        <CheckCircle2 className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-foreground">
          ¡Carga Inicial de Inventario Completada!
        </h2>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          El lote fue aplicado de forma atómica e inmutable en el libro mayor de stock.
        </p>
      </div>

      {/* Batch Details Card */}
      <div className="bg-muted/40 border border-border rounded-xl p-4 text-left space-y-3 text-xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <span className="text-muted-foreground">ID del Lote (Batch):</span>
          <span className="font-mono font-semibold text-foreground select-all">
            {result.batchId}
          </span>
        </div>
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <span className="text-muted-foreground">Movimientos Registrados:</span>
          <span className="font-semibold text-foreground">
            {result.movementCount} (Tipo: AJUSTE_ENTRADA)
          </span>
        </div>
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <span className="text-muted-foreground">Total Unidades Ingresadas:</span>
          <span className="font-semibold text-primary">
            {result.totalQuantityBase.toLocaleString('es-AR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Fecha y Hora de Confirmación:</span>
          <span className="font-medium text-foreground">
            {new Date(result.confirmedAt).toLocaleString('es-AR')}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReset}
          className="w-full sm:w-auto text-xs gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Realizar Nueva Carga
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={onGoToOverview}
          className="w-full sm:w-auto text-xs gap-1.5"
        >
          <Package className="w-3.5 h-3.5" />
          Ir al Control de Stock
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};
