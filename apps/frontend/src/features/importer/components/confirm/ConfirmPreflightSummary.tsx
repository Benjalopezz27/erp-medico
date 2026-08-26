import React from 'react';
import {
  Building2,
  FileText,
  LayoutGrid,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { IImporterPreviewResponse, ISupplierImportTemplate } from '../../types/importer.types';

interface ConfirmPreflightSummaryProps {
  preview: IImporterPreviewResponse;
  file: File;
  template: ISupplierImportTemplate | null;
  onBack: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

export const ConfirmPreflightSummary: React.FC<ConfirmPreflightSummaryProps> = ({
  preview,
  file,
  template,
  onBack,
  onConfirm,
  isPending,
}) => {
  return (
    <div className="space-y-6">
      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Supplier Card */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-start space-x-3">
          <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">Proveedor</p>
            <p className="text-sm font-semibold text-foreground truncate">
              {preview.supplier.businessName}
            </p>
            <p className="text-xs text-muted-foreground font-mono">CUIT: {preview.supplier.cuit}</p>
          </div>
        </div>

        {/* File Card */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-start space-x-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">Archivo Original</p>
            <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB &bull; {preview.summary.totalRows} filas
            </p>
          </div>
        </div>

        {/* Template / Mapping Card */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-start space-x-3">
          <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">Plantilla / Configuración</p>
            <p className="text-sm font-semibold text-foreground truncate">
              {template ? template.name : 'Mapeo Manual'}
            </p>
            <p className="text-xs text-muted-foreground">
              {template ? 'Plantilla guardada' : 'Columnas mapeadas ad-hoc'}
            </p>
          </div>
        </div>

        {/* Valid Rows / Integrity Card */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-start space-x-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">Filas Validadas</p>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {preview.validRows.length} de {preview.summary.totalRows} listas
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              Hash: {preview.contentChecksum.slice(0, 8)}...
            </p>
          </div>
        </div>
      </div>

      {/* Amber Warning Notice */}
      <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20 flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900 dark:text-amber-200">
          <p className="font-semibold">Aviso Importante sobre la Confirmación:</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
            Esta acción actualizará atómicamente los costos habituales y descripciones en el
            catálogo de productos del proveedor seleccionado. <strong>No modifica</strong> el stock
            físico actual, movimientos del libro mayor de inventario ni los costos netos o precios
            de venta base de los productos internos.
          </p>
        </div>
      </div>

      {/* Action Buttons Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isPending}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Vista Previa
        </Button>

        <Button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Check className="w-4 h-4" />
          {isPending ? 'Confirmando...' : 'Confirmar Importación'}
        </Button>
      </div>
    </div>
  );
};
