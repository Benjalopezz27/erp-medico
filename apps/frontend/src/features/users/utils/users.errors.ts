import { AxiosError } from 'axios';

export interface NestErrorResponse {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

export function parseUserApiError(error: unknown): string {
  if (!error) {
    return 'Ocurrió un error inesperado al procesar la solicitud.';
  }

  // Handle Axios Error
  const axiosError = error as AxiosError<NestErrorResponse>;
  if (
    axiosError.isAxiosError ||
    (axiosError.response && typeof axiosError.response.status === 'number')
  ) {
    const status = axiosError.response?.status;
    const data = axiosError.response?.data;
    const rawMessage = data?.message;

    // Handle Network / Disconnect
    if (!axiosError.response || axiosError.code === 'ERR_NETWORK') {
      return 'Error de comunicación con el servidor. Verifique su conexión o intente nuevamente.';
    }

    if (status === 400) {
      if (typeof rawMessage === 'string') {
        const lower = rawMessage.toLowerCase();
        if (lower.includes('no effective changes') || lower.includes('empty')) {
          return 'No se detectaron modificaciones en los datos del usuario.';
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
      return 'El usuario solicitado no existe o fue removido.';
    }

    if (status === 409) {
      const msgStr = typeof rawMessage === 'string' ? rawMessage.toLowerCase() : '';
      if (msgStr.includes('already exists') || msgStr.includes('email')) {
        return 'El correo electrónico ingresado ya está registrado por otro usuario.';
      }
      if (msgStr.includes('own user account') || msgStr.includes('self')) {
        return 'No es posible desactivar su propia cuenta de usuario.';
      }
      if (
        msgStr.includes('last remaining active administrator') ||
        msgStr.includes('last active')
      ) {
        return 'No es posible desactivar ni cambiar el rol del último administrador activo del sistema.';
      }
      return 'No se pudo completar la operación debido a un conflicto con el estado actual del usuario.';
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
