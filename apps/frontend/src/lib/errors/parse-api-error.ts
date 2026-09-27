import axios from 'axios';
import type { ApiErrorResponse } from '@erp/shared-types';

/**
 * `ApiErrorResponse.message` mirrors the raw backend wire shape, which can be
 * a `string[]` for some hand-built exceptions. `parseApiError` always joins
 * that into a single readable string, so its return type narrows `message`
 * accordingly instead of forcing every caller to re-flatten it.
 */
export type ParsedApiError = Omit<ApiErrorResponse, 'message'> & { message: string };

export function parseApiError(error: unknown): ParsedApiError {
  const timestamp = new Date().toISOString();

  if (!axios.isAxiosError(error)) {
    return {
      statusCode: 0,
      message: 'Ocurrió un error inesperado.',
      error: 'Unknown Error',
      requestId: 'unknown',
      timestamp,
      path: '',
    };
  }

  if (!error.response) {
    return {
      statusCode: 0,
      message: 'No se pudo conectar con el servidor. Verificá tu conexión e intentá nuevamente.',
      error: 'Network Error',
      requestId: 'unknown',
      timestamp,
      path: error.config?.url ?? '',
    };
  }

  const body = error.response.data as Partial<ApiErrorResponse> | undefined;
  const message = Array.isArray(body?.message) ? body.message.join(' ') : body?.message;

  return {
    statusCode: error.response.status,
    message: message || 'No se pudo completar la operación.',
    error: body?.error || 'Error',
    ...(body?.code ? { code: body.code } : {}),
    ...(body?.details === undefined ? {} : { details: body.details }),
    requestId: body?.requestId || 'unknown',
    timestamp: body?.timestamp || timestamp,
    path: body?.path || error.config?.url || '',
  };
}
