import React, { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useDeactivateUserMutation } from '../hooks/use-user-mutations';
import { parseUserApiError } from '../utils/users.errors';
import type { IUser } from '../types/users.types';

export interface UserDeactivateModalProps {
  user: IUser | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const UserDeactivateModal: React.FC<UserDeactivateModalProps> = ({
  user,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const deactivateMutation = useDeactivateUserMutation();

  if (!user) return null;

  const handleConfirm = async () => {
    setErrorMessage(null);
    try {
      await deactivateMutation.mutateAsync(user.id);
      onSuccess?.();
      onClose();
    } catch (error) {
      setErrorMessage(parseUserApiError(error));
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
      title="Desactivar Usuario"
      description="Confirmación de baja lógica de acceso"
    >
      <div className="space-y-4">
        {/* Warning Icon & Text */}
        <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs leading-relaxed">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p>
              ¿Está seguro de que desea desactivar a{' '}
              <strong className="font-semibold text-slate-900">{user.name}</strong> (
              <span className="font-mono text-slate-700">{user.email}</span>)?
            </p>
            <p className="mt-1 text-amber-800">
              El usuario perderá acceso inmediato al sistema, pero su historial y transacciones
              asociadas se mantendrán intactos.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs"
          >
            {errorMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
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
              'Desactivar Usuario'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
