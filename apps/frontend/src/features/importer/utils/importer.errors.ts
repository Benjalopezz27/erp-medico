import axios from 'axios';
import { ImporterErrorCode } from '@erp/shared-types';

const messages: Record<ImporterErrorCode, string> = {
  [ImporterErrorCode.IMPORTER_FILE_MISSING]: 'No se ha seleccionado ningún archivo para cargar.',
  [ImporterErrorCode.IMPORTER_FILE_EMPTY]: 'El archivo seleccionado está vacío.',
  [ImporterErrorCode.IMPORTER_FILE_TOO_LARGE]:
    'El archivo supera el tamaño máximo permitido de 2 MiB.',
  [ImporterErrorCode.IMPORTER_FORMAT_NOT_SUPPORTED]:
    'Formato no soportado. Solo se admiten archivos .csv y .xlsx.',
  [ImporterErrorCode.IMPORTER_MIME_MISMATCH]:
    'El contenido del archivo no coincide con su extensión.',
  [ImporterErrorCode.IMPORTER_FILE_CORRUPT]:
    'El archivo está corrupto o su estructura es inválida.',
  [ImporterErrorCode.IMPORTER_ZIP_SUSPICIOUS]:
    'El archivo contiene una estructura comprimida sospechosa.',
  [ImporterErrorCode.IMPORTER_MACROS_NOT_ALLOWED]: 'Los archivos con macros no están permitidos.',
  [ImporterErrorCode.IMPORTER_FORMULA_IN_HEADER]: 'Uno o más encabezados contienen fórmulas.',
  [ImporterErrorCode.IMPORTER_FORMULA_IN_DATA]:
    'El archivo contiene fórmulas. Expórtalo como valores estáticos.',
  [ImporterErrorCode.IMPORTER_EXCEL_ERROR_CELL]:
    'El archivo contiene celdas con errores nativos de Excel.',
  [ImporterErrorCode.IMPORTER_ROW_LIMIT_EXCEEDED]:
    'El archivo supera el límite de 1.000 filas de datos.',
  [ImporterErrorCode.IMPORTER_COLUMN_LIMIT_EXCEEDED]:
    'El archivo supera el límite de 100 columnas.',
  [ImporterErrorCode.IMPORTER_HEADER_EMPTY]: 'El archivo contiene encabezados vacíos.',
  [ImporterErrorCode.IMPORTER_HEADER_DUPLICATE]: 'El archivo contiene encabezados duplicados.',
  [ImporterErrorCode.IMPORTER_MULTIPLE_SHEETS]:
    'El archivo Excel debe contener una sola hoja con datos.',
  [ImporterErrorCode.IMPORTER_SUPPLIER_NOT_FOUND]:
    'El proveedor seleccionado no existe o fue eliminado.',
  [ImporterErrorCode.IMPORTER_SUPPLIER_INACTIVE]:
    'El proveedor seleccionado se encuentra inactivo.',

  // S3-US13-B Template & Mapping
  [ImporterErrorCode.IMPORTER_TEMPLATE_NOT_FOUND]:
    'La plantilla solicitada no existe o fue eliminada.',
  [ImporterErrorCode.IMPORTER_TEMPLATE_NAME_DUPLICATE]:
    'Ya existe una plantilla con ese nombre para este proveedor.',
  [ImporterErrorCode.IMPORTER_TEMPLATE_FINGERPRINT_DUPLICATE]:
    'Ya existe una plantilla guardada para este formato de archivo en este proveedor.',
  [ImporterErrorCode.IMPORTER_INVALID_MAPPING]:
    'La configuración de mapeo de columnas es inválida.',
  [ImporterErrorCode.IMPORTER_MAPPING_MISSING_REQUIRED_FIELD]:
    'Faltan campos obligatorios por mapear (SKU de proveedor y Costo neto).',
  [ImporterErrorCode.IMPORTER_MAPPING_HEADER_NOT_FOUND]:
    'Una o más columnas asignadas no existen en el archivo.',
  [ImporterErrorCode.IMPORTER_MAPPING_DUPLICATE_COLUMN]:
    'Una misma columna del archivo no puede asignarse a más de un campo del sistema.',
  [ImporterErrorCode.IMPORTER_FINGERPRINT_MISMATCH]:
    'La estructura del archivo no coincide con el formato esperado de la plantilla.',

  // S3-US14-A Preview & Resolution
  [ImporterErrorCode.IMPORTER_CHECKSUM_MISMATCH]:
    'El archivo enviado no coincide con el archivo cargado originalmente. Por favor, vuelva a cargar el archivo.',
  [ImporterErrorCode.IMPORTER_MAPPING_INVALID_JSON]:
    'El formato de configuración de mapeo de columnas es inválido.',

  // S3-US14-B Confirmation & Batches
  [ImporterErrorCode.IMPORTER_CONFIRM_FILE_MISMATCH]:
    'El archivo enviado no coincide con el archivo validado durante la vista previa.',
  [ImporterErrorCode.IMPORTER_CONFIRM_MAPPING_MISMATCH]:
    'El mapeo de columnas enviado no coincide con el validado en la vista previa.',
  [ImporterErrorCode.IMPORTER_CONFIRM_CONTENT_MISMATCH]:
    'El contenido del archivo o el catálogo ha cambiado respecto a la vista previa.',
  [ImporterErrorCode.IMPORTER_CONFIRM_PREVIEW_INVALID]:
    'La vista previa contiene errores o SKUs desconocidos y no puede confirmarse.',
  [ImporterErrorCode.IMPORTER_BATCH_ALREADY_CONFIRMED]:
    'Este lote de importación ya fue confirmado previamente para este proveedor.',
  [ImporterErrorCode.IMPORTER_BATCH_NOT_FOUND]:
    'El lote de importación solicitado no existe o fue eliminado.',
};

export function parseImporterApiError(error: unknown): string {
  if (axios.isCancel(error)) return '';
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { code?: ImporterErrorCode; message?: string | string[]; existingBatchId?: string }
      | undefined;
    if (data?.code && messages[data.code]) return messages[data.code];
    if (Array.isArray(data?.message)) return data.message.join(' ');
    if (typeof data?.message === 'string') return data.message;
    if (!error.response) return 'No se pudo conectar con el servidor. Intenta nuevamente.';
  }
  return error instanceof Error ? error.message : 'No se pudo procesar la solicitud.';
}

export function getExistingBatchIdFromError(error: unknown): string | null {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { existingBatchId?: string } | undefined;
    return data?.existingBatchId || null;
  }
  return null;
}
