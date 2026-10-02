import { describe, it, expect } from 'vitest';
import { ProductBulkFileErrorCode } from '@erp/shared-types';
import { parseProductBulkLoadApiError } from './product-bulk.errors';

describe('parseProductBulkLoadApiError', () => {
  it('translates BULK_LOAD_INVALID_FILE into clear Spanish message', () => {
    const error = {
      response: {
        data: {
          code: ProductBulkFileErrorCode.BULK_LOAD_INVALID_FILE,
          message: 'Default error',
        },
      },
    };
    expect(parseProductBulkLoadApiError(error)).toBe(
      'El archivo seleccionado está vacío, corrupto, contiene fórmulas o celdas no permitidas.',
    );
  });

  it('translates BULK_LOAD_NO_VALID_ROWS into clear message', () => {
    const error = {
      response: {
        data: {
          code: ProductBulkFileErrorCode.BULK_LOAD_NO_VALID_ROWS,
        },
      },
    };
    expect(parseProductBulkLoadApiError(error)).toBe(
      'El archivo no contiene filas con datos de productos para cargar.',
    );
  });

  it('translates BULK_LOAD_ALREADY_CONFIRMED into duplicate operation message', () => {
    const error = {
      response: {
        data: {
          code: ProductBulkFileErrorCode.BULK_LOAD_ALREADY_CONFIRMED,
        },
      },
    };
    expect(parseProductBulkLoadApiError(error)).toBe(
      'Este lote de productos ya fue aplicado previamente (operación duplicada).',
    );
  });

  it('translates HTTP 413 into file size limit message', () => {
    const error = {
      response: {
        status: 413,
      },
    };
    expect(parseProductBulkLoadApiError(error)).toBe(
      'El archivo supera el tamaño máximo permitido de 2 MiB.',
    );
  });

  it('translates HTTP 415 into unsupported type message', () => {
    const error = {
      response: {
        status: 415,
      },
    };
    expect(parseProductBulkLoadApiError(error)).toBe(
      'Formato de archivo no soportado. Sólo se admiten archivos .csv y .xlsx.',
    );
  });

  it('falls back to error.message if no response data is available', () => {
    const error = new Error('Network timeout');
    expect(parseProductBulkLoadApiError(error)).toBe('Network timeout');
  });
});
