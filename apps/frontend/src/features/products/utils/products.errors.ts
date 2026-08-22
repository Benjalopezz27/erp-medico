import axios from 'axios';

/**
 * Extracts and translates backend NestJS error responses into user-friendly messages.
 */
export function parseProductApiError(error: unknown): string {
  if (!error) {
    return 'Ocurrió un error inesperado al procesar la solicitud.';
  }

  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    // Handle string array of validation messages
    if (data && Array.isArray(data.message)) {
      return data.message.join('. ');
    }

    // Handle single string message
    if (data && typeof data.message === 'string') {
      return data.message;
    }

    // Handle specific status codes if no message body
    if (error.response?.status === 409) {
      return 'Ya existe un registro con los datos especificados (código interno o unidad de presentación duplicada).';
    }

    if (error.response?.status === 404) {
      return 'El recurso solicitado no fue encontrado.';
    }

    if (error.response?.status === 403) {
      return 'No tienes permisos suficientes para realizar esta acción.';
    }

    if (error.response?.status === 400) {
      return 'Los datos enviados no son válidos. Por favor, revisa el formulario.';
    }

    if (error.code === 'ERR_NETWORK') {
      return 'No se pudo conectar con el servidor. Revisa tu conexión a internet.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Ocurrió un error inesperado. Intente nuevamente.';
}
