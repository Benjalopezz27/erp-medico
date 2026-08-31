import axios from 'axios';
import { SaleReturnErrorCode } from '@erp/shared-types';
import type { ParsedSaleReturnError } from '../types/sales.types';

const messages: Record<string, string> = {
  [SaleReturnErrorCode.SALE_RETURN_SALE_NOT_CONFIRMED]:
    'Sólo se pueden registrar devoluciones sobre ventas confirmadas.',
  [SaleReturnErrorCode.SALE_RETURN_EXCEEDS_ORIGINAL_QUANTITY]:
    'La cantidad a devolver excede el saldo restante disponible. Se actualizaron los datos.',
  [SaleReturnErrorCode.SALE_RETURN_CONCURRENCY_CONFLICT]:
    'La venta fue modificada concurrentemente. Se actualizaron las cantidades restantes.',
  [SaleReturnErrorCode.SALE_RETURN_IDEMPOTENCY_CONFLICT]:
    'La clave de operación ya fue utilizada con un contenido distinto.',
  [SaleReturnErrorCode.SALE_RETURN_ITEM_NOT_FOUND]:
    'Uno de los ítems seleccionados no pertenece a esta venta.',
  [SaleReturnErrorCode.SALE_RETURN_PRODUCT_INACTIVE]: 'Uno de los productos se encuentra inactivo.',
  [SaleReturnErrorCode.SALE_RETURN_RECEIVABLE_INCONSISTENCY]:
    'No fue posible compensar la cuenta corriente de la venta.',
};

export function parseSaleReturnError(error: unknown): ParsedSaleReturnError {
  if (!axios.isAxiosError(error)) {
    return {
      message: 'No fue posible completar la devolución.',
      isAmbiguousNetworkError: false,
      canRetryDirectly: false,
      isConflict: false,
    };
  }

  if (!error.response) {
    return {
      message:
        'No se recibió confirmación del servidor. La devolución podría haberse registrado: revisá el historial antes de reintentar.',
      requestId: (error as { requestId?: string }).requestId,
      isAmbiguousNetworkError: true,
      canRetryDirectly: true,
      isConflict: false,
    };
  }

  const body = error.response.data as {
    code?: string;
    message?: string | string[];
    requestId?: string;
  };
  const code = body?.code;
  const backendMessage = Array.isArray(body?.message) ? body.message.join(' ') : body?.message;

  const isConflict =
    error.response.status === 409 ||
    code === SaleReturnErrorCode.SALE_RETURN_EXCEEDS_ORIGINAL_QUANTITY ||
    code === SaleReturnErrorCode.SALE_RETURN_CONCURRENCY_CONFLICT;

  return {
    status: error.response.status,
    code,
    message:
      (code && messages[code]) || backendMessage || 'No fue posible registrar la devolución.',
    requestId: body?.requestId ?? (error as { requestId?: string }).requestId,
    isAmbiguousNetworkError: false,
    canRetryDirectly:
      error.response.status === 409 &&
      code !== SaleReturnErrorCode.SALE_RETURN_IDEMPOTENCY_CONFLICT,
    isConflict,
  };
}
