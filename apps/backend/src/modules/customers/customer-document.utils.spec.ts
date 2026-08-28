import {
  CustomerDocumentType,
  isCustomerTaxConditionCompatible,
  sanitizeCustomerDocument,
  TaxCondition,
} from '@erp/shared-types';

describe('customer document utilities', () => {
  it('normalizes valid DNI formats and rejects invalid DNI values', () => {
    expect(
      sanitizeCustomerDocument(CustomerDocumentType.DNI, '35.123.456'),
    ).toBe('35123456');
    expect(
      sanitizeCustomerDocument(CustomerDocumentType.DNI, '00000000'),
    ).toBeNull();
    expect(
      sanitizeCustomerDocument(CustomerDocumentType.DNI, '35A123456'),
    ).toBeNull();
  });

  it('normalizes CUIT only when its prefix and checksum are valid', () => {
    expect(
      sanitizeCustomerDocument(CustomerDocumentType.CUIT, '30-50001091-2'),
    ).toBe('30500010912');
    expect(
      sanitizeCustomerDocument(CustomerDocumentType.CUIT, '30-50001091-9'),
    ).toBeNull();
  });

  it('allows DNI only for final consumers and CUIT for every tax condition', () => {
    expect(
      isCustomerTaxConditionCompatible(
        CustomerDocumentType.DNI,
        TaxCondition.CONSUMIDOR_FINAL,
      ),
    ).toBe(true);
    expect(
      isCustomerTaxConditionCompatible(
        CustomerDocumentType.DNI,
        TaxCondition.MONOTRIBUTO,
      ),
    ).toBe(false);
    expect(
      isCustomerTaxConditionCompatible(
        CustomerDocumentType.CUIT,
        TaxCondition.RESPONSABLE_INSCRIPTO,
      ),
    ).toBe(true);
  });
});
