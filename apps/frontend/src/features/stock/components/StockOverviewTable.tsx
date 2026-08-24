import React from 'react';
import { Eye, Inbox, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StockStatusBadge } from './StockStatusBadge';
import type { IStockOverviewItem } from '../types/stock.types';

interface StockOverviewTableProps {
  items: IStockOverviewItem[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  onViewLedger: (productId: string) => void;
}

export const StockOverviewTable: React.FC<StockOverviewTableProps> = ({
  items,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  onViewLedger,
}) => {
  if (isLoading) {
    return (
      <div
        data-testid="stock-overview-loading"
        className="w-full bg-card rounded-lg border border-border p-8 space-y-4"
      >
        <div className="flex items-center justify-center gap-3 text-muted-foreground animate-pulse">
          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
          <span>Cargando inventario de stock...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        data-testid="stock-overview-error"
        className="w-full bg-card rounded-lg border border-destructive/30 p-8 text-center space-y-4"
      >
        <div className="text-destructive font-medium">
          {errorMessage || 'Ocurrió un error al cargar el inventario.'}
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
        data-testid="stock-overview-empty"
        className="w-full bg-card rounded-lg border border-border p-12 text-center space-y-3"
      >
        <Inbox className="w-10 h-10 text-muted-foreground mx-auto" />
        <div className="text-base font-medium text-foreground">No se encontraron productos</div>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          No hay productos que coincidan con los filtros de búsqueda seleccionados.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-card rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table
          data-testid="stock-overview-table"
          className="w-full text-left text-sm text-muted-foreground border-collapse"
        >
          <thead className="bg-muted/50 text-foreground font-semibold border-b border-border">
            <tr>
              <th scope="col" className="py-3 px-4 w-28">
                Código
              </th>
              <th scope="col" className="py-3 px-4">
                Producto
              </th>
              <th scope="col" className="py-3 px-4">
                Categoría
              </th>
              <th scope="col" className="py-3 px-4 text-right">
                Stock Actual
              </th>
              <th scope="col" className="py-3 px-4 text-right">
                Stock Mínimo
              </th>
              <th scope="col" className="py-3 px-4 text-center">
                Estado
              </th>
              <th scope="col" className="py-3 px-4 text-center w-28">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => {
              const isCritical = item.currentBaseStock <= 0;
              const isLow = item.currentBaseStock > 0 && item.currentBaseStock <= item.minStock;

              return (
                <tr key={item.productId} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-foreground text-xs">
                    {item.internalCode}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-foreground">{item.productName}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                      {item.category.name}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium">
                    <span
                      className={
                        isCritical
                          ? 'text-destructive font-bold'
                          : isLow
                            ? 'text-amber-600 dark:text-amber-400 font-semibold'
                            : 'text-foreground'
                      }
                    >
                      {item.currentBaseStock.toLocaleString('es-AR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      <span className="text-xs text-muted-foreground font-normal">
                        {item.baseUnit.symbol}
                      </span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-muted-foreground">
                    {item.minStock.toLocaleString('es-AR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    <span className="text-xs">{item.baseUnit.symbol}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <StockStatusBadge status={item.stockStatus} />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewLedger(item.productId)}
                      className="h-8 px-2.5 text-xs text-primary hover:text-primary-foreground hover:bg-primary"
                      aria-label={`Ver ledger de ${item.productName}`}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Ledger
                    </Button>
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
