import { describe, expect, it } from 'vitest';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { parseUserApiError, NestErrorResponse } from './users.errors';

function createMockAxiosError(
  status?: number,
  data?: NestErrorResponse,
  code?: string,
): AxiosError<NestErrorResponse> {
  const error = new AxiosError<NestErrorResponse>('Request failed');
  error.isAxiosError = true;
  error.code = code;
  if (status !== undefined) {
    error.response = {
      status,
      data: data ?? {},
      statusText: 'Error',
      headers: {},
      config: {} as InternalAxiosRequestConfig,
    } as AxiosResponse<NestErrorResponse>;
  }
  return error;
}

describe('parseUserApiError', () => {
  it('handles network disconnection without response', () => {
    const error = createMockAxiosError(undefined, undefined, 'ERR_NETWORK');
    expect(parseUserApiError(error)).toBe(
      'Error de comunicación con el servidor. Verifique su conexión o intente nuevamente.',
    );
  });

  it('maps 400 validation error array to readable string', () => {
    const error = createMockAxiosError(400, {
      statusCode: 400,
      message: ['El nombre es requerido', 'El email es inválido'],
      error: 'Bad Request',
    });
    expect(parseUserApiError(error)).toBe('El nombre es requerido. El email es inválido');
  });

  it('maps 400 no-op error message', () => {
    const error = createMockAxiosError(400, {
      statusCode: 400,
      message: 'No effective changes detected in update payload',
    });
    expect(parseUserApiError(error)).toBe(
      'No se detectaron modificaciones en los datos del usuario.',
    );
  });

  it('maps 403 Forbidden to administrator permissions warning', () => {
    const error = createMockAxiosError(403, {
      statusCode: 403,
      message: 'Forbidden resource',
    });
    expect(parseUserApiError(error)).toBe(
      'Acceso denegado: Se requieren permisos de Administrador para realizar esta acción.',
    );
  });

  it('maps 404 Not Found', () => {
    const error = createMockAxiosError(404, {
      statusCode: 404,
      message: 'User with ID "123" not found',
    });
    expect(parseUserApiError(error)).toBe('El usuario solicitado no existe o fue removido.');
  });

  it('maps 409 duplicate email conflict', () => {
    const error = createMockAxiosError(409, {
      statusCode: 409,
      message: 'User with email "admin@erp.com" already exists',
    });
    expect(parseUserApiError(error)).toBe(
      'El correo electrónico ingresado ya está registrado por otro usuario.',
    );
  });

  it('maps 409 self-deactivation conflict', () => {
    const error = createMockAxiosError(409, {
      statusCode: 409,
      message: 'Cannot deactivate your own user account',
    });
    expect(parseUserApiError(error)).toBe('No es posible desactivar su propia cuenta de usuario.');
  });

  it('maps 409 last active administrator conflict', () => {
    const error = createMockAxiosError(409, {
      statusCode: 409,
      message: 'Cannot deactivate the last remaining active administrator',
    });
    expect(parseUserApiError(error)).toBe(
      'No es posible desactivar ni cambiar el rol del último administrador activo del sistema.',
    );
  });

  it('maps generic 500 server error', () => {
    const error = createMockAxiosError(500, {
      statusCode: 500,
      message: 'Internal server error',
    });
    expect(parseUserApiError(error)).toBe(
      'Error interno del servidor. Por favor, intente más tarde.',
    );
  });
});
