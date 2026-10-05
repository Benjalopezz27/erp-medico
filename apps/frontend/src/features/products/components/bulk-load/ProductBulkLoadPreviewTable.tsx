import React, { useState } from 'react';
import { CheckCircle2, XCircle, Filter, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductBulkLoadRowStatus, type IProductBulkLoadValidatedRow } from '@erp/shared-types';

interface ProductBulkLoadPreviewTableProps {
  rows: IProductBulkLoadValidatedRow[];
}

type FilterView = 'ALL' | 'VALID' | 'ERRORS';

export const ProductBulkLoadPreviewTable: React.FC<ProductBulkLoadPreviewTableProps> = ({
  rows,
}) => {
  const [filterView, setFilterView] = useState<FilterView>('ALL');

  const hasErrors = rows.some((r) => r.status === ProductBulkLoadRowStatus.INVALID);

  const displayedRows = rows.filter((r) => {
    if (filterView === 'ERRORS') {
      return r.status === ProductBulkLoadRowStatus.INVALID;
    }
    if (filterView === 'VALID') {
      return r.status === ProductBulkLoadRowStatus.VALID;
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
            Previsualización y comprobación de productos antes de la creación
          </p>
        </div>

        {/* Filter Toggle Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            type="button"
            variant={filterView === 'ALL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterView('ALL')}
            className="text-xs h-8"
          >
            Ver Todos
          </Button>

          <Button
            type="button"
            variant={filterView === 'VALID' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterView('VALID')}
            className="text-xs h-8"
          >
            Sólo Válidos
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
              <th scope="col" className="py-3 px-4 w-14">
                Fila
              </th>
              <th scope="col" className="py-3 px-4">
                Producto
              </th>
              <th scope="col" className="py-3 px-4">
                Categoría
              </th>
              <th scope="col" className="py-3 px-4">
                U. Base
              </th>
              <th scope="col" className="py-3 px-4 text-right">
                Costo Neto
              </th>
              <th scope="col" className="py-3 px-4 text-right">
                Precio Neto
              </th>
              <th scope="col" className="py-3 px-4 text-right">
                Stock Inicial
              </th>
              <th scope="col" className="py-3 px-4 text-right">
                Stock Mín.
              </th>
              <th scope="col" className="py-3 px-4">
                IVA / Fiscal
              </th>
              <th scope="col" className="py-3 px-4">
                Conversiones
              </th>
              <th scope="col" className="py-3 px-4 text-center w-28">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {displayedRows.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-muted-foreground">
                  No hay filas para mostrar en este filtro.
                </td>
              </tr>
            ) : (
              displayedRows.map((row) => {
                const isValid = row.status === ProductBulkLoadRowStatus.VALID;
                const p = row.product;

                return (
                  <tr
                    key={row.rowNumber}
                    className={`transition-colors ${
                      !isValid ? 'bg-destructive/5 hover:bg-destructive/10' : 'hover:bg-muted/30'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-medium text-muted-foreground">
                      #{row.rowNumber}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-foreground">
                        {p?.name || row.name || '—'}
                      </div>
                      {p?.description && (
                        <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                          {p.description}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-medium text-foreground">{p?.categoryName || '—'}</span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-mono text-muted-foreground">
                        {p?.baseUnitSymbol || '—'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-medium text-foreground">
                      {p?.costNet !== undefined ? `$${p.costNet.toFixed(2)}` : '—'}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {p?.activePriceNet !== undefined ? `$${p.activePriceNet.toFixed(2)}` : '—'}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-semibold text-primary">
                      {p?.initialStock !== undefined ? p.initialStock : '—'}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                      {p?.minStock !== undefined ? p.minStock : '—'}
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-[11px]">
                        <span className="font-medium text-foreground">
                          {p?.taxTreatment || 'GRAVADO'}
                        </span>
                        <span className="text-muted-foreground ml-1">
                          ({p?.ivaPercentage !== undefined ? `${p.ivaPercentage}%` : '—'})
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {p && p.conversions && p.conversions.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {p.conversions.map((c, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-foreground"
                            >
                              {c.presentationUnitSymbol}:{c.conversionFactor}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {isValid ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Válido
                        </span>
                      ) : (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-destructive/10 text-destructive">
                            <XCircle className="w-3.5 h-3.5" />
                            Error
                          </span>
                          <div className="text-[10px] text-destructive text-left space-y-0.5 max-w-xs">
                            {row.errors.map((e, idx) => (
                              <div key={idx} className="flex items-start gap-1">
                                <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                                <span>{e.message}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
