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

    // Handle structured 422 INSUFFICIENT_STOCK with numeric validation
    if (error.response?.status === 422 && data?.code === 'INSUFFICIENT_STOCK' && data.details) {
      const available =
        typeof data.details.available === 'number'
          ? data.details.available.toLocaleString('es-AR', {
              minimumFractionDigits: 2,
            })
          : String(data.details.available ?? '0');
      const requested =
        typeof data.details.requested === 'number'
          ? data.details.requested.toLocaleString('es-AR', {
              minimumFractionDigits: 2,
            })
          : String(data.details.requested ?? '0');
      return `Stock insuficiente para realizar el ajuste. Stock disponible: ${available} u. Cantidad solicitada: ${requested} u.`;
    }

    // Handle array of validation messages
    if (data && Array.isArray(data.message)) {
      return data.message.join('. ');
    }

    // Handle single string message
    if (data && typeof data.message === 'string') {
      return data.message;
    }

    if (error.response?.status === 401) {
      return 'Tu sesión expiró. Inicia sesión nuevamente para continuar.';
    }

    if (error.response?.status === 403) {
      return 'No tienes permisos de administrador para realizar ajustes de stock.';
    }

    if (error.response?.status === 404) {
      return 'El producto o registro de stock solicitado no fue encontrado.';
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

  return 'Ocurrió un error inesperado al procesar la operación de stock.';
}
