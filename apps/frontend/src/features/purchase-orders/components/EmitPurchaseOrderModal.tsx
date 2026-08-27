import React from 'react';
import { Send, AlertCircle, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '../utils/purchase-orders.math';
import type { IPurchaseOrderDetail } from '../types/purchase-orders.types';

export interface EmitPurchaseOrderModalProps {
  isOpen: boolean;
  order: IPurchaseOrderDetail | null;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const EmitPurchaseOrderModal: React.FC<EmitPurchaseOrderModalProps> = ({
  isOpen,
  order,
  onConfirm,
  onCancel,
  isSubmitting = false,
}) => {
  if (!order) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={`¿Emitir Orden de Compra ${order.orderNumber}?`}
      description="La orden pasará a estado EMITIDA y sus datos quedarán congelados para recepción."
    >
      <div className="space-y-4 text-xs">
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500">Proveedor:</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {order.supplier.businessName}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Cantidad de ítems:</span>
            <span className="font-semibold text-slate-900 dark:text-white font-mono">
              {order.itemsCount}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Monto total estimado:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400 font-mono text-sm">
              {formatCurrency(order.totalNet)}
            </span>
          </div>
        </div>

        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-2.5 text-blue-800 dark:text-blue-200">
          <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p>
            Al emitir la orden se congelarán los snapshots de SKU, unidad, factor de conversión y
            costo esperado. Una vez emitida, <strong>no podrá volver a editarse</strong>.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{isSubmitting ? 'Emitiendo...' : 'Confirmar Emisión'}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
