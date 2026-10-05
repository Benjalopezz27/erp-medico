import { apiClient } from '@/services/api.client';

export type ReportFormat = 'excel' | 'pdf';
export type ReportFilters = Record<string, string | undefined>;

const EXTENSIONS: Record<ReportFormat, string> = { excel: 'xlsx', pdf: 'pdf' };

export function parseFilename(disposition: string | undefined, fallback: string): string {
  return /filename="([^"]+)"/.exec(disposition ?? '')?.[1] ?? fallback;
}

/** Descarga el reporte exportado y dispara el guardado en el navegador. */
export async function downloadReport(
  type: string,
  format: ReportFormat,
  filters: ReportFilters = {},
): Promise<void> {
  const params = Object.fromEntries(Object.entries({ ...filters, format }).filter(([, v]) => v));
  const res = await apiClient.get<Blob>(`/reports/${type}`, {
    params,
    responseType: 'blob',
  });
  const fallback = `${type}-${new Date().toISOString().slice(0, 10)}.${EXTENSIONS[format]}`;
  const url = window.URL.createObjectURL(res.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = parseFilename(res.headers['content-disposition'], fallback);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
