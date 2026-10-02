import React, { useState, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  FileSpreadsheet,
  ArrowLeft,
  ShieldCheck,
  RotateCcw,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ProductBulkLoadStepIndicator,
  ProductBulkLoadStep,
} from '../../features/products/components/bulk-load/ProductBulkLoadStepIndicator';
import { ProductBulkLoadUploader } from '../../features/products/components/bulk-load/ProductBulkLoadUploader';
import { ProductBulkLoadSummary } from '../../features/products/components/bulk-load/ProductBulkLoadSummary';
import { ProductBulkLoadPreviewTable } from '../../features/products/components/bulk-load/ProductBulkLoadPreviewTable';
import { ProductBulkLoadSuccess } from '../../features/products/components/bulk-load/ProductBulkLoadSuccess';
import {
  useProductBulkPreviewMutation,
  useProductBulkConfirmMutation,
} from '../../features/products/hooks/use-product-bulk-load';
import { parseProductBulkLoadApiError } from '../../features/products/utils/product-bulk.errors';
import type {
  IProductBulkLoadPreviewResponse,
  IProductBulkLoadConfirmResponse,
} from '@erp/shared-types';

export const ProductBulkLoadPage: React.FC = () => {
  const navigate = useNavigate();
  const isSubmittingRef = useRef(false);

  const [step, setStep] = useState<ProductBulkLoadStep>('UPLOAD');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<IProductBulkLoadPreviewResponse | null>(null);
  const [confirmResult, setConfirmResult] = useState<IProductBulkLoadConfirmResponse | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const { mutate: executePreview, isPending: isPreviewing } = useProductBulkPreviewMutation();
  const { mutate: executeConfirm, isPending: isConfirming } = useProductBulkConfirmMutation();

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setGeneralError(null);

    executePreview(file, {
      onSuccess: (data) => {
        setPreviewData(data);
        setStep('PREVIEW');
      },
      onError: (err) => {
        setGeneralError(parseProductBulkLoadApiError(err));
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
          setGeneralError(parseProductBulkLoadApiError(err));
        },
      },
    );
  };

  return (
    <div
      data-testid="product-bulk-load-page"
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
                onClick={() => navigate({ to: '/products' as any })}
                className="hover:text-foreground transition-colors"
              >
                Productos
              </button>
              <span>/</span>
              <span className="text-foreground font-medium">Carga Masiva</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight mt-0.5">
              Carga Masiva de Productos
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Importación y alta inicial del catálogo de productos con inventario base
            </p>
          </div>
        </div>

        {step !== 'SUCCESS' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: '/products' as any })}
            className="text-xs gap-1.5 self-start sm:self-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver a Productos
          </Button>
        )}
      </div>

      {/* Step Indicator */}
      <ProductBulkLoadStepIndicator currentStep={step} />

      {/* General Error Banner */}
      {generalError && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs animate-in fade-in duration-150"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-sm">Error al procesar la carga</p>
            <p className="leading-relaxed">{generalError}</p>
          </div>
        </div>
      )}

      {/* Step Content */}
      {step === 'UPLOAD' && (
        <ProductBulkLoadUploader onFileSelected={handleFileSelected} isLoading={isPreviewing} />
      )}

      {step === 'PREVIEW' && previewData && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Summary KPIs & Integrity Banners */}
          <ProductBulkLoadSummary summary={previewData.summary} isValid={previewData.valid} />

          {/* Detailed Preview Table with Filter Controls */}
          <ProductBulkLoadPreviewTable rows={previewData.rows} />

          {/* Sticky Bottom Actions Bar */}
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isConfirming}
              className="w-full sm:w-auto text-xs gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Cancelar y Subir Otro Archivo
            </Button>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {!previewData.valid && (
                <span className="text-xs text-destructive hidden md:inline">
                  Corrige los errores del archivo para habilitar la confirmación.
                </span>
              )}

              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleConfirm}
                disabled={!previewData.valid || previewData.summary.validRows === 0 || isConfirming}
                className="w-full sm:w-auto text-xs gap-1.5"
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Aplicando Importación...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Confirmar y Crear {previewData.summary.validRows} Productos
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 'SUCCESS' && confirmResult && (
        <ProductBulkLoadSuccess
          result={confirmResult}
          onReset={handleReset}
          onGoToProducts={() => navigate({ to: '/products' as any })}
        />
      )}
    </div>
  );
};
