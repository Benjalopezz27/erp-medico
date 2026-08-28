import { AlertTriangle } from 'lucide-react';
import { PriceReviewStaleReason } from '@erp/shared-types';

const reasonLabels: Record<PriceReviewStaleReason, string> = {
  [PriceReviewStaleReason.SUPERSEDED]: 'Existe una revisión posterior para el producto.',
  [PriceReviewStaleReason.COST_CHANGED]: 'El costo actual ya no coincide con esta revisión.',
  [PriceReviewStaleReason.SUGGESTED_PRICE_CHANGED]:
    'El precio sugerido actual cambió desde que se creó.',
  [PriceReviewStaleReason.ACTIVE_PRICE_CHANGED]:
    'El precio activo cambió desde que se creó la revisión.',
};

export function PriceReviewStaleAlert({
  reasons,
  supersededByReviewId,
  compact = false,
}: {
  reasons: PriceReviewStaleReason[];
  supersededByReviewId?: string | null;
  compact?: boolean;
}) {
  return (
    <div
      role="status"
      className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <strong>Revisión obsoleta</strong>
          {!compact && (
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {reasons.map((reason) => (
                <li key={reason}>{reasonLabels[reason]}</li>
              ))}
            </ul>
          )}
          {!compact && supersededByReviewId && (
            <p className="mt-1 font-mono text-[10px]">
              Reemplazada por {supersededByReviewId.slice(0, 8)}…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
