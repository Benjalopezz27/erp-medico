import { ConfigService } from '@nestjs/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
  ArcaStatus,
  CustomerDocumentType,
  FiscalDocumentType,
  PaymentAllocationType,
  PaymentMethod,
  ProductStatus,
  ProductTaxTreatment,
  SaleReturnItemQuality,
  StockMovementType,
  TaxCondition,
} from '@erp/shared-types';
import { AppModule } from '../src/app.module';
import dataSource from '../src/database/data-source';
import { runInitialSeed } from '../src/database/seeds/initial.seed';
import { Category } from '../src/modules/categories/entities/category.entity';
import { Product } from '../src/modules/products/entities/product.entity';
import { Unit } from '../src/modules/units/entities/unit.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { FiscalDocument } from '../src/modules/sales/entities/fiscal-document.entity';
import { Stock } from '../src/modules/stock/entities/stock.entity';
import { StockMovement } from '../src/modules/stock/entities/stock-movement.entity';
import { StockService } from '../src/modules/stock/stock.service';
import { ARCA_SERVICE } from '../src/modules/arca/arca.constants';
import { IArcaService } from '../src/modules/arca/interfaces/arca-service.interface';
import { InvoiceTypeResolverService } from '../src/modules/arca/services/invoice-type-resolver.service';
import { FiscalNumberingService } from '../src/modules/sales/services/fiscal-numbering.service';
import { FiscalInvoiceProcessor } from '../src/modules/queue/processors/fiscal-invoice.processor';
import { FiscalContingencyOrchestrator } from '../src/modules/queue/services/fiscal-contingency-orchestrator.service';
import { PdfGenerateQueueService } from '../src/modules/queue/services/pdf-generate.queue';

/** Consumer wsfe-emit en proceso (sin worker BullMQ), mismo patrón que fiscal-invoice-emission. */
function buildProcessor(app: INestApplication, ds: DataSource) {
  const orchestrator = new FiscalContingencyOrchestrator(
    ds,
    app.get<IArcaService>(ARCA_SERVICE),
    app.get(InvoiceTypeResolverService),
    new FiscalNumberingService(ds),
    app.get(ConfigService),
  );
  return new FiscalInvoiceProcessor(
    {} as any,
    ds,
    orchestrator,
    app.get(PdfGenerateQueueService),
  );
}

const job = (fiscalDocumentId: string, attemptsMade = 0) =>
  ({
    id: `job-${fiscalDocumentId}-${attemptsMade}`,
    data: { fiscalDocumentId },
    attemptsMade,
    opts: { attempts: 6 },
  }) as any;

