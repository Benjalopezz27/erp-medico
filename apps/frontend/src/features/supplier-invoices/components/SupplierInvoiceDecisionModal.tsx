import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

export type SupplierInvoiceDecisionMode = 'authorize' | 'reject';

export function SupplierInvoiceDecisionModal({
  mode,
  invoiceNumber,
  reason,
  onReasonChange,
  onClose,
  onConfirm,
  pending,
  error,
}: {
  mode: SupplierInvoiceDecisionMode | null;
  invoiceNumber: string;
  reason: string;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
  error?: string;
}) {
  const rejecting = mode === 'reject';
  const normalizedReason = reason.trim();
  const reasonValid = normalizedReason.length >= 3 && normalizedReason.length <= 500;
  return (
    <Modal
      isOpen={Boolean(mode)}
      onClose={() => {
        if (!pending) onClose();
      }}
      title={rejecting ? 'Rechazar factura observada' : 'Autorizar factura observada'}
      description={`Comprobante ${invoiceNumber}`}
      showCloseButton={!pending}
    >
      <div className="space-y-4 text-sm">
        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {rejecting
              ? 'El rechazo conserva toda la trazabilidad y libera el saldo para registrar otra factura.'
              : 'La autorización acepta todas las observaciones y habilita la confirmación y el ajuste de costos posterior.'}
          </p>
        </div>

        {rejecting && (
          <div>
            <label
              htmlFor="supplier-invoice-rejection-reason"
              className="mb-1.5 block font-semibold"
            >
              Motivo del rechazo
            </label>
            <textarea
              id="supplier-invoice-rejection-reason"
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              maxLength={500}
              rows={4}
              disabled={pending}
              aria-invalid={Boolean(reason) && !reasonValid}
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
              placeholder="Explique por qué se rechaza el comprobante"
            />
            <div className="mt-1 flex justify-between text-xs">
              <span className={!reasonValid && reason ? 'text-rose-600' : 'text-slate-500'}>
                Entre 3 y 500 caracteres
              </span>
              <span className="text-slate-400">{reason.length}/500</span>
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            variant={rejecting ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={pending || (rejecting && !reasonValid)}
          >
            {pending ? 'Procesando…' : rejecting ? 'Confirmar rechazo' : 'Confirmar autorización'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
