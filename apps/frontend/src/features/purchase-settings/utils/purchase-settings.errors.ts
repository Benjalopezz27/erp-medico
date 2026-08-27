import axios from 'axios';
import { PurchaseSettingsErrorCode } from '../types/purchase-settings.types';

export function parsePurchaseSettingsError(error: unknown): string {
  if (!axios.isAxiosError(error)) return 'No se pudo actualizar la tolerancia de costos.';
  const data = error.response?.data as
    | { code?: PurchaseSettingsErrorCode; message?: string | string[]; requestId?: string }
    | undefined;
  const requestId = data?.requestId || (error as typeof error & { requestId?: string }).requestId;
  if (data?.code === PurchaseSettingsErrorCode.PURCHASE_SETTINGS_INVALID_TOLERANCE) {
    return 'La tolerancia debe estar entre 0 y 100% y tener hasta 4 decimales.';
  }
  const message = Array.isArray(data?.message) ? data.message.join(' ') : data?.message;
  return `${message || 'No se pudo actualizar la tolerancia de costos.'}${
    requestId ? ` Código de seguimiento: ${requestId}.` : ''
  }`;
}
