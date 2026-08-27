import axios from 'axios';
import { GoodsReceiptErrorCode } from '../types/purchase-orders.types';

export type GoodsReceiptErrorKind =
  | 'CONCURRENCY'
  | 'DUPLICATE_DELIVERY_NOTE'
  | 'VALIDATION'
  | 'AUTH'
  | 'NOT_FOUND'
  | 'NETWORK'
  | 'UNKNOWN';

export interface ParsedGoodsReceiptError {
  message: string;
  kind: GoodsReceiptErrorKind;
  code?: GoodsReceiptErrorCode;
  status?: number;
  requestId?: string;
}

const CONCURRENCY_CODES = new Set<GoodsReceiptErrorCode>([
  GoodsReceiptErrorCode.GOODS_RECEIPT_CONCURRENCY_CONFLICT,
  GoodsReceiptErrorCode.GOODS_RECEIPT_EXCEEDS_PENDING,
  GoodsReceiptErrorCode.GOODS_RECEIPT_INVALID_PURCHASE_ORDER_STATUS,
]);

const ERROR_MESSAGES: Record<GoodsReceiptErrorCode, string> = {
  [GoodsReceiptErrorCode.GOODS_RECEIPT_NOT_FOUND]: 'La recepción no existe o no fue encontrada.',
  [GoodsReceiptErrorCode.GOODS_RECEIPT_PURCHASE_ORDER_NOT_FOUND]:
    'La orden de compra no existe o no fue encontrada.',
  [GoodsReceiptErrorCode.GOODS_RECEIPT_INVALID_PURCHASE_ORDER_STATUS]:
    'La orden cambió de estado y ya no admite esta recepción.',
  [GoodsReceiptErrorCode.GOODS_RECEIPT_DELIVERY_NOTE_REQUIRED]:
    'Ingrese un número de remito válido.',
  [GoodsReceiptErrorCode.GOODS_RECEIPT_DUPLICATE_DELIVERY_NOTE]:
    'Este remito ya fue registrado para el proveedor. Ingrese uno diferente.',
  [GoodsReceiptErrorCode.GOODS_RECEIPT_EMPTY_ITEMS]:
    'Ingrese una cantidad positiva en al menos una línea.',
  [GoodsReceiptErrorCode.GOODS_RECEIPT_DUPLICATE_ITEM]: 'La recepción contiene líneas duplicadas.',
  [GoodsReceiptErrorCode.GOODS_RECEIPT_ITEM_MISMATCH]:
    'Una de las líneas ya no pertenece a esta orden de compra.',
  [GoodsReceiptErrorCode.GOODS_RECEIPT_INVALID_QUANTITY]:
    'Revise las cantidades: deben ser positivas y tener hasta 4 decimales.',
  [GoodsReceiptErrorCode.GOODS_RECEIPT_EXCEEDS_PENDING]:
    'La cantidad supera el saldo actualizado de la orden de compra.',
  [GoodsReceiptErrorCode.GOODS_RECEIPT_INVALID_COST]:
    'El costo provisional debe ser no negativo y tener hasta 4 decimales.',
  [GoodsReceiptErrorCode.GOODS_RECEIPT_BASE_QUANTITY_NOT_REPRESENTABLE]:
    'La conversión no produce una cantidad de stock representable. Ajuste la cantidad recibida.',
  [GoodsReceiptErrorCode.GOODS_RECEIPT_BASE_QUANTITY_OVERFLOW]:
    'La cantidad convertida supera el máximo admitido por el inventario.',
  [GoodsReceiptErrorCode.GOODS_RECEIPT_CONCURRENCY_CONFLICT]:
    'La orden o el stock fueron actualizados por otra operación.',
};

export function parseGoodsReceiptApiError(error: unknown): ParsedGoodsReceiptError {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return {
        kind: 'NETWORK',
        message: 'No se pudo conectar con el servidor. Verifique su conexión e intente nuevamente.',
      };
    }
  }

  const candidate = error as {
    response?: {
      status?: number;
      data?: { code?: GoodsReceiptErrorCode; message?: string | string[]; requestId?: string };
    };
  };
  const status = candidate?.response?.status;
  const data = candidate?.response?.data;
  const code = data?.code;
  const requestId = data?.requestId;

  if (code) {
    let kind: GoodsReceiptErrorKind = 'VALIDATION';
    if (CONCURRENCY_CODES.has(code)) kind = 'CONCURRENCY';
    if (code === GoodsReceiptErrorCode.GOODS_RECEIPT_DUPLICATE_DELIVERY_NOTE) {
      kind = 'DUPLICATE_DELIVERY_NOTE';
    }
    if (
      code === GoodsReceiptErrorCode.GOODS_RECEIPT_NOT_FOUND ||
      code === GoodsReceiptErrorCode.GOODS_RECEIPT_PURCHASE_ORDER_NOT_FOUND
    ) {
      kind = 'NOT_FOUND';
    }
    return { kind, code, status, requestId, message: ERROR_MESSAGES[code] };
  }

  if (status === 401 || status === 403) {
    return {
      kind: 'AUTH',
      status,
      requestId,
      message:
        status === 401
          ? 'Su sesión expiró. Inicie sesión nuevamente.'
          : 'No tiene permisos para registrar recepciones.',
    };
  }
  if (status === 404) {
    return {
      kind: 'NOT_FOUND',
      status,
      requestId,
      message: 'La orden de compra no existe o no fue encontrada.',
    };
  }
  if (status === 409) {
    return {
      kind: 'CONCURRENCY',
      status,
      requestId,
      message: 'Los saldos de la orden cambiaron. Actualice los datos antes de continuar.',
    };
  }

  const apiMessage = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
  return {
    kind: status === 400 || status === 422 ? 'VALIDATION' : 'UNKNOWN',
    status,
    requestId,
    message:
      apiMessage ||
      `Ocurrió un error inesperado al registrar la recepción${requestId ? ` (ID: ${requestId})` : ''}.`,
  };
}
