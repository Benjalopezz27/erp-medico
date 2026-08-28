import { Filter } from 'lucide-react';
import {
  MarkupLevel,
  PriceReviewDecisionAction,
  PriceReviewStatus,
  type IPriceReviewDetail,
} from '@erp/shared-types';
import { Button } from '@/components/ui/button';
import {
  calculateCostVariation,
  formatPriceReviewDate,
  formatPriceReviewMoney,
  formatPriceReviewPercentage,
  formatReviewAge,
} from '../utils/price-reviews.math';
import { PriceReviewStaleAlert } from './PriceReviewStaleAlert';

const statusLabels: Record<PriceReviewStatus, string> = {
  [PriceReviewStatus.PENDIENTE]: 'Pendiente',
  [PriceReviewStatus.APROBADO]: 'Aprobada',
  [PriceReviewStatus.RECHAZADO]: 'Rechazada',
  [PriceReviewStatus.POSPUESTO]: 'Pospuesta',
};

const statusClasses: Record<PriceReviewStatus, string> = {
  [PriceReviewStatus.PENDIENTE]: 'bg-amber-100 text-amber-800',
  [PriceReviewStatus.APROBADO]: 'bg-emerald-100 text-emerald-800',
  [PriceReviewStatus.RECHAZADO]: 'bg-rose-100 text-rose-800',
  [PriceReviewStatus.POSPUESTO]: 'bg-sky-100 text-sky-800',
};

const actionLabels: Record<PriceReviewDecisionAction, string> = {
  [PriceReviewDecisionAction.APPROVE_SUGGESTED]: 'Aprobar sugerido',
  [PriceReviewDecisionAction.APPROVE_CUSTOM]: 'Precio custom',
  [PriceReviewDecisionAction.REJECT]: 'Mantener actual',
  [PriceReviewDecisionAction.POSTPONE]: 'Posponer',
  [PriceReviewDecisionAction.REOPEN]: 'Reabrir',
};

const markupLabels: Record<MarkupLevel, string> = {
  [MarkupLevel.GLOBAL]: 'Global',
  [MarkupLevel.CATEGORY]: 'Categoría',
  [MarkupLevel.PRODUCT]: 'Producto',
};

function Actions({
  review,
  onAction,
}: {
  review: IPriceReviewDetail;
  onAction: (review: IPriceReviewDetail, action: PriceReviewDecisionAction) => void;
}) {
  if (review.allowedActions.length === 0)
    return <span className="text-[11px] text-slate-400">Sin acciones pendientes</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {review.allowedActions.map((action) => (
        <Button
          key={action}
          type="button"
          size="sm"
          variant={action.startsWith('APPROVE') ? 'default' : 'outline'}
          className="h-7 px-2 text-[10px]"
          onClick={() => onAction(review, action)}
          aria-label={`${actionLabels[action]} para ${review.product.name}`}
        >
          {actionLabels[action]}
        </Button>
      ))}
    </div>
  );
}

function PriceSummary({ review }: { review: IPriceReviewDetail }) {
  const activeChanged = review.activePriceNetSnapshot !== review.product.activePriceNet;
  return (
    <div className="space-y-1 font-mono text-[11px]">
      <p>
        <span className="font-sans text-slate-500">Activo al crear:</span>{' '}
        {formatPriceReviewMoney(review.activePriceNetSnapshot)}
      </p>
      <p className={activeChanged ? 'font-semibold text-amber-700' : ''}>
        <span className="font-sans text-slate-500">Activo actual:</span>{' '}
        {formatPriceReviewMoney(review.product.activePriceNet)}
      </p>
      <p className="font-semibold text-blue-700">
        <span className="font-sans text-slate-500">Sugerido:</span>{' '}
        {formatPriceReviewMoney(review.suggestedPriceNet)}
      </p>
      {review.approvedPriceNet && (
        <p className="font-semibold text-emerald-700">
          <span className="font-sans text-slate-500">Aprobado:</span>{' '}
          {formatPriceReviewMoney(review.approvedPriceNet)}
        </p>
      )}
    </div>
  );
}

