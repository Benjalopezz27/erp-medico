import { describe, expect, it } from 'vitest';
import { priceReviewKeys } from './price-review-keys';

describe('priceReviewKeys', () => {
  it('provides the stable cache root reserved for the Sprint 6 review tray', () => {
    expect(priceReviewKeys.all).toEqual(['price-reviews']);
  });
});
