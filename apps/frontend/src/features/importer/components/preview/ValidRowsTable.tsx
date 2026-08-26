import React from 'react';
import { CheckCircle2, PackageCheck } from 'lucide-react';
import type { IImporterValidRow } from '../../types/importer.types';

interface ValidRowsTableProps {
  rows: IImporterValidRow[];
}

export const ValidRowsTable: React.FC<ValidRowsTableProps> = ({ rows }) => {
  if (rows.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center">
        <PackageCheck className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
          No hay filas válidas disponibles
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          Todas las filas del archivo presentan errores o requieren asociar sus SKUs desconocidos.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Filas Válidas ({rows.length})
          </h3>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Listas para actualizar costos de catálogo
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="py-3 px-4 w-16 text-center">Fila</th>
              <th className="py-3 px-4">SKU Prov.</th>
              <th className="py-3 px-4">Descripción Prov.</th>
              <th className="py-3 px-4 text-right">Costo Neto</th>
              <th className="py-3 px-4 text-center">Cant. Archivo</th>
              <th className="py-3 px-4 text-center">Unidad Archivo</th>
              <th className="py-3 px-4">Producto del Catálogo</th>
              <th className="py-3 px-4 text-center">Unidad Compra</th>
              <th className="py-3 px-4 text-center">Factor Base</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
            {rows.map((row) => (
              <tr
                key={`valid-${row.rowNumber}`}
                className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors"
              >
                <td className="py-3 px-4 text-center font-mono text-xs text-slate-400">
                  {row.rowNumber}
                </td>
                <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-slate-100">
                  {row.normalizedSku}
                </td>
                <td
                  className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-xs truncate"
                  title={row.supplierDescription ?? ''}
                >
                  {row.supplierDescription || <span className="text-slate-400 italic">-</span>}
                </td>
                <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700 dark:text-emerald-400">
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
                <td className="py-3 px-4">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {row.product.name}
                    </span>
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                      Cód: {row.product.internalCode} (Base: {row.product.baseUnit.symbol})
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {row.supplierProduct.purchaseUnit.name} (
                    {row.supplierProduct.purchaseUnit.symbol})
                  </span>
                </td>
                <td className="py-3 px-4 text-center font-mono text-xs text-slate-600 dark:text-slate-400">
                  x{Number(row.supplierProduct.conversionFactorToBase).toLocaleString('es-AR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
