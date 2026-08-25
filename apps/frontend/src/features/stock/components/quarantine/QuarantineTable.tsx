import React from 'react';
import {
  ShieldAlert,
  Loader2,
  AlertCircle,
  RotateCcw,
  CheckSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuarantineStatusBadge } from './QuarantineStatusBadge';
import {
  QuarantineStatus,
  type IQuarantineStock,
} from '../../types/quarantine.types';

interface QuarantineTableProps {
  items: IQuarantineStock[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  onOpenResolve: (item: IQuarantineStock) => void;
}

export const QuarantineTable: React.FC<QuarantineTableProps> = ({
  items,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  onOpenResolve,
}) => {
  if (isLoading) {
    return (
      <div
        data-testid="quarantine-loading-state"
        className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center text-muted-foreground shadow-sm"
      >
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium">Cargando registros de cuarentena...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        data-testid="quarantine-error-state"
        className="bg-destructive/5 border border-destructive/20 rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-sm"
      >
        <div className="p-3 bg-destructive/10 text-destructive rounded-full mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">
          Error al cargar registros de cuarentena
        </h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-md">
          {errorMessage || 'Ocurrió un error inesperado al consultar los datos.'}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-4 text-xs gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reintentar
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        data-testid="quarantine-empty-state"
        className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center text-center text-muted-foreground shadow-sm"
      >
        <div className="p-3 bg-muted rounded-full mb-3 text-muted-foreground">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">
          No hay registros de cuarentena
        </h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          No se encontraron productos retenidos o apartados con los filtros seleccionados.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/50 text-muted-foreground uppercase text-[11px] font-semibold tracking-wider border-b border-border">
            <tr>
              <th scope="col" className="py-3.5 px-4">
                Producto
              </th>
              <th scope="col" className="py-3.5 px-4 text-right">
                Cantidad Retenida
              </th>
              <th scope="col" className="py-3.5 px-4">
                Motivo / Ingresado Por
              </th>
              <th scope="col" className="py-3.5 px-4">
                Fecha Ingreso
              </th>
              <th scope="col" className="py-3.5 px-4 text-center">
                Estado
              </th>
              <th scope="col" className="py-3.5 px-4">
                Resolución / Notas
              </th>
              <th scope="col" className="py-3.5 px-4 text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => {
              const isPending = item.status === QuarantineStatus.EN_CUARENTENA;

              return (
                <tr
                  key={`quarantine-row-${item.id}`}
                  className="hover:bg-muted/30 transition-colors"
                  data-testid={`quarantine-row-${item.id}`}
                >
                  {/* Product */}
                  <td className="py-3.5 px-4">
                    <div>
                      <p className="font-semibold text-foreground">{item.product.name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        <span className="font-mono">{item.product.internalCode}</span>
                        <span>•</span>
                        <span>
                          Unidad: {item.product.baseUnit.name} ({item.product.baseUnit.symbol})
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Quantity */}
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground">
                    {item.quantityBase.toLocaleString('es-AR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    <span className="text-[11px] font-normal text-muted-foreground">
                      {item.product.baseUnit.symbol}
                    </span>
                  </td>

                  {/* Reason & Entry Actor */}
                  <td className="py-3.5 px-4 max-w-xs">
                    <p className="text-foreground line-clamp-2" title={item.reason}>
                      {item.reason}
                    </p>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      Por: {item.entryActor.name}
                    </span>
                  </td>

                  {/* Entry Date */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                    {new Date(item.createdAt).toLocaleDateString('es-AR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 text-center">
                    <QuarantineStatusBadge status={item.status} />
                  </td>

                  {/* Resolution details */}
                  <td className="py-3.5 px-4 max-w-xs">
                    {item.resolutionNotes ? (
                      <div>
                        <p
                          className="text-foreground text-[11px] line-clamp-2"
                          title={item.resolutionNotes}
                        >
                          {item.resolutionNotes}
                        </p>
                        {item.resolvedByActor && (
                          <span className="text-[10px] text-muted-foreground block mt-0.5">
                            Por: {item.resolvedByActor.name} (
                            {item.resolvedAt
                              ? new Date(item.resolvedAt).toLocaleDateString('es-AR')
                              : ''}
                            )
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic text-[11px]">
                        Pendiente de resolución
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    {isPending ? (
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={() => onOpenResolve(item)}
                        className="text-xs gap-1.5 h-8 bg-amber-600 hover:bg-amber-700 text-white"
                        data-testid={`quarantine-resolve-btn-${item.id}`}
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        Resolver
                      </Button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground font-medium">
                        Completado
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-2.5 bg-muted/20 border-t border-border text-[11px] text-muted-foreground">
        * El stock en cuarentena no computa para la venta disponible. Al resolver como Reingreso,
        se registrará un movimiento AJUSTE_ENTRADA.
      </div>
    </div>
  );
};
