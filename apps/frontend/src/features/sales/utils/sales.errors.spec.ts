import axios from 'axios';
import { describe, expect, it } from 'vitest';
import { SalesErrorCode } from '@erp/shared-types';
import { parseSalesError } from './sales.errors';

describe('parseSalesError', () => {
  it('preserves insufficient-stock details', () => {
    const error = new axios.AxiosError('stock', 'ERR_BAD_REQUEST', undefined, undefined, {
      data: {
        code: 'INSUFFICIENT_STOCK',
        requestId: 'req-1',
        details: { productId: 'p1', available: 2, requested: 3 },
      },
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
    });
    expect(parseSalesError(error)).toMatchObject({
      status: 422,
      requestId: 'req-1',
      stock: { productId: 'p1', available: 2, requested: 3 },
      isAmbiguousNetworkError: false,
    });
  });

  it('allows explicit retry for rolled-back concurrency conflicts', () => {
    const error = new axios.AxiosError('conflict', 'ERR_BAD_REQUEST', undefined, undefined, {
      data: { code: SalesErrorCode.SALE_CONCURRENCY_CONFLICT },
      status: 409,
      statusText: 'Conflict',
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
    });
    expect(parseSalesError(error)).toMatchObject({
      canRetryDirectly: true,
      code: SalesErrorCode.SALE_CONCURRENCY_CONFLICT,
    });
  });

  it('marks network failures without response as ambiguous', () => {
    expect(parseSalesError(new axios.AxiosError('Network', 'ERR_NETWORK'))).toMatchObject({
      isAmbiguousNetworkError: true,
      canRetryDirectly: false,
    });
  });
});
