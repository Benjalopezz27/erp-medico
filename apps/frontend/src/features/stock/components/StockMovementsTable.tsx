import React from 'react';
import { Inbox, RefreshCw, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StockMovementType, type IStockMovementItem } from '../types/stock.types';

interface StockMovementsTableProps {
  items: IStockMovementItem[];
  baseUnitSymbol: string;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
}

const formatDateTime = (isoString: string | Date) => {
  try {
    const d = new Date(isoString);
    return d.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(isoString);
  }
};

const getMovementTypeBadge = (type: StockMovementType) => {
  switch (type) {
    case StockMovementType.ENTRADA_COMPRA:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
          <ArrowUpRight className="w-3.5 h-3.5" />
          Entrada Compra
        </span>
      );
    case StockMovementType.SALIDA_VENTA:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
          <ArrowDownRight className="w-3.5 h-3.5" />
          Salida Venta
        </span>
      );
    case StockMovementType.MERMA:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
          <ArrowDownRight className="w-3.5 h-3.5" />
          Merma
        </span>
      );
    case StockMovementType.AJUSTE_ENTRADA:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300">
          <ArrowUpRight className="w-3.5 h-3.5" />
          Ajuste Entrada
        </span>
      );
    case StockMovementType.AJUSTE_SALIDA:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300">
          <ArrowDownRight className="w-3.5 h-3.5" />
          Ajuste Salida
        </span>
      );
    case StockMovementType.DEVOLUCION_CLIENTE:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
          <ArrowUpRight className="w-3.5 h-3.5" />
          Devolución Cliente
        </span>
      );
    default:
      return (
        <span className="inline-block px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
          {type}
        </span>
      );
  }
};

const isPositiveMovement = (type: StockMovementType) => {
  return (
    type === StockMovementType.ENTRADA_COMPRA ||
    type === StockMovementType.AJUSTE_ENTRADA ||
    type === StockMovementType.DEVOLUCION_CLIENTE
  );
};

export const StockMovementsTable: React.FC<StockMovementsTableProps> = ({
  items,
  baseUnitSymbol,
  isLoading,
  isError,
  errorMessage,
  onRetry,
}) => {
  if (isLoading) {
    return (
      <div
        data-testid="stock-movements-loading"
        className="w-full bg-card rounded-lg border border-border p-8 space-y-4"
      >
        <div className="flex items-center justify-center gap-3 text-muted-foreground animate-pulse">
          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
          <span>Cargando libro de movimientos (ledger)...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        data-testid="stock-movements-error"
        className="w-full bg-card rounded-lg border border-destructive/30 p-8 text-center space-y-4"
      >
        <div className="text-destructive font-medium">
          {errorMessage || 'Ocurrió un error al consultar el historial de movimientos.'}
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Reintentar
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        data-testid="stock-movements-empty"
        className="w-full bg-card rounded-lg border border-border p-12 text-center space-y-3"
      >
        <Inbox className="w-10 h-10 text-muted-foreground mx-auto" />
        <div className="text-base font-medium text-foreground">Sin movimientos registrados</div>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          No se encontraron movimientos para este producto con los filtros aplicados.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-card rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table
          data-testid="stock-movements-table"
          className="w-full text-left text-sm text-muted-foreground border-collapse"
        >
          <thead className="bg-muted/50 text-foreground font-semibold border-b border-border">
            <tr>
              <th scope="col" className="py-3 px-4 w-40">
                Fecha / Hora
              </th>
              <th scope="col" className="py-3 px-4">
                Tipo
              </th>
              <th scope="col" className="py-3 px-4 text-right">
                Cantidad
              </th>
              <th scope="col" className="py-3 px-4 text-right">
                Saldo Anterior
              </th>
              <th scope="col" className="py-3 px-4 text-right">
                Saldo Resultante
              </th>
              <th scope="col" className="py-3 px-4">
                Motivo / Justificación
              </th>
              <th scope="col" className="py-3 px-4">
                Doc. Ref.
              </th>
              <th scope="col" className="py-3 px-4">
                Usuario
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((m) => {
              const positive = isPositiveMovement(m.movementType);

              return (
                <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-mono text-xs text-foreground whitespace-nowrap">
                    {formatDateTime(m.createdAt)}
                  </td>
                  <td className="py-3 px-4">{getMovementTypeBadge(m.movementType)}</td>
                  <td className="py-3 px-4 text-right font-semibold whitespace-nowrap">
                    <span
                      className={
                        positive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }
                    >
                      {positive ? '+' : '-'}
                      {m.quantityBase.toLocaleString('es-AR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      <span className="text-xs text-muted-foreground font-normal">
                        {baseUnitSymbol}
                      </span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs">
                    {m.previousStock.toLocaleString('es-AR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs font-bold text-foreground">
                    {m.subsequentStock.toLocaleString('es-AR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-3 px-4 max-w-xs">
                    <span className="text-foreground text-xs">{m.reason}</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                    {m.documentReference || '-'}
                  </td>
                  <td className="py-3 px-4 text-xs text-foreground font-medium">
                    {m.user?.name || 'Sistema'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
