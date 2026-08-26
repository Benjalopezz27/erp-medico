import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AlertCircle, ArrowLeft, ArrowRight, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ISupplier } from '@/features/suppliers/types/suppliers.types';
import { ImporterStepIndicator } from '@/features/importer/components/ImporterStepIndicator';
import { SupplierSelector } from '@/features/importer/components/SupplierSelector';
import { FileUploader } from '@/features/importer/components/FileUploader';
import { FileUploadSummary } from '@/features/importer/components/FileUploadSummary';
import { SampleTable } from '@/features/importer/components/SampleTable';
import { useImporterUploadMutation } from '@/features/importer/hooks/use-importer-upload';
import { parseImporterApiError } from '@/features/importer/utils/importer.errors';
import type {
  IImporterUploadResponse,
  ImporterStep,
} from '@/features/importer/types/importer.types';

export function ImporterWizardPage() {
  const navigate = useNavigate();
  const uploadMutation = useImporterUploadMutation();
  const [step, setStep] = useState<ImporterStep>('UPLOAD');
  const [selectedSupplier, setSelectedSupplier] = useState<ISupplier | null>(null);
  const [acceptedFile, setAcceptedFile] = useState<File | null>(null);
  const [acceptedPreview, setAcceptedPreview] = useState<IImporterUploadResponse | null>(null);
  const [replacementMode, setReplacementMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadSequenceRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  const changeSupplier = (supplier: ISupplier | null) => {
    abortControllerRef.current?.abort();
    uploadSequenceRef.current += 1;
    setSelectedSupplier(supplier);
    setAcceptedFile(null);
    setAcceptedPreview(null);
    setReplacementMode(false);
    setUploadError(null);
    setIsUploading(false);
    setStep('UPLOAD');
  };

  const handleFileSelected = async (candidateFile: File) => {
    if (!selectedSupplier) return;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const sequence = ++uploadSequenceRef.current;
    setIsUploading(true);
    setUploadError(null);

    try {
      const response = await uploadMutation.mutateAsync({
        supplierId: selectedSupplier.id,
        file: candidateFile,
        signal: controller.signal,
      });
      if (sequence !== uploadSequenceRef.current || controller.signal.aborted) return;
      setAcceptedFile(candidateFile);
      setAcceptedPreview(response);
      setReplacementMode(false);
    } catch (error) {
      if (sequence !== uploadSequenceRef.current || controller.signal.aborted) return;
      setUploadError(parseImporterApiError(error));
    } finally {
      if (sequence === uploadSequenceRef.current) setIsUploading(false);
    }
  };

  return (
    <div
      data-testid="importer-wizard-page"
      className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8"
    >
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
            <FileUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Proveedores / Importador</p>
            <h1 className="text-2xl font-bold tracking-tight">Importar archivo de proveedor</h1>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate({ to: '/suppliers' as never })}
          className="gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Cancelar
        </Button>
      </header>

      <ImporterStepIndicator currentStep={step} />

      {step === 'UPLOAD' ? (
        <>
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <SupplierSelector
              value={selectedSupplier}
              onChange={changeSupplier}
              disabled={isUploading}
            />
          </section>

          {uploadError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {uploadError}
            </div>
          )}

          {acceptedPreview && (
            <FileUploadSummary
              preview={acceptedPreview}
              isLoading={isUploading}
              onReplace={() => {
                setReplacementMode(true);
                setUploadError(null);
              }}
            />
          )}

          {(!acceptedPreview || replacementMode) && (
            <FileUploader
              disabled={!selectedSupplier}
              isLoading={isUploading}
              onFileSelected={handleFileSelected}
              onValidationError={setUploadError}
            />
          )}

          {acceptedPreview && <SampleTable preview={acceptedPreview} />}

          <div className="flex justify-end">
            <Button
              type="button"
              disabled={!acceptedFile || !acceptedPreview || isUploading}
              onClick={() => setStep('MAP')}
              className="gap-1.5"
            >
              Continuar al mapeo <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      ) : (
        <section className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold">Archivo listo para mapear</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Se conservaron el proveedor y el archivo validado. La configuración de columnas se
            implementará en la issue #111.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-5"
            onClick={() => setStep('UPLOAD')}
          >
            Volver a la subida
          </Button>
        </section>
      )}
    </div>
  );
}
