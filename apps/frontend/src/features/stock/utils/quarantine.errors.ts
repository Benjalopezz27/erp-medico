/**
 * Maps API errors from quarantine endpoints into clear Spanish user messages.
 */
export function parseQuarantineApiError(error: unknown): string {
  if (!error) {
    return 'Ocurrió un error inesperado al procesar la operación de cuarentena.';
  }

  const apiError = error as {
    response?: {
      status?: number;
      data?: {
        code?: string;
        message?: string | string[];
      };
    };
    message?: string;
  };

  const responseData = apiError.response?.data;
  const errorCode = responseData?.code;
  const status = apiError.response?.status;

  if (errorCode === 'INSUFFICIENT_STOCK') {
    return 'Saldo disponible insuficiente en stock para apartar la cantidad solicitada a cuarentena.';
  }

  if (errorCode === 'QUARANTINE_ALREADY_RESOLVED' || status === 409) {
    return 'El registro de cuarentena ya ha sido resuelto previamente por otro usuario.';
  }

  if (status === 404) {
    return 'El registro de cuarentena o el producto especificado no fue encontrado.';
  }

  if (status === 403) {
    return 'No tienes permisos suficientes para gestionar stock en cuarentena.';
  }

  if (status === 401) {
    return 'Sesión expirada o no autorizada para realizar esta operación.';
  }

  if (typeof responseData?.message === 'string') {
    return responseData.message;
  }

  if (Array.isArray(responseData?.message) && responseData.message.length > 0) {
    return responseData.message.join(', ');
  }

  if (status === 422) {
    return 'La operación no pudo procesarse debido a restricciones de saldo o reglas de negocio.';
  }

  if (status === 400) {
    return 'Los datos enviados son inválidos. Revisa los campos e intenta nuevamente.';
  }

  return (
    apiError.message ||
    'Error de comunicación con el servidor al procesar la operación de cuarentena.'
  );
}
