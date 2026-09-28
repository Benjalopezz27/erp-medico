import { ConfigService } from '@nestjs/config';
import { InvoiceTypeResolverService } from './invoice-type-resolver.service';
import {
  CustomerDocumentType,
  FiscalDocumentType,
  TaxCondition,
} from '@erp/shared-types';

describe('InvoiceTypeResolverService', () => {
  function makeService(emisorTaxCondition?: string) {
    const configService = {
      get: jest.fn((key: string) =>
        key === 'ARCA_EMISOR_TAX_CONDITION' ? emisorTaxCondition : undefined,
      ),
    } as unknown as ConfigService;
    return new InvoiceTypeResolverService(configService);
  }

  it('resolves Factura A for RESPONSABLE_INSCRIPTO customer with CUIT', () => {
    const service = makeService();
    const result = service.resolve({
      taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
      documentType: CustomerDocumentType.CUIT,
    });
    expect(result).toBe(FiscalDocumentType.FACTURA_A);
  });

  it('resolves Factura A for MONOTRIBUTO customer with CUIT', () => {
    const service = makeService();
    const result = service.resolve({
      taxCondition: TaxCondition.MONOTRIBUTO,
      documentType: CustomerDocumentType.CUIT,
    });
    expect(result).toBe(FiscalDocumentType.FACTURA_A);
  });

  it('resolves Factura B for CONSUMIDOR_FINAL', () => {
    const service = makeService();
    const result = service.resolve({
      taxCondition: TaxCondition.CONSUMIDOR_FINAL,
      documentType: CustomerDocumentType.DNI,
    });
    expect(result).toBe(FiscalDocumentType.FACTURA_B);
  });

  it('resolves Factura B for EXENTO', () => {
    const service = makeService();
    const result = service.resolve({
      taxCondition: TaxCondition.EXENTO,
      documentType: CustomerDocumentType.DNI,
    });
    expect(result).toBe(FiscalDocumentType.FACTURA_B);
  });

  it('resolves Factura B when the customer has no CUIT, even if RESPONSABLE_INSCRIPTO', () => {
    const service = makeService();
    const result = service.resolve({
      taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
      documentType: CustomerDocumentType.DNI,
    });
    expect(result).toBe(FiscalDocumentType.FACTURA_B);
  });

  it('resolves Factura B when there is no customer at all', () => {
    const service = makeService();
    const result = service.resolve(null);
    expect(result).toBe(FiscalDocumentType.FACTURA_B);
  });

  it('resolves Factura B for any customer when the issuer is not RESPONSABLE_INSCRIPTO', () => {
    const service = makeService(TaxCondition.MONOTRIBUTO);
    const result = service.resolve({
      taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
      documentType: CustomerDocumentType.CUIT,
    });
    expect(result).toBe(FiscalDocumentType.FACTURA_B);
  });
});
