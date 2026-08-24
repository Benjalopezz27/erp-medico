import { describe, it, expect } from 'vitest';
import { StockBulkFileErrorCode } from '@erp/shared-types';
import { parseBulkLoadApiError } from './stock-bulk.errors';

describe('parseBulkLoadApiError', () => {
  it('translates BULK_LOAD_INVALID_FILE into clear Spanish message', () => {
    const error = {
      response: {
        data: {
          code: StockBulkFileErrorCode.BULK_LOAD_INVALID_FILE,
          message: 'Default error',
        },
      },
    };
    expect(parseBulkLoadApiError(error)).toBe(
      'El archivo seleccionado está vacío, corrupto, contiene fórmulas o celdas no permitidas.',
    );
  });

  it('translates BULK_LOAD_TEMPLATE_ROW_LIMIT_EXCEEDED into catalog limit message', () => {
    const error = {
      response: {
        data: {
          code: StockBulkFileErrorCode.BULK_LOAD_TEMPLATE_ROW_LIMIT_EXCEEDED,
        },
      },
    };
    expect(parseBulkLoadApiError(error)).toBe(
      'El catálogo de productos activos supera el límite de 1000 productos para la descarga de la plantilla.',
    );
  });

  it('translates BULK_LOAD_NO_INCLUDED_ROWS into action message', () => {
    const error = {
      response: {
        data: {
          code: StockBulkFileErrorCode.BULK_LOAD_NO_INCLUDED_ROWS,
        },
      },
    };
    expect(parseBulkLoadApiError(error)).toBe(
      'Debes ingresar la cantidad de al menos un producto para confirmar la carga.',
    );
  });

  it('translates BULK_LOAD_ALREADY_CONFIRMED into duplicate operation message', () => {
    const error = {
      response: {
        data: {
          code: StockBulkFileErrorCode.BULK_LOAD_ALREADY_CONFIRMED,
        },
      },
    };
    expect(parseBulkLoadApiError(error)).toBe(
      'Este lote de stock ya fue aplicado previamente (operación duplicada).',
    );
  });

  it('translates HTTP 413 into file size limit message', () => {
    const error = {
      response: {
        status: 413,
      },
    };
    expect(parseBulkLoadApiError(error)).toBe(
      'El archivo supera el tamaño máximo permitido de 2 MiB.',
    );
  });

  it('translates HTTP 415 into unsupported type message', () => {
    const error = {
      response: {
        status: 415,
      },
    };
    expect(parseBulkLoadApiError(error)).toBe(
      'Formato de archivo no soportado. Sólo se admiten archivos .csv y .xlsx.',
    );
  });

  it('falls back to error.message if no response data is available', () => {
    const error = new Error('Network timeout');
    expect(parseBulkLoadApiError(error)).toBe('Network timeout');
  });
});