describe('Full business flow regression (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let stockService: StockService;
  let adminToken: string;
  let seller: User;
  let sequence = 0;

  const http = () => request(app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    ds = await dataSource.initialize();
    await ds.runMigrations();
    await runInitialSeed(ds, {
      adminEmail: 'flow-admin@erp.com',
      adminPassword: 'AdminPassword123!',
      vendedorEmail: 'flow-seller@erp.com',
      vendedorPassword: 'SellerPassword123!',
    });
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    stockService = app.get(StockService);
    seller = await ds
      .getRepository(User)
      .findOneByOrFail({ email: 'flow-seller@erp.com' });
    adminToken = (
      await http().post('/api/v1/auth/login').send({
        email: 'flow-admin@erp.com',
        password: 'AdminPassword123!',
      })
    ).body.accessToken;
  });

  beforeEach(async () => {
    sequence = 0;
    await ds.query(`
      TRUNCATE TABLE receipts, payment_allocations, account_receivable_movements, payments,
        account_receivables, fiscal_documents, quarantine_stocks, sale_return_items,
        sale_returns, sale_items, sales, stock_movements, stocks,
        customer_special_prices, customers, products, categories, units,
        audit_logs RESTART IDENTITY CASCADE
    `);
    await ds.query('UPDATE receipt_counters SET last_number = 0');
  });

  afterEach(() => jest.restoreAllMocks());

  afterAll(async () => {
    if (app) await app.close();
    if (ds?.isInitialized) {
      await runInitialSeed(ds);
      await ds.destroy();
    }
  });

  async function createProduct(
    stock: number,
    opts: {
      price?: string;
      iva?: string;
      treatment?: ProductTaxTreatment;
    } = {},
  ): Promise<Product> {
    sequence += 1;
    const category = await ds
      .getRepository(Category)
      .save({ name: `Cat flujo ${sequence}`, description: null });
    const unit = await ds
      .getRepository(Unit)
      .save({ name: `Unidad flujo ${sequence}`, symbol: `ff${sequence}` });
    const product = await ds.getRepository(Product).save({
      internalCode: `FLOW-${sequence}`,
      name: `Producto flujo ${sequence}`,
      description: null,
      categoryId: category.id,
      baseUnitId: unit.id,
      costNet: '50.0000',
      suggestedPriceNet: opts.price ?? '100.00',
      activePriceNet: opts.price ?? '100.00',
      taxTreatment: opts.treatment ?? ProductTaxTreatment.GRAVADO,
      ivaPercentage: opts.iva ?? '21.00',
      status: ProductStatus.ACTIVE,
    });
    if (stock > 0) {
      await stockService.recordMovement({
        productId: product.id,
        movementType: StockMovementType.AJUSTE_ENTRADA,
        quantityBase: stock,
        reason: 'Stock inicial test flujo completo',
        userId: seller.id,
      });
    }
    return product;
  }

  /** Alta de cliente vía API (parte del flujo, no fixture). */
  async function createCustomerViaApi(
    taxCondition: TaxCondition,
    documentType = CustomerDocumentType.CUIT,
    cuitOrDni = '30712345671',
  ) {
    const res = await http()
      .post('/api/v1/customers')
      .set(as(adminToken))
      .send({
        businessName: 'Cliente Flujo Completo SA',
        documentType,
        cuitOrDni,
        taxCondition,
        creditLimit: '100000.00',
      })
      .expect(201);
    return res.body as { id: string };
  }

  const sell = (body: object, token = adminToken) =>
    http().post('/api/v1/sales').set(as(token)).send(body);

  const stockOf = async (productId: string) =>
    Number(
      (await ds.getRepository(Stock).findOneByOrFail({ productId }))
        .currentBaseStock,
    );

  const fiscalDoc = (id: string) =>
    ds.getRepository(FiscalDocument).findOneByOrFail({ id });

  it('runs customer -> sale -> stock -> invoice CAE -> credit note -> stock restored -> payment and receipt', async () => {
    const product = await createProduct(10);
    const customer = await createCustomerViaApi(
      TaxCondition.RESPONSABLE_INSCRIPTO,
    );
    const processor = buildProcessor(app, ds);

    // Venta a crédito de 4 u. ($121 c/u) -> stock descontado una sola vez
    const sale = (
      await sell({
        customerId: customer.id,
        isCreditSale: true,
        requiresFiscalInvoice: true,
        paymentMethod: PaymentMethod.CTA_CTE,
        items: [{ productId: product.id, quantityBase: 4 }],
      }).expect(201)
    ).body;
    expect(sale.totalGross).toBe('484.00');
    expect(await stockOf(product.id)).toBe(6);
    const saleMovements = await ds.getRepository(StockMovement).countBy({
      productId: product.id,
      movementType: StockMovementType.SALIDA_VENTA,
    });
    expect(saleMovements).toBe(1);

    // Factura A con CAE (ArcaMockService)
    await processor.process(job(sale.fiscalDocument.id));
    const invoice = await fiscalDoc(sale.fiscalDocument.id);
    expect(invoice).toMatchObject({
      arcaStatus: ArcaStatus.EMITIDO,
      documentType: FiscalDocumentType.FACTURA_A,
    });
    expect(invoice.cae).toBeTruthy();

    // NC por 1 u. -> stock repuesto una sola vez
    const ret = (
      await http()
        .post(`/api/v1/sales/${sale.id}/returns`)
        .set(as(adminToken))
        .send({
          reason: 'Devolución flujo completo',
          items: [
            {
              saleItemId: sale.items[0].id,
              quantityBase: 1,
              quality: SaleReturnItemQuality.APTO,
            },
          ],
        })
        .expect(201)
    ).body;
    expect(await stockOf(product.id)).toBe(7);
    await processor.process(job(ret.fiscalDocument.id));
    const creditNote = await fiscalDoc(ret.fiscalDocument.id);
    expect(creditNote).toMatchObject({
      arcaStatus: ArcaStatus.EMITIDO,
      documentType: FiscalDocumentType.NOTA_CREDITO_A,
      pointOfSale: invoice.pointOfSale,
    });

    // Cobro del saldo restante (factura - NC) y recibo
    const [ar] = await ds.query(
      'SELECT id, current_balance::text AS balance FROM account_receivables WHERE sale_id = $1',
      [sale.id],
    );
    expect(ar.balance).toBe('363.00'); // 484 - 121 (NC)
    const paid = await http()
      .post('/api/v1/payments')
      .set(as(adminToken))
      .send({
        customerId: customer.id,
        paymentMethod: PaymentMethod.EFECTIVO,
        mode: PaymentAllocationType.GLOBAL_AGE,
        totalAmount: ar.balance,
      })
      .expect(201);
    expect(paid.body.receipt.receiptNumber).toBe('0001-00000001');
    const [after] = await ds.query(
      'SELECT current_balance::text AS balance, status FROM account_receivables WHERE id = $1',
      [ar.id],
    );
    expect(after).toEqual({ balance: '0.00', status: 'CANCELADO' });
    await http()
      .get(`/api/v1/receipts/${paid.body.receipt.id}`)
      .set(as(adminToken))
      .expect(200);
  });

  describe('edge cases', () => {
    it('rejects a sale without stock and leaves stock and ledger untouched', async () => {
      const empty = await createProduct(0);
      const res = await sell({
        customerId: null,
        isCreditSale: false,
        requiresFiscalInvoice: false,
        paymentMethod: PaymentMethod.EFECTIVO,
        items: [{ productId: empty.id, quantityBase: 1 }],
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
      expect(await ds.query('SELECT 1 FROM sales')).toHaveLength(0);
      expect(
        await ds.getRepository(StockMovement).countBy({
          productId: empty.id,
          movementType: StockMovementType.SALIDA_VENTA,
        }),
      ).toBe(0);
    });

    it.each([
      [
        'RI con CUIT -> Factura A',
        TaxCondition.RESPONSABLE_INSCRIPTO,
        CustomerDocumentType.CUIT,
        '30712345671',
        FiscalDocumentType.FACTURA_A,
      ],
      [
        'monotributo con CUIT -> Factura A',
        TaxCondition.MONOTRIBUTO,
        CustomerDocumentType.CUIT,
        '20345678906',
        FiscalDocumentType.FACTURA_A,
      ],
      [
        'consumidor final con DNI -> Factura B',
        TaxCondition.CONSUMIDOR_FINAL,
        CustomerDocumentType.DNI,
        '30123456',
        FiscalDocumentType.FACTURA_B,
      ],
    ])('%s', async (_name, taxCondition, docType, doc, expected) => {
      const product = await createProduct(5);
      const customer = await createCustomerViaApi(taxCondition, docType, doc);
      const sale = (
        await sell({
          customerId: customer.id,
          isCreditSale: false,
          requiresFiscalInvoice: true,
          paymentMethod: PaymentMethod.EFECTIVO,
          items: [{ productId: product.id, quantityBase: 1 }],
        }).expect(201)
      ).body;
      await buildProcessor(app, ds).process(job(sale.fiscalDocument.id));
      expect(await fiscalDoc(sale.fiscalDocument.id)).toMatchObject({
        arcaStatus: ArcaStatus.EMITIDO,
        documentType: expected,
      });
    });

    it('keeps decimal policy with many-decimal prices and 10.5% IVA, and ARCA accepts the amounts', async () => {
      // 33.33 * 3 = 99.99 neto; IVA 10.5% = 10.49895 -> 10.50; bruto 110.49
      const product = await createProduct(10, { price: '33.33', iva: '10.50' });
      const sale = (
        await sell({
          customerId: null,
          isCreditSale: false,
          requiresFiscalInvoice: true,
          paymentMethod: PaymentMethod.EFECTIVO,
          items: [{ productId: product.id, quantityBase: 3 }],
        }).expect(201)
      ).body;
      expect(sale).toMatchObject({
        totalNet: '99.99',
        ivaTotal: '10.50',
        totalGross: '110.49',
      });
      await buildProcessor(app, ds).process(job(sale.fiscalDocument.id));
      expect((await fiscalDoc(sale.fiscalDocument.id)).arcaStatus).toBe(
        ArcaStatus.EMITIDO,
      );
    });

    it('does not duplicate the comprobante when the CAE response is lost mid-emission (timeout) and the job retries', async () => {
      const product = await createProduct(5);
      const customer = await createCustomerViaApi(
        TaxCondition.RESPONSABLE_INSCRIPTO,
      );
      const sale = (
        await sell({
          customerId: customer.id,
          isCreditSale: true,
          requiresFiscalInvoice: true,
          paymentMethod: PaymentMethod.CTA_CTE,
          items: [{ productId: product.id, quantityBase: 1 }],
        }).expect(201)
      ).body;
      const arca = app.get<IArcaService>(ARCA_SERVICE);
      const original = arca.requestCAE.bind(arca);
      let authorized: Awaited<ReturnType<typeof original>> | undefined;
      const requestCAE = jest
        .spyOn(arca, 'requestCAE')
        .mockImplementationOnce(async (data) => {
          authorized = await original(data); // ARCA autoriza...
          throw new Error('WSFE timeout: ETIMEDOUT'); // ...pero la respuesta se pierde
        });
      jest
        .spyOn(arca, 'queryDocument')
        .mockImplementation(
          async (documentType, pointOfSale, documentNumber) => ({
            documentType,
            pointOfSale,
            documentNumber,
            cae: authorized!.cae,
            caeExpiration: authorized!.caeExpiration,
          }),
        );

      const processor = buildProcessor(app, ds);
      await expect(
        processor.process(job(sale.fiscalDocument.id, 0)),
      ).rejects.toThrow(/ETIMEDOUT/);
      const reserved = await fiscalDoc(sale.fiscalDocument.id);
      expect(reserved.arcaStatus).toBe(ArcaStatus.PENDIENTE_FACTURACION);
      expect(reserved.documentNumber).not.toBeNull();

      await processor.process(job(sale.fiscalDocument.id, 1));
      const final = await fiscalDoc(sale.fiscalDocument.id);
      expect(final).toMatchObject({
        arcaStatus: ArcaStatus.EMITIDO,
        documentNumber: reserved.documentNumber,
        cae: authorized!.cae,
      });
      expect(requestCAE).toHaveBeenCalledTimes(1); // reconcilió por consulta, no re-emitió
      expect(await ds.getRepository(FiscalDocument).count()).toBe(1);
    });

    it('double submit of manual emission and double job processing yield a single CAE', async () => {
      const product = await createProduct(5);
      const customer = await createCustomerViaApi(
        TaxCondition.RESPONSABLE_INSCRIPTO,
      );
      const sale = (
        await sell({
          customerId: customer.id,
          isCreditSale: true,
          requiresFiscalInvoice: true,
          paymentMethod: PaymentMethod.CTA_CTE,
          items: [{ productId: product.id, quantityBase: 1 }],
        }).expect(201)
      ).body;
      const emit = () =>
        http()
          .post(`/api/v1/sales/${sale.id}/fiscal-document/emit`)
          .set(as(adminToken));
      const [a, b] = await Promise.all([emit(), emit()]);
      expect([a.status, b.status].every((s) => s < 500)).toBe(true);

      const arca = app.get<IArcaService>(ARCA_SERVICE);
      const requestCAE = jest.spyOn(arca, 'requestCAE');
      const processor = buildProcessor(app, ds);
      await Promise.all([
        processor.process(job(sale.fiscalDocument.id)),
        processor.process(job(sale.fiscalDocument.id)),
      ]);
      expect(requestCAE).toHaveBeenCalledTimes(1);
      expect(await ds.getRepository(FiscalDocument).count()).toBe(1);
      expect((await fiscalDoc(sale.fiscalDocument.id)).arcaStatus).toBe(
        ArcaStatus.EMITIDO,
      );
    });
  });
});
