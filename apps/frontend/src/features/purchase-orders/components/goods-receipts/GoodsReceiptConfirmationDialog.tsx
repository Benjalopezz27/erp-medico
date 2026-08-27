import React from 'react';
import { AlertTriangle, Loader2, PackageCheck } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import type {
  ICreateGoodsReceiptPayload,
  IPurchaseOrderDetail,
} from '../../types/purchase-orders.types';
import { PurchaseOrderStatus } from '../../types/purchase-orders.types';
import { formatCurrency, formatQuantity } from '../../utils/purchase-orders.math';
import { calculateGoodsReceiptSubtotal } from '../../utils/goods-receipt.math';

interface GoodsReceiptConfirmationDialogProps {
  isOpen: boolean;
  order: IPurchaseOrderDetail;
  payload: ICreateGoodsReceiptPayload | null;
  anticipatedStatus: PurchaseOrderStatus.PARCIAL | PurchaseOrderStatus.COMPLETADA | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const GoodsReceiptConfirmationDialog: React.FC<GoodsReceiptConfirmationDialogProps> = ({
  isOpen,
  order,
  payload,
  anticipatedStatus,
  isSubmitting,
  onCancel,
  onConfirm,
}) => {
  if (!payload) return null;
  const orderItems = new Map(order.items.map((item) => [item.id, item]));

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => undefined : onCancel}
      title={`Confirmar recepción de ${order.orderNumber}`}
      description="Esta operación actualizará el stock y no puede editarse ni eliminarse después."
    >
      <div className="space-y-4 text-xs">
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
          <div>
            <span className="text-slate-500">Remito</span>
            <p className="font-mono font-semibold text-slate-900 dark:text-white">
              {payload.deliveryNoteNumber}
            </p>
          </div>
          <div>
            <span className="text-slate-500">Estado resultante</span>
            <p className="font-semibold text-blue-600">{anticipatedStatus}</p>
          </div>
        </div>

        <div className="max-h-64 space-y-2 overflow-y-auto">
          {payload.items.map((line) => {
            const item = orderItems.get(line.purchaseOrderItemId);
            const subtotal = calculateGoodsReceiptSubtotal(
              line.receivedQtyPurchaseUnit,
              line.provisionalCostUnitNet ?? item?.expectedCostUnitNet ?? 0,
            );
            return (
              <div
                key={line.purchaseOrderItemId}
                className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {item?.productName}
                    </p>
                    <p className="text-slate-500">{item?.purchaseUnitName}</p>
                  </div>
                  <div className="text-right font-mono">
                    <p>
                      {formatQuantity(line.receivedQtyPurchaseUnit)} {item?.purchaseUnitSymbol}
                    </p>
                    <p className="text-slate-500">{subtotal ? formatCurrency(subtotal) : '—'}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Verifique el remito y las cantidades físicas antes de confirmar.</p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
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
            size="sm"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {isSubmitting ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <PackageCheck className="mr-1.5 h-4 w-4" />
            )}
            {isSubmitting ? 'Registrando...' : 'Confirmar recepción'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
