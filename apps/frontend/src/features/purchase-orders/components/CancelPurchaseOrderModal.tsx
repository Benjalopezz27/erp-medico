import React, { useState } from 'react';
import { Ban, AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { type IPurchaseOrderDetail, PurchaseOrderStatus } from '../types/purchase-orders.types';

export interface CancelPurchaseOrderModalProps {
  isOpen: boolean;
  order: IPurchaseOrderDetail | null;
  onConfirm: (cancelReason?: string) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const CancelPurchaseOrderModal: React.FC<CancelPurchaseOrderModalProps> = ({
  isOpen,
  order,
  onConfirm,
  onCancel,
  isSubmitting = false,
}) => {
  const [reason, setReason] = useState('');

  if (!order) return null;

  const isPartial = order.status === PurchaseOrderStatus.PARCIAL;

  const handleConfirm = () => {
    onConfirm(reason.trim() ? reason.trim() : undefined);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={
        isPartial
          ? `¿Cancelar saldo pendiente de ${order.orderNumber}?`
          : `¿Cancelar Orden de Compra ${order.orderNumber}?`
      }
      description={
        isPartial
          ? 'Se cerrarán las cantidades pendientes. Las recepciones previas y stock ingresado se mantendrán intactos.'
          : 'Esta acción cancelará la orden de compra de forma permanente.'
      }
    >
      <div className="space-y-4 text-xs">
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg flex items-start gap-2.5 text-rose-800 dark:text-rose-200">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <p>
            {isPartial
              ? 'La orden pasará a estado CANCELADA para el saldo pendiente. Esta operación no puede revertirse.'
              : 'La orden pasará a estado CANCELADA. Esta operación no puede revertirse.'}
          </p>
        </div>

        <div>
          <label
            htmlFor="cancel-reason-input"
            className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Motivo de cancelación (opcional, máx. 255 caracteres):
          </label>
          <textarea
            id="cancel-reason-input"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 255))}
            placeholder="Ej: Pedido duplicado, proveedor sin stock, cambio de condiciones..."
            rows={3}
            disabled={isSubmitting}
            className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
          <div className="text-right text-[10px] text-slate-400 mt-0.5 font-mono">
            {reason.length}/255
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Volver
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Ban className="w-3.5 h-3.5" />
            )}
            <span>{isSubmitting ? 'Cancelando...' : 'Confirmar Cancelación'}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
