import { BackLink } from '@/components/ui/back-link';
import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  downloadReport,
  type ReportFilters,
  type ReportFormat,
} from '@/features/reports/api/download-report';
import { ReportFilterField } from '@/features/reports/components/ReportFilterField';
import { ReportTable } from '@/features/reports/components/ReportTable';
import { useReportQuery } from '@/features/reports/hooks/use-report';
import { findReportConfig } from '@/features/reports/report-configs';
import { parseApiError } from '@/lib/errors/parse-api-error';

export function ReportPage() {
  const { type } = useParams({ strict: false }) as { type?: string };
  const config = findReportConfig(type);
  const [draft, setDraft] = useState<ReportFilters>({});
  const [applied, setApplied] = useState<ReportFilters>({});
  const [exporting, setExporting] = useState<ReportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const report = useReportQuery(config?.type ?? '', applied);

  if (!config) {
    return <p role="alert">El reporte "{type}" no existe.</p>;
  }

  const exportAs = async (format: ReportFormat) => {
    setExporting(format);
    setExportError(null);
    try {
      await downloadReport(config.type, format, applied);
    } catch (e) {
      setExportError(parseApiError(e).message);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <BackLink to="/reports" className="mb-3">
          Volver a Reportes
        </BackLink>
        <h1 className="text-2xl font-bold text-slate-900">{config.title}</h1>
        <p className="text-xs text-slate-500">{config.description}</p>
      </div>

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(draft);
        }}
      >
        {config.filters.map((def) => (
          <ReportFilterField
            key={def.key}
            def={def}
            value={draft[def.key] ?? ''}
            onChange={(value) => setDraft((d) => ({ ...d, [def.key]: value }))}
          />
        ))}
        <Button type="submit">Generar reporte</Button>
      </form>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {report.data ? `${report.data.rows.length} filas` : ''}
        </p>
        <div className="flex gap-2">
          {(['excel', 'pdf'] as const).map((format) => (
            <Button
              key={format}
              size="sm"
              variant="outline"
              disabled={exporting !== null}
              onClick={() => exportAs(format)}
            >
              <Download className="mr-1.5 h-4 w-4" />
              {format === 'excel' ? 'Exportar Excel' : 'Exportar PDF'}
            </Button>
          ))}
        </div>
      </div>

      {(report.isError || exportError) && (
        <p role="alert" className="flex items-center gap-2 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4" />
          {exportError ?? parseApiError(report.error).message}
        </p>
      )}
      {report.isLoading && <p className="text-sm text-slate-500">Generando…</p>}
      {report.data && <ReportTable report={report.data} />}
    </div>
  );
}
