import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { IPaginatedPriceReviewsResponse, IPriceReviewDetail } from '@erp/shared-types';
import { productKeys } from '@/features/products/hooks/use-products-query';
import { supplierProductsKeys } from '@/features/supplier-products/hooks/supplier-products-keys';
import { supplierInvoicesKeys } from '@/features/supplier-invoices/hooks/supplier-invoices-keys';
import {
  approvePriceReviewApi,
  postponePriceReviewApi,
  rejectPriceReviewApi,
  reopenPriceReviewApi,
} from '../api/price-reviews.api';
import type {
  ApprovePriceReviewPayload,
  PriceReviewReasonPayload,
  RejectPriceReviewPayload,
} from '../types/price-reviews.types';
import { parsePriceReviewError } from '../utils/price-reviews.errors';
import { priceReviewKeys } from './price-review-keys';

function writeReviewToCache(queryClient: QueryClient, review: IPriceReviewDetail) {
  queryClient.setQueryData(priceReviewKeys.detail(review.id), review);
  queryClient.setQueriesData<IPaginatedPriceReviewsResponse>(
    { queryKey: priceReviewKeys.lists() },
    (current) =>
      current
        ? {
            ...current,
            data: current.data.map((item) => (item.id === review.id ? review : item)),
          }
        : current,
  );
}

function useReviewMutationLifecycle(invalidateCatalog: boolean) {
  const queryClient = useQueryClient();
  return {
    onSuccess: async (review: IPriceReviewDetail) => {
      writeReviewToCache(queryClient, review);
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: priceReviewKeys.all }),
        queryClient.invalidateQueries({
          queryKey: supplierInvoicesKeys.detail(review.supplierInvoiceId),
        }),
      ];
      if (invalidateCatalog) {
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: productKeys.all }),
          queryClient.invalidateQueries({ queryKey: supplierProductsKeys.all }),
          queryClient.invalidateQueries({ queryKey: supplierInvoicesKeys.lists() }),
        );
      }
      await Promise.all(invalidations);
    },
    onError: async (error: unknown) => {
      const parsed = parsePriceReviewError(error);
      const authoritative = parsed.conflict?.details.currentReview;
      if (authoritative) writeReviewToCache(queryClient, authoritative);
      if (parsed.shouldRefresh) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: priceReviewKeys.all }),
          ...(authoritative
            ? [
                queryClient.invalidateQueries({
                  queryKey: productKeys.detail(authoritative.productId),
                }),
              ]
            : []),
        ]);
      }
    },
  };
}

export function useApprovePriceReviewMutation() {
  const lifecycle = useReviewMutationLifecycle(true);
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ApprovePriceReviewPayload }) =>
      approvePriceReviewApi(id, payload),
    retry: false,
    ...lifecycle,
  });
}

export function useRejectPriceReviewMutation() {
  const lifecycle = useReviewMutationLifecycle(false);
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RejectPriceReviewPayload }) =>
      rejectPriceReviewApi(id, payload),
    retry: false,
    ...lifecycle,
  });
}

export function usePostponePriceReviewMutation() {
  const lifecycle = useReviewMutationLifecycle(false);
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PriceReviewReasonPayload }) =>
      postponePriceReviewApi(id, payload),
    retry: false,
    ...lifecycle,
  });
}

export function useReopenPriceReviewMutation() {
  const lifecycle = useReviewMutationLifecycle(false);
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PriceReviewReasonPayload }) =>
      reopenPriceReviewApi(id, payload),
    retry: false,
    ...lifecycle,
  });
}
