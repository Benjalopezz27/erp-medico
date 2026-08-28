import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  PriceReviewApprovalMode,
  PriceReviewDecisionAction,
  type IPriceReviewDetail,
} from '@erp/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import {
  useApprovePriceReviewMutation,
  usePostponePriceReviewMutation,
  useRejectPriceReviewMutation,
  useReopenPriceReviewMutation,
} from '../hooks/use-price-review-mutations';
import { formatPriceReviewMoney, normalizeCustomPrice } from '../utils/price-reviews.math';
import { parsePriceReviewError } from '../utils/price-reviews.errors';

const copy: Record<
  PriceReviewDecisionAction,
  { title: string; submit: string; changesPrice: boolean }
> = {
  [PriceReviewDecisionAction.APPROVE_SUGGESTED]: {
    title: 'Aprobar precio sugerido',
    submit: 'Aprobar sugerido',
    changesPrice: true,
  },
  [PriceReviewDecisionAction.APPROVE_CUSTOM]: {
    title: 'Aprobar precio personalizado',
    submit: 'Aplicar precio',
    changesPrice: true,
  },
  [PriceReviewDecisionAction.REJECT]: {
    title: 'Mantener precio actual',
    submit: 'Rechazar propuesta',
    changesPrice: false,
  },
  [PriceReviewDecisionAction.POSTPONE]: {
    title: 'Posponer revisión',
    submit: 'Posponer',
    changesPrice: false,
  },
  [PriceReviewDecisionAction.REOPEN]: {
    title: 'Reabrir revisión',
    submit: 'Reabrir',
    changesPrice: false,
  },
};

