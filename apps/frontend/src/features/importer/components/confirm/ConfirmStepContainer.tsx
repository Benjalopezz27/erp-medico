import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, ShieldAlert, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmPreflightSummary } from './ConfirmPreflightSummary';
import { ConfirmSuccessReceipt } from './ConfirmSuccessReceipt';
import { useImporterConfirmMutation } from '../../hooks/use-importer-confirm';
import { useImporterBatchQuery } from '../../hooks/use-importer-batch';
import { parseImporterApiError, getExistingBatchIdFromError } from '../../utils/importer.errors';
import type {
  IImporterPreviewResponse,
  IImporterSupplierSummary,
  ISupplierImportMapping,
  ISupplierImportTemplate,
  IImporterConfirmResponse,
} from '../../types/importer.types';

interface ConfirmStepContainerProps {
  supplier: IImporterSupplierSummary;
  file: File;
  mapping: ISupplierImportMapping;
  template: ISupplierImportTemplate | null;
  preview: IImporterPreviewResponse;
  onBack: () => void;
  onReset: () => void;
}

export const ConfirmStepContainer: React.FC<ConfirmStepContainerProps> = ({
  supplier,
  file,
  mapping,
  template,
  preview,
  onBack,
  onReset,
}) => {
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmedReceipt, setConfirmedReceipt] = useState<IImporterConfirmResponse | null>(null);
  const [duplicateBatchId, setDuplicateBatchId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSubmittingRef = useRef(false);
  const confirmMutation = useImporterConfirmMutation();

  // Query for recovering duplicate batch details if 409 returned an existingBatchId
  const { data: duplicateBatchData } = useImporterBatchQuery(duplicateBatchId);

  // If duplicate batch details are loaded, set confirmed receipt
  useEffect(() => {
    if (duplicateBatchData?.batch && !confirmedReceipt) {
      setConfirmedReceipt(duplicateBatchData.batch);
    }
  }, [duplicateBatchData, confirmedReceipt]);

  const handleOpenDialog = () => {
    setErrorMessage(null);
    setIsConfirmDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (confirmMutation.isPending) return;
    setIsConfirmDialogOpen(false);
  };

  const handleExecuteConfirmation = async () => {
    if (isSubmittingRef.current || confirmMutation.isPending) return;
    isSubmittingRef.current = true;
    setErrorMessage(null);

    try {
      const response = await confirmMutation.mutateAsync({
        file,
        payload: {
          supplierId: supplier.id,
          expectedFileChecksum: preview.fileChecksum,
          expectedMappingChecksum: preview.mappingChecksum,
          expectedContentChecksum: preview.contentChecksum,
          mapping,
          templateId: template?.id || null,
        },
      });

      setConfirmedReceipt(response);
      setIsConfirmDialogOpen(false);
    } catch (err: unknown) {
      const existingId = getExistingBatchIdFromError(err);
      if (existingId) {
        setDuplicateBatchId(existingId);
        setIsConfirmDialogOpen(false);
      } else {
        setErrorMessage(parseImporterApiError(err));
      }
    } finally {
      isSubmittingRef.current = false;
    }
  };

  // If already confirmed, render success receipt
  if (confirmedReceipt) {
    return <ConfirmSuccessReceipt receipt={confirmedReceipt} onReset={onReset} />;
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="border-b border-border pb-4">
        <h2 className="text-lg font-semibold text-foreground">
          Paso 4: Confirmación Transaccional
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Revise los datos generales y ejecute la aplicación atómica de la lista de precios.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 flex items-start space-x-3 text-destructive">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">No se pudo confirmar la importación</p>
            <p className="mt-0.5 text-xs">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Preflight Summary */}
      <ConfirmPreflightSummary
        preview={preview}
        file={file}
        template={template}
        onBack={onBack}
        onConfirm={handleOpenDialog}
        isPending={confirmMutation.isPending}
      />

      {/* Confirmation Modal Dialog */}
      {isConfirmDialogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  ¿Confirmar importación de precios?
                </h3>
                <p className="text-xs text-muted-foreground">{preview.supplier.businessName}</p>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              Se procesarán <strong>{preview.validRows.length}</strong> artículos en una única
              transacción atómica. Los costos habituales serán actualizados de forma inmediata.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                disabled={confirmMutation.isPending}
              >
                Cancelar
              </Button>

              <Button
                type="button"
                onClick={handleExecuteConfirmation}
                disabled={confirmMutation.isPending}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {confirmMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  'Sí, Confirmar'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
