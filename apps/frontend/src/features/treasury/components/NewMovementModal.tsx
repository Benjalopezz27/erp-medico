import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import {
  TreasuryAccountType,
  TreasuryMovementType,
  type ManualTreasuryAccountType,
} from '@erp/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { parseApiError } from '@/lib/errors/parse-api-error';
import { useCreateTreasuryMovementMutation } from '../hooks/use-treasury';
import { ACCOUNT_LABELS, MOVEMENT_TYPE_LABELS } from '../utils/treasury.labels';
import {
  normalizeAmount,
  validateMovement,
  type MovementFormErrors,
} from '../utils/treasury.validation';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const MANUAL_ACCOUNTS: ManualTreasuryAccountType[] = [
  TreasuryAccountType.EFECTIVO,
  TreasuryAccountType.BANCOS,
];

export function NewMovementModal({ isOpen, onClose }: Props) {
  const [accountType, setAccountType] = useState<ManualTreasuryAccountType>(
    TreasuryAccountType.EFECTIVO,
  );
  const [movementType, setMovementType] = useState(TreasuryMovementType.INGRESO);
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [errors, setErrors] = useState<MovementFormErrors>({});
  const mutation = useCreateTreasuryMovementMutation();

  const close = () => {
    setAmount('');
    setConcept('');
    setErrors({});
    mutation.reset();
    onClose();
  };

  const submit = async () => {
    const found = validateMovement(amount, concept);
    setErrors(found);
    if (found.amount || found.concept) return;
    try {
      await mutation.mutateAsync({
        accountType,
        movementType,
        amount: normalizeAmount(amount),
        concept: concept.trim(),
      });
      close();
    } catch {
      // El error se muestra desde mutation.error.
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Movimiento manual"
      description="Registre un ajuste, retiro o depósito. El movimiento no se puede editar ni borrar."
    >
      <div className="space-y-4 text-sm">
        <label className="block space-y-1 text-xs font-semibold">
          Cuenta
          <Select
            aria-label="Cuenta"
            value={accountType}
            onChange={(e) => setAccountType(e.target.value as ManualTreasuryAccountType)}
          >
            {MANUAL_ACCOUNTS.map((value) => (
              <option key={value} value={value}>
                {ACCOUNT_LABELS[value]}
              </option>
            ))}
          </Select>
        </label>
        <label className="block space-y-1 text-xs font-semibold">
          Tipo
          <Select
            aria-label="Tipo"
            value={movementType}
            onChange={(e) => setMovementType(e.target.value as TreasuryMovementType)}
          >
            {Object.values(TreasuryMovementType).map((value) => (
              <option key={value} value={value}>
                {MOVEMENT_TYPE_LABELS[value]}
              </option>
            ))}
          </Select>
        </label>
        <label className="block space-y-1 text-xs font-semibold">
          Monto
          <Input
            aria-label="Monto"
            inputMode="decimal"
            className="font-mono"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {errors.amount && <span className="text-rose-600">{errors.amount}</span>}
        </label>
        <label className="block space-y-1 text-xs font-semibold">
          Concepto
          <Input
            aria-label="Concepto"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
          />
          {errors.concept && <span className="text-rose-600">{errors.concept}</span>}
        </label>
        {mutation.isError && (
          <p role="alert" className="flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4" />
            {parseApiError(mutation.error).message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={close} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando…' : 'Registrar movimiento'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
