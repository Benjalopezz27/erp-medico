import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  ArcaStatus,
  CustomerDocumentType,
  CustomerPricingRuleApplied,
  FiscalDocumentType,
  PaymentMethod,
  SaleStatus,
  TreasuryAccountType,
  TreasuryMovementType,
  SalesErrorCode,
  ProductTaxTreatment,
  TaxCondition,
} from '@erp/shared-types';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QuerySalesDto } from './dto';
import { AuditService } from '../audit/audit.service';
import { CustomerPricingService } from '../customers/special-prices/services/customer-pricing.service';
import { AccountReceivable } from '../receivables/entities/account-receivable.entity';
import { ReceivablesService } from '../receivables/receivables.service';
import { StockService } from '../stock/stock.service';
import { PdfGenerateQueueService } from '../queue/services/pdf-generate.queue';
import { InvoiceTypeResolverService } from '../arca/services/invoice-type-resolver.service';
import { FiscalDocument } from './entities/fiscal-document.entity';
import { SaleItem } from './entities/sale-item.entity';
import { Sale } from './entities/sale.entity';
import { SalesService } from './sales.service';
import { PendingFiscalService } from './services/pending-fiscal.service';

describe('SalesService', () => {
  const userId = '10000000-0000-4000-8000-000000000001';
  const productId = '20000000-0000-4000-8000-000000000001';
  const baseDto = {
    customerId: null,
    isCreditSale: false,
    requiresFiscalInvoice: false,
    paymentMethod: PaymentMethod.EFECTIVO,
    items: [{ productId, quantityBase: 1 }],
  };

  let sale: any;
  let items: any[];
  let fiscalDocument: any;
  let debt: any;
  let customer: any;
  let manager: any;
  let treasuryService: { recordMovement: jest.Mock };
  let dataSource: any;
  let customerPricingService: jest.Mocked<
    Pick<CustomerPricingService, 'resolveForSale'>
  >;
  let stockService: jest.Mocked<Pick<StockService, 'recordMovement'>>;
  let receivablesService: jest.Mocked<
    Pick<ReceivablesService, 'recordCreditSaleDebt'>
  >;
  let auditService: jest.Mocked<Pick<AuditService, 'record'>>;
  let pdfGenerateQueueService: jest.Mocked<
    Pick<PdfGenerateQueueService, 'enqueue'>
  >;
  let invoiceTypeResolverService: jest.Mocked<
    Pick<InvoiceTypeResolverService, 'resolve'>
  >;
  let pendingFiscalService: jest.Mocked<Pick<PendingFiscalService, 'retry'>>;
  let service: SalesService;

  beforeEach(() => {
    sale = null;
    items = [];
    fiscalDocument = null;
    debt = null;
    customer = null;
    const detailQuery = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () =>
        sale
          ? {
              ...sale,
              customer,
              user: { id: userId, name: 'Vendedor' },
              items: items.map((item) => ({
                ...item,
                product: {
                  id: productId,
                  internalCode: 'P0001',
                  name: 'Producto',
                },
              })),
              fiscalDocuments: fiscalDocument ? [fiscalDocument] : [],
              fiscalDocument,
            }
          : null,
      ),
    };
    const saleRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => {
        sale = {
          id: 'sale-1',
          createdAt: new Date('2026-08-31T12:00:00Z'),
          updatedAt: new Date('2026-08-31T12:00:00Z'),
          ...value,
        };
        return sale;
      }),
      createQueryBuilder: jest.fn(() => detailQuery),
      findOne: jest.fn(async () => sale),
    };
    const itemRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => {
        const saved = { id: `item-${items.length + 1}`, ...value };
        items.push(saved);
        return saved;
      }),
    };
    const fiscalRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => {
        fiscalDocument = { id: 'fiscal-1', ...value };
        return fiscalDocument;
      }),
      findOne: jest.fn(async () => fiscalDocument),
    };
    const debtRepository = { findOne: jest.fn(async () => debt) };
    manager = {
      queryRunner: { isTransactionActive: true },
      query: jest.fn().mockResolvedValue([{ saleNumber: 'V-00000001' }]),
      getRepository: jest.fn((entity) => {
        if (entity === Sale) return saleRepository;
        if (entity === SaleItem) return itemRepository;
        if (entity === FiscalDocument) return fiscalRepository;
        if (entity === AccountReceivable) return debtRepository;
        throw new Error('Unexpected repository');
      }),
    };
    dataSource = {
      manager,
      getRepository: jest.fn(() => saleRepository),
      transaction: jest.fn(async (callback) => callback(manager)),
    };
    customerPricingService = {
      resolveForSale: jest.fn().mockResolvedValue({
        productId,
        productCode: 'P0001',
        productName: 'Producto',
        catalogPriceNet: '10.00',
        ruleApplied: CustomerPricingRuleApplied.CATALOG_PRICE,
        ruleId: null,
        discountPercentage: null,
        discountAmountNet: '0.00',
        finalPriceNet: '10.00',
        taxTreatment: ProductTaxTreatment.GRAVADO,
        ivaPercentage: '21.00',
      }),
    };
    stockService = { recordMovement: jest.fn().mockResolvedValue({} as any) };
    receivablesService = {
      recordCreditSaleDebt: jest.fn(async (_manager, input) => {
        debt = {
          id: 'debt-1',
          ...input,
          documentReference: input.saleNumber,
          originalAmount: input.totalGross,
          currentBalance: input.totalGross,
          status: 'PENDIENTE',
          dueDate: null,
        };
        return debt;
      }),
    };
    auditService = { record: jest.fn().mockResolvedValue({} as any) };
    treasuryService = { recordMovement: jest.fn().mockResolvedValue({}) };
    pdfGenerateQueueService = {
      enqueue: jest.fn().mockResolvedValue({ jobId: 'pdf-generate-doc-1' }),
    };
    invoiceTypeResolverService = {
      resolve: jest.fn().mockResolvedValue(FiscalDocumentType.FACTURA_B),
    };
    pendingFiscalService = {
      retry: jest.fn().mockResolvedValue({
        fiscalDocumentId: 'fiscal-1',
        arcaStatus: ArcaStatus.PENDIENTE_FACTURACION,
        jobId: 'wsfe-emit-fiscal-1',
        created: true,
      }),
    };
    service = new SalesService(
      dataSource,
      customerPricingService as any,
      stockService as any,
      receivablesService as any,
      auditService as any,
      pdfGenerateQueueService as any,
      invoiceTypeResolverService as any,
      pendingFiscalService as any,
      treasuryService as any,
    );
  });

  it('confirms an anonymous cash sale using backend pricing and IVA', async () => {
    const result = await service.create(baseDto, userId);

    expect(result).toMatchObject({
      saleNumber: 'V-00000001',
      status: SaleStatus.CONFIRMADA,
      totalNet: '10.00',
      ivaTotal: '2.10',
      totalGross: '12.10',
      fiscalDocument: null,
      accountReceivable: null,
    });
    expect(customerPricingService.resolveForSale).toHaveBeenCalledWith(
      null,
      productId,
      manager,
    );
    expect(stockService.recordMovement).toHaveBeenCalledWith(
      expect.objectContaining({ documentReference: 'V-00000001' }),
      manager,
    );
    expect(auditService.record).toHaveBeenCalledTimes(1);
  });

  it('separates taxable, exempt and non-taxed amounts in a mixed sale', async () => {
    customerPricingService.resolveForSale
      .mockResolvedValueOnce({
        productId,
        productCode: 'P0001',
        productName: 'Gravado',
        catalogPriceNet: '100.00',
        ruleApplied: CustomerPricingRuleApplied.CATALOG_PRICE,
        ruleId: null,
        discountPercentage: null,
        discountAmountNet: '0.00',
        finalPriceNet: '100.00',
        taxTreatment: ProductTaxTreatment.GRAVADO,
        ivaPercentage: '21.00',
      })
      .mockResolvedValueOnce({
        productId: '20000000-0000-4000-8000-000000000002',
        productCode: 'P0002',
        productName: 'Exento',
        catalogPriceNet: '20.00',
        ruleApplied: CustomerPricingRuleApplied.CATALOG_PRICE,
        ruleId: null,
        discountPercentage: null,
        discountAmountNet: '0.00',
        finalPriceNet: '20.00',
        taxTreatment: ProductTaxTreatment.EXENTO,
        ivaPercentage: null,
      })
      .mockResolvedValueOnce({
        productId: '20000000-0000-4000-8000-000000000003',
        productCode: 'P0003',
        productName: 'No gravado',
        catalogPriceNet: '10.00',
        ruleApplied: CustomerPricingRuleApplied.CATALOG_PRICE,
        ruleId: null,
        discountPercentage: null,
        discountAmountNet: '0.00',
        finalPriceNet: '10.00',
        taxTreatment: ProductTaxTreatment.NO_GRAVADO,
        ivaPercentage: null,
      });

    const result = await service.create(
      {
        ...baseDto,
        items: [
          { productId, quantityBase: 1 },
          {
            productId: '20000000-0000-4000-8000-000000000002',
            quantityBase: 1,
          },
          {
            productId: '20000000-0000-4000-8000-000000000003',
            quantityBase: 1,
          },
        ],
      },
      userId,
    );

    expect(result).toMatchObject({
      totalNet: '130.00',
      taxableNet: '100.00',
      exemptAmount: '20.00',
      nonTaxedAmount: '10.00',
      ivaTotal: '21.00',
      totalGross: '151.00',
    });
    expect(items.map((item) => item.taxTreatment)).toEqual([
      ProductTaxTreatment.GRAVADO,
      ProductTaxTreatment.EXENTO,
      ProductTaxTreatment.NO_GRAVADO,
    ]);
  });

  describe('findAll sorting', () => {
    let qb: Record<string, jest.Mock>;
    beforeEach(() => {
      qb = {
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      dataSource.getRepository = jest.fn(() => ({
        createQueryBuilder: () => qb,
      }));
    });

    it('sorts by whitelisted column with id tie-break and joins customer', async () => {
      await service.findAll({ sortBy: 'customer', sortOrder: 'desc' });
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
        'sale.customer',
        'customer',
      );
      expect(qb.orderBy).toHaveBeenCalledWith('customer.businessName', 'DESC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('sale.id', 'DESC');
    });

    it('keeps createdAt DESC default without sortBy', async () => {
      await service.findAll({});
      expect(qb.orderBy).toHaveBeenCalledWith('sale.createdAt', 'DESC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('sale.id', 'DESC');
      expect(qb.leftJoinAndSelect).not.toHaveBeenCalled();
    });

    it('rejects invalid sortBy at DTO level', async () => {
      const dto = plainToInstance(QuerySalesDto, { sortBy: 'nope' });
      expect((await validate(dto)).map((e) => e.property)).toContain('sortBy');
    });
  });

  describe('treasury movement', () => {
    it.each([
      [PaymentMethod.EFECTIVO, TreasuryAccountType.EFECTIVO],
      [PaymentMethod.QR, TreasuryAccountType.BANCOS],
      [PaymentMethod.CHEQUE, TreasuryAccountType.CHEQUES_CARTERA],
    ])(
      'records an income for a cash sale paid with %s',
      async (paymentMethod, accountType) => {
        const result = await service.create(
          { ...baseDto, paymentMethod },
          userId,
        );
        expect(treasuryService.recordMovement).toHaveBeenCalledWith(
          manager,
          expect.objectContaining({
            accountType,
            movementType: TreasuryMovementType.INGRESO,
            amount: result.totalGross,
            referenceType: 'SALE',
            referenceId: result.id,
            userId,
          }),
        );
      },
    );

    it('records nothing for a credit sale', async () => {
      await service.create(
        {
          ...baseDto,
          customerId: '30000000-0000-4000-8000-000000000001',
          isCreditSale: true,
          requiresFiscalInvoice: true,
          paymentMethod: PaymentMethod.CTA_CTE,
        },
        userId,
      );
      expect(treasuryService.recordMovement).not.toHaveBeenCalled();
    });
  });

  it('creates a pending fiscal document and debt for a credit sale', async () => {
    const result = await service.create(
      {
        ...baseDto,
        customerId: '30000000-0000-4000-8000-000000000001',
        isCreditSale: true,
        requiresFiscalInvoice: true,
        paymentMethod: PaymentMethod.CTA_CTE,
      },
      userId,
    );

    expect(result.fiscalDocument).toMatchObject({
      documentType: null,
      pointOfSale: null,
      documentNumber: null,
      arcaStatus: ArcaStatus.PENDIENTE_FACTURACION,
    });
    expect(result.accountReceivable).toMatchObject({
      originalAmount: '12.10',
      currentBalance: '12.10',
    });
    expect(pendingFiscalService.retry).not.toHaveBeenCalled();
  });

  it('never auto-enqueues fiscal emission; the sale stays PENDIENTE_FACTURACION until manually emitted', async () => {
    const result = await service.create(
      {
        ...baseDto,
        customerId: '30000000-0000-4000-8000-000000000001',
        isCreditSale: true,
        requiresFiscalInvoice: true,
        paymentMethod: PaymentMethod.CTA_CTE,
      },
      userId,
    );

    expect(result.status).toBe(SaleStatus.CONFIRMADA);
    expect(result.fiscalDocument).toMatchObject({
      arcaStatus: ArcaStatus.PENDIENTE_FACTURACION,
    });
    expect(pendingFiscalService.retry).not.toHaveBeenCalled();
  });

  describe('findFiscalDocument', () => {
    it('returns 200 with CAE data when EMITIDO', async () => {
      sale = { id: 'sale-1' };
      fiscalDocument = {
        id: 'fiscal-1',
        saleId: 'sale-1',
        saleReturnId: null,
        documentType: 'FACTURA_B',
        pointOfSale: 1,
        documentNumber: 101,
        arcaStatus: ArcaStatus.EMITIDO,
        cae: '75123456789012',
        caeExpirationDate: '2026-10-15',
        issuedAt: new Date('2026-09-01T12:00:00Z'),
      };

      const result = await service.findFiscalDocument('sale-1');

      expect(result).toMatchObject({
        arcaStatus: ArcaStatus.EMITIDO,
        cae: '75123456789012',
        documentNumber: 101,
      });
    });

    it('returns 200 without CAE data when PENDIENTE_FACTURACION', async () => {
      sale = { id: 'sale-1' };
      fiscalDocument = {
        id: 'fiscal-1',
        saleId: 'sale-1',
        saleReturnId: null,
        documentType: null,
        pointOfSale: null,
        documentNumber: null,
        arcaStatus: ArcaStatus.PENDIENTE_FACTURACION,
        cae: null,
        caeExpirationDate: null,
        issuedAt: null,
      };

      const result = await service.findFiscalDocument('sale-1');

      expect(result).toMatchObject({
        arcaStatus: ArcaStatus.PENDIENTE_FACTURACION,
        cae: null,
      });
    });

    it('throws 404 when the sale has no fiscal document', async () => {
      sale = { id: 'sale-1' };
      fiscalDocument = null;

      await expect(service.findFiscalDocument('sale-1')).rejects.toMatchObject({
        response: expect.objectContaining({
          code: SalesErrorCode.SALE_FISCAL_DOCUMENT_NOT_FOUND,
        }),
      });
    });

    it('throws 404 when the sale does not exist', async () => {
      sale = null;

      await expect(service.findFiscalDocument('missing')).rejects.toMatchObject(
        {
          response: expect.objectContaining({
            code: SalesErrorCode.SALE_NOT_FOUND,
          }),
        },
      );
    });
  });

  describe('previewFiscalDocument', () => {
    it('computes the invoice type without touching ARCA for a PENDIENTE_FACTURACION document', async () => {
      sale = {
        id: 'sale-1',
        totalNet: '10.00',
        taxableNet: '10.00',
        exemptAmount: '0.00',
        nonTaxedAmount: '0.00',
        ivaTotal: '2.10',
        totalGross: '12.10',
      };
      items = [];
      customer = {
        businessName: 'Cliente SA',
        documentType: CustomerDocumentType.CUIT,
        cuitOrDni: '20304050607',
        taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
      };
      fiscalDocument = {
        saleReturnId: null,
        arcaStatus: ArcaStatus.PENDIENTE_FACTURACION,
        documentType: null,
        pointOfSale: null,
        documentNumber: null,
        cae: null,
      };
      invoiceTypeResolverService.resolve.mockResolvedValue(
        FiscalDocumentType.FACTURA_A,
      );

      const result = await service.previewFiscalDocument('sale-1');

      expect(invoiceTypeResolverService.resolve).toHaveBeenCalledWith({
        taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
        documentType: CustomerDocumentType.CUIT,
      });
      expect(result).toMatchObject({
        saleId: 'sale-1',
        isEmitted: false,
        invoiceType: FiscalDocumentType.FACTURA_A,
        cae: null,
        receiver: {
          businessName: 'Cliente SA',
          documentType: 80,
          documentNumber: '20304050607',
        },
        totals: { totalGross: '12.10' },
      });
    });

    it('returns the real emitted data instead of a computed type once CAE exists', async () => {
      sale = {
        id: 'sale-1',
        totalNet: '10.00',
        taxableNet: '10.00',
        exemptAmount: '0.00',
        nonTaxedAmount: '0.00',
        ivaTotal: '2.10',
        totalGross: '12.10',
      };
      items = [];
      customer = null;
      fiscalDocument = {
        saleReturnId: null,
        arcaStatus: ArcaStatus.EMITIDO,
        documentType: FiscalDocumentType.FACTURA_B,
        pointOfSale: 1,
        documentNumber: 101,
        cae: '75123456789012',
      };

      const result = await service.previewFiscalDocument('sale-1');

      expect(invoiceTypeResolverService.resolve).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        isEmitted: true,
        invoiceType: FiscalDocumentType.FACTURA_B,
        documentNumber: 101,
        cae: '75123456789012',
        receiver: { businessName: 'Consumidor Final', documentType: 99 },
      });
    });

    it('throws 404 when the sale does not require a fiscal document', async () => {
      sale = { id: 'sale-1', totalNet: '0.00' };
      items = [];
      fiscalDocument = null;

      await expect(
        service.previewFiscalDocument('sale-1'),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: SalesErrorCode.SALE_FISCAL_DOCUMENT_NOT_FOUND,
        }),
      });
    });
  });

  describe('emitFiscalDocument', () => {
    it('delegates to PendingFiscalService.retry with the sale fiscal document id', async () => {
      sale = { id: 'sale-1' };
      fiscalDocument = { id: 'fiscal-1', saleId: 'sale-1', saleReturnId: null };

      const result = await service.emitFiscalDocument('sale-1', userId);

      expect(pendingFiscalService.retry).toHaveBeenCalledWith(
        'fiscal-1',
        userId,
      );
      expect(result).toMatchObject({
        fiscalDocumentId: 'fiscal-1',
        created: true,
      });
    });
  });

  describe('getFiscalDocumentPdf', () => {
    it('returns the stored PDF buffer and a derived filename when DISPONIBLE', async () => {
      sale = { id: 'sale-1' };
      fiscalDocument = {
        id: 'fiscal-1',
        saleId: 'sale-1',
        saleReturnId: null,
        documentType: 'FACTURA_B',
        pointOfSale: 3,
        documentNumber: 102,
        arcaStatus: ArcaStatus.EMITIDO,
        pdfStatus: 'DISPONIBLE',
        pdfData: Buffer.from('%PDF-1.7 fake'),
      };

      const result = await service.getFiscalDocumentPdf('sale-1');

      expect(result.buffer).toEqual(Buffer.from('%PDF-1.7 fake'));
      expect(result.filename).toBe('factura-b-00003-00000102.pdf');
      expect(pdfGenerateQueueService.enqueue).not.toHaveBeenCalled();
    });

    it('throws 409 and re-enqueues generation when EMITIDO but artifact is still pending', async () => {
      sale = { id: 'sale-1' };
      fiscalDocument = {
        id: 'fiscal-1',
        saleId: 'sale-1',
        saleReturnId: null,
        arcaStatus: ArcaStatus.EMITIDO,
        pdfStatus: 'PENDIENTE',
        pdfData: null,
      };

      await expect(
        service.getFiscalDocumentPdf('sale-1'),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: SalesErrorCode.SALE_FISCAL_ARTIFACT_NOT_AVAILABLE,
        }),
      });
      expect(pdfGenerateQueueService.enqueue).toHaveBeenCalledWith({
        fiscalDocumentId: 'fiscal-1',
      });
    });

    it('throws 409 without enqueueing when the document has no CAE yet', async () => {
      sale = { id: 'sale-1' };
      fiscalDocument = {
        id: 'fiscal-1',
        saleId: 'sale-1',
        saleReturnId: null,
        arcaStatus: ArcaStatus.PENDIENTE_FACTURACION,
        pdfStatus: 'PENDIENTE',
        pdfData: null,
      };

      await expect(
        service.getFiscalDocumentPdf('sale-1'),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: SalesErrorCode.SALE_FISCAL_ARTIFACT_NOT_AVAILABLE,
        }),
      });
      expect(pdfGenerateQueueService.enqueue).not.toHaveBeenCalled();
    });

    it('throws 404 when the sale has no fiscal document', async () => {
      sale = { id: 'sale-1' };
      fiscalDocument = null;

      await expect(
        service.getFiscalDocumentPdf('sale-1'),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          code: SalesErrorCode.SALE_FISCAL_DOCUMENT_NOT_FOUND,
        }),
      });
    });
  });

  describe('getFiscalDocumentQr', () => {
    it('returns a PNG buffer decoding to the persisted QR payload when EMITIDO', async () => {
      sale = { id: 'sale-1' };
      fiscalDocument = {
        id: 'fiscal-1',
        saleId: 'sale-1',
        saleReturnId: null,
        arcaStatus: ArcaStatus.EMITIDO,
        pdfStatus: 'DISPONIBLE',
        qrCodeData: 'https://www.afip.gob.ar/fe/qr/?p=dGVzdA==',
      };

      const buffer = await service.getFiscalDocumentQr('sale-1');

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.slice(0, 8).toString('hex')).toBe('89504e470d0a1a0a'); // PNG signature
    });

    it('throws 409 when EMITIDO but the QR payload is not persisted yet', async () => {
      sale = { id: 'sale-1' };
      fiscalDocument = {
        id: 'fiscal-1',
        saleId: 'sale-1',
        saleReturnId: null,
        arcaStatus: ArcaStatus.EMITIDO,
        pdfStatus: 'PENDIENTE',
        qrCodeData: null,
      };

      await expect(service.getFiscalDocumentQr('sale-1')).rejects.toMatchObject(
        {
          response: expect.objectContaining({
            code: SalesErrorCode.SALE_FISCAL_ARTIFACT_NOT_AVAILABLE,
          }),
        },
      );
    });
  });

  it.each([
    [
      { ...baseDto, isCreditSale: true },
      SalesErrorCode.SALE_CREDIT_REQUIRES_CUSTOMER,
    ],
    [
      {
        ...baseDto,
        customerId: '30000000-0000-4000-8000-000000000001',
        isCreditSale: true,
      },
      SalesErrorCode.SALE_CREDIT_REQUIRES_INVOICE,
    ],
    [
      { ...baseDto, paymentMethod: PaymentMethod.CTA_CTE },
      SalesErrorCode.SALE_CASH_INVALID_CURRENT_ACCOUNT,
    ],
  ])(
    'rejects an invalid commercial contract before the transaction',
    async (dto, code) => {
      await expect(service.create(dto as any, userId)).rejects.toMatchObject({
        response: expect.objectContaining({ code }),
      });
      expect(dataSource.transaction).not.toHaveBeenCalled();
    },
  );

  it('rejects duplicate products before the transaction', async () => {
    await expect(
      service.create(
        { ...baseDto, items: [...baseDto.items, ...baseDto.items] },
        userId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects client supplied prices before the transaction', async () => {
    await expect(
      service.create(
        {
          ...baseDto,
          items: [{ ...baseDto.items[0], unitPriceNet: '0.01' }],
        } as any,
        userId,
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: SalesErrorCode.SALE_PRICE_FIELDS_NOT_ALLOWED,
      }),
    });
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('translates a deadlock without retrying the transaction', async () => {
    dataSource.transaction.mockRejectedValueOnce({ code: '40P01' });
    await expect(service.create(baseDto, userId)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });
});