export function PriceReviewDecisionModal({
  review,
  action,
  onClose,
  onSuccess,
  onConflict,
}: {
  review: IPriceReviewDetail;
  action: PriceReviewDecisionAction;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onConflict: (message: string) => void;
}) {
  const approve = useApprovePriceReviewMutation();
  const reject = useRejectPriceReviewMutation();
  const postpone = usePostponePriceReviewMutation();
  const reopen = useReopenPriceReviewMutation();
  const [customPrice, setCustomPrice] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string>();
  const isPending = approve.isPending || reject.isPending || postpone.isPending || reopen.isPending;
  const currentCopy = copy[action];
  const customValidation = useMemo(() => normalizeCustomPrice(customPrice), [customPrice]);

  useEffect(() => {
    setCustomPrice('');
    setReason('');
    setError(undefined);
  }, [action, review.id]);

  const close = () => {
    if (!isPending) onClose();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isPending) return;
    const trimmedReason = reason.trim();
    if (action === PriceReviewDecisionAction.REJECT && trimmedReason.length < 3) {
      setError('Ingrese un motivo de al menos 3 caracteres para mantener el precio actual.');
      return;
    }
    if (trimmedReason.length > 0 && trimmedReason.length < 3) {
      setError('Si agrega un motivo, debe tener al menos 3 caracteres.');
      return;
    }
    if (trimmedReason.length > 500) {
      setError('El motivo no puede superar los 500 caracteres.');
      return;
    }
    if (action === PriceReviewDecisionAction.APPROVE_CUSTOM && !customValidation.success) {
      setError(customValidation.message);
      return;
    }
    setError(undefined);
    const reasonPayload = trimmedReason ? { reason: trimmedReason } : {};
    try {
      if (action === PriceReviewDecisionAction.APPROVE_SUGGESTED) {
        await approve.mutateAsync({
          id: review.id,
          payload: { mode: PriceReviewApprovalMode.SUGGESTED, ...reasonPayload },
        });
      } else if (action === PriceReviewDecisionAction.APPROVE_CUSTOM) {
        await approve.mutateAsync({
          id: review.id,
          payload: {
            mode: PriceReviewApprovalMode.CUSTOM,
            customPriceNet: customValidation.success ? customValidation.value : undefined,
            ...reasonPayload,
          },
        });
      } else if (action === PriceReviewDecisionAction.REJECT) {
        await reject.mutateAsync({ id: review.id, payload: { reason: trimmedReason } });
      } else if (action === PriceReviewDecisionAction.POSTPONE) {
        await postpone.mutateAsync({ id: review.id, payload: reasonPayload });
      } else {
        await reopen.mutateAsync({ id: review.id, payload: reasonPayload });
      }
      onSuccess(
        currentCopy.changesPrice
          ? 'Precio activo actualizado correctamente.'
          : action === PriceReviewDecisionAction.REJECT
            ? 'Propuesta rechazada. El precio activo se mantuvo sin cambios.'
            : action === PriceReviewDecisionAction.POSTPONE
              ? 'Revisión pospuesta sin modificar el precio activo.'
              : 'Revisión reabierta sin modificar el precio activo.',
      );
      onClose();
    } catch (caught) {
      const parsed = parsePriceReviewError(caught);
      if (parsed.status === 409) {
        onConflict(parsed.message);
        onClose();
      } else {
        setError(parsed.message);
      }
    }
  };

  const impactMessage =
    action === PriceReviewDecisionAction.APPROVE_CUSTOM
      ? customValidation.success
        ? `Esta acción cambiará el precio activo a ${formatPriceReviewMoney(customValidation.value)}.`
        : 'Esta acción cambiará el precio activo al precio personalizado válido que ingrese.'
      : `Esta acción cambiará el precio activo a ${formatPriceReviewMoney(review.suggestedPriceNet)}.`;

  return (
    <Modal
      isOpen
      onClose={close}
      title={currentCopy.title}
      description={`Revisión de ${review.product.code} · ${review.product.name}`}
      showCloseButton={!isPending}
    >
      <form className="space-y-4" onSubmit={submit} noValidate>
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs">
          <div>
            <span className="block text-slate-500">Precio activo actual</span>
            <strong className="font-mono text-sm">
              {formatPriceReviewMoney(review.product.activePriceNet)}
            </strong>
          </div>
          <div>
            <span className="block text-slate-500">Sugerido histórico</span>
            <strong className="font-mono text-sm">
              {formatPriceReviewMoney(review.suggestedPriceNet)}
            </strong>
          </div>
        </div>

        {action === PriceReviewDecisionAction.APPROVE_CUSTOM && (
          <div>
            <label
              htmlFor="price-review-custom-price"
              className="mb-1.5 block text-xs font-semibold"
            >
              Nuevo precio neto activo
            </label>
            <Input
              id="price-review-custom-price"
              value={customPrice}
              onChange={(event) => {
                setCustomPrice(event.target.value);
                setError(undefined);
              }}
              inputMode="decimal"
              placeholder="Ej.: 165,50"
              disabled={isPending}
              aria-invalid={customPrice.length > 0 && !customValidation.success}
              aria-describedby="price-review-custom-help"
              autoFocus
            />
            <p id="price-review-custom-help" className="mt-1 text-[11px] text-slate-500">
              Mayor que cero y con hasta 2 decimales. El sugerido histórico se conservará.
            </p>
          </div>
        )}

        <div
          className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${
            currentCopy.changesPrice
              ? 'border-amber-300 bg-amber-50 text-amber-900'
              : 'border-sky-200 bg-sky-50 text-sky-900'
          }`}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {currentCopy.changesPrice
              ? impactMessage
              : action === PriceReviewDecisionAction.REOPEN
                ? 'Esta acción devuelve la revisión a pendientes y no modifica el precio activo.'
                : 'Esta acción no modifica el precio activo del producto.'}
          </p>
        </div>

        <div>
          <label htmlFor="price-review-reason" className="mb-1.5 block text-xs font-semibold">
            Motivo {action === PriceReviewDecisionAction.REJECT ? '(obligatorio)' : '(opcional)'}
          </label>
          <textarea
            id="price-review-reason"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setError(undefined);
            }}
            maxLength={500}
            rows={3}
            disabled={isPending}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            aria-describedby="price-review-reason-count"
            autoFocus={action === PriceReviewDecisionAction.REJECT}
          />
          <p id="price-review-reason-count" className="text-right text-[10px] text-slate-400">
            {reason.length}/500
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
          >
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" size="sm" onClick={close} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {currentCopy.submit}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
