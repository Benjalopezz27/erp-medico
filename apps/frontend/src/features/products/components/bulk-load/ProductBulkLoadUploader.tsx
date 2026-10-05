import React, { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, Download, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDownloadProductTemplate } from '../../hooks/use-product-bulk-load';

interface ProductBulkLoadUploaderProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
}

export const ProductBulkLoadUploader: React.FC<ProductBulkLoadUploaderProps> = ({
  onFileSelected,
  isLoading,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate: downloadTemplate, isPending: isDownloading } = useDownloadProductTemplate();

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
            Utiliza la plantilla oficial con catálogo de categorías y unidades de referencia.
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
        className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all cursor-pointer select-none ${
          isDragOver
            ? 'border-primary bg-primary/5 ring-4 ring-primary/10'
            : 'border-border hover:border-primary/50 hover:bg-muted/40 bg-card'
        } ${isLoading ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv"
          className="hidden"
          onChange={(e) => handleFileChange(e.target.files?.[0])}
          disabled={isLoading}
        />

        <div className="max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto ring-8 ring-primary/5">
            {isLoading ? (
              <FileSpreadsheet className="w-7 h-7 animate-pulse" />
            ) : (
              <UploadCloud className="w-7 h-7" />
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-foreground">
              {isLoading ? (
                'Procesando archivo...'
              ) : (
                <>
                  <span className="text-primary hover:underline">Haz clic para examinar</span> o
                  arrastra tu archivo aquí
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Archivos permitidos: <strong className="font-semibold">.xlsx</strong> y{' '}
              <strong className="font-semibold">.csv</strong> (hasta 2 MiB, máx. 1000 filas)
            </p>
          </div>

          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Soporta hojas con pestañas de referencia
            </span>
          </div>
        </div>
      </div>

      {/* Validation Error Banner */}
      {validationError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 p-3.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs animate-in fade-in duration-150"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{validationError}</p>
        </div>
      )}

      {/* Instructions Card */}
      <div className="bg-muted/40 border border-border rounded-xl p-5 space-y-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <Info className="w-4 h-4 text-primary" />
          <span>Estructura esperada del archivo</span>
        </div>
        <p className="leading-relaxed">
          El archivo debe contener en la primera hoja los encabezados:
        </p>
        <div className="p-3 bg-card border border-border/80 rounded-lg font-mono text-[11px] text-foreground overflow-x-auto whitespace-nowrap">
          name*, category*, baseUnit*, costNet*, activePriceNet*, description, minStock,
          initialStock, markupPercentage, taxTreatment, ivaPercentage, conversions
        </div>
        <ul className="list-disc list-inside space-y-1.5 pt-1 pl-1 leading-relaxed">
          <li>
            <strong className="text-foreground">Campos requeridos (*):</strong> Nombre del producto,
            Categoría existente, Unidad base existente, Costo neto y Precio activo neto.
          </li>
          <li>
            <strong className="text-foreground">Stock inicial:</strong> Opcional. Si se especifica
            un valor mayor a 0, creará automáticamente el balance y registrará el movimiento de
            ajuste inicial.
          </li>
          <li>
            <strong className="text-foreground">Tratamiento fiscal / IVA:</strong> GRAVADO, EXENTO o
            NO_GRAVADO. Alícuota permitida: 0, 2.5, 5, 10.5, 21 o 27.
          </li>
          <li>
            <strong className="text-foreground">Conversiones:</strong> Formato{' '}
            <span className="font-mono">Unidad:Factor</span> (ej:{' '}
            <span className="font-mono">Caja:10; Blister:5</span>).
          </li>
          <li>
            <strong className="text-foreground">Integridad:</strong> La carga es transaccional (todo
            o nada). Ningún producto será creado si existen filas con errores.
          </li>
        </ul>
      </div>
    </div>
  );
};
