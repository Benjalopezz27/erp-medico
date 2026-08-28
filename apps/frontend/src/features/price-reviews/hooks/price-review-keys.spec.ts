import { describe, expect, it } from 'vitest';
import { PriceReviewStatus } from '@erp/shared-types';
import { priceReviewKeys } from './price-review-keys';

describe('priceReviewKeys', () => {
  it('provides the stable cache root reserved for the Sprint 6 review tray', () => {
    expect(priceReviewKeys.all).toEqual(['price-reviews']);
  });

  it('builds stable list, detail and pending-count keys', () => {
    const filters = { page: 1, limit: 20, status: PriceReviewStatus.PENDIENTE };
    expect(priceReviewKeys.list(filters)).toEqual(['price-reviews', 'list', filters]);
    expect(priceReviewKeys.detail('review-1')).toEqual(['price-reviews', 'detail', 'review-1']);
    expect(priceReviewKeys.pendingCount()).toEqual(['price-reviews', 'pending-count']);
  });
});
