import React, { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, Download, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDownloadStockTemplate } from '../../hooks/use-stock-bulk-load';

interface BulkLoadUploaderProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
}

export const BulkLoadUploader: React.FC<BulkLoadUploaderProps> = ({
  onFileSelected,
  isLoading,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate: downloadTemplate, isPending: isDownloading } = useDownloadStockTemplate();

  const handleFileChange = (file: File | null | undefined) => {
    setValidationError(null);
    if (!file) return;

    // Check size limit: 2 MiB
    if (file.size > 2 * 1024 * 1024) {
      setValidationError('El archivo supera el tamaño máximo permitido de 2 MiB.');
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'csv' && extension !== 'xlsx') {
      setValidationError('Formato de archivo no soportado. Sólo se admiten archivos .csv y .xlsx.');
      return;
    }

    onFileSelected(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isLoading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isLoading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  return (
    <div className="space-y-6">
      {/* Download Templates Actions */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Descargar Plantilla de Carga</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Utiliza la plantilla oficial con los encabezados requeridos (internalCode,
            quantityBase).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isDownloading || isLoading}
            onClick={() => downloadTemplate('xlsx')}
            className="text-xs gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Plantilla Excel (.xlsx)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isDownloading || isLoading}
            onClick={() => downloadTemplate('csv')}
            className="text-xs gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Plantilla CSV (.csv)
          </Button>
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Zona de carga de archivo. Arrastra y suelta un archivo CSV o XLSX o haz clic para seleccionarlo"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer bg-card ${
          isDragOver
            ? 'border-primary bg-primary/5 ring-4 ring-primary/10'
            : 'border-border hover:border-primary/50 hover:bg-muted/30'
        } ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFileChange(e.target.files[0]);
            }
          }}
          disabled={isLoading}
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 bg-primary/10 text-primary rounded-full flex items-center justify-center">
            {isLoading ? (
              <FileSpreadsheet className="w-7 h-7 animate-pulse" />
            ) : (
              <UploadCloud className="w-7 h-7" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {isLoading
                ? 'Analizando y validando archivo...'
                : 'Arrastra y suelta tu archivo aquí, o haz clic para explorar'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Archivos soportados: .CSV o .XLSX (máximo 2 MiB, hasta 1000 filas de datos)
            </p>
          </div>
          {!isLoading && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Seleccionar Archivo
            </Button>
          )}
        </div>
      </div>

      {/* Client-side Validation Error */}
      {validationError && (
        <div
          role="alert"
          className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
};
