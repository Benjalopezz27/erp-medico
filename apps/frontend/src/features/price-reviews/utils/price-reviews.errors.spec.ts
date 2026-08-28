import axios from 'axios';
import { describe, expect, it } from 'vitest';
import { PriceReviewErrorCode } from '@erp/shared-types';
import { buildPriceReview } from '../testing/price-review-fixtures';
import { parsePriceReviewError } from './price-reviews.errors';

describe('parsePriceReviewError', () => {
  it('extracts the authoritative review from a 409 envelope', () => {
    const currentReview = buildPriceReview();
    const error = new axios.AxiosError('Conflict');
    error.response = {
      status: 409,
      statusText: 'Conflict',
      headers: {},
      config: {} as never,
      data: {
        code: PriceReviewErrorCode.PRICE_REVIEW_STALE,
        message: 'stale',
        details: {
          currentReview,
          currentProduct: currentReview.product,
          supersededByReviewId: null,
        },
      },
    };

    const parsed = parsePriceReviewError(error);
    expect(parsed.shouldRefresh).toBe(true);
    expect(parsed.conflict?.details.currentReview).toEqual(currentReview);
    expect(parsed.message).toContain('obsoleta');
  });

  it('keeps validation failures inside the form', () => {
    const error = new axios.AxiosError('Bad request');
    error.response = {
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {} as never,
      data: { code: PriceReviewErrorCode.PRICE_REVIEW_INVALID_REASON },
    };
    expect(parsePriceReviewError(error)).toMatchObject({ status: 400, shouldRefresh: false });
  });
});
