import { formatDecimal } from '@/features/products/utils/products.math';
import { SortableTh } from '@/components/ui/sortable-th';
import { useClientSort } from '@/lib/sorting';
import type { ReportColumn, ReportResult } from '../api/get-report';
import { formatCurrency } from '@/lib/money';

const isRight = (c: ReportColumn) => c.type === 'money' || c.type === 'number';

function formatCell(column: ReportColumn, value: string | number | null): string {
  if (value === null || value === '') return '';
  if (column.type === 'money') return formatCurrency(value);
  if (column.type === 'number') return formatDecimal(value);
  return String(value);
}

type Row = ReportResult['rows'][number];

export function ReportTable({ report }: { report: ReportResult }) {
  const firstKey = report.columns[0]?.key;
  const accessors = Object.fromEntries(
    report.columns.map((c) => [
      c.key,
      (row: Row) => {
        const v = row[c.key];
        if (v === null || v === '') return null;
        // Number() only for ordering; displayed value is untouched
        return isRight(c) && !Number.isNaN(Number(v)) ? Number(v) : v;
      },
    ]),
  );
  const { sorted, ...sort } = useClientSort(
    report.rows,
    accessors,
    (row) => row[firstKey] === 'TOTAL',
  );
  if (report.rows.length === 0) {
    return <p className="p-4 text-sm text-slate-500">Sin resultados para los filtros elegidos.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            {report.columns.map((c) => (
              <SortableTh
                key={c.key}
                field={c.key}
                {...sort}
                right={isRight(c)}
                className="px-3 py-2 font-semibold text-left"
              >
                {c.header}
              </SortableTh>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((row, i) => (
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
