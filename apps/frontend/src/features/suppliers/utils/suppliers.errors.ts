import { AxiosError } from 'axios';

export interface NestErrorResponse {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

export function parseSupplierApiError(error: unknown): string {
  if (!error) {
    return 'Ocurrió un error inesperado al procesar la solicitud.';
  }

  const axiosError = error as AxiosError<NestErrorResponse>;
  if (
    axiosError.isAxiosError ||
    (axiosError.response && typeof axiosError.response.status === 'number')
  ) {
    const status = axiosError.response?.status;
    const data = axiosError.response?.data;
    const rawMessage = data?.message;

    if (!axiosError.response || axiosError.code === 'ERR_NETWORK') {
      return 'Error de comunicación con el servidor. Verifique su conexión o intente nuevamente.';
    }

    if (status === 400) {
      if (typeof rawMessage === 'string') {
        const lower = rawMessage.toLowerCase();
        if (lower.includes('no effective changes') || lower.includes('cambios efectivos')) {
          return 'No se detectaron modificaciones en los datos del proveedor.';
        }
        if (lower.includes('inactivo') || lower.includes('inactive')) {
          return 'El proveedor ya se encuentra inactivo.';
        }
        if (lower.includes('activo') || lower.includes('active')) {
          return 'El proveedor ya se encuentra activo.';
        }
        if (lower.includes('cuit')) {
          return 'El CUIT ingresado no es válido.';
        }
        return rawMessage;
      }
      if (Array.isArray(rawMessage) && rawMessage.length > 0) {
        return rawMessage.join('. ');
      }
      return 'Los datos enviados son inválidos. Verifique los campos requeridos.';
    }

    if (status === 403) {
      return 'Acceso denegado: Se requieren permisos de Administrador para realizar esta acción.';
    }

    if (status === 404) {
      return 'El proveedor solicitado no existe o fue removido.';
    }

    if (status === 409) {
      const msgStr = typeof rawMessage === 'string' ? rawMessage.toLowerCase() : '';
      if (msgStr.includes('cuit') || msgStr.includes('registrado')) {
        return 'Ya existe un proveedor registrado con el CUIT ingresado.';
      }
      return 'No se pudo completar la operación debido a un conflicto con los datos del proveedor.';
    }

    if (status && status >= 500) {
      return 'Error interno del servidor. Por favor, intente más tarde.';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Ocurrió un error inesperado al procesar la solicitud.';
}
