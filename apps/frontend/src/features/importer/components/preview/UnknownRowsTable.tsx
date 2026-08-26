import React from 'react';
import { HelpCircle, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import type { IImporterUnknownRow } from '../../types/importer.types';

interface UnknownRowsTableProps {
  rows: IImporterUnknownRow[];
  onResolveRow: (row: IImporterUnknownRow) => void;
}

export const UnknownRowsTable: React.FC<UnknownRowsTableProps> = ({ rows, onResolveRow }) => {
  if (rows.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
          ¡Excelente! No hay SKUs desconocidos
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          Todos los artículos del archivo ya se encuentran asociados a productos del catálogo
          interno.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            SKUs Desconocidos ({rows.length})
          </h3>
        </div>
        <span className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-full font-medium">
          Requiere asociar antes de continuar
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="py-3 px-4 w-16 text-center">Fila</th>
              <th className="py-3 px-4">SKU Prov.</th>
              <th className="py-3 px-4">Descripción en Archivo</th>
              <th className="py-3 px-4 text-right">Costo Neto</th>
              <th className="py-3 px-4 text-center">Cant.</th>
              <th className="py-3 px-4 text-center">Unidad Archivo</th>
              <th className="py-3 px-4 text-center w-36">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
            {rows.map((row) => (
              <tr
                key={`unknown-${row.rowNumber}`}
                className="hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition-colors"
              >
                <td className="py-3 px-4 text-center font-mono text-xs text-slate-400">
                  {row.rowNumber}
                </td>
                <td className="py-3 px-4 font-mono font-medium text-amber-800 dark:text-amber-300">
                  {row.rawSku}
                </td>
                <td
                  className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-sm truncate"
                  title={row.supplierDescription ?? ''}
                >
                  {row.supplierDescription || <span className="text-slate-400 italic">-</span>}
                </td>
                <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                  $
                  {Number(row.usualCostNet).toLocaleString('es-AR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}
                </td>
                <td className="py-3 px-4 text-center font-mono text-xs text-slate-600 dark:text-slate-400">
                  {row.rawQuantity || <span className="text-slate-400 italic">-</span>}
                </td>
                <td className="py-3 px-4 text-center text-xs">
                  {row.rawPurchaseUnit ? (
                    <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                      {row.rawPurchaseUnit}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">-</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  <button
                    type="button"
                    onClick={() => onResolveRow(row)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    Asociar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
