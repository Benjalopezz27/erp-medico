import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertOctagon,
  RefreshCw,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { PreviewSummaryCards } from './PreviewSummaryCards';
import { ValidRowsTable } from './ValidRowsTable';
import { UnknownRowsTable } from './UnknownRowsTable';
import { ErrorRowsTable } from './ErrorRowsTable';
import { ResolveUnknownDrawer } from './ResolveUnknownDrawer';
import { EditAssociationDrawer } from './EditAssociationDrawer';
import type {
  IImporterErrorRow,
  IImporterPreviewResponse,
  IImporterUnknownRow,
} from '../../types/importer.types';

interface PreviewStepContainerProps {
  supplierId: string;
  supplierName: string;
  previewData: IImporterPreviewResponse | null;
  isLoading: boolean;
  error: string | null;
  onBack: () => void;
  onContinue: (previewResponse: IImporterPreviewResponse) => void;
  onRefreshPreview: () => Promise<void>;
}

export const PreviewStepContainer: React.FC<PreviewStepContainerProps> = ({
  supplierId,
  supplierName,
  previewData,
  isLoading,
  error,
  onBack,
  onContinue,
  onRefreshPreview,
}) => {
  const [activeTab, setActiveTab] = useState<'valid' | 'unknown' | 'error'>('valid');
  const [resolvingRow, setResolvingRow] = useState<IImporterUnknownRow | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingAssociationRow, setEditingAssociationRow] = useState<IImporterErrorRow | null>(
    null,
  );
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Automatically select the most relevant tab when preview data loads
  useEffect(() => {
    if (previewData) {
      if (previewData.summary.errorRows > 0) {
        setActiveTab('error');
      } else if (previewData.summary.unknownRows > 0) {
        setActiveTab('unknown');
      } else {
        setActiveTab('valid');
      }
    }
  }, [previewData]);

  // Clear toast after 4s
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  const handleOpenResolve = (row: IImporterUnknownRow) => {
    setResolvingRow(row);
    setIsDrawerOpen(true);
  };

  const handleCloseResolve = () => {
    setIsDrawerOpen(false);
    setResolvingRow(null);
  };

  const handleResolved = async (sku: string) => {
    setSuccessToast(`SKU "${sku}" asociado exitosamente al catálogo.`);
    await onRefreshPreview();
  };

  const handleAssociationUpdated = async (sku: string) => {
    setSuccessToast(`La asociación del SKU "${sku}" se actualizó correctamente.`);
    await onRefreshPreview();
  };

  if (isLoading && !previewData) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-12 text-center space-y-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          Procesando vista previa del archivo...
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Estamos re-parseando el archivo, validando los tipos de datos y cruzando los SKUs con el
          catálogo de proveedores.
        </p>
      </div>
    );
  }

  if (error && !previewData) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center space-y-4">
        <AlertOctagon className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          No se pudo generar la vista previa
        </h3>
        <p className="text-sm text-rose-600 dark:text-rose-400 max-w-md mx-auto">{error}</p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Volver al Mapeo
          </button>
          <button
            type="button"
            onClick={() => onRefreshPreview()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!previewData) return null;

  const { summary, validRows, unknownRows, errorRows } = previewData;

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      {successToast && (
        <div className="bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between text-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-5 h-5" />
            <span>{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-white/80 hover:text-white text-xs font-semibold uppercase tracking-wider"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <PreviewSummaryCards summary={summary} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tabs bar */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab('valid')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'valid'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Válidas ({validRows.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('unknown')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'unknown'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            SKUs Desconocidos ({unknownRows.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('error')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'error'
                ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <AlertOctagon className="w-4 h-4" />
            Filas con Error ({errorRows.length})
          </button>
        </div>

        <button
          type="button"
          onClick={() => onRefreshPreview()}
          disabled={isLoading}
          className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1.5 pb-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar vista
        </button>
      </div>

      {/* Tab Content Table */}
      <div>
        {activeTab === 'valid' && <ValidRowsTable rows={validRows} />}
        {activeTab === 'unknown' && (
          <UnknownRowsTable rows={unknownRows} onResolveRow={handleOpenResolve} />
        )}
        {activeTab === 'error' && (
          <ErrorRowsTable rows={errorRows} onEditAssociation={setEditingAssociationRow} />
        )}
      </div>

      {/* Resolve Drawer Modal */}
      <ResolveUnknownDrawer
        isOpen={isDrawerOpen}
        supplierId={supplierId}
        supplierName={supplierName}
        row={resolvingRow}
        onClose={handleCloseResolve}
        onResolved={handleResolved}
      />

      <EditAssociationDrawer
        isOpen={editingAssociationRow !== null}
        supplierId={supplierId}
        supplierName={supplierName}
        row={editingAssociationRow}
        onClose={() => setEditingAssociationRow(null)}
        onUpdated={handleAssociationUpdated}
      />

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Mapeo
        </button>

        <div className="flex items-center gap-3">
          {!summary.canContinue && (
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
              {summary.errorRows > 0
                ? 'Corrija los errores del archivo para avanzar'
                : 'Asocie todos los SKUs desconocidos para avanzar'}
            </span>
          )}

          <button
            type="button"
            disabled={!summary.canContinue || isLoading}
            onClick={() => onContinue(previewData)}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            title={
              summary.canContinue
                ? 'Continuar a confirmación'
                : summary.errorRows > 0
                  ? 'No es posible continuar con filas en error'
                  : 'Debe resolver todos los SKUs desconocidos antes de confirmar'
            }
          >
            <span>Continuar a Confirmación</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
