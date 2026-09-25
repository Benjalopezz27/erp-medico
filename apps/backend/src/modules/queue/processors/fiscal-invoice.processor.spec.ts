import {
  ArcaStatus,
  CustomerDocumentType,
  FiscalDocumentType,
  ProductTaxTreatment,
  TaxCondition,
} from '@erp/shared-types';
import { FiscalInvoiceProcessor } from './fiscal-invoice.processor';
import { WsfeRejectedError } from '../../arca/services/wsfe-soap-client.service';
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

describe('FiscalInvoiceProcessor', () => {
  let processor: FiscalInvoiceProcessor;
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
  let arcaService: any;
  let invoiceTypeResolver: any;
  let numberingService: any;
  let configService: any;

  const fiscalDocument: FiscalDocument = {
    id: 'doc-1',
    saleId: 'sale-1',
    saleReturnId: null,
    documentType: null,
    pointOfSale: null,
    documentNumber: null,
    cae: null,
    caeExpirationDate: null,
    arcaStatus: ArcaStatus.PENDIENTE_FACTURACION,
    arcaErrorMessage: null,
    qrCodeData: null,
    issuedAt: null,
  } as FiscalDocument;

  const sale: Sale = {
    id: 'sale-1',
    customerId: 'customer-1',
  } as Sale;

  const customer: Customer = {
    id: 'customer-1',
    taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
    documentType: CustomerDocumentType.CUIT,
    cuitOrDni: '20123456789',
  } as Customer;

  const saleItem: SaleItem = {
    taxTreatment: ProductTaxTreatment.GRAVADO,
    subtotalNet: '100.00',
    ivaPercentage: '21.00',
    ivaAmount: '21.00',
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
        findOne: jest.fn().mockResolvedValue({ ...fiscalDocument }),
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

    arcaService = {
      getLastAuthorizedNumber: jest.fn().mockResolvedValue(10),
      requestCAE: jest.fn().mockResolvedValue({
        cae: '70123456789012',
        caeExpiration: '20260201',
      }),
    };

    invoiceTypeResolver = {
      resolve: jest.fn().mockReturnValue(FiscalDocumentType.FACTURA_A),
    };

    numberingService = {
      reserveNextNumber: jest.fn().mockResolvedValue(11),
    };

    configService = { get: jest.fn().mockReturnValue(1) };

    processor = new FiscalInvoiceProcessor(
      {} as any,
      dataSource,
      arcaService,
      invoiceTypeResolver,
      numberingService,
      configService,
    );
  });

  it('happy path: resolves type, reserves number, requests CAE, persists EMITIDO', async () => {
    const result = await processor.process({
      id: 'job-1',
      data: { fiscalDocumentId: 'doc-1' },
    } as any);

    expect(invoiceTypeResolver.resolve).toHaveBeenCalledWith({
      taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
      documentType: CustomerDocumentType.CUIT,
    });
    expect(numberingService.reserveNextNumber).toHaveBeenCalledWith(
      'doc-1',
      FiscalDocumentType.FACTURA_A,
      1,
      expect.any(Function),
      expect.anything(),
    );
    expect(arcaService.requestCAE).toHaveBeenCalledWith(
      expect.objectContaining({
        documentType: FiscalDocumentType.FACTURA_A,
        pointOfSale: 1,
        documentNumber: 11,
        docType: 80,
        docNumber: '20123456789',
      }),
    );
    expect(repos.FiscalDocument.update).toHaveBeenCalledWith(
      { id: 'doc-1', arcaStatus: ArcaStatus.PENDIENTE_FACTURACION },
      expect.objectContaining({
        cae: '70123456789012',
        caeExpirationDate: '2026-02-01',
        arcaStatus: ArcaStatus.EMITIDO,
      }),
    );
    expect(result).toEqual({ status: 'emitted', fiscalDocumentId: 'doc-1' });
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

  it('is a no-op when the document is already EMITIDO (idempotent replay)', async () => {
    repos.FiscalDocument.findOne.mockResolvedValue({
      ...fiscalDocument,
      arcaStatus: ArcaStatus.EMITIDO,
    });

    const result = await processor.process({
      id: 'job-1',
      data: { fiscalDocumentId: 'doc-1' },
    } as any);

    expect(arcaService.requestCAE).not.toHaveBeenCalled();
    expect(result).toEqual({ status: 'skipped', fiscalDocumentId: 'doc-1' });
  });

  it('rejects without calling ARCA when the fiscal totals are inconsistent', async () => {
    repos.SaleItem.find.mockResolvedValue([
      { ...saleItem, ivaPercentage: '15.00' }, // unmapped ARCA rate
    ]);

    const result = await processor.process({
      id: 'job-1',
      data: { fiscalDocumentId: 'doc-1' },
    } as any);

    expect(arcaService.requestCAE).not.toHaveBeenCalled();
    expect(repos.FiscalDocument.update).toHaveBeenCalledWith(
      { id: 'doc-1', arcaStatus: ArcaStatus.PENDIENTE_FACTURACION },
      expect.objectContaining({
        arcaStatus: ArcaStatus.RECHAZADO,
        arcaErrorMessage: expect.stringContaining('TOTALS_MISMATCH'),
      }),
    );
    expect(result).toEqual({ status: 'rejected', fiscalDocumentId: 'doc-1' });
  });

  it('persists RECHAZADO with sanitized observations when WSFE rejects the comprobante', async () => {
    arcaService.requestCAE.mockRejectedValue(
      new WsfeRejectedError('rechazado', 'CUIT del receptor no autorizado'),
    );

    const result = await processor.process({
      id: 'job-1',
      data: { fiscalDocumentId: 'doc-1' },
    } as any);

    expect(repos.FiscalDocument.update).toHaveBeenCalledWith(
      { id: 'doc-1', arcaStatus: ArcaStatus.PENDIENTE_FACTURACION },
      expect.objectContaining({
        arcaStatus: ArcaStatus.RECHAZADO,
        arcaErrorMessage: expect.stringContaining(
          'CUIT del receptor no autorizado',
        ),
      }),
    );
    expect(result).toEqual({ status: 'rejected', fiscalDocumentId: 'doc-1' });
  });

  it('leaves the document PENDIENTE_FACTURACION and rethrows on a transient WSFE failure (so BullMQ retries)', async () => {
    arcaService.requestCAE.mockRejectedValue(
      new Error('WSFE network error: ECONNRESET'),
    );

    await expect(
      processor.process({
        id: 'job-1',
        data: { fiscalDocumentId: 'doc-1' },
      } as any),
    ).rejects.toThrow(/ECONNRESET/);

    expect(repos.FiscalDocument.update).not.toHaveBeenCalled();
  });

  it('reloads instead of throwing a raw error when the unique index rejects a duplicate number', async () => {
    repos.FiscalDocument.update.mockRejectedValueOnce({
      code: '23505',
      message: 'duplicate key value violates unique constraint',
    });

    const result = await processor.process({
      id: 'job-1',
      data: { fiscalDocumentId: 'doc-1' },
    } as any);

    expect(result).toEqual({ status: 'skipped', fiscalDocumentId: 'doc-1' });
  });

  it('does not modify Sale.status on success or rejection', async () => {
    await processor.process({
      id: 'job-1',
      data: { fiscalDocumentId: 'doc-1' },
    } as any);
    expect(repos.Sale.update).not.toHaveBeenCalled();
  });
});
