import React, { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { formatCuit } from '@erp/shared-types';
import { useDeactivateSupplierMutation } from '../hooks/use-supplier-mutations';
import { parseSupplierApiError } from '../utils/suppliers.errors';
import type { ISupplier } from '../types/suppliers.types';

export interface SupplierDeactivateModalProps {
  supplier: ISupplier | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SupplierDeactivateModal: React.FC<SupplierDeactivateModalProps> = ({
  supplier,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const deactivateMutation = useDeactivateSupplierMutation();

  if (!supplier) return null;

  const handleConfirm = async () => {
    setErrorMessage(null);
    try {
      await deactivateMutation.mutateAsync(supplier.id);
      onSuccess?.();
      onClose();
    } catch (error) {
      setErrorMessage(parseSupplierApiError(error));
    }
  };

  const handleClose = () => {
    if (deactivateMutation.isPending) return;
    setErrorMessage(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Desactivar Proveedor"
      description="Confirmación de baja lógica del proveedor"
    >
      <div className="space-y-4">
        {/* Warning Icon & Text */}
        <div className="flex items-start gap-3 p-3.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 rounded-lg text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p>
              ¿Está seguro de que desea desactivar al proveedor{' '}
              <strong className="font-semibold text-slate-900 dark:text-white">
                {supplier.businessName}
              </strong>{' '}
              (CUIT:{' '}
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {formatCuit(supplier.cuit)}
              </span>
              )?
            </p>
            <p className="mt-1 text-amber-800 dark:text-amber-300">
              El proveedor pasará al estado inactivo y no podrá ser seleccionado en nuevas
              operaciones, pero su historial se mantendrá intacto.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg text-red-700 dark:text-red-300 text-xs"
          >
            {errorMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={deactivateMutation.isPending}
            className="text-xs"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={deactivateMutation.isPending}
            className="bg-red-600 hover:bg-red-700 text-white text-xs gap-1.5 focus:ring-red-500"
          >
            {deactivateMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Desactivando...
              </>
            ) : (
              'Desactivar Proveedor'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
