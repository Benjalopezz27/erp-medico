import axios from 'axios';
import { PriceReviewErrorCode, type IPriceReviewConflictState } from '@erp/shared-types';

export interface ParsedPriceReviewError {
  code?: PriceReviewErrorCode;
  status?: number;
  message: string;
  shouldRefresh: boolean;
  conflict?: IPriceReviewConflictState;
}

const messages: Partial<Record<PriceReviewErrorCode, string>> = {
  [PriceReviewErrorCode.PRICE_REVIEW_NOT_FOUND]:
    'La revisión ya no existe. La bandeja se actualizará.',
  [PriceReviewErrorCode.PRICE_REVIEW_PRODUCT_NOT_FOUND]:
    'El producto asociado ya no está disponible.',
  [PriceReviewErrorCode.PRICE_REVIEW_INVALID_TRANSITION]:
    'La revisión cambió de estado y esta acción ya no está permitida.',
  [PriceReviewErrorCode.PRICE_REVIEW_STALE]:
    'La revisión quedó obsoleta. Se cargó el estado más reciente.',
  [PriceReviewErrorCode.PRICE_REVIEW_INVALID_CUSTOM_PRICE]:
    'El precio personalizado debe ser positivo y tener hasta 2 decimales.',
  [PriceReviewErrorCode.PRICE_REVIEW_INVALID_REASON]:
    'El motivo debe tener entre 3 y 500 caracteres.',
  [PriceReviewErrorCode.PRICE_REVIEW_INVALID_DATE_RANGE]:
    'El rango de fechas seleccionado no es válido.',
  [PriceReviewErrorCode.PRICE_REVIEW_CONCURRENCY_CONFLICT]:
    'Otra operación modificó la revisión. Se cargó el estado más reciente.',
};

export function parsePriceReviewError(error: unknown): ParsedPriceReviewError {
  if (!axios.isAxiosError(error)) {
    return {
      message: 'No se pudo completar la operación sobre la revisión de precio.',
      shouldRefresh: false,
    };
  }
  const response = error.response;
  const body = response?.data as
    | (Partial<IPriceReviewConflictState> & {
        code?: PriceReviewErrorCode;
        message?: string | string[];
        requestId?: string;
      })
    | undefined;
  const code = body?.code;
  const fallback = Array.isArray(body?.message) ? body.message.join(' ') : body?.message;
  const requestId = body?.requestId || (error as typeof error & { requestId?: string }).requestId;
  const conflict =
    response?.status === 409 && body?.details?.currentReview
      ? (body as IPriceReviewConflictState)
      : undefined;
  return {
    code,
    status: response?.status,
    message: `${(code && messages[code]) || fallback || 'No se pudo completar la operación.'}${
      requestId ? ` Código de seguimiento: ${requestId}.` : ''
    }`,
    shouldRefresh: response?.status === 404 || response?.status === 409,
    conflict,
  };
}
