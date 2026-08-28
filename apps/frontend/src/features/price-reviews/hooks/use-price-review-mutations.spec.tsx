import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PriceReviewApprovalMode } from '@erp/shared-types';
import { productKeys } from '@/features/products/hooks/use-products-query';
import { supplierProductsKeys } from '@/features/supplier-products/hooks/supplier-products-keys';
import { buildPriceReview } from '../testing/price-review-fixtures';
import * as api from '../api/price-reviews.api';
import { priceReviewKeys } from './price-review-keys';
import {
  useApprovePriceReviewMutation,
  useRejectPriceReviewMutation,
} from './use-price-review-mutations';

vi.mock('../api/price-reviews.api');

describe('price review mutations', () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
  });

  it('writes the authoritative approval and invalidates reviews, products and catalogs', async () => {
    const review = buildPriceReview({ approvedPriceNet: '168.00' });
    vi.mocked(api.approvePriceReviewApi).mockResolvedValue(review);
    const { result } = renderHook(() => useApprovePriceReviewMutation(), { wrapper });

    await act(() =>
      result.current.mutateAsync({
        id: review.id,
        payload: { mode: PriceReviewApprovalMode.SUGGESTED },
      }),
    );

    expect(queryClient.getQueryData(priceReviewKeys.detail(review.id))).toEqual(review);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: priceReviewKeys.all });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: productKeys.all });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: supplierProductsKeys.all,
    });
  });

  it('rejects without falsely invalidating product or catalog prices', async () => {
    const review = buildPriceReview();
    vi.mocked(api.rejectPriceReviewApi).mockResolvedValue(review);
    const { result } = renderHook(() => useRejectPriceReviewMutation(), { wrapper });
    await act(() =>
      result.current.mutateAsync({ id: review.id, payload: { reason: 'Mantener precio actual' } }),
    );
    await waitFor(() =>
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: priceReviewKeys.all }),
    );
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith({ queryKey: productKeys.all });
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: supplierProductsKeys.all,
    });
  });
});
