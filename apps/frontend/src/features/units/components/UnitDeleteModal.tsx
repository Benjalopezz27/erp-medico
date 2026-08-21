import React, { useState, useEffect } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useDeleteUnitMutation } from '../hooks/use-unit-mutations';
import type { IUnit } from '../types/units.types';

interface UnitDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitToDelete?: IUnit | null;
  onSuccessNotice?: (message: string) => void;
}

export const UnitDeleteModal: React.FC<UnitDeleteModalProps> = ({
  isOpen,
  onClose,
  unitToDelete,
  onSuccessNotice,
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const deleteMutation = useDeleteUnitMutation();

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!unitToDelete) return null;

  const handleConfirm = async () => {
    setErrorMessage(null);
    try {
      await deleteMutation.mutateAsync(unitToDelete.id);
      onSuccessNotice?.(`Unidad de medida "${unitToDelete.name}" eliminada exitosamente.`);
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'No se pudo eliminar la unidad de medida. Verifique que no esté en uso.';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Eliminar Unidad de Medida"
      description="Confirmación de eliminación física del registro de catálogo"
    >
      <div className="space-y-4">
        {errorMessage && (
          <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="font-medium">{errorMessage}</div>
          </div>
        )}

        <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs leading-relaxed">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p>
              ¿Está seguro de que desea eliminar la unidad de medida{' '}
              <strong className="font-semibold text-slate-900">{unitToDelete.name}</strong> (
              <span className="font-mono text-slate-700">{unitToDelete.symbol}</span>)?
            </p>
            <p className="mt-1 text-amber-800">
              Esta acción no se puede deshacer. La eliminación solo será permitida si no existen
              productos asociados a esta unidad.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={deleteMutation.isPending}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={deleteMutation.isPending}
            className="bg-red-600 hover:bg-red-700 text-white text-xs gap-1.5 focus:ring-red-500"
          >
            {deleteMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Eliminar Unidad</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
