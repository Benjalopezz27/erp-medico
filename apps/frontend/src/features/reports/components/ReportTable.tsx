import { formatCurrency, formatDecimal } from '@/features/products/utils/products.math';
import type { ReportColumn, ReportResult } from '../api/get-report';

const isRight = (c: ReportColumn) => c.type === 'money' || c.type === 'number';

function formatCell(column: ReportColumn, value: string | number | null): string {
  if (value === null || value === '') return '';
  if (column.type === 'money') return formatCurrency(value);
  if (column.type === 'number') return formatDecimal(value);
  return String(value);
}

export function ReportTable({ report }: { report: ReportResult }) {
  if (report.rows.length === 0) {
    return <p className="p-4 text-sm text-slate-500">Sin resultados para los filtros elegidos.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            {report.columns.map((c) => (
              <th
                key={c.key}
                className={`px-3 py-2 font-semibold ${isRight(c) ? 'text-right' : 'text-left'}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {report.rows.map((row, i) => (
            <tr key={i} className={row[report.columns[0].key] === 'TOTAL' ? 'font-bold' : ''}>
              {report.columns.map((c) => (
                <td key={c.key} className={`px-3 py-2 ${isRight(c) ? 'text-right font-mono' : ''}`}>
                  {formatCell(c, row[c.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
