export type ReportCellValue = string | number | null;
export type ReportRow = Record<string, ReportCellValue>;

export interface ReportColumn {
  key: string;
  header: string;
  /** `money` y `number` se alinean a la derecha; `money` usa 2 decimales. */
  type?: 'text' | 'money' | 'number' | 'date';
  width?: number;
}

export interface ReportResult {
  title: string;
  columns: ReportColumn[];
  rows: ReportRow[];
}

export interface ReportDefinition {
  /** Clave de ruta: `GET /reports/:type`. */
  readonly type: string;
  generate(filters: Record<string, string>): Promise<ReportResult>;
}

export const REPORT_DEFINITIONS = Symbol('REPORT_DEFINITIONS');
