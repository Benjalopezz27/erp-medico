import React, { useState, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  FileSpreadsheet,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  BulkLoadStepIndicator,
  BulkLoadStep,
} from '../../features/stock/components/bulk-load/BulkLoadStepIndicator';
import { BulkLoadUploader } from '../../features/stock/components/bulk-load/BulkLoadUploader';
import { BulkLoadSummary } from '../../features/stock/components/bulk-load/BulkLoadSummary';
import { BulkLoadPreviewTable } from '../../features/stock/components/bulk-load/BulkLoadPreviewTable';
import { BulkLoadSuccess } from '../../features/stock/components/bulk-load/BulkLoadSuccess';
import {
  useStockBulkPreviewMutation,
  useStockBulkConfirmMutation,
} from '../../features/stock/hooks/use-stock-bulk-load';
import { parseBulkLoadApiError } from '../../features/stock/utils/stock-bulk.errors';
import type {
  IStockBulkLoadPreviewResponse,
  IStockBulkLoadConfirmResponse,
} from '../../features/stock/types/stock.types';

export const StockBulkLoadPage: React.FC = () => {
  const navigate = useNavigate();
  const isSubmittingRef = useRef(false);

  const [step, setStep] = useState<BulkLoadStep>('UPLOAD');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<IStockBulkLoadPreviewResponse | null>(null);
  const [confirmResult, setConfirmResult] = useState<IStockBulkLoadConfirmResponse | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const { mutate: executePreview, isPending: isPreviewing } = useStockBulkPreviewMutation();

  const { mutate: executeConfirm, isPending: isConfirming } = useStockBulkConfirmMutation();

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setGeneralError(null);

    executePreview(file, {
      onSuccess: (data) => {
        setPreviewData(data);
        setStep('PREVIEW');
      },
      onError: (err) => {
        setGeneralError(parseBulkLoadApiError(err));
      },
    });
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setConfirmResult(null);
    setGeneralError(null);
    isSubmittingRef.current = false;
    setStep('UPLOAD');
  };

  const handleConfirm = () => {
    if (!selectedFile || !previewData || isConfirming || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setGeneralError(null);

    executeConfirm(
      {
        file: selectedFile,
        previewFileChecksum: previewData.fileChecksum,
      },
      {
        onSuccess: (data) => {
          setConfirmResult(data);
          setStep('SUCCESS');
          isSubmittingRef.current = false;
        },
        onError: (err) => {
          isSubmittingRef.current = false;
          setGeneralError(parseBulkLoadApiError(err));
        },
      },
    );
  };

  return (
    <div
      data-testid="stock-bulk-load-page"
      className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-in fade-in duration-200"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <button
                type="button"
                onClick={() => navigate({ to: '/stock' as any })}
                className="hover:text-foreground transition-colors"
              >
                Control de Stock
              </button>
              <span>/</span>
              <span className="text-foreground font-medium">Carga Inicial Masiva</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight mt-0.5">
              Carga Inicial de Inventario
            </h1>
          </div>
        </div>

        {step !== 'SUCCESS' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: '/stock' as any })}
            className="text-xs gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver a Stock
          </Button>
        )}
      </div>

      {/* Step Indicator */}
      <BulkLoadStepIndicator currentStep={step} />

      {/* General Error Banner */}
      {generalError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{generalError}</span>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'UPLOAD' && (
        <BulkLoadUploader onFileSelected={handleFileSelected} isLoading={isPreviewing} />
      )}

      {/* Step 2: Preview & Validation */}
      {step === 'PREVIEW' && previewData && (
        <div className="space-y-6">
          <BulkLoadSummary summary={previewData.summary} isValid={previewData.valid} />

          <BulkLoadPreviewTable rows={previewData.rows} />

          {/* Navigation Actions */}
          <div className="flex items-center justify-between gap-4 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-xs gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Cambiar Archivo
            </Button>

            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={!previewData.valid}
              onClick={() => setStep('CONFIRM')}
              className="text-xs gap-1.5"
            >
              Siguiente: Confirmación
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {step === 'CONFIRM' && previewData && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Confirmación de Carga Masiva
                </h2>
                <p className="text-xs text-muted-foreground">
                  Verifica el resumen antes de aplicar los movimientos al libro mayor
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Archivo Seleccionado:</span>
                <span className="font-semibold text-foreground">{selectedFile?.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Total de Productos a Cargar:</span>
                <span className="font-semibold text-foreground">
                  {previewData.summary.validRows} productos
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Total Unidades Base:</span>
                <span className="font-semibold text-primary">
                  {previewData.summary.totalQuantityBase.toLocaleString('es-AR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Tipo de Movimiento:</span>
                <span className="font-medium text-foreground">AJUSTE_ENTRADA</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 rounded-lg text-xs leading-relaxed">
              ⚠️ Esta operación aplicará los movimientos de forma atómica e irreversible en el libro
              mayor de stock.
            </div>

            <div className="flex items-center justify-between gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isConfirming}
                onClick={() => setStep('PREVIEW')}
                className="text-xs gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Volver a la Validación
              </Button>

              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={isConfirming}
                onClick={handleConfirm}
                className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Aplicando Lote de Stock...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Confirmar y Aplicar Carga
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Terminal State: Success */}
      {step === 'SUCCESS' && confirmResult && (
        <BulkLoadSuccess
          result={confirmResult}
          onReset={handleReset}
          onGoToOverview={() => navigate({ to: '/stock' as any })}
        />
      )}
    </div>
  );
};
