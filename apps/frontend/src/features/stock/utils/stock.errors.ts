import axios from 'axios';

/**
 * Extracts user-friendly error messages from backend responses for stock operations.
 */
export function parseStockApiError(error: unknown): string {
  if (!error) {
    return 'Ocurrió un error inesperado al procesar la solicitud.';
  }

  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    // Handle array of validation messages
    if (data && Array.isArray(data.message)) {
      return data.message.join('. ');
    }

    // Handle single string message
    if (data && typeof data.message === 'string') {
      return data.message;
    }

    if (error.response?.status === 404) {
      return 'El producto o registro de stock solicitado no fue encontrado.';
    }

    if (error.response?.status === 403) {
      return 'No tienes permisos suficientes para realizar esta acción.';
    }

    if (error.response?.status === 400) {
      return 'Los filtros o parámetros de consulta enviados no son válidos.';
    }

    if (error.code === 'ERR_NETWORK') {
      return 'No se pudo conectar con el servidor. Revisa tu conexión a internet.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Ocurrió un error inesperado al consultar el inventario.';
}
