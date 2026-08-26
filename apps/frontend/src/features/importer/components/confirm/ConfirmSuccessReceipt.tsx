import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { CheckCircle2, Copy, Check, RotateCw, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { IImporterConfirmResponse } from '../../types/importer.types';

interface ConfirmSuccessReceiptProps {
  receipt: IImporterConfirmResponse;
  onReset: () => void;
}

export const ConfirmSuccessReceipt: React.FC<ConfirmSuccessReceiptProps> = ({
  receipt,
  onReset,
}) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleCopyBatchId = () => {
    navigator.clipboard.writeText(receipt.batchId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6 text-center">
      {/* Icon & Title */}
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Importación Confirmada con Éxito</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          La lista de precios ha sido aplicada atómicamente en el catálogo del proveedor.
        </p>
      </div>

      {/* Receipt Card */}
      <div className="p-6 rounded-2xl border border-border bg-card shadow-sm text-left space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Identificador del Lote
            </span>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className="font-mono text-sm font-bold text-foreground">{receipt.batchId}</span>
              <button
                type="button"
                onClick={handleCopyBatchId}
                className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                title="Copiar ID del Lote"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Fecha de Confirmación
            </span>
            <p className="text-xs text-foreground mt-0.5">
              {new Date(receipt.confirmedAt).toLocaleString('es-AR')}
            </p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Proveedor</span>
            <p className="font-medium text-foreground">{receipt.supplier.businessName}</p>
            <p className="text-xs text-muted-foreground font-mono">CUIT: {receipt.supplier.cuit}</p>
          </div>

          <div>
            <span className="text-xs text-muted-foreground">Archivo</span>
            <p className="font-medium text-foreground truncate">{receipt.fileName}</p>
            <p className="text-xs text-muted-foreground font-mono">
              Hash: {receipt.contentChecksum.slice(0, 8)}...
            </p>
          </div>
        </div>

        {/* Counts Row */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-muted/40 border border-border">
            <span className="text-xs font-medium text-muted-foreground">Filas Aplicadas</span>
            <p className="text-xl font-bold text-foreground mt-1">{receipt.appliedRows}</p>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
              Precios/Desc. Modificados
            </span>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">
              {receipt.changedRows}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border">
            <span className="text-xs font-medium text-muted-foreground">Sin Cambios</span>
            <p className="text-xl font-bold text-foreground mt-1">{receipt.unchangedRows}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Button
          type="button"
          onClick={() => navigate({ to: `/suppliers/${receipt.supplier.id}/catalog` as never })}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Building2 className="w-4 h-4" />
          Ver Catálogo del Proveedor
        </Button>

        <Button type="button" variant="outline" onClick={onReset} className="gap-2">
          <RotateCw className="w-4 h-4" />
          Realizar Nueva Importación
        </Button>
      </div>
    </div>
  );
};
