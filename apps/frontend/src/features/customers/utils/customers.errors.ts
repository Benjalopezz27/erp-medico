import axios from 'axios';
import { CustomerErrorCode } from '@erp/shared-types';

export interface ParsedCustomerError {
  code?: CustomerErrorCode;
  status?: number;
  message: string;
  shouldRefresh: boolean;
  documentDuplicate: boolean;
}

const messages: Partial<Record<CustomerErrorCode, string>> = {
  [CustomerErrorCode.CUSTOMER_NOT_FOUND]: 'El cliente ya no existe. Actualizá la vista.',
  [CustomerErrorCode.CUSTOMER_DOCUMENT_INVALID]: 'El DNI o CUIT ingresado no es válido.',
  [CustomerErrorCode.CUSTOMER_DOCUMENT_ALREADY_EXISTS]:
    'Ya existe un cliente registrado con este DNI o CUIT.',
  [CustomerErrorCode.CUSTOMER_TAX_CONDITION_INCOMPATIBLE]:
    'La condición fiscal no es compatible con el tipo de documento.',
  [CustomerErrorCode.CUSTOMER_INVALID_CREDIT_LIMIT]:
    'El límite de crédito debe ser un importe no negativo con hasta dos decimales.',
  [CustomerErrorCode.CUSTOMER_NO_EFFECTIVE_CHANGES]: 'No se detectaron cambios para guardar.',
  [CustomerErrorCode.CUSTOMER_ALREADY_INACTIVE]: 'El cliente ya está inactivo.',
  [CustomerErrorCode.CUSTOMER_ALREADY_ACTIVE]: 'El cliente ya está activo.',
  [CustomerErrorCode.CUSTOMER_FORBIDDEN_CREDIT_LIMIT]:
    'Tu rol no permite asignar un límite de crédito mayor a cero.',
  [CustomerErrorCode.CUSTOMER_FORBIDDEN_FIELD_UPDATE]:
    'Tu rol no permite modificar los datos fiscales o comerciales enviados.',
  [CustomerErrorCode.CUSTOMER_CONCURRENCY_CONFLICT]:
    'Otro usuario modificó el cliente. Actualizá los datos antes de continuar.',
};

export function parseCustomerError(error: unknown): ParsedCustomerError {
  if (!axios.isAxiosError(error)) {
    return {
      message: 'No se pudo completar la operación sobre el cliente.',
      shouldRefresh: false,
      documentDuplicate: false,
    };
  }
  if (!error.response || error.code === 'ERR_NETWORK') {
    return {
      message: 'No se pudo conectar con el servidor. Verificá la conexión e intentá nuevamente.',
      shouldRefresh: false,
      documentDuplicate: false,
    };
  }
  const body = error.response.data as
    { code?: CustomerErrorCode; message?: string | string[]; requestId?: string } | undefined;
  const code = body?.code;
  const fallback = Array.isArray(body?.message) ? body.message.join(' ') : body?.message;
  const requestId = body?.requestId || (error as typeof error & { requestId?: string }).requestId;
  const message = (code && messages[code]) || fallback || 'No se pudo completar la operación.';
  return {
    code,
    status: error.response.status,
    message: `${message}${requestId ? ` Código de seguimiento: ${requestId}.` : ''}`,
    shouldRefresh: error.response.status === 404 || error.response.status === 409,
    documentDuplicate: code === CustomerErrorCode.CUSTOMER_DOCUMENT_ALREADY_EXISTS,
  };
}
