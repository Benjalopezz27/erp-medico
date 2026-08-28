import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PriceReviewApprovalMode, PriceReviewStatus } from '@erp/shared-types';
import { apiClient } from '@/services/api.client';
import {
  approvePriceReviewApi,
  getPriceReviewApi,
  getPriceReviewPendingCountApi,
  getPriceReviewsApi,
  postponePriceReviewApi,
  rejectPriceReviewApi,
  reopenPriceReviewApi,
} from './price-reviews.api';

vi.mock('@/services/api.client', () => ({
  apiClient: { get: vi.fn(), patch: vi.fn() },
}));

describe('price reviews API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({ data: {} });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });
  });

  it('calls list, detail and pending count endpoints with their contracts', async () => {
    const signal = new AbortController().signal;
    await getPriceReviewsApi({ page: 1, limit: 20, status: PriceReviewStatus.PENDIENTE }, signal);
    await getPriceReviewApi('review-1', signal);
    await getPriceReviewPendingCountApi(signal);

    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/price-reviews', {
      params: { page: 1, limit: 20, status: PriceReviewStatus.PENDIENTE },
      signal,
    });
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/price-reviews/review-1', { signal });
    expect(apiClient.get).toHaveBeenNthCalledWith(3, '/price-reviews/pending-count', { signal });
  });

  it('sends the exact payload for every transactional decision', async () => {
    await approvePriceReviewApi('review-1', { mode: PriceReviewApprovalMode.SUGGESTED });
    await rejectPriceReviewApi('review-1', { reason: 'Mantener precio' });
    await postponePriceReviewApi('review-1', { reason: 'Revisar luego' });
    await reopenPriceReviewApi('review-1', {});

    expect(apiClient.patch).toHaveBeenNthCalledWith(1, '/price-reviews/review-1/approve', {
      mode: PriceReviewApprovalMode.SUGGESTED,
    });
    expect(apiClient.patch).toHaveBeenNthCalledWith(2, '/price-reviews/review-1/reject', {
      reason: 'Mantener precio',
    });
    expect(apiClient.patch).toHaveBeenNthCalledWith(3, '/price-reviews/review-1/postpone', {
      reason: 'Revisar luego',
    });
    expect(apiClient.patch).toHaveBeenNthCalledWith(4, '/price-reviews/review-1/reopen', {});
  });
});
