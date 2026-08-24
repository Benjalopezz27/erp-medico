import React, { useState } from 'react';
import { CheckCircle2, XCircle, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { IStockBulkLoadValidatedRow } from '../../types/stock.types';

interface BulkLoadPreviewTableProps {
  rows: IStockBulkLoadValidatedRow[];
}

export const BulkLoadPreviewTable: React.FC<BulkLoadPreviewTableProps> = ({ rows }) => {
  const [filterOnlyErrors, setFilterOnlyErrors] = useState(false);

  const hasErrors = rows.some((r) => !r.isValid);
  const displayedRows = filterOnlyErrors ? rows.filter((r) => !r.isValid) : rows;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden space-y-3">
      {/* Table Toolbar */}
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Detalle de Filas ({rows.length})
          </h3>
          <p className="text-xs text-muted-foreground">
            Previsualización y comprobación de productos en catálogo
          </p>
        </div>

        {hasErrors && (
          <Button
            type="button"
            variant={filterOnlyErrors ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterOnlyErrors(!filterOnlyErrors)}
            className="text-xs gap-1.5 h-8"
          >
            <Filter className="w-3.5 h-3.5" />
            {filterOnlyErrors ? 'Ver Todas las Filas' : 'Ver Sólo Filas con Error'}
          </Button>
        )}
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
            {displayedRows.map((row) => {
              const hasRowError = !row.isValid;

              return (
                <tr
                  key={`bulk-row-${row.rowNumber}`}
                  className={`transition-colors ${
                    hasRowError ? 'bg-destructive/5 hover:bg-destructive/10' : 'hover:bg-muted/30'
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
                    {row.isValid ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        VÁLIDO
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-destructive/15 text-destructive">
                        <XCircle className="w-3.5 h-3.5" />
                        ERROR
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
        * El saldo proyectado corresponde a la estimación al momento del preview y sumará a los
        saldos vigentes mediante movimiento AJUSTE_ENTRADA.
      </div>
    </div>
  );
};
