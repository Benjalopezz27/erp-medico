import { useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { ICheckListItem } from '@erp/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { parseApiError } from '@/lib/errors/parse-api-error';
import { useCheckActionMutation, useCheckDetailQuery } from '../hooks/use-checks';
import { formatCurrency } from '@/lib/money';

interface Props {
  check: ICheckListItem | null;
  onClose: () => void;
}

/** Muestra el impacto del rechazo (facturas que se reabren) antes de confirmarlo. */
export function RejectCheckModal({ check, onClose }: Props) {
  const [reason, setReason] = useState('');
  const detail = useCheckDetailQuery(check?.id ?? null);
  const action = useCheckActionMutation();
  const impact = detail.data?.rejectionImpact;

  const close = () => {
    setReason('');
    action.reset();
    onClose();
  };

  return (
    <Modal
      isOpen={check !== null}
      onClose={close}
      title="Registrar rechazo de cheque"
      description={check ? `Cheque N° ${check.checkNumber} — ${check.bankName}` : undefined}
      className="max-w-xl"
    >
      {detail.isPending && <p className="text-xs text-slate-500">Calculando impacto…</p>}
      {detail.isError && (
        <p role="alert" className="text-xs text-rose-700">
          {parseApiError(detail.error).message}
        </p>
      )}
      {detail.data?.rejectionBlockedReason && (
        <p role="alert" className="flex items-start gap-2 text-xs text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {detail.data.rejectionBlockedReason}
        </p>
      )}
      {impact && (
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Al rechazar, el cobro se revierte y estas facturas vuelven a tener deuda:
          </p>
          <table className="w-full text-left text-xs">
            <thead className="text-slate-600">
              <tr>
                <th className="py-1">Factura</th>
                <th className="py-1 text-right">Se repone</th>
                <th className="py-1 text-right">Saldo resultante</th>
                <th className="py-1">Estado</th>
              </tr>
            </thead>
            <tbody>
              {impact.lines.map((line) => (
                <tr key={line.accountReceivableId}>
                  <td className="py-1">{line.documentReference}</td>
                  <td className="py-1 text-right">{formatCurrency(line.amountToRestore)}</td>
                  <td className="py-1 text-right">{formatCurrency(line.resultingBalance)}</td>
                  <td className="py-1">{line.resultingStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-sm font-semibold">
            Saldo del cliente aumenta: {formatCurrency(impact.totalIncrease)}
          </p>
          <label className="block space-y-1 text-xs">
            Motivo (opcional)
            <Input
              aria-label="Motivo del rechazo"
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
        </div>
      )}
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
          variant="destructive"
          disabled={!impact || action.isPending}
          onClick={() =>
            check &&
            action.mutate(
              { id: check.id, action: 'reject', reason: reason.trim() || undefined },
              { onSuccess: close },
            )
          }
        >
          {action.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          Confirmar rechazo
        </Button>
      </div>
    </Modal>
  );
}
