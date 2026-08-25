import { describe, it, expect } from 'vitest';
import { parseQuarantineApiError } from './quarantine.errors';

describe('parseQuarantineApiError', () => {
  it('translates INSUFFICIENT_STOCK code into clear Spanish message', () => {
    const error = {
      response: {
        status: 422,
        data: {
          code: 'INSUFFICIENT_STOCK',
          message: 'Insufficient stock',
        },
      },
    };
    expect(parseQuarantineApiError(error)).toBe(
      'Saldo disponible insuficiente en stock para apartar la cantidad solicitada a cuarentena.',
    );
  });

  it('translates 409 Conflict into already resolved message', () => {
    const error = {
      response: {
        status: 409,
        data: {
          code: 'QUARANTINE_ALREADY_RESOLVED',
        },
      },
    };
    expect(parseQuarantineApiError(error)).toBe(
      'El registro de cuarentena ya ha sido resuelto previamente por otro usuario.',
    );
  });

  it('translates 404 Not Found into message', () => {
    const error = {
      response: {
        status: 404,
      },
    };
    expect(parseQuarantineApiError(error)).toBe(
      'El registro de cuarentena o el producto especificado no fue encontrado.',
    );
  });

  it('translates 403 Forbidden into permission message', () => {
    const error = {
      response: {
        status: 403,
      },
    };
    expect(parseQuarantineApiError(error)).toBe(
      'No tienes permisos suficientes para gestionar stock en cuarentena.',
    );
  });

  it('returns backend message string if provided on 400', () => {
    const error = {
      response: {
        status: 400,
        data: {
          message: 'No se puede ingresar a cuarentena un producto inactivo.',
        },
      },
    };
    expect(parseQuarantineApiError(error)).toBe(
      'No se puede ingresar a cuarentena un producto inactivo.',
    );
  });

  it('falls back to error.message when no response is attached', () => {
    const error = new Error('Network error');
    expect(parseQuarantineApiError(error)).toBe('Network error');
  });
});
