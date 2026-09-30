import axios from 'axios';
import { describe, expect, it } from 'vitest';
import { parseApiError } from './parse-api-error';

describe('parseApiError', () => {
  it('translates a backend error response into ApiErrorResponse', () => {
    const error = new axios.AxiosError('Bad Request', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: {},
      config: { headers: {} } as never,
      data: {
        statusCode: 422,
        error: 'Unprocessable Entity',
        code: 'INSUFFICIENT_STOCK',
        message: 'Stock insuficiente para completar la operación.',
        requestId: 'req-123',
        timestamp: '2026-01-01T00:00:00.000Z',
        path: '/api/v1/sales',
      },
    });

    expect(parseApiError(error)).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'INSUFFICIENT_STOCK',
      message: 'Stock insuficiente para completar la operación.',
      requestId: 'req-123',
      timestamp: '2026-01-01T00:00:00.000Z',
      path: '/api/v1/sales',
    });
  });

  it('joins array-style validation messages into a single string', () => {
    const error = new axios.AxiosError('Bad Request', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: { headers: {} } as never,
      data: {
        statusCode: 400,
        error: 'Bad Request',
        message: ['email must be an email', 'quantity must be positive'],
        requestId: 'req-456',
        timestamp: '2026-01-01T00:00:00.000Z',
        path: '/api/v1/sales',
      },
    });

    expect(parseApiError(error).message).toBe('email must be an email quantity must be positive');
  });

  it('returns a network-safe error when there is no response', () => {
    const error = new axios.AxiosError('Network Error', 'ERR_NETWORK');

    const result = parseApiError(error);
    expect(result.statusCode).toBe(0);
    expect(result.message).toContain('conectar');
  });

  it('returns a generic error for a non-axios error', () => {
    const result = parseApiError(new Error('boom'));
    expect(result.statusCode).toBe(0);
    expect(result.error).toBe('Unknown Error');
  });
});
