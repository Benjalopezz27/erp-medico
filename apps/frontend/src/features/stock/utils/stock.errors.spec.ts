import { describe, it, expect } from 'vitest';
import { AxiosError } from 'axios';
import { parseStockApiError } from './stock.errors';

describe('parseStockApiError', () => {
  it('returns default message for null/undefined error', () => {
    expect(parseStockApiError(null)).toBe('Ocurrió un error inesperado al procesar la solicitud.');
  });

  it('formats structured 422 INSUFFICIENT_STOCK error with numeric details', () => {
    const axiosError = new AxiosError(
      'Unprocessable Entity',
      'ERR_BAD_RESPONSE',
      undefined,
      undefined,
      {
        status: 422,
        statusText: 'Unprocessable Entity',
        headers: {},
        config: {} as any,
        data: {
          code: 'INSUFFICIENT_STOCK',
          details: {
            available: 5.5,
            requested: 10,
          },
        },
      },
    );

    const message = parseStockApiError(axiosError);
    expect(message).toContain('Stock insuficiente para realizar el ajuste.');
    expect(message).toContain('Stock disponible: 5,50 u.');
    expect(message).toContain('Cantidad solicitada: 10,00 u.');
  });

  it('handles 401 Unauthorized with session expired message', () => {
    const axiosError = new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: {} as any,
      data: {},
    });

    expect(parseStockApiError(axiosError)).toBe(
      'Tu sesión expiró. Inicia sesión nuevamente para continuar.',
    );
  });

  it('handles 403 Forbidden with admin permissions message', () => {
    const axiosError = new AxiosError('Forbidden', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 403,
      statusText: 'Forbidden',
      headers: {},
      config: {} as any,
      data: {},
    });

    expect(parseStockApiError(axiosError)).toBe(
      'No tienes permisos de administrador para realizar ajustes de stock.',
    );
  });

  it('joins array validation error messages', () => {
    const axiosError = new AxiosError('Bad Request', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: {} as any,
      data: {
        message: ['El motivo es obligatorio', 'La cantidad debe ser mayor a 0'],
      },
    });

    expect(parseStockApiError(axiosError)).toBe(
      'El motivo es obligatorio. La cantidad debe ser mayor a 0',
    );
  });
});
