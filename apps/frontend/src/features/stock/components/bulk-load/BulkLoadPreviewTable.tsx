import React, { useState } from 'react';
import { CheckCircle2, XCircle, MinusCircle, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StockBulkLoadRowStatus, type IStockBulkLoadValidatedRow } from '../../types/stock.types';

interface BulkLoadPreviewTableProps {
  rows: IStockBulkLoadValidatedRow[];
}

type FilterView = 'INCLUDED' | 'ALL' | 'ERRORS';

export const BulkLoadPreviewTable: React.FC<BulkLoadPreviewTableProps> = ({ rows }) => {
  const [filterView, setFilterView] = useState<FilterView>('INCLUDED');

  const hasErrors = rows.some((r) => r.status === StockBulkLoadRowStatus.INCLUDED_INVALID);
  const hasSkipped = rows.some((r) => r.status === StockBulkLoadRowStatus.SKIPPED);

  const displayedRows = rows.filter((r) => {
    if (filterView === 'ERRORS') {
      return r.status === StockBulkLoadRowStatus.INCLUDED_INVALID;
    }
    if (filterView === 'INCLUDED') {
      return r.status !== StockBulkLoadRowStatus.SKIPPED;
    }
    return true; // ALL
  });

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden space-y-3">
      {/* Table Toolbar */}
      <div className="px-5 py-3.5 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Detalle de Filas ({displayedRows.length} de {rows.length})
          </h3>
          <p className="text-xs text-muted-foreground">
            Previsualización y comprobación de productos en catálogo
          </p>
        </div>

        {/* Filter Toggle Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {hasSkipped && (
            <Button
              type="button"
              variant={filterView === 'INCLUDED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterView('INCLUDED')}
              className="text-xs h-8"
            >
              Productos a Cargar
            </Button>
          )}

          <Button
            type="button"
            variant={filterView === 'ALL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterView('ALL')}
            className="text-xs h-8"
          >
            Ver Todos
          </Button>

          {hasErrors && (
            <Button
              type="button"
              variant={filterView === 'ERRORS' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setFilterView('ERRORS')}
              className="text-xs gap-1.5 h-8 text-destructive hover:text-destructive-foreground"
            >
              <Filter className="w-3.5 h-3.5" />
              Sólo Errores
            </Button>
          )}
        </div>
      </div>

      {/* Grid / Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/50 text-muted-foreground uppercase text-[11px] font-semibold tracking-wider border-b border-border">
            <tr>
              <th scope="col" className="py-3 px-4 w-16">
                Fila
              </th>
              <th scope="col" className="py-3 px-4">
                Código
              </th>
              <th scope="col" className="py-3 px-4">
                Producto Resuelto
              </th>
              <th scope="col" className="py-3 px-4 text-right">
                Cantidad a Cargar
              </th>
              <th scope="col" className="py-3 px-4 text-right">
                Saldo Actual
              </th>
              <th scope="col" className="py-3 px-4 text-right">
                Saldo Proyectado*
              </th>
              <th scope="col" className="py-3 px-4 text-center w-28">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {displayedRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground">
                  No hay filas para mostrar con el filtro seleccionado.
                </td>
              </tr>
            ) : (
              displayedRows.map((row) => {
                const isError = row.status === StockBulkLoadRowStatus.INCLUDED_INVALID;
                const isSkipped = row.status === StockBulkLoadRowStatus.SKIPPED;

                return (
                  <tr
                    key={`bulk-row-${row.rowNumber}`}
                    className={`transition-colors ${
                      isError
                        ? 'bg-destructive/5 hover:bg-destructive/10'
                        : isSkipped
                          ? 'bg-muted/10 hover:bg-muted/20 opacity-75'
                          : 'hover:bg-muted/30'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono text-muted-foreground">#{row.rowNumber}</td>
                    <td className="py-3 px-4 font-mono font-medium text-foreground">
                      {row.internalCode || '—'}
                    </td>
                    <td className="py-3 px-4">
                      {row.product ? (
                        <div>
                          <p className="font-medium text-foreground">{row.product.name}</p>
                          <span className="text-[11px] text-muted-foreground">
                            Unidad Base: {row.product.baseUnit.name} ({row.product.baseUnit.symbol})
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">No resuelto</span>
                      )}

                      {/* Row Errors Breakdown */}
                      {row.errors.length > 0 && (
                        <div className="mt-1.5 space-y-1">
                          {row.errors.map((err, idx) => (
                            <div
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-destructive/15 text-destructive text-[11px] font-medium mr-1.5"
                            >
                              <span>{err.message}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">
                      {row.quantityBase !== null
                        ? row.quantityBase.toLocaleString('es-AR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                      {row.product
                        ? row.product.currentBaseStock.toLocaleString('es-AR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {row.product
                        ? row.product.projectedStock.toLocaleString('es-AR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.status === StockBulkLoadRowStatus.INCLUDED_VALID && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          INCLUIDO
                        </span>
                      )}
                      {row.status === StockBulkLoadRowStatus.INCLUDED_INVALID && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-destructive/15 text-destructive">
                          <XCircle className="w-3.5 h-3.5" />
                          ERROR
                        </span>
                      )}
                      {row.status === StockBulkLoadRowStatus.SKIPPED && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          <MinusCircle className="w-3.5 h-3.5" />
                          OMITIDO
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-2.5 bg-muted/20 border-t border-border text-[11px] text-muted-foreground">
        * El saldo proyectado corresponde a la estimación al momento del preview y sumará a los
        saldos vigentes mediante movimiento AJUSTE_ENTRADA. Las filas omitidas no alteran el stock.
      </div>
    </div>
  );
};
