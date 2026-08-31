import { describe, expect, it } from 'vitest';
import { AxiosError } from 'axios';
import { SaleReturnErrorCode } from '@erp/shared-types';
import { parseSaleReturnError } from './sales-returns.errors';

describe('sales-returns error parsing', () => {
  it('parses network error as ambiguous with retry option', () => {
    const networkError = new AxiosError('Network Error');
    networkError.response = undefined;
    const result = parseSaleReturnError(networkError);
    expect(result.isAmbiguousNetworkError).toBe(true);
    expect(result.canRetryDirectly).toBe(true);
    expect(result.message).toContain('No se recibió confirmación del servidor');
  });

  it('parses concurrency and excess conflicts (409) with friendly messages', () => {
    const conflictError = new AxiosError('Conflict', '409', undefined, undefined, {
      status: 409,
      data: {
        code: SaleReturnErrorCode.SALE_RETURN_EXCEEDS_ORIGINAL_QUANTITY,
        message: 'Sale return exceeds original quantity',
      },
    } as any);

    const result = parseSaleReturnError(conflictError);
    expect(result.isConflict).toBe(true);
    expect(result.canRetryDirectly).toBe(true);
    expect(result.message).toContain('excede el saldo restante');
  });

  it('parses generic backend message when code is unrecognized', () => {
    const genericError = new AxiosError('Bad Request', '400', undefined, undefined, {
      status: 400,
      data: {
        message: 'Error personalizado del servidor',
      },
    } as any);

    const result = parseSaleReturnError(genericError);
    expect(result.message).toBe('Error personalizado del servidor');
    expect(result.isConflict).toBe(false);
  });
});
