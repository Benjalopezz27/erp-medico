import { FileSpreadsheet, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { IImporterUploadResponse } from '../types/importer.types';

export function FileUploadSummary({
  preview,
  onReplace,
  isLoading,
}: {
  preview: IImporterUploadResponse;
  onReplace: () => void;
  isLoading: boolean;
}) {
  return (
    <section
      className="rounded-xl border border-border bg-card p-5 shadow-sm"
      aria-labelledby="file-summary-title"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex gap-3">
          <div className="rounded-lg bg-emerald-100 p-2.5 text-emerald-700">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h2 id="file-summary-title" className="font-semibold">
              {preview.fileName}
            </h2>
            <p className="text-xs text-muted-foreground">
              {preview.detectedFormat.toUpperCase()} · {(preview.fileSize / 1024).toFixed(1)} KiB ·{' '}
              {preview.totalRows} filas · {preview.totalColumns} columnas
            </p>
            <p className="mt-2 text-xs">
              <span className="font-medium">Proveedor:</span> {preview.supplier.businessName}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isLoading}
          onClick={onReplace}
          className="gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reemplazar archivo
        </Button>
      </div>
      <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Checksum del archivo</dt>
          <dd className="mt-1 truncate font-mono" title={preview.fileChecksum}>
            {preview.fileChecksum}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Fingerprint de encabezados</dt>
          <dd className="mt-1 truncate font-mono" title={preview.headerFingerprint}>
            {preview.headerFingerprint}
          </dd>
        </div>
      </dl>
    </section>
  );
}
