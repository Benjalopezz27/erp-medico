import { CustomerDocumentType, TaxCondition } from '@erp/shared-types';
import { customerFormSchema } from './customers.schema';

const valid = {
  businessName: 'Farmacia Central',
  documentType: CustomerDocumentType.CUIT,
  cuitOrDni: '30-50001091-2',
  taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
  email: ' CLIENTE@EXAMPLE.COM ',
  phone: ' 351-555-0101 ',
  address: '',
  creditLimit: '1500.5',
};

describe('customerFormSchema', () => {
  it('normalizes contact and canonicalizes the credit limit', () => {
    expect(customerFormSchema.parse(valid)).toMatchObject({
      email: 'cliente@example.com',
      phone: '351-555-0101',
      address: null,
      creditLimit: '1500.50',
    });
  });

  it('rejects invalid CUIT checksums and negative credit', () => {
    expect(
      customerFormSchema.safeParse({
        ...valid,
        cuitOrDni: '30-50001091-9',
        creditLimit: '-1',
      }).success,
    ).toBe(false);
  });

  it('accepts DNI only for final consumers', () => {
    expect(
      customerFormSchema.safeParse({
        ...valid,
        documentType: CustomerDocumentType.DNI,
        cuitOrDni: '35.123.456',
        taxCondition: TaxCondition.CONSUMIDOR_FINAL,
      }).success,
    ).toBe(true);
    expect(
      customerFormSchema.safeParse({
        ...valid,
        documentType: CustomerDocumentType.DNI,
        cuitOrDni: '35.123.456',
        taxCondition: TaxCondition.MONOTRIBUTO,
      }).success,
    ).toBe(false);
  });
});
