import Decimal from 'decimal.js';
import { DataSource } from 'typeorm';
import {
  ReportColumn,
  ReportDefinition,
  ReportResult,
  ReportRow,
} from './report.types';

export interface SqlReportSpec {
  type: string;
  title: string;
  columns: ReportColumn[];
  /** Columnas de importe que se suman en una fila TOTAL al pie. */
  totals?: string[];
  build(filters: Record<string, string>): { sql: string; params: unknown[] };
}

function totalRow(spec: SqlReportSpec, rows: ReportRow[]): ReportRow {
  const row: ReportRow = Object.fromEntries(
    spec.columns.map((c) => [c.key, null]),
  );
  row[spec.columns[0].key] = 'TOTAL';
  for (const key of spec.totals ?? []) {
    row[key] = rows
      .reduce((sum, r) => sum.plus(String(r[key] ?? 0)), new Decimal(0))
      .toFixed(2);
  }
  return row;
}

export function createSqlReport(
  dataSource: DataSource,
  spec: SqlReportSpec,
): ReportDefinition {
  return {
    type: spec.type,
    async generate(filters): Promise<ReportResult> {
      const { sql, params } = spec.build(filters);
      const rows: ReportRow[] = await dataSource.query(sql, params);
      return {
        title: spec.title,
        columns: spec.columns,
        rows:
          spec.totals && rows.length ? [...rows, totalRow(spec, rows)] : rows,
      };
    },
  };
}
