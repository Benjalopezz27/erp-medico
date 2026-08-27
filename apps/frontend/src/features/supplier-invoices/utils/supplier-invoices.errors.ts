import axios from 'axios';
import { SupplierInvoiceErrorCode } from '../types/supplier-invoices.types';

export type SupplierInvoiceErrorKind =
  | 'DUPLICATE_NUMBER'
  | 'RECEIPT_STALE'
  | 'CONCURRENCY'
  | 'DECISION_CONFLICT'
  | 'REJECTION_REASON'
  | 'NOT_FOUND'
  | 'FIELD'
  | 'GENERAL';

export interface ParsedSupplierInvoiceError {
  kind: SupplierInvoiceErrorKind;
  message: string;
  code?: SupplierInvoiceErrorCode;
  requestId?: string;
}

export function parseSupplierInvoiceError(error: unknown): ParsedSupplierInvoiceError {
  if (!axios.isAxiosError(error)) {
    return { kind: 'GENERAL', message: 'No se pudo registrar la factura.' };
  }
  const data = error.response?.data as
    | { code?: SupplierInvoiceErrorCode; message?: string | string[]; requestId?: string }
    | undefined;
  const code = data?.code;
  const fallback = Array.isArray(data?.message) ? data.message.join(' ') : data?.message;
  const requestId = data?.requestId || (error as typeof error & { requestId?: string }).requestId;
  const suffix = requestId ? ` Código de seguimiento: ${requestId}.` : '';

  if (code === SupplierInvoiceErrorCode.SUPPLIER_INVOICE_DUPLICATE_NUMBER) {
    return {
      kind: 'DUPLICATE_NUMBER',
      code,
      requestId,
      message: 'Ya existe ese comprobante para el proveedor.',
    };
  }
  if (code === SupplierInvoiceErrorCode.SUPPLIER_INVOICE_NOT_FOUND) {
    return {
      kind: 'NOT_FOUND',
      code,
      requestId,
      message: `La factura ya no se encuentra disponible.${suffix}`,
    };
  }
  if (
    code === SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_STATUS ||
    code === SupplierInvoiceErrorCode.SUPPLIER_INVOICE_DECISION_CONFLICT
  ) {
    return {
      kind: 'DECISION_CONFLICT',
      code,
      requestId,
      message: `La factura fue resuelta o cambió de estado mientras la revisaba.${suffix}`,
    };
  }
  if (
    code === SupplierInvoiceErrorCode.SUPPLIER_INVOICE_REJECTION_REASON_REQUIRED ||
    code === SupplierInvoiceErrorCode.SUPPLIER_INVOICE_REJECTION_REASON_INVALID
  ) {
    return {
      kind: 'REJECTION_REASON',
      code,
      requestId,
      message: `Ingrese un motivo de rechazo de entre 3 y 500 caracteres.${suffix}`,
    };
  }
  if (
    code === SupplierInvoiceErrorCode.SUPPLIER_INVOICE_RECEIPT_NOT_FOUND ||
    code === SupplierInvoiceErrorCode.SUPPLIER_INVOICE_ITEM_MISMATCH
  ) {
    return {
      kind: 'RECEIPT_STALE',
      code,
      requestId,
      message: 'La recepción o una de sus líneas ya no está disponible.',
    };
  }
  if (
    code === SupplierInvoiceErrorCode.SUPPLIER_INVOICE_CONCURRENCY_CONFLICT ||
    code === SupplierInvoiceErrorCode.SUPPLIER_INVOICE_ALLOCATION_INCONSISTENT
  ) {
    return {
      kind: 'CONCURRENCY',
      code,
      requestId,
      message: 'Los saldos cambiaron mientras preparaba la factura.',
    };
  }
  if (
    code === SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_NUMBER ||
    code === SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_DATE ||
    code === SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_QUANTITY ||
    code === SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_COST ||
    code === SupplierInvoiceErrorCode.SUPPLIER_INVOICE_INVALID_TAX
  ) {
    return {
      kind: 'FIELD',
      code,
      requestId,
      message: `${fallback || 'Revise los datos ingresados.'}${suffix}`,
    };
  }
  return {
    kind: 'GENERAL',
    code,
    requestId,
    message: `${fallback || 'No se pudo completar la operación.'}${suffix}`,
  };
}
