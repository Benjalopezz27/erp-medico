import axios from 'axios';
import { SalesErrorCode } from '@erp/shared-types';
import type { ParsedSalesError, StockErrorDetails } from '../types/sales.types';

const messages: Record<string, string> = {
  [SalesErrorCode.SALE_CONCURRENCY_CONFLICT]:
    'La venta cambió concurrentemente. Podés intentar confirmarla nuevamente.',
  [SalesErrorCode.SALE_DUPLICATE_PRODUCT]: 'Un producto no puede repetirse en la venta.',
  [SalesErrorCode.SALE_CREDIT_REQUIRES_CUSTOMER]: 'La venta a crédito requiere un cliente.',
  [SalesErrorCode.SALE_CREDIT_REQUIRES_INVOICE]: 'La venta a crédito requiere factura.',
  [SalesErrorCode.SALE_CREDIT_REQUIRES_CURRENT_ACCOUNT]:
    'La venta a crédito debe registrarse en cuenta corriente.',
  [SalesErrorCode.SALE_CASH_INVALID_CURRENT_ACCOUNT]:
    'Una venta de contado no puede usar cuenta corriente.',
  [SalesErrorCode.SALE_NOT_FOUND]: 'La venta solicitada no existe.',
};

export function parseSalesError(error: unknown): ParsedSalesError {
  if (!axios.isAxiosError(error)) {
    return {
      message: 'No fue posible completar la operación.',
      isAmbiguousNetworkError: false,
      canRetryDirectly: false,
    };
  }

  if (!error.response) {
    return {
      message:
        'No se recibió respuesta. La venta podría haberse registrado: revisá el historial antes de reintentar.',
      requestId: (error as { requestId?: string }).requestId,
      isAmbiguousNetworkError: true,
      canRetryDirectly: false,
    };
  }

  const body = error.response.data as {
    code?: string;
    message?: string | string[];
    requestId?: string;
    details?: Partial<StockErrorDetails>;
  };
  const code = body?.code;
  const stock =
    error.response.status === 422 &&
    code === 'INSUFFICIENT_STOCK' &&
    typeof body.details?.productId === 'string'
      ? {
          productId: body.details.productId,
          available: Number(body.details.available ?? 0),
          requested: Number(body.details.requested ?? 0),
        }
      : undefined;
  const backendMessage = Array.isArray(body?.message) ? body.message.join(' ') : body?.message;

  return {
    status: error.response.status,
    code,
    message: stock
      ? `Stock insuficiente. Disponible: ${stock.available}; solicitado: ${stock.requested}.`
      : (code && messages[code]) || backendMessage || 'No fue posible completar la operación.',
    requestId: body?.requestId ?? (error as { requestId?: string }).requestId,
    stock,
    isAmbiguousNetworkError: false,
    canRetryDirectly: error.response.status === 409,
  };
}
