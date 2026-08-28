import axios from 'axios';
import { MarkupErrorCode } from '@erp/shared-types';

export interface ParsedMarkupError {
  code?: MarkupErrorCode;
  status?: number;
  message: string;
  shouldRefresh: boolean;
}

const messages: Partial<Record<MarkupErrorCode, string>> = {
  [MarkupErrorCode.MARKUP_ALREADY_EXISTS]:
    'Otro cambio creó una regla para este objetivo. Actualice las configuraciones y elija nuevamente.',
  [MarkupErrorCode.MARKUP_NOT_FOUND]:
    'La regla ya no existe. Actualice las configuraciones para continuar.',
  [MarkupErrorCode.MARKUP_INVALID_TARGET]: 'El objetivo seleccionado ya no existe o no es válido.',
  [MarkupErrorCode.MARKUP_INVALID_PERCENTAGE]:
    'El porcentaje debe estar entre 0 y 1000 y tener hasta 4 decimales.',
  [MarkupErrorCode.MARKUP_TARGET_INACTIVE]:
    'El producto fue desactivado y ya no puede recibir una excepción.',
  [MarkupErrorCode.MARKUP_GLOBAL_MISSING]:
    'Falta la configuración global obligatoria. Contacte a soporte antes de continuar.',
  [MarkupErrorCode.MARKUP_GLOBAL_CANNOT_BE_DELETED]:
    'La configuración global es obligatoria y solo puede editarse.',
};

export function parseMarkupError(error: unknown): ParsedMarkupError {
  if (!axios.isAxiosError(error)) {
    return {
      message: 'No se pudo completar la operación de markup.',
      shouldRefresh: false,
    };
  }
  const data = error.response?.data as
    { code?: MarkupErrorCode; message?: string | string[]; requestId?: string } | undefined;
  const status = error.response?.status;
  const code = data?.code;
  const requestId = data?.requestId || (error as typeof error & { requestId?: string }).requestId;
  const serverMessage = Array.isArray(data?.message) ? data.message.join(' ') : data?.message;
  const message = code && messages[code] ? messages[code]! : serverMessage;
  return {
    code,
    status,
    message: `${message || 'No se pudo completar la operación de markup.'}${
      requestId ? ` Código de seguimiento: ${requestId}.` : ''
    }`,
    shouldRefresh: status === 404 || status === 409,
  };
}
