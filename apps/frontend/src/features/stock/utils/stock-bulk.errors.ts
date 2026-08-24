import { StockBulkFileErrorCode } from '@erp/shared-types';

/**
 * Maps API errors from bulk load preview/confirm endpoints into clear Spanish user messages.
 */
export function parseBulkLoadApiError(error: unknown): string {
  if (!error) {
    return 'Ocurrió un error inesperado al procesar el archivo.';
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

  if (errorCode) {
    switch (errorCode) {
      case StockBulkFileErrorCode.BULK_LOAD_MISSING_FILE:
        return 'No se ha seleccionado ningún archivo para cargar.';
      case StockBulkFileErrorCode.BULK_LOAD_INVALID_FILE:
        return 'El archivo seleccionado está vacío, corrupto o contiene fórmulas no permitidas.';
      case StockBulkFileErrorCode.BULK_LOAD_UNSUPPORTED_TYPE:
        return 'Formato de archivo no soportado. Sólo se admiten archivos .csv y .xlsx.';
      case StockBulkFileErrorCode.BULK_LOAD_FILE_TOO_LARGE:
        return 'El archivo supera el tamaño máximo permitido de 2 MiB.';
      case StockBulkFileErrorCode.BULK_LOAD_ROW_LIMIT_EXCEEDED:
        return 'El archivo supera el límite máximo de 1000 filas de datos.';
      case StockBulkFileErrorCode.BULK_LOAD_MISSING_HEADERS:
        return 'El archivo no contiene los encabezados obligatorios (internalCode, quantityBase).';
      case StockBulkFileErrorCode.BULK_LOAD_DUPLICATE_HEADER:
      case StockBulkFileErrorCode.BULK_LOAD_UNKNOWN_HEADER:
        return 'Los encabezados del archivo son inválidos. Se esperan exactamente: internalCode, quantityBase.';
      case StockBulkFileErrorCode.BULK_LOAD_MULTIPLE_SHEETS:
        return 'El archivo Excel contiene más de una hoja con datos. Debe contener exactamente una hoja.';
      case StockBulkFileErrorCode.BULK_LOAD_PREVIEW_MISMATCH:
        return 'El archivo enviado para confirmar no coincide con la previsualización autorizada.';
      case StockBulkFileErrorCode.BULK_LOAD_ALREADY_CONFIRMED:
        return 'Este lote de stock ya fue aplicado previamente (operación duplicada).';
      case StockBulkFileErrorCode.BULK_LOAD_VALIDATION_FAILED:
        return 'El archivo contiene errores de validación en sus filas y no puede ser aplicado.';
      default:
        break;
    }
  }

  if (typeof responseData?.message === 'string') {
    return responseData.message;
  }

  if (Array.isArray(responseData?.message) && responseData.message.length > 0) {
    return responseData.message.join(', ');
  }

  if (status === 413) {
    return 'El archivo supera el tamaño máximo permitido de 2 MiB.';
  }

  if (status === 415) {
    return 'Formato de archivo no soportado. Sólo se admiten archivos .csv y .xlsx.';
  }

  if (status === 403) {
    return 'No tienes permisos suficientes para realizar cargas masivas de inventario.';
  }

  if (status === 409) {
    return 'Conflicto al procesar el lote: ya fue aplicado o no coincide con la previsualización.';
  }

  return apiError.message || 'Error de comunicación con el servidor al procesar el archivo.';
}
