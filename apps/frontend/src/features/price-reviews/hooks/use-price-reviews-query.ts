import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  getPriceReviewApi,
  getPriceReviewPendingCountApi,
  getPriceReviewsApi,
} from '../api/price-reviews.api';
import type { PriceReviewSearchParams } from '../types/price-reviews.types';
import { priceReviewKeys } from './price-review-keys';

export function usePriceReviewsQuery(params: PriceReviewSearchParams) {
  return useQuery({
    queryKey: priceReviewKeys.list(params),
    queryFn: ({ signal }) => getPriceReviewsApi(params, signal),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function usePriceReviewQuery(id?: string) {
  return useQuery({
    queryKey: priceReviewKeys.detail(id ?? ''),
    queryFn: ({ signal }) => getPriceReviewApi(id!, signal),
    enabled: Boolean(id),
    staleTime: 15_000,
  });
}

export function usePriceReviewPendingCountQuery(enabled = true) {
  return useQuery({
    queryKey: priceReviewKeys.pendingCount(),
    queryFn: ({ signal }) => getPriceReviewPendingCountApi(signal),
    enabled,
    staleTime: 30_000,
  });
}
