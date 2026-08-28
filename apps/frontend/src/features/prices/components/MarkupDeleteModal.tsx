import { useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useDeleteMarkupMutation } from '../hooks/use-markup-mutations';
import type { IMarkupConfiguration } from '../types/markups.types';
import { parseMarkupError } from '../utils/markups.errors';

interface MarkupDeleteModalProps {
  configuration: IMarkupConfiguration | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onRefresh: () => void;
}

export function MarkupDeleteModal({
  configuration,
  onClose,
  onSuccess,
  onRefresh,
}: MarkupDeleteModalProps) {
  const mutation = useDeleteMarkupMutation();
  const [error, setError] = useState<string>();
  const [canRefresh, setCanRefresh] = useState(false);
  const target = configuration?.categoryName ?? configuration?.productName ?? '';

  const close = () => {
    if (!mutation.isPending) {
      setError(undefined);
      setCanRefresh(false);
      onClose();
    }
  };

  const confirm = async () => {
    if (!configuration || mutation.isPending) return;
    setError(undefined);
    try {
      await mutation.mutateAsync(configuration.id);
      onSuccess(`Excepción de ${target} eliminada correctamente.`);
      onClose();
    } catch (caught) {
      const parsed = parseMarkupError(caught);
      setError(parsed.message);
      setCanRefresh(parsed.shouldRefresh);
    }
  };

  return (
    <Modal
      isOpen={Boolean(configuration)}
      onClose={close}
      title="Eliminar excepción de markup"
      description="La eliminación hará fallback al siguiente nivel de la jerarquía."
    >
      <div className="space-y-4">
        <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p>
            ¿Confirma eliminar la excepción de <strong>{target}</strong>? El precio activo no será
            modificado.
          </p>
        </div>
        {error && (
          <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
            {error}
            {canRefresh && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 block"
                onClick={onRefresh}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Actualizar configuraciones
              </Button>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={close}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={confirm}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Eliminar excepción
          </Button>
        </div>
      </div>
    </Modal>
  );
}
