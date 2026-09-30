import axios from 'axios';
import { FiscalRetryErrorCode, type ParsedFiscalRetryError } from '../types/fiscal-alerts.types';
import { parseApiError } from '@/lib/errors/parse-api-error';

const messages: Record<string, string> = {
  [FiscalRetryErrorCode.FISCAL_DOCUMENT_NOT_FOUND]:
    'El comprobante no existe o ya no está disponible.',
  [FiscalRetryErrorCode.FISCAL_DOCUMENT_ALREADY_ISSUED]:
    'El comprobante ya fue emitido por ARCA. Se actualizó su estado.',
  [FiscalRetryErrorCode.FISCAL_RETRY_JOB_ACTIVE]:
    'Ya existe un reintento en curso para este comprobante.',
  [FiscalRetryErrorCode.FISCAL_DOCUMENT_NOT_RETRYABLE]:
    'Este rechazo no admite reintento automático.',
  [FiscalRetryErrorCode.FISCAL_CONFIGURATION_PENDING]:
    'Falta configuración fiscal pendiente antes de poder reintentar.',
};

const reconciliationCodes: string[] = [
  FiscalRetryErrorCode.FISCAL_DOCUMENT_ALREADY_ISSUED,
  FiscalRetryErrorCode.FISCAL_RETRY_JOB_ACTIVE,
];

export function parseFiscalRetryError(error: unknown): ParsedFiscalRetryError {
  if (!axios.isAxiosError(error)) {
    return {
      message: 'No fue posible solicitar el reintento.',
      requiresReconciliation: false,
    };
  }

  const apiError = parseApiError(error);
  if (!error.response) {
    return {
      message: 'No se recibió confirmación del servidor. Verificá el estado antes de reintentar.',
      requiresReconciliation: true,
    };
  }

  const code = apiError.code;

  return {
    status: apiError.statusCode,
    code,
    message: (code && messages[code]) || apiError.message,
    requiresReconciliation: Boolean(code && reconciliationCodes.includes(code)),
  };
}
