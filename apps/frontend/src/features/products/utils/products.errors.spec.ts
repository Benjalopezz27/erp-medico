import { describe, it, expect } from 'vitest';
import { AxiosError, AxiosResponse } from 'axios';
import { parseProductApiError } from './products.errors';

describe('products.errors', () => {
  it('extracts message array from NestJS validation pipe', () => {
    const error = new AxiosError('Bad Request');
    error.response = {
      status: 400,
      data: {
        message: ['El código interno es obligatorio', 'El nombre es obligatorio'],
      },
    } as AxiosResponse;

    expect(parseProductApiError(error)).toBe(
      'El código interno es obligatorio. El nombre es obligatorio',
    );
  });

  it('extracts single message from NestJS exception', () => {
    const error = new AxiosError('Conflict');
    error.response = {
      status: 409,
      data: {
        message: 'Ya existe un producto con el código interno especificado.',
      },
    } as AxiosResponse;

    expect(parseProductApiError(error)).toBe(
      'Ya existe un producto con el código interno especificado.',
    );
  });

  it('handles standard Error instances', () => {
    const err = new Error('Custom Error');
    expect(parseProductApiError(err)).toBe('Custom Error');
  });

  it('returns fallback for unknown errors', () => {
    expect(parseProductApiError(null)).toContain('error inesperado');
    expect(parseProductApiError({})).toContain('error inesperado');
  });
});
