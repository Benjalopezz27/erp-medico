import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { ICheckListItem } from '@erp/shared-types';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { useSuppliersQuery } from '@/features/suppliers/hooks/use-suppliers-query';
import { parseApiError } from '@/lib/errors/parse-api-error';
import { useCheckActionMutation } from '../hooks/use-checks';

interface Props {
  check: ICheckListItem | null;
  onClose: () => void;
}

export function EndorseCheckModal({ check, onClose }: Props) {
  const [supplierId, setSupplierId] = useState('');
  const suppliers = useSuppliersQuery({ page: 1, limit: 100, isActive: true });
  const action = useCheckActionMutation();

  const close = () => {
    setSupplierId('');
    action.reset();
    onClose();
  };

  return (
    <Modal
      isOpen={check !== null}
      onClose={close}
      title="Endosar cheque a proveedor"
      description={check ? `Cheque N° ${check.checkNumber} — ${check.bankName}` : undefined}
    >
      <label className="block space-y-1 text-xs">
        Proveedor
        <Select
          aria-label="Proveedor"
          value={supplierId}
          onChange={(event) => setSupplierId(event.target.value)}
        >
          <option value="">Seleccioná un proveedor…</option>
          {suppliers.data?.data.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.businessName}
            </option>
          ))}
        </Select>
      </label>
      {action.isError && (
        <p role="alert" className="mt-2 text-xs text-rose-700">
          {parseApiError(action.error).message}
        </p>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={close}>
          Cancelar
        </Button>
        <Button
          type="button"
          disabled={!supplierId || action.isPending}
          onClick={() =>
            check &&
            action.mutate({ id: check.id, action: 'endorse', supplierId }, { onSuccess: close })
          }
        >
          {action.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          Confirmar endoso
        </Button>
      </div>
    </Modal>
  );
}
