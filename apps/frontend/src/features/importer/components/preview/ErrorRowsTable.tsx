import React from 'react';
import { AlertOctagon, CheckCircle2 } from 'lucide-react';
import type { IImporterErrorRow } from '../../types/importer.types';

interface ErrorRowsTableProps {
  rows: IImporterErrorRow[];
}

export const ErrorRowsTable: React.FC<ErrorRowsTableProps> = ({ rows }) => {
  if (rows.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
          Sin errores detectados
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          Todas las filas del archivo cumplen con los estándares de validación de sintaxis y
          compatibilidad.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Filas con Error ({rows.length})
          </h3>
        </div>
        <span className="text-xs text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 px-2.5 py-1 rounded-full font-medium">
          Errores bloqueantes para confirmación
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="py-3 px-4 w-16 text-center">Fila</th>
              <th className="py-3 px-4">SKU Prov.</th>
              <th className="py-3 px-4">Costo Recibido</th>
              <th className="py-3 px-4">Descripción</th>
              <th className="py-3 px-4 text-center">Cant.</th>
              <th className="py-3 px-4 text-center">Unidad</th>
              <th className="py-3 px-4">Errores Detectados</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
            {rows.map((row) => (
              <tr
                key={`error-${row.rowNumber}`}
                className="hover:bg-rose-50/40 dark:hover:bg-rose-950/20 transition-colors"
              >
                <td className="py-3 px-4 text-center font-mono text-xs text-rose-500 font-bold">
                  {row.rowNumber}
                </td>
                <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-slate-100">
                  {row.rawSku || <span className="text-rose-500 italic">[Vacío]</span>}
                </td>
                <td className="py-3 px-4 font-mono text-slate-800 dark:text-slate-200">
                  {row.rawCost !== null && row.rawCost !== undefined ? (
                    row.rawCost
                  ) : (
                    <span className="text-rose-500 italic">[Vacío]</span>
                  )}
                </td>
                <td
                  className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate"
                  title={row.rawDescription ?? ''}
                >
                  {row.rawDescription || <span className="text-slate-400 italic">-</span>}
                </td>
                <td className="py-3 px-4 text-center font-mono text-xs text-slate-600 dark:text-slate-400">
                  {row.rawQuantity || <span className="text-slate-400 italic">-</span>}
                </td>
                <td className="py-3 px-4 text-center text-xs">
                  {row.rawPurchaseUnit || <span className="text-slate-400 italic">-</span>}
                </td>
                <td className="py-3 px-4">
                  <div className="space-y-1.5">
                    {row.errors.map((err, idx) => (
                      <div
                        key={`err-${row.rowNumber}-${idx}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                      >
                        <span className="font-mono font-semibold text-[10px] text-rose-600 dark:text-rose-400">
                          [{err.field}]
                        </span>
                        <span>{err.message}</span>
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
