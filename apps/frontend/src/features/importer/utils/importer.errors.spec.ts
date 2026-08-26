import { describe, expect, it } from 'vitest';
import { ImporterErrorCode } from '@erp/shared-types';
import { parseImporterApiError } from './importer.errors';

describe('parseImporterApiError', () => {
  it('maps stable importer codes to actionable Spanish messages', () => {
    const error = {
      isAxiosError: true,
      response: { data: { code: ImporterErrorCode.IMPORTER_FORMULA_IN_DATA } },
      toJSON: () => ({}),
    };
    expect(parseImporterApiError(error)).toMatch(/fórmulas/i);
  });

  it('falls back to server validation messages', () => {
    const error = {
      isAxiosError: true,
      response: { data: { message: ['supplierId debe ser UUID'] } },
      toJSON: () => ({}),
    };
    expect(parseImporterApiError(error)).toBe('supplierId debe ser UUID');
  });
});
