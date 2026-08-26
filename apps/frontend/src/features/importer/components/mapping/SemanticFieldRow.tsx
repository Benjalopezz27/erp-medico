import React from 'react';
import type { IImporterSampleRow, ISupplierImportMapping } from '../../types/importer.types';

interface SemanticFieldRowProps {
  label: string;
  fieldKey: keyof ISupplierImportMapping;
  required: boolean;
  description: string;
  badgeText?: string;
  currentValue: string | null | undefined;
  headers: string[];
  normalizedHeaders: string[];
  usedNormalizedColumns: Set<string>;
  sampleRows: IImporterSampleRow[];
  onChange: (value: string | null) => void;
}

export function findFirstNonEmptySampleValue(
  sampleRows: IImporterSampleRow[],
  columnIndex: number,
): string {
  if (columnIndex < 0) return '—';
  for (const row of sampleRows) {
    const val = row.cells[columnIndex];
    if (val !== null && val !== undefined && String(val).trim() !== '') {
      return String(val);
    }
  }
  return '(vacío)';
}

export const SemanticFieldRow: React.FC<SemanticFieldRowProps> = ({
  label,
  fieldKey,
  required,
  description,
  badgeText,
  currentValue,
  headers,
  normalizedHeaders,
  usedNormalizedColumns,
  sampleRows,
  onChange,
}) => {
  const normalizedCurrent = currentValue
    ? currentValue.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')
    : '';

  // Find column index for sample preview
  const columnIndex = normalizedHeaders.findIndex((h) => h === normalizedCurrent);
  const sampleValue =
    columnIndex >= 0 ? findFirstNonEmptySampleValue(sampleRows, columnIndex) : '—';

  return (
    <tr className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{label}</span>
          {required ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50">
              Requerido
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400">
              Opcional
            </span>
          )}
          {badgeText && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
              {badgeText}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
      </td>
      <td className="py-3.5 px-4 w-72">
        <select
          id={`mapping-select-${fieldKey}`}
          aria-label={`Mapeo para ${label}`}
          value={normalizedCurrent}
          onChange={(e) => {
            const val = e.target.value;
            onChange(val === '' ? null : val);
          }}
          className="w-full text-sm rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors disabled:opacity-50"
        >
          <option value="">(Sin asignar)</option>
          {headers.map((hdr, idx) => {
            const norm = normalizedHeaders[idx];
            const isAssignedElsewhere =
              usedNormalizedColumns.has(norm) && norm !== normalizedCurrent;
            return (
              <option key={`${norm}-${idx}`} value={norm} disabled={isAssignedElsewhere}>
                {hdr} {isAssignedElsewhere ? '(ya asignada)' : ''}
              </option>
            );
          })}
        </select>
      </td>
      <td
        className="py-3.5 px-4 w-64 text-sm text-gray-600 dark:text-gray-400 font-mono truncate max-w-xs"
        title={sampleValue}
      >
        {sampleValue}
      </td>
    </tr>
  );
};
