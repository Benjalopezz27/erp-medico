import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { FiscalStatusBadge } from '@/features/sales/components/FiscalStatusBadge';
import { ArcaStatus, type IFiscalDocument } from '@erp/shared-types';
import { useRetryFiscalDocumentMutation } from '../hooks/use-retry-fiscal-document-mutation';
import { parseFiscalRetryError } from '../utils/fiscal-alerts.errors';
import type { IFiscalAlertRow, ParsedFiscalRetryError } from '../types/fiscal-alerts.types';

interface RetryFiscalDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  row: IFiscalAlertRow | null;
}

export const RetryFiscalDocumentModal: React.FC<RetryFiscalDocumentModalProps> = ({
  isOpen,
  onClose,
  row,
}) => {
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [mutationError, setMutationError] = useState<ParsedFiscalRetryError | null>(null);
  const mutation = useRetryFiscalDocumentMutation(row?.saleId ?? '');

  useEffect(() => {
    if (isOpen) {
      setIdempotencyKey(crypto.randomUUID());
      setMutationError(null);
    }
  }, [isOpen, row?.id]);

  if (!row) return null;

  const currentDocument: IFiscalDocument = {
    id: row.id,
    saleId: row.saleId,
    saleReturnId: row.saleReturnId,
    documentType: row.documentType,
    pointOfSale: null,
    documentNumber: null,
    arcaStatus: row.arcaStatus,
    arcaErrorMessage: row.arcaErrorMessage,
  };

  const handleConfirm = async () => {
    if (mutation.isPending) return;
    setMutationError(null);
    try {
      const result = await mutation.mutateAsync({ fiscalDocumentId: row.id, idempotencyKey });
      if (result.arcaStatus === ArcaStatus.EMITIDO) {
        onClose();
        return;
      }
      onClose();
    } catch (err) {
      const parsed = parseFiscalRetryError(err);
      setMutationError(parsed);
      if (parsed.requiresReconciliation) {
        onClose();
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!mutation.isPending) onClose();
      }}
      title="Reintentar emisión fiscal"
      description={`Comprobante: ${row.saleNumber}`}
      showCloseButton={!mutation.isPending}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span>Estado actual:</span>
          <FiscalStatusBadge document={currentDocument} />
        </div>
        <p className="text-xs text-slate-600">
          Primero se consultará el estado del comprobante en ARCA. La venta seguirá confirmada y no
          se generará otra venta, movimiento de stock ni deuda por esta acción.
        </p>

        {mutationError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
            <p className="font-medium">{mutationError.message}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" disabled={mutation.isPending} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={mutation.isPending}
            onClick={handleConfirm}
            className="min-w-[160px]"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reintentando…
              </>
            ) : (
              'Confirmar reintento'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
