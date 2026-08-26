import { useRef, useState } from 'react';
import { FileSpreadsheet, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileUploaderProps {
  disabled: boolean;
  isLoading: boolean;
  onFileSelected: (file: File) => void;
  onValidationError: (message: string) => void;
}

export function FileUploader({
  disabled,
  isLoading,
  onFileSelected,
  onValidationError,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const selectFile = (file?: File) => {
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      onValidationError('El archivo supera el tamaño máximo permitido de 2 MiB.');
      return;
    }
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'csv' && extension !== 'xlsx') {
      onValidationError('Formato no soportado. Solo se admiten archivos .csv y .xlsx.');
      return;
    }
    onFileSelected(file);
  };

  const openPicker = () => {
    if (!disabled && !isLoading) inputRef.current?.click();
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || isLoading}
      aria-label="Zona de carga de archivo CSV o XLSX"
      onClick={openPicker}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openPicker();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled && !isLoading) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled && !isLoading) selectFile(event.dataTransfer.files[0]);
      }}
      className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
        dragging ? 'border-primary bg-primary/5' : 'border-border bg-card'
      } ${disabled || isLoading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-primary/50'}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        disabled={disabled || isLoading}
        onChange={(event) => selectFile(event.target.files?.[0])}
      />
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-full bg-primary/10 p-4 text-primary">
          {isLoading ? (
            <FileSpreadsheet className="h-7 w-7 animate-pulse" />
          ) : (
            <UploadCloud className="h-7 w-7" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold">
            {isLoading ? 'Analizando archivo…' : 'Arrastra el archivo aquí o selecciónalo'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            CSV o XLSX · máximo 2 MiB · hasta 1.000 filas
          </p>
        </div>
        {!isLoading && (
          <Button type="button" variant="secondary" size="sm" tabIndex={-1}>
            Seleccionar archivo
          </Button>
        )}
      </div>
    </div>
  );
}
