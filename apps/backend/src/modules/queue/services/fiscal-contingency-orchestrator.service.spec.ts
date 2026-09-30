import {
  ArcaStatus,
  CustomerDocumentType,
  FiscalDocumentType,
  FiscalErrorCode,
  FiscalFailureStage,
  ProductTaxTreatment,
  TaxCondition,
} from '@erp/shared-types';
import { FiscalContingencyOrchestrator } from './fiscal-contingency-orchestrator.service';
import { WsfeRejectedError } from '../../arca/services/wsfe-soap-client.service';
import { FiscalDocument } from '../../sales/entities/fiscal-document.entity';
import { Sale } from '../../sales/entities/sale.entity';
import { SaleItem } from '../../sales/entities/sale-item.entity';
import { SaleReturnItem } from '../../sales/returns/entities/sale-return-item.entity';
import { Customer } from '../../customers/entities/customer.entity';

describe('FiscalContingencyOrchestrator', () => {
  let orchestrator: FiscalContingencyOrchestrator;
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
  let manager: any;
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
    attemptCount: 0,
    lastAttemptAt: null,
    nextAttemptAt: null,
    failureStage: null,
    arcaErrorCode: null,
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

  function makeJob(
    overrides: Partial<{ attemptsMade: number; attempts: number }> = {},
  ) {
    return {
      id: 'job-1',
      data: { fiscalDocumentId: 'doc-1' },
      attemptsMade: overrides.attemptsMade ?? 0,
      opts: { attempts: overrides.attempts ?? 6 },
    } as any;
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

    manager = { getRepository: jest.fn(repoFor) };
    dataSource = { getRepository: jest.fn(repoFor) };

    arcaService = {
      getLastAuthorizedNumber: jest.fn().mockResolvedValue(10),
      requestCAE: jest.fn().mockResolvedValue({
        cae: '70123456789012',
        caeExpiration: '20260201',
      }),
      queryDocument: jest.fn(),
    };

    invoiceTypeResolver = {
      resolve: jest.fn().mockReturnValue(FiscalDocumentType.FACTURA_A),
    };

    numberingService = {
      reserveNextNumber: jest.fn().mockResolvedValue(11),
    };

    configService = { get: jest.fn().mockReturnValue(1) };

    orchestrator = new FiscalContingencyOrchestrator(
      dataSource,
      arcaService,
      invoiceTypeResolver,
      numberingService,
      configService,
    );
  });

  it('happy path: resolves type, reserves number, requests CAE, persists EMITIDO', async () => {
    const result = await orchestrator.process(manager, makeJob(), 'doc-1');

    expect(numberingService.reserveNextNumber).toHaveBeenCalledWith(
      'doc-1',
      FiscalDocumentType.FACTURA_A,
      1,
      expect.any(Function),
      manager,
    );
    expect(arcaService.requestCAE).toHaveBeenCalledWith(
      expect.objectContaining({
        documentType: FiscalDocumentType.FACTURA_A,
        pointOfSale: 1,
        documentNumber: 11,
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
    expect(arcaService.queryDocument).not.toHaveBeenCalled();
  });

  it('is a no-op when the document is already EMITIDO (idempotent replay)', async () => {
    repos.FiscalDocument.findOne.mockResolvedValue({
      ...fiscalDocument,
      arcaStatus: ArcaStatus.EMITIDO,
    });

    const result = await orchestrator.process(manager, makeJob(), 'doc-1');

    expect(arcaService.requestCAE).not.toHaveBeenCalled();
    expect(result).toEqual({ status: 'skipped', fiscalDocumentId: 'doc-1' });
  });

  it('rejects without calling ARCA when the fiscal totals are inconsistent', async () => {
    repos.SaleItem.find.mockResolvedValue([
      { ...saleItem, ivaPercentage: '15.00' }, // unmapped ARCA rate
    ]);

    const result = await orchestrator.process(manager, makeJob(), 'doc-1');

    expect(arcaService.requestCAE).not.toHaveBeenCalled();
    expect(repos.FiscalDocument.update).toHaveBeenCalledWith(
      { id: 'doc-1', arcaStatus: ArcaStatus.PENDIENTE_FACTURACION },
      expect.objectContaining({
        arcaStatus: ArcaStatus.RECHAZADO,
        arcaErrorMessage: expect.stringContaining('TOTALS_MISMATCH'),
        arcaErrorCode: FiscalErrorCode.TOTALS_MISMATCH,
      }),
    );
    expect(result).toEqual({ status: 'rejected', fiscalDocumentId: 'doc-1' });
  });

  it('persists RECHAZADO with sanitized observations when WSFE rejects the comprobante', async () => {
    arcaService.requestCAE.mockRejectedValue(
      new WsfeRejectedError('rechazado', 'CUIT del receptor no autorizado'),
    );

    const result = await orchestrator.process(manager, makeJob(), 'doc-1');

    expect(repos.FiscalDocument.update).toHaveBeenCalledWith(
      { id: 'doc-1', arcaStatus: ArcaStatus.PENDIENTE_FACTURACION },
      expect.objectContaining({
        arcaStatus: ArcaStatus.RECHAZADO,
        arcaErrorMessage: expect.stringContaining(
          'CUIT del receptor no autorizado',
        ),
        arcaErrorCode: FiscalErrorCode.WSFE_REJECTED,
      }),
    );
    expect(result).toEqual({ status: 'rejected', fiscalDocumentId: 'doc-1' });
  });

  it('reloads instead of throwing a raw error when the unique index rejects a duplicate number', async () => {
    repos.FiscalDocument.update.mockRejectedValueOnce({
      code: '23505',
      message: 'duplicate key value violates unique constraint',
    });

    const result = await orchestrator.process(manager, makeJob(), 'doc-1');

    expect(result).toEqual({ status: 'skipped', fiscalDocumentId: 'doc-1' });
  });

  it('does not modify Sale.status on success or rejection', async () => {
    await orchestrator.process(manager, makeJob(), 'doc-1');
    expect(repos.Sale.update).not.toHaveBeenCalled();
  });

  describe('Escenario A — falla transitoria antes del CAE', () => {
    it('persists attempt metadata and signals retry without rolling back (not the last attempt)', async () => {
      arcaService.requestCAE.mockRejectedValue(
        new Error('WSFE network error: ECONNRESET'),
      );

      const result = await orchestrator.process(
        manager,
        makeJob({ attemptsMade: 0 }),
        'doc-1',
      );

      expect(result).toEqual({
        status: 'retrying',
        fiscalDocumentId: 'doc-1',
        error: expect.stringContaining('ECONNRESET'),
      });
      expect(repos.FiscalDocument.update).toHaveBeenCalledWith(
        { id: 'doc-1' },
        expect.objectContaining({
          attemptCount: 1,
          failureStage: FiscalFailureStage.PRE_CAE,
          arcaErrorCode: FiscalErrorCode.TRANSIENT,
          nextAttemptAt: expect.any(Date),
        }),
      );
    });

    it('marks RECHAZADO with RETRIES_EXHAUSTED on the last allowed attempt, without rethrowing', async () => {
      arcaService.requestCAE.mockRejectedValue(
        new Error('WSFE network error: ECONNRESET'),
      );

      const result = await orchestrator.process(
        manager,
        makeJob({ attemptsMade: 5, attempts: 6 }),
        'doc-1',
      );

      expect(result).toEqual({ status: 'rejected', fiscalDocumentId: 'doc-1' });
      expect(repos.FiscalDocument.update).toHaveBeenCalledWith(
        { id: 'doc-1', arcaStatus: ArcaStatus.PENDIENTE_FACTURACION },
        expect.objectContaining({
          arcaStatus: ArcaStatus.RECHAZADO,
          arcaErrorCode: FiscalErrorCode.RETRIES_EXHAUSTED,
        }),
      );
    });
  });

  describe('Escenario B — número ya reservado por un intento previo', () => {
    const documentWithNumber: FiscalDocument = {
      ...fiscalDocument,
      documentNumber: 42,
    } as FiscalDocument;

    beforeEach(() => {
      repos.FiscalDocument.findOne.mockResolvedValue({
        ...documentWithNumber,
      });
    });

    it('reconciles an already-authorized CAE without calling requestCAE again', async () => {
      arcaService.queryDocument.mockResolvedValue({
        documentType: 1,
        pointOfSale: 1,
        documentNumber: 42,
        cae: '70999999999999',
        caeExpiration: '20260315',
      });

      const result = await orchestrator.process(manager, makeJob(), 'doc-1');

      expect(arcaService.queryDocument).toHaveBeenCalledWith(1, 1, 42);
      expect(arcaService.requestCAE).not.toHaveBeenCalled();
      expect(numberingService.reserveNextNumber).not.toHaveBeenCalled();
      expect(repos.FiscalDocument.update).toHaveBeenCalledWith(
        { id: 'doc-1', arcaStatus: ArcaStatus.PENDIENTE_FACTURACION },
        expect.objectContaining({
          cae: '70999999999999',
          arcaStatus: ArcaStatus.EMITIDO,
        }),
      );
      expect(result).toEqual({ status: 'emitted', fiscalDocumentId: 'doc-1' });
    });

    it('proceeds to a single emission when the query confirms the comprobante does not exist yet', async () => {
      arcaService.queryDocument.mockResolvedValue(null);

      const result = await orchestrator.process(manager, makeJob(), 'doc-1');

      expect(arcaService.requestCAE).toHaveBeenCalledTimes(1);
      expect(arcaService.requestCAE).toHaveBeenCalledWith(
        expect.objectContaining({ documentNumber: 42 }),
      );
      expect(numberingService.reserveNextNumber).not.toHaveBeenCalled();
      expect(result).toEqual({ status: 'emitted', fiscalDocumentId: 'doc-1' });
    });

    it('does not emit blindly when the query itself is uncertain (fails)', async () => {
      arcaService.queryDocument.mockRejectedValue(
        new Error('WSFE FECompConsultar timeout'),
      );

      const result = await orchestrator.process(
        manager,
        makeJob({ attemptsMade: 0 }),
        'doc-1',
      );

      expect(result.status).toBe('retrying');
      expect(arcaService.requestCAE).not.toHaveBeenCalled();
      expect(repos.FiscalDocument.update).toHaveBeenCalledWith(
        { id: 'doc-1' },
        expect.objectContaining({
          arcaErrorCode: FiscalErrorCode.QUERY_UNCERTAIN,
        }),
      );
    });
  });
});
