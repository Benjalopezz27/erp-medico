import axios from 'axios';
import { CustomerPricingErrorCode, type ICustomerSpecialPrice } from '@erp/shared-types';

export interface ParsedCustomerPricingError {
  code?: CustomerPricingErrorCode;
  status?: number;
  message: string;
  shouldRefresh: boolean;
  currentRule?: ICustomerSpecialPrice;
}

const messages: Partial<Record<CustomerPricingErrorCode, string>> = {
  [CustomerPricingErrorCode.CUSTOMER_SPECIAL_PRICE_NOT_FOUND]:
    'La excepción ya no existe. Se actualizarán los precios.',
  [CustomerPricingErrorCode.CUSTOMER_SPECIAL_PRICE_ALREADY_EXISTS]:
    'Ya existe una excepción para este producto.',
  [CustomerPricingErrorCode.CUSTOMER_SPECIAL_PRICE_INVALID_MODE]:
    'Elegí precio fijo o descuento porcentual.',
  [CustomerPricingErrorCode.CUSTOMER_SPECIAL_PRICE_INVALID_PRICE]:
    'El precio fijo debe ser positivo y tener hasta dos decimales.',
  [CustomerPricingErrorCode.CUSTOMER_SPECIAL_PRICE_INVALID_DISCOUNT]:
    'El descuento debe ser mayor que 0, menor que 100 y tener hasta cuatro decimales.',
  [CustomerPricingErrorCode.CUSTOMER_SPECIAL_PRICE_NO_EFFECTIVE_CHANGES]:
    'No se detectaron cambios para guardar.',
  [CustomerPricingErrorCode.CUSTOMER_PRICING_CUSTOMER_NOT_FOUND]: 'El cliente ya no existe.',
  [CustomerPricingErrorCode.CUSTOMER_PRICING_CUSTOMER_INACTIVE]:
    'El cliente está inactivo y no admite cambios de precios.',
  [CustomerPricingErrorCode.CUSTOMER_PRICING_PRODUCT_NOT_FOUND]: 'El producto ya no existe.',
  [CustomerPricingErrorCode.CUSTOMER_PRICING_PRODUCT_INACTIVE]:
    'El producto fue desactivado y no admite precios especiales.',
  [CustomerPricingErrorCode.CUSTOMER_SPECIAL_PRICE_CONCURRENCY_CONFLICT]:
    'Otra persona modificó la excepción. Se cargará el estado más reciente.',
};

export function parseCustomerPricingError(error: unknown): ParsedCustomerPricingError {
  if (!axios.isAxiosError(error)) {
    return {
      message: 'No se pudo completar la operación de precios especiales.',
      shouldRefresh: false,
    };
  }
  if (!error.response || error.code === 'ERR_NETWORK') {
    return {
      message: 'No se pudo conectar con el servidor. Verificá la conexión e intentá nuevamente.',
      shouldRefresh: false,
    };
  }
  const body = error.response.data as
    | {
        code?: CustomerPricingErrorCode;
        message?: string | string[];
        requestId?: string;
        details?: { currentRule?: ICustomerSpecialPrice };
      }
    | undefined;
  const fallback = Array.isArray(body?.message) ? body.message.join(' ') : body?.message;
  const requestId = body?.requestId || (error as typeof error & { requestId?: string }).requestId;
  return {
    code: body?.code,
    status: error.response.status,
    message: `${(body?.code && messages[body.code]) || fallback || 'No se pudo completar la operación.'}${
      requestId ? ` Código de seguimiento: ${requestId}.` : ''
    }`,
    shouldRefresh: error.response.status === 404 || error.response.status === 409,
    currentRule: body?.details?.currentRule,
  };
}
