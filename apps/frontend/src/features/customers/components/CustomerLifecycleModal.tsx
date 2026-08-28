import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import {
  useDeactivateCustomerMutation,
  useReactivateCustomerMutation,
} from '../hooks/use-customer-mutations';
import type { ICustomer } from '../types/customers.types';
import { parseCustomerError } from '../utils/customers.errors';

export function CustomerLifecycleModal({
  customer,
  isOpen,
  onClose,
  onSuccess,
}: {
  customer: ICustomer | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: ICustomer) => void;
}) {
  const deactivate = useDeactivateCustomerMutation();
  const reactivate = useReactivateCustomerMutation();
  const [error, setError] = useState<string | null>(null);
  const pending = deactivate.isPending || reactivate.isPending;
  useEffect(() => {
    if (isOpen) setError(null);
  }, [isOpen]);
  if (!customer) return null;
  const action = customer.isActive ? 'desactivar' : 'reactivar';
  const handleConfirm = async () => {
    setError(null);
    try {
      const updated = customer.isActive
        ? await deactivate.mutateAsync(customer.id)
        : await reactivate.mutateAsync(customer.id);
      onSuccess(updated);
      onClose();
    } catch (cause) {
      setError(parseCustomerError(cause).message);
    }
  };
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !pending && onClose()}
      title={`${customer.isActive ? 'Desactivar' : 'Reactivar'} cliente`}
      description="La identidad y el historial siempre se conservan"
    >
      <div className="space-y-4">
        <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p>
            ¿Confirmás que querés {action} a <strong>{customer.businessName}</strong>?{' '}
            {customer.isActive
              ? 'No podrá utilizarse en nuevas operaciones hasta su reactivación.'
              : 'Volverá a estar disponible para operaciones nuevas.'}
          </p>
        </div>
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant={customer.isActive ? 'destructive' : 'default'}
            size="sm"
            disabled={pending}
            onClick={() => void handleConfirm()}
          >
            {pending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {customer.isActive ? 'Desactivar' : 'Reactivar'} cliente
          </Button>
        </div>
      </div>
    </Modal>
  );
}
