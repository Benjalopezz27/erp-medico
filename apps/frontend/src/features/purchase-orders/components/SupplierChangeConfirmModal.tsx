import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

export interface SupplierChangeConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const SupplierChangeConfirmModal: React.FC<SupplierChangeConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="¿Cambiar proveedor de la orden?"
      description="Esta acción afectará los productos actualmente cargados en la orden de compra."
    >
      <div className="space-y-4">
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3 text-xs text-amber-800 dark:text-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p>
            Al cambiar el proveedor, <strong>se eliminarán todas las líneas de productos</strong>{' '}
            actualmente agregadas a la orden para evitar asociaciones cruzadas con otro proveedor.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Conservar proveedor actual
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onConfirm}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            Confirmar y limpiar líneas
          </Button>
        </div>
      </div>
    </Modal>
  );
};
