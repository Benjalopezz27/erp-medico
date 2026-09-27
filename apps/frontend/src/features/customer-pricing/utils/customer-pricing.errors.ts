import axios from 'axios';
import { CustomerPricingErrorCode, type ICustomerSpecialPrice } from '@erp/shared-types';
import { parseApiError } from '@/lib/errors/parse-api-error';

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

  const apiError = parseApiError(error);
  if (apiError.statusCode === 0) {
    return { message: apiError.message, shouldRefresh: false };
  }

  const code = apiError.code as CustomerPricingErrorCode | undefined;
  const details = apiError.details as { currentRule?: ICustomerSpecialPrice } | undefined;
  const requestId = apiError.requestId !== 'unknown' ? apiError.requestId : undefined;

  return {
    code,
    status: apiError.statusCode,
    message: `${(code && messages[code]) || apiError.message}${
      requestId ? ` Código de seguimiento: ${requestId}.` : ''
    }`,
    shouldRefresh: apiError.statusCode === 404 || apiError.statusCode === 409,
    currentRule: details?.currentRule,
  };
}
