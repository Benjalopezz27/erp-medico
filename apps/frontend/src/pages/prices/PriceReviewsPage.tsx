import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { AlertCircle, CheckCircle2, Info, RefreshCw, Tags, X } from 'lucide-react';
import { PriceReviewDecisionAction, type IPriceReviewDetail } from '@erp/shared-types';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { PriceReviewDecisionModal } from '@/features/price-reviews/components/PriceReviewDecisionModal';
import { PriceReviewsFilters } from '@/features/price-reviews/components/PriceReviewsFilters';
import { PriceReviewsTable } from '@/features/price-reviews/components/PriceReviewsTable';
import {
  usePriceReviewPendingCountQuery,
  usePriceReviewsQuery,
} from '@/features/price-reviews/hooks/use-price-reviews-query';
import type {
  PriceReviewDecision,
  PriceReviewSearchParams,
} from '@/features/price-reviews/types/price-reviews.types';
import { parsePriceReviewError } from '@/features/price-reviews/utils/price-reviews.errors';

export function PriceReviewsPage() {
  const navigate = useNavigate();
  const filters = useSearch({ strict: false }) as PriceReviewSearchParams;
  const reviewsQuery = usePriceReviewsQuery(filters);
  const pendingCountQuery = usePriceReviewPendingCountQuery();
  const [decision, setDecision] = useState<PriceReviewDecision>();
  const [notice, setNotice] = useState<{ type: 'success' | 'warning'; message: string }>();

  const update = useCallback(
    (next: Partial<PriceReviewSearchParams>, resetPage = true) =>
      navigate({
        to: '/prices/review',
        search: ((previous: PriceReviewSearchParams) => ({
          ...previous,
          ...next,
          page: resetPage ? 1 : (next.page ?? previous.page),
        })) as never,
        replace: true,
      }),
    [navigate],
  );

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(undefined), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const meta = reviewsQuery.data?.meta;
    if (
      meta &&
      meta.totalPages > 0 &&
      filters.page > meta.totalPages &&
      !reviewsQuery.isPlaceholderData
    ) {
      update({ page: meta.totalPages }, false);
    }
  }, [filters.page, reviewsQuery.data?.meta, reviewsQuery.isPlaceholderData, update]);

  const hasFilters = Boolean(
    filters.productId ||
    filters.categoryId ||
    filters.supplierId ||
    filters.supplierInvoiceId ||
    filters.dateFrom ||
    filters.dateTo,
  );
  const resetFilters = () =>
    navigate({
      to: '/prices/review',
      search: { page: 1, limit: filters.limit, status: filters.status },
      replace: true,
    });

  const openDecision = (review: IPriceReviewDetail, action: PriceReviewDecisionAction) => {
    if (!review.allowedActions.includes(action)) return;
    setDecision({ review, action });
  };

  return (
    <main className="mx-auto max-w-7xl space-y-5 animate-in fade-in duration-200">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-blue-700">
            <Tags className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Revisión de precios</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Compare costos y decida cada actualización del catálogo.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => reviewsQuery.refetch()}
          disabled={reviewsQuery.isFetching}
        >
          <RefreshCw
            className={`mr-1.5 h-4 w-4 ${reviewsQuery.isFetching ? 'animate-spin' : ''}`}
          />{' '}
          Actualizar
        </Button>
      </header>

      <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <strong>El sistema nunca cambia precios automáticamente.</strong> Solo una aprobación
          explícita modifica el precio activo; rechazar, posponer o reabrir no lo alteran.
        </p>
      </div>

      {notice && (
        <div
          role={notice.type === 'success' ? 'status' : 'alert'}
          className={`flex items-center justify-between rounded-xl border p-3 text-sm ${notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-300 bg-amber-50 text-amber-900'}`}
        >
          <span className="flex items-center gap-2">
            {notice.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {notice.message}
          </span>
          <button
            type="button"
            aria-label="Cerrar notificación"
            onClick={() => setNotice(undefined)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <PriceReviewsFilters
        filters={filters}
        pendingCount={pendingCountQuery.data?.count}
        onChange={update}
        onReset={resetFilters}
      />

      {reviewsQuery.isError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {parsePriceReviewError(reviewsQuery.error).message}
          </span>
          <Button variant="outline" size="sm" onClick={() => reviewsQuery.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <>
          <PriceReviewsTable
            reviews={reviewsQuery.data?.data ?? []}
            loading={reviewsQuery.isLoading}
            hasFilters={hasFilters}
            onAction={openDecision}
            onFilterInvoice={(supplierInvoiceId) => update({ supplierInvoiceId })}
          />
          {reviewsQuery.data && reviewsQuery.data.meta.total > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 sm:flex-row">
              <span>
                Mostrando página <strong>{reviewsQuery.data.meta.page}</strong> de{' '}
                <strong>{Math.max(reviewsQuery.data.meta.totalPages, 1)}</strong> ·{' '}
                {reviewsQuery.data.meta.total} revisiones
              </span>
              <div className="flex items-center gap-2">
                <label htmlFor="price-review-page-size">Filas:</label>
                <Select
                  id="price-review-page-size"
                  value={String(filters.limit)}
                  onChange={(event) => update({ limit: Number(event.target.value) })}
                  className="h-8 w-16"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!reviewsQuery.data.meta.hasPreviousPage}
                  onClick={() => update({ page: filters.page - 1 }, false)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!reviewsQuery.data.meta.hasNextPage}
                  onClick={() => update({ page: filters.page + 1 }, false)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {decision && (
        <PriceReviewDecisionModal
          review={decision.review}
          action={decision.action}
          onClose={() => setDecision(undefined)}
          onSuccess={(message) => setNotice({ type: 'success', message })}
          onConflict={(message) => setNotice({ type: 'warning', message })}
        />
      )}
    </main>
  );
}
