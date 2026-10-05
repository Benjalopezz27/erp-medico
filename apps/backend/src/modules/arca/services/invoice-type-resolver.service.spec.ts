import { SystemSettingsService } from '../../config/system-settings.service';
import { InvoiceTypeResolverService } from './invoice-type-resolver.service';
import {
  CustomerDocumentType,
  FiscalDocumentType,
  TaxCondition,
} from '@erp/shared-types';

describe('InvoiceTypeResolverService', () => {
  function makeService(taxCondition: TaxCondition | null = null) {
    const settings = {
      getIssuer: jest
        .fn()
        .mockResolvedValue({ razonSocial: null, cuit: null, taxCondition }),
    } as unknown as SystemSettingsService;
    return new InvoiceTypeResolverService(settings);
  }

  it('resolves Factura A for RESPONSABLE_INSCRIPTO customer with CUIT', async () => {
    const service = makeService();
    const result = await service.resolve({
      taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
      documentType: CustomerDocumentType.CUIT,
    });
    expect(result).toBe(FiscalDocumentType.FACTURA_A);
  });

  it('resolves Factura A for MONOTRIBUTO customer with CUIT', async () => {
    const service = makeService();
    const result = await service.resolve({
      taxCondition: TaxCondition.MONOTRIBUTO,
      documentType: CustomerDocumentType.CUIT,
    });
    expect(result).toBe(FiscalDocumentType.FACTURA_A);
  });

  it('resolves Factura B for CONSUMIDOR_FINAL', async () => {
    const service = makeService();
    const result = await service.resolve({
      taxCondition: TaxCondition.CONSUMIDOR_FINAL,
      documentType: CustomerDocumentType.DNI,
    });
    expect(result).toBe(FiscalDocumentType.FACTURA_B);
  });

  it('resolves Factura B for EXENTO', async () => {
    const service = makeService();
    const result = await service.resolve({
      taxCondition: TaxCondition.EXENTO,
      documentType: CustomerDocumentType.DNI,
    });
    expect(result).toBe(FiscalDocumentType.FACTURA_B);
  });

  it('resolves Factura B when the customer has no CUIT, even if RESPONSABLE_INSCRIPTO', async () => {
    const service = makeService();
    const result = await service.resolve({
      taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
      documentType: CustomerDocumentType.DNI,
    });
    expect(result).toBe(FiscalDocumentType.FACTURA_B);
  });

  it('resolves Factura B when there is no customer at all', async () => {
    const service = makeService();
    const result = await service.resolve(null);
    expect(result).toBe(FiscalDocumentType.FACTURA_B);
  });

  it('resolves Factura B for any customer when the issuer is not RESPONSABLE_INSCRIPTO', async () => {
    const service = makeService(TaxCondition.MONOTRIBUTO);
    const result = await service.resolve({
      taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
      documentType: CustomerDocumentType.CUIT,
    });
    expect(result).toBe(FiscalDocumentType.FACTURA_B);
  });
});