export function PriceReviewsTable({
  reviews,
  loading,
  hasFilters,
  onAction,
  onFilterInvoice,
}: {
  reviews: IPriceReviewDetail[];
  loading: boolean;
  hasFilters: boolean;
  onAction: (review: IPriceReviewDetail, action: PriceReviewDecisionAction) => void;
  onFilterInvoice: (invoiceId: string) => void;
}) {
  if (loading) {
    return (
      <div aria-label="Cargando revisiones de precio" className="space-y-2">
        {[1, 2, 3, 4].map((row) => (
          <div key={row} className="h-28 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }
  if (reviews.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="font-semibold text-slate-800">No hay revisiones para esta vista</p>
        <p className="mt-1 text-xs text-slate-500">
          {hasFilters
            ? 'Quite algún filtro para ampliar los resultados.'
            : 'Las nuevas variaciones de costo aparecerán aquí.'}
        </p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="hidden overflow-x-auto lg:block">
        <table
          className="w-full min-w-[1180px] text-left text-xs"
          aria-label="Listado de revisiones de precio"
        >
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-3 py-3">
                Producto
              </th>
              <th scope="col" className="px-3 py-3">
                Origen
              </th>
              <th scope="col" className="px-3 py-3">
                Costo
              </th>
              <th scope="col" className="px-3 py-3">
                Precios netos
              </th>
              <th scope="col" className="px-3 py-3">
                Markup
              </th>
              <th scope="col" className="px-3 py-3">
                Estado y antigüedad
              </th>
              <th scope="col" className="px-3 py-3">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reviews.map((review) => {
              const variation = calculateCostVariation(review.previousCostNet, review.newCostNet);
              return (
                <tr key={review.id} className="align-top hover:bg-slate-50/60">
                  <td className="px-3 py-3">
                    <strong className="block text-slate-900">{review.product.name}</strong>
                    <span className="font-mono text-[10px] text-slate-500">
                      {review.product.code}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      {review.product.categoryName}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <strong className="block">{review.origin.supplierName}</strong>
                    <button
                      type="button"
                      className="mt-1 inline-flex items-center text-[11px] text-blue-700 hover:underline"
                      onClick={() => onFilterInvoice(review.origin.supplierInvoiceId)}
                    >
                      {review.origin.invoiceNumber}
                      <Filter className="ml-1 h-3 w-3" />
                    </button>
                    <span className="block text-[10px] text-slate-500">
                      {formatPriceReviewDate(review.origin.invoiceDate)}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono">
                    <span className="block text-slate-500">
                      {formatPriceReviewMoney(review.previousCostNet)}
                    </span>
                    <strong className="block">→ {formatPriceReviewMoney(review.newCostNet)}</strong>
                    <span
                      className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] ${variation.direction === 'up' ? 'bg-amber-100 text-amber-800' : variation.direction === 'down' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}
                    >
                      {variation.label}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <PriceSummary review={review} />
                  </td>
                  <td className="px-3 py-3">
                    <strong>{formatPriceReviewPercentage(review.markupPercentageSnapshot)}</strong>
                    <span className="block text-[10px] text-slate-500">
                      {review.effectiveMarkupLevel
                        ? markupLabels[review.effectiveMarkupLevel]
                        : 'Sin snapshot'}
                    </span>
                    {review.effectiveMarkupTargetName && (
                      <span
                        className="block max-w-28 truncate text-[10px] text-slate-500"
                        title={review.effectiveMarkupTargetName}
                      >
                        {review.effectiveMarkupTargetName}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClasses[review.status]}`}
                    >
                      {statusLabels[review.status]}
                    </span>
                    <span className="mt-1 block" title={formatPriceReviewDate(review.createdAt)}>
                      {formatReviewAge(review.createdAt)}
                    </span>
                    {review.reviewedBy && (
                      <span className="block text-[10px] text-slate-500">
                        Por {review.reviewedBy.name}
                      </span>
                    )}
                    {review.decisionAction && (
                      <span className="block text-[10px] text-slate-500">
                        {actionLabels[review.decisionAction]}
                        {review.reviewedAt ? ` · ${formatPriceReviewDate(review.reviewedAt)}` : ''}
                      </span>
                    )}
                    {review.isStale && (
                      <div className="mt-2">
                        <PriceReviewStaleAlert
                          reasons={review.staleReasons}
                          supersededByReviewId={review.supersededByReviewId}
                          compact
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <Actions review={review} onAction={onAction} />
                    {review.decisionReason && (
                      <p
                        className="mt-2 max-w-52 text-[10px] text-slate-500"
                        title={review.decisionReason}
                      >
                        Motivo: {review.decisionReason}
                      </p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-slate-200 lg:hidden">
        {reviews.map((review) => {
          const variation = calculateCostVariation(review.previousCostNet, review.newCostNet);
          return (
            <article key={review.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <strong className="block">{review.product.name}</strong>
                  <span className="text-[11px] text-slate-500">
                    {review.product.code} · {review.product.categoryName}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusClasses[review.status]}`}
                >
                  {statusLabels[review.status]}
                </span>
              </div>
              {review.isStale && (
                <PriceReviewStaleAlert
                  reasons={review.staleReasons}
                  supersededByReviewId={review.supersededByReviewId}
                />
              )}
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs">
                <div>
                  <span className="block text-slate-500">Costo</span>
                  {formatPriceReviewMoney(review.previousCostNet)} →{' '}
                  <strong>{formatPriceReviewMoney(review.newCostNet)}</strong>
                  <span className="block text-amber-700">{variation.label}</span>
                </div>
                <PriceSummary review={review} />
              </div>
              <div className="text-xs">
                <strong>{review.origin.supplierName}</strong>
                <button
                  type="button"
                  className="ml-2 text-blue-700 underline"
                  onClick={() => onFilterInvoice(review.origin.supplierInvoiceId)}
                >
                  {review.origin.invoiceNumber}
                </button>
                <span
                  className="block text-[10px] text-slate-500"
                  title={formatPriceReviewDate(review.createdAt)}
                >
                  {formatReviewAge(review.createdAt)}
                </span>
                {review.decisionAction && (
                  <span className="block text-[10px] text-slate-500">
                    {actionLabels[review.decisionAction]}
                    {review.reviewedBy ? ` por ${review.reviewedBy.name}` : ''}
                  </span>
                )}
              </div>
              <Actions review={review} onAction={onAction} />
            </article>
          );
        })}
      </div>
    </div>
  );
}
