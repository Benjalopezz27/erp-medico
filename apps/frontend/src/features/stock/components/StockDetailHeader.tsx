import React from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StockStatusBadge } from './StockStatusBadge';
import { ProductStatus } from '@erp/shared-types';
import type { IStockDetailResponse } from '../types/stock.types';

interface StockDetailHeaderProps {
  product: IStockDetailResponse['product'];
  onBack: () => void;
}

export const StockDetailHeader: React.FC<StockDetailHeaderProps> = ({ product, onBack }) => {
  const isInactive = product.status === ProductStatus.INACTIVE;

  return (
    <div
      data-testid="stock-detail-header"
      className="bg-card rounded-lg border border-border p-6 space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-9 px-3 text-xs"
            aria-label="Volver al inventario de stock"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Volver
          </Button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {product.internalCode}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {product.productName}
              </h1>
              <StockStatusBadge status={product.stockStatus} />
            </div>

            <p className="text-xs text-muted-foreground mt-1">
              Categoría: <strong className="text-foreground">{product.category.name}</strong> &bull;
              Unidad Base:{' '}
              <strong className="text-foreground">
                {product.baseUnit.name} ({product.baseUnit.symbol})
              </strong>
            </p>
          </div>
        </div>

        {/* Stock Balance Cards */}
        <div className="flex items-center gap-4 bg-muted/40 p-3 rounded-lg border border-border">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Stock Actual</div>
            <div className="text-xl font-bold text-foreground">
              {product.currentBaseStock.toLocaleString('es-AR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              <span className="text-xs font-normal text-muted-foreground">
                {product.baseUnit.symbol}
              </span>
            </div>
          </div>

          <div className="h-8 w-px bg-border" />

          <div className="text-right">
            <div className="text-xs text-muted-foreground">Stock Mínimo</div>
            <div className="text-base font-semibold text-muted-foreground">
              {product.minStock.toLocaleString('es-AR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              <span className="text-xs font-normal">{product.baseUnit.symbol}</span>
            </div>
          </div>
        </div>
      </div>

      {isInactive && (
        <div
          data-testid="stock-inactive-banner"
          className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-md text-xs font-medium"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            Este producto está <strong>inactivo</strong> en el catálogo. Se muestra su historial
            inmutable de movimientos con fines de auditoría.
          </span>
        </div>
      )}
    </div>
  );
};
