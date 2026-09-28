import React, { useState } from 'react';
import { UserCheck, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useReactivateUserMutation } from '../hooks/use-user-mutations';
import { parseUserApiError } from '../utils/users.errors';
import type { IUser } from '../types/users.types';

export interface UserApproveModalProps {
  user: IUser | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: IUser) => void;
}

export const UserApproveModal: React.FC<UserApproveModalProps> = ({
  user,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const approveMutation = useReactivateUserMutation();

  if (!user) return null;

  const handleConfirm = async () => {
    setErrorMessage(null);
    try {
      await approveMutation.mutateAsync(user.id);
      onSuccess?.(user);
      onClose();
    } catch (error) {
      setErrorMessage(parseUserApiError(error));
    }
  };

  const handleClose = () => {
    if (approveMutation.isPending) return;
    setErrorMessage(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Aprobar Usuario"
      description="Confirmación de activación de cuenta"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs leading-relaxed">
          <UserCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <p>
            ¿Aprobar y activar a{' '}
            <strong className="font-semibold text-slate-900">{user.name}</strong> (
            <span className="font-mono text-slate-700">{user.email}</span>)? El usuario podrá
            iniciar sesión de inmediato con el rol <strong>{user.role}</strong>.
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs"
          >
            {errorMessage}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={approveMutation.isPending}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={approveMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
          >
            {approveMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Aprobando...
              </>
            ) : (
              'Aprobar Usuario'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
