import {
  ArcaStatus,
  CustomerDocumentType,
  FiscalDocumentType,
  PdfArtifactStatus,
  ProductTaxTreatment,
  TaxCondition,
} from '@erp/shared-types';
import { PdfGenerateProcessor } from './pdf-generate.processor';
import { FiscalQrPayloadService } from '../../sales/services/fiscal-qr-payload.service';
import {
  FiscalPdfTemplateService,
  PDF_TEMPLATE_VERSION,
} from '../../sales/services/fiscal-pdf-template.service';
import { FiscalDocument } from '../../sales/entities/fiscal-document.entity';
import { Sale } from '../../sales/entities/sale.entity';
import { SaleItem } from '../../sales/entities/sale-item.entity';
import { SaleReturnItem } from '../../sales/returns/entities/sale-return-item.entity';
import { Customer } from '../../customers/entities/customer.entity';

jest.mock('bullmq', () => ({
  Worker: jest
    .fn()
    .mockImplementation(() => ({ on: jest.fn(), close: jest.fn() })),
}));

describe('PdfGenerateProcessor', () => {
  let processor: PdfGenerateProcessor;
  let repos: Record<
    string,
    {
      findOne: jest.Mock;
      findOneOrFail: jest.Mock;
      find: jest.Mock;
      update: jest.Mock;
    }
  >;
  let dataSource: any;
  let configService: any;
  let settings: any;

  const emittedDocument: FiscalDocument = {
    id: 'doc-1',
    saleId: 'sale-1',
    saleReturnId: null,
    documentType: FiscalDocumentType.FACTURA_B,
    pointOfSale: 3,
    documentNumber: 102,
    cae: '73000012345678',
    caeExpirationDate: '2026-09-03',
    arcaStatus: ArcaStatus.EMITIDO,
    arcaErrorMessage: null,
    qrCodeData: null,
    issuedAt: new Date('2026-08-24T15:00:00.000Z'),
    pdfData: null,
    pdfChecksum: null,
    pdfSizeBytes: null,
    pdfTemplateVersion: null,
    pdfGeneratedAt: null,
    pdfStatus: PdfArtifactStatus.PENDIENTE,
    pdfErrorMessage: null,
  } as FiscalDocument;

  const sale: Sale = { id: 'sale-1', customerId: 'customer-1' } as Sale;

  const customer: Customer = {
    id: 'customer-1',
    businessName: 'Juan Pérez',
    taxCondition: TaxCondition.CONSUMIDOR_FINAL,
    documentType: CustomerDocumentType.DNI,
    cuitOrDni: '20123456',
    address: null,
  } as Customer;

  const saleItem: SaleItem = {
    quantityBase: '10.00',
    unitPriceNet: '50.00',
    ivaPercentage: '21.00',
    ivaAmount: '105.00',
    subtotalNet: '500.00',
    subtotalGross: '605.00',
    taxTreatment: ProductTaxTreatment.GRAVADO,
    product: { internalCode: 'SKU-1', name: 'Jeringa 5ml' },
  } as SaleItem;

  function makeRepo(overrides: Partial<Record<string, jest.Mock>> = {}) {
    return {
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      find: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      ...overrides,
    };
  }

  beforeEach(() => {
    repos = {
      FiscalDocument: makeRepo({
        findOne: jest.fn().mockResolvedValue({ ...emittedDocument }),
      }),
      Sale: makeRepo({ findOneOrFail: jest.fn().mockResolvedValue(sale) }),
      SaleItem: makeRepo({ find: jest.fn().mockResolvedValue([saleItem]) }),
      SaleReturnItem: makeRepo({ find: jest.fn().mockResolvedValue([]) }),
      Customer: makeRepo({ findOne: jest.fn().mockResolvedValue(customer) }),
    };

    const repoFor = (entity: any) => {
      if (entity === FiscalDocument) return repos.FiscalDocument;
      if (entity === Sale) return repos.Sale;
      if (entity === SaleItem) return repos.SaleItem;
      if (entity === SaleReturnItem) return repos.SaleReturnItem;
      if (entity === Customer) return repos.Customer;
      throw new Error('Unexpected entity in test');
    };

    dataSource = {
      manager: { getRepository: jest.fn(repoFor) },
      getRepository: jest.fn(repoFor),
      transaction: jest.fn((work: (manager: unknown) => unknown) =>
        work({ getRepository: jest.fn(repoFor) }),
      ),
    };

    configService = {
      get: jest.fn((key: string) =>
        key === 'ARCA_CUIT' ? '20345678901' : undefined,
      ),
    };

    settings = {
      getIssuer: jest.fn().mockResolvedValue({
        razonSocial: 'Distribuidora Sur SA',
        cuit: null,
        taxCondition: 'MONOTRIBUTO',
      }),
    };

    processor = new PdfGenerateProcessor(
      {} as any,
      dataSource,
      new FiscalQrPayloadService(configService),
      new FiscalPdfTemplateService(),
      configService,
      settings,
    );
  });

  it('generates and persists PDF/QR for an EMITIDO document', async () => {
    const result = await processor.process({
      id: 'job-1',
      data: { fiscalDocumentId: 'doc-1' },
    } as any);

    expect(result).toEqual({ status: 'generated', fiscalDocumentId: 'doc-1' });
    expect(repos.FiscalDocument.update).toHaveBeenCalledWith(
      'doc-1',
      expect.objectContaining({
        pdfStatus: PdfArtifactStatus.DISPONIBLE,
        pdfTemplateVersion: PDF_TEMPLATE_VERSION,
        qrCodeData: expect.stringContaining(
          'https://www.afip.gob.ar/fe/qr/?p=',
        ),
      }),
    );
    const [, payload] = repos.FiscalDocument.update.mock.calls[0];
    expect(Buffer.isBuffer(payload.pdfData)).toBe(true);
    expect(payload.pdfSizeBytes).toBe(payload.pdfData.length);
    expect(payload.pdfChecksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it('renders the issuer from system settings, keeping the CUIT from env', async () => {
    const render = jest.fn().mockResolvedValue(new Uint8Array([1]));
    processor = new PdfGenerateProcessor(
      {} as any,
      dataSource,
      new FiscalQrPayloadService(configService),
      { render } as unknown as FiscalPdfTemplateService,
      configService,
      settings,
    );

    await processor.process({
      id: 'job-1',
      data: { fiscalDocumentId: 'doc-1' },
    } as any);

    expect(render).toHaveBeenCalledWith(
      expect.objectContaining({
        emisor: expect.objectContaining({
          razonSocial: 'Distribuidora Sur SA',
          documentLabel: 'CUIT 20345678901',
        }),
      }),
    );
  });

  it('is a no-op when the document is not EMITIDO', async () => {
    repos.FiscalDocument.findOne.mockResolvedValue({
      ...emittedDocument,
      arcaStatus: ArcaStatus.PENDIENTE_FACTURACION,
    });

    const result = await processor.process({
      id: 'job-1',
      data: { fiscalDocumentId: 'doc-1' },
    } as any);

    expect(result).toEqual({ status: 'skipped', fiscalDocumentId: 'doc-1' });
    expect(repos.FiscalDocument.update).not.toHaveBeenCalled();
  });

  it('is a no-op when the document already has an artifact at the current template version', async () => {
    repos.FiscalDocument.findOne.mockResolvedValue({
      ...emittedDocument,
      pdfStatus: PdfArtifactStatus.DISPONIBLE,
      pdfTemplateVersion: PDF_TEMPLATE_VERSION,
    });

    const result = await processor.process({
      id: 'job-1',
      data: { fiscalDocumentId: 'doc-1' },
    } as any);

    expect(result).toEqual({ status: 'skipped', fiscalDocumentId: 'doc-1' });
    expect(repos.FiscalDocument.update).not.toHaveBeenCalled();
  });

  it('regenerates when the existing artifact is from an older template version', async () => {
    repos.FiscalDocument.findOne.mockResolvedValue({
      ...emittedDocument,
      pdfStatus: PdfArtifactStatus.DISPONIBLE,
      pdfTemplateVersion: 'v0',
    });

    const result = await processor.process({
      id: 'job-1',
      data: { fiscalDocumentId: 'doc-1' },
    } as any);

    expect(result).toEqual({ status: 'generated', fiscalDocumentId: 'doc-1' });
  });

  it('persists ERROR without touching arcaStatus/cae when render fails', async () => {
    const failingPdfService = {
      render: jest.fn().mockRejectedValue(new Error('render exploded')),
    } as unknown as FiscalPdfTemplateService;

    processor = new PdfGenerateProcessor(
      {} as any,
      dataSource,
      new FiscalQrPayloadService(configService),
      failingPdfService,
      configService,
      settings,
    );

    await expect(
      processor.process({
        id: 'job-1',
        data: { fiscalDocumentId: 'doc-1' },
      } as any),
    ).rejects.toThrow('render exploded');

    expect(repos.FiscalDocument.update).toHaveBeenCalledWith('doc-1', {
      pdfStatus: PdfArtifactStatus.ERROR,
      pdfErrorMessage: expect.stringContaining('render exploded'),
    });
  });

  it('reads the document with a pessimistic write lock inside a transaction', async () => {
    await processor.process({
      id: 'job-1',
      data: { fiscalDocumentId: 'doc-1' },
    } as any);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(repos.FiscalDocument.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'doc-1' },
        lock: { mode: 'pessimistic_write' },
      }),
    );
  });
});
