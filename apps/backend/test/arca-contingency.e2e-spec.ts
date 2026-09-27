import { ConfigService } from '@nestjs/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
  ArcaStatus,
  CustomerDocumentType,
  FiscalDocumentType,
  FiscalErrorCode,
  PaymentMethod,
  ProductStatus,
  ProductTaxTreatment,
  StockMovementType,
  TaxCondition,
} from '@erp/shared-types';
import { AppModule } from '../src/app.module';
import dataSource from '../src/database/data-source';
import { runInitialSeed } from '../src/database/seeds/initial.seed';
import { Category } from '../src/modules/categories/entities/category.entity';
import { Customer } from '../src/modules/customers/entities/customer.entity';
import { Product } from '../src/modules/products/entities/product.entity';
import { Unit } from '../src/modules/units/entities/unit.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { FiscalDocument } from '../src/modules/sales/entities/fiscal-document.entity';
import { StockService } from '../src/modules/stock/stock.service';
import { ARCA_SERVICE } from '../src/modules/arca/arca.constants';
import { IArcaService } from '../src/modules/arca/interfaces/arca-service.interface';
import { InvoiceTypeResolverService } from '../src/modules/arca/services/invoice-type-resolver.service';
import { FiscalNumberingService } from '../src/modules/sales/services/fiscal-numbering.service';
import { FiscalInvoiceProcessor } from '../src/modules/queue/processors/fiscal-invoice.processor';
import { FiscalContingencyOrchestrator } from '../src/modules/queue/services/fiscal-contingency-orchestrator.service';
import { FiscalInvoiceQueueService } from '../src/modules/queue/services/fiscal-invoice.queue';
import { FiscalReconciliationSweepService } from '../src/modules/queue/services/fiscal-reconciliation-sweep.service';
import { PdfGenerateQueueService } from '../src/modules/queue/services/pdf-generate.queue';

/**
 * Contingencia/idempotencia fiscal (#226): Escenario A/B, agotamiento de
 * reintentos, barrido de recuperación y la API administrativa de
 * `/sales/pending-fiscal`. Same in-process pattern as
 * fiscal-invoice-emission.e2e-spec.ts (no real BullMQ worker consumes jobs
 * here) — the processor is invoked directly, with `job.attemptsMade`/
 * `job.opts.attempts` set explicitly to simulate BullMQ's own retry count.
 */
function buildProcessor(app: INestApplication, ds: DataSource) {
  const redisStub = {} as any;
  const orchestrator = new FiscalContingencyOrchestrator(
    ds,
    app.get<IArcaService>(ARCA_SERVICE),
    app.get(InvoiceTypeResolverService),
    new FiscalNumberingService(ds),
    app.get(ConfigService),
  );
  return new FiscalInvoiceProcessor(
    redisStub,
    ds,
    orchestrator,
    app.get(PdfGenerateQueueService),
  );
}

function makeJob(fiscalDocumentId: string, attemptsMade: number) {
  return {
    id: `job-${attemptsMade}`,
    data: { fiscalDocumentId },
    attemptsMade,
    opts: { attempts: 6 },
  } as any;
}

describe('ARCA contingency engine (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let stockService: StockService;
  let adminToken: string;
  let sellerToken: string;
  let seller: User;
  let productSequence = 0;

  beforeAll(async () => {
    ds = await dataSource.initialize();
    await ds.runMigrations();
    await runInitialSeed(ds, {
      adminEmail: 'arca-contingency-admin@erp.com',
      adminPassword: 'AdminPassword123!',
      vendedorEmail: 'arca-contingency-seller@erp.com',
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
      .findOneByOrFail({ email: 'arca-contingency-seller@erp.com' });
    adminToken = (
      await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'arca-contingency-admin@erp.com',
        password: 'AdminPassword123!',
      })
    ).body.accessToken;
    sellerToken = (
      await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'arca-contingency-seller@erp.com',
        password: 'SellerPassword123!',
      })
    ).body.accessToken;
  });

  beforeEach(async () => {
    productSequence = 0;
    await ds.query(`
      TRUNCATE TABLE account_receivables, fiscal_documents, sale_return_items,
        sale_returns, sale_items, sales, stock_movements, stocks,
        customer_special_prices, customers, products, categories, units,
        audit_logs RESTART IDENTITY CASCADE
    `);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (ds?.isInitialized) {
      await runInitialSeed(ds);
      await ds.destroy();
    }
  });

  async function createProduct(id: string, stock: number): Promise<Product> {
    productSequence += 1;
    const category = await ds.getRepository(Category).save({
      name: `Categoría ${id}`,
      description: null,
    });
    const unit = await ds.getRepository(Unit).save({
      name: `Unidad ${id}`,
      symbol: `ac${productSequence}`,
    });
    const product = await ds.getRepository(Product).save({
      internalCode: `AC-${productSequence}`,
      name: `Producto ${id}`,
      description: null,
      categoryId: category.id,
      baseUnitId: unit.id,
      minStock: '0.00',
      costNet: '50.0000',
      suggestedPriceNet: '100.00',
      activePriceNet: '100.00',
      taxTreatment: ProductTaxTreatment.GRAVADO,
      ivaPercentage: '21.00',
      status: ProductStatus.ACTIVE,
    });
    await stockService.recordMovement({
      productId: product.id,
      movementType: StockMovementType.AJUSTE_ENTRADA,
      quantityBase: stock,
      reason: 'Stock inicial test contingencia fiscal',
      userId: seller.id,
    });
    return product;
  }

  async function createCustomer(): Promise<Customer> {
    return ds.getRepository(Customer).save({
      businessName: 'Cliente Test Contingencia Fiscal SA',
      documentType: CustomerDocumentType.CUIT,
      cuitOrDni: '30798765432',
      taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
      email: null,
      phone: null,
      address: null,
      creditLimit: '10000.00',
      generalDiscountPercentage: '0.0000',
      isActive: true,
    });
  }

  async function createInvoicedSale(): Promise<{
    saleId: string;
    fiscalDocumentId: string;
  }> {
    const product = await createProduct('X', 10);
    const customer = await createCustomer();
    const saleRes = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: customer.id,
        isCreditSale: true,
        requiresFiscalInvoice: true,
        paymentMethod: PaymentMethod.CTA_CTE,
        items: [{ productId: product.id, quantityBase: 1 }],
      })
      .expect(201);
    return {
      saleId: saleRes.body.id,
      fiscalDocumentId: saleRes.body.fiscalDocument.id,
    };
  }

  describe('Escenario A — falla transitoria antes del CAE', () => {
    it('retries with persisted attempt metadata and eventually emits, sale stays CONFIRMADA throughout', async () => {
      const { saleId, fiscalDocumentId } = await createInvoicedSale();
      const arcaService = app.get<IArcaService>(ARCA_SERVICE);
      const original = arcaService.requestCAE.bind(arcaService);
      jest
        .spyOn(arcaService, 'requestCAE')
        .mockRejectedValueOnce(new Error('WSFE network error: ECONNRESET'))
        .mockRejectedValueOnce(new Error('WSFE network error: ECONNRESET'))
        .mockImplementation(original);

      const processor = buildProcessor(app, ds);

      await expect(
        processor.process(makeJob(fiscalDocumentId, 0)),
      ).rejects.toThrow(/ECONNRESET/);
      let doc = await ds
        .getRepository(FiscalDocument)
        .findOneByOrFail({ id: fiscalDocumentId });
      expect(doc.arcaStatus).toBe(ArcaStatus.PENDIENTE_FACTURACION);
      expect(doc.attemptCount).toBe(1);

      await expect(
        processor.process(makeJob(fiscalDocumentId, 1)),
      ).rejects.toThrow(/ECONNRESET/);
      doc = await ds
        .getRepository(FiscalDocument)
        .findOneByOrFail({ id: fiscalDocumentId });
      expect(doc.attemptCount).toBe(2);

      const result = await processor.process(makeJob(fiscalDocumentId, 2));
      expect(result.status).toBe('emitted');

      doc = await ds
        .getRepository(FiscalDocument)
        .findOneByOrFail({ id: fiscalDocumentId });
      expect(doc.arcaStatus).toBe(ArcaStatus.EMITIDO);

      const saleCheck = await request(app.getHttpServer())
        .get(`/api/v1/sales/${saleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(saleCheck.body.status).toBe('CONFIRMADA');
    });

    it('marks RECHAZADO with RETRIES_EXHAUSTED after the 6th attempt (5 retries), without leaking secrets', async () => {
      const { fiscalDocumentId } = await createInvoicedSale();
      const arcaService = app.get<IArcaService>(ARCA_SERVICE);
      jest
        .spyOn(arcaService, 'requestCAE')
        .mockRejectedValue(
          new Error(
            'WSFE timeout. <Token>secret-token-abc</Token><Sign>secret-sign-xyz</Sign>',
          ),
        );

      const processor = buildProcessor(app, ds);
      for (const attemptsMade of [0, 1, 2, 3, 4]) {
        await expect(
          processor.process(makeJob(fiscalDocumentId, attemptsMade)),
        ).rejects.toThrow();
      }
      const result = await processor.process(makeJob(fiscalDocumentId, 5));
      expect(result).toEqual({ status: 'rejected', fiscalDocumentId });

      const doc = await ds
        .getRepository(FiscalDocument)
        .findOneByOrFail({ id: fiscalDocumentId });
      expect(doc.arcaStatus).toBe(ArcaStatus.RECHAZADO);
      expect(doc.arcaErrorCode).toBe(FiscalErrorCode.RETRIES_EXHAUSTED);
      expect(doc.attemptCount).toBeGreaterThanOrEqual(5);
      expect(doc.arcaErrorMessage).not.toContain('secret-token-abc');
      expect(doc.arcaErrorMessage).not.toContain('secret-sign-xyz');
    });
  });

  describe('Escenario B — identidad fiscal ya reservada', () => {
    it('reconciles an already-authorized CAE via FECompConsultar instead of requesting a new one', async () => {
      const { fiscalDocumentId } = await createInvoicedSale();
      const arcaService = app.get<IArcaService>(ARCA_SERVICE);
      const requestCAESpy = jest.spyOn(arcaService, 'requestCAE');
      jest.spyOn(arcaService, 'queryDocument').mockResolvedValueOnce({
        documentType: 1,
        pointOfSale: 1,
        documentNumber: 55555,
        cae: '70555555555555',
        caeExpiration: '20260401',
      });

      // Simulates a previous attempt that reserved the number but lost the
      // CAE response before persisting it (post-CAE contingency).
      await ds.getRepository(FiscalDocument).update(
        { id: fiscalDocumentId },
        {
          documentType: FiscalDocumentType.FACTURA_A,
          pointOfSale: 1,
          documentNumber: 55555,
        },
      );

      const result = await buildProcessor(app, ds).process(
        makeJob(fiscalDocumentId, 1),
      );

      expect(result.status).toBe('emitted');
      expect(requestCAESpy).not.toHaveBeenCalled();

      const doc = await ds
        .getRepository(FiscalDocument)
        .findOneByOrFail({ id: fiscalDocumentId });
      expect(doc.cae).toBe('70555555555555');
      expect(doc.documentNumber).toBe(55555);
    });

    it('proceeds to a single emission when the query confirms the comprobante does not exist yet', async () => {
      const { fiscalDocumentId } = await createInvoicedSale();
      const arcaService = app.get<IArcaService>(ARCA_SERVICE);
      const requestCAESpy = jest.spyOn(arcaService, 'requestCAE');

      await ds.getRepository(FiscalDocument).update(
        { id: fiscalDocumentId },
        {
          documentType: FiscalDocumentType.FACTURA_A,
          pointOfSale: 1,
          documentNumber: 66666,
        },
      );

      const result = await buildProcessor(app, ds).process(
        makeJob(fiscalDocumentId, 1),
      );

      expect(result.status).toBe('emitted');
      expect(requestCAESpy).toHaveBeenCalledTimes(1);
      expect(requestCAESpy).toHaveBeenCalledWith(
        expect.objectContaining({ documentNumber: 66666 }),
      );
    });

    it('does not emit blindly when the query itself is uncertain', async () => {
      const { fiscalDocumentId } = await createInvoicedSale();
      const arcaService = app.get<IArcaService>(ARCA_SERVICE);
      const requestCAESpy = jest.spyOn(arcaService, 'requestCAE');
      jest
        .spyOn(arcaService, 'queryDocument')
        .mockRejectedValueOnce(new Error('WSFE FECompConsultar timeout'));

      await ds.getRepository(FiscalDocument).update(
        { id: fiscalDocumentId },
        {
          documentType: FiscalDocumentType.FACTURA_A,
          pointOfSale: 1,
          documentNumber: 77777,
        },
      );

      await expect(
        buildProcessor(app, ds).process(makeJob(fiscalDocumentId, 0)),
      ).rejects.toThrow();
      expect(requestCAESpy).not.toHaveBeenCalled();

      const doc = await ds
        .getRepository(FiscalDocument)
        .findOneByOrFail({ id: fiscalDocumentId });
      expect(doc.arcaErrorCode).toBe(FiscalErrorCode.QUERY_UNCERTAIN);
      expect(doc.arcaStatus).toBe(ArcaStatus.PENDIENTE_FACTURACION);
    });
  });

  it('reprocessing a job for an already-EMITIDO document is a no-op that preserves the CAE', async () => {
    const { fiscalDocumentId } = await createInvoicedSale();
    const arcaService = app.get<IArcaService>(ARCA_SERVICE);
    const requestCAESpy = jest.spyOn(arcaService, 'requestCAE');

    const processor = buildProcessor(app, ds);
    await processor.process(makeJob(fiscalDocumentId, 0));
    const before = await ds
      .getRepository(FiscalDocument)
      .findOneByOrFail({ id: fiscalDocumentId });

    const result = await processor.process(makeJob(fiscalDocumentId, 0));
    const after = await ds
      .getRepository(FiscalDocument)
      .findOneByOrFail({ id: fiscalDocumentId });

    expect(result).toEqual({ status: 'skipped', fiscalDocumentId });
    expect(requestCAESpy).toHaveBeenCalledTimes(1);
    expect(after.cae).toBe(before.cae);
  });

  describe('API administrativa /sales/pending-fiscal', () => {
    it('lists pending/rejected documents and counts them (ADMINISTRADOR only)', async () => {
      const { fiscalDocumentId } = await createInvoicedSale();

      await request(app.getHttpServer())
        .get('/api/v1/sales/pending-fiscal')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(403);

      const listRes = await request(app.getHttpServer())
        .get('/api/v1/sales/pending-fiscal')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(
        listRes.body.data.some((d: any) => d.id === fiscalDocumentId),
      ).toBe(true);

      const countRes = await request(app.getHttpServer())
        .get('/api/v1/sales/pending-fiscal/count')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(countRes.body.pending).toBeGreaterThanOrEqual(1);

      // Query params exactly as sent by the fiscal-alerts frontend feature
      // (#235) — `status`/`dateFrom`/`dateTo`/`search`, not
      // `arcaStatus`/`from`/`to`; the global ValidationPipe's
      // forbidNonWhitelisted rejects unknown params with 400.
      const filteredRes = await request(app.getHttpServer())
        .get('/api/v1/sales/pending-fiscal')
        .query({
          status: 'PENDIENTE_FACTURACION',
          page: 1,
          limit: 20,
          search: 'V-',
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const row = filteredRes.body.data.find(
        (d: any) => d.id === fiscalDocumentId,
      );
      expect(row).toMatchObject({
        saleNumber: expect.any(String),
        customerName: expect.any(String),
        amount: expect.any(String),
        hasActiveRetryJob: expect.any(Boolean),
        isRetryable: true,
      });
    });

    it('retry: 404 unknown, 409 EMITIDO, and idempotent 201 while pending', async () => {
      await request(app.getHttpServer())
        .post(
          '/api/v1/sales/pending-fiscal/00000000-0000-0000-0000-000000000000/retry',
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      const { fiscalDocumentId } = await createInvoicedSale();
      await buildProcessor(app, ds).process(makeJob(fiscalDocumentId, 0));

      // No real worker consumes the job BullMQ enqueued at sale creation in
      // this suite (see file header) — evict it, as a real worker having
      // processed it successfully would have left it `completed`.
      const queueService = app.get(FiscalInvoiceQueueService);
      const staleJob = await queueService.getJob(fiscalDocumentId);
      if (staleJob) await staleJob.remove();

      await request(app.getHttpServer())
        .post(`/api/v1/sales/pending-fiscal/${fiscalDocumentId}/retry`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);

      await ds
        .getRepository(FiscalDocument)
        .update({ id: fiscalDocumentId }, { arcaStatus: ArcaStatus.RECHAZADO });

      const firstRetry = await request(app.getHttpServer())
        .post(`/api/v1/sales/pending-fiscal/${fiscalDocumentId}/retry`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
      expect(firstRetry.body.created).toBe(true);
      expect(firstRetry.body.fiscalDocumentId).toBe(fiscalDocumentId);
      expect(firstRetry.body.arcaStatus).toBe(ArcaStatus.PENDIENTE_FACTURACION);

      const doc = await ds
        .getRepository(FiscalDocument)
        .findOneByOrFail({ id: fiscalDocumentId });
      expect(doc.arcaStatus).toBe(ArcaStatus.PENDIENTE_FACTURACION);

      const secondRetry = await request(app.getHttpServer())
        .post(`/api/v1/sales/pending-fiscal/${fiscalDocumentId}/retry`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
      expect(secondRetry.body.created).toBe(false);
      expect(secondRetry.body.jobId).toBe(firstRetry.body.jobId);
    });
  });

  it('sweep() recovers a PENDIENTE_FACTURACION document without an active job after the grace period', async () => {
    const { fiscalDocumentId } = await createInvoicedSale();
    const queueService = app.get(FiscalInvoiceQueueService);

    // Simulate the post-commit enqueue failing (Redis unavailable at that
    // moment): evict the job sales.service.ts just enqueued, and backdate
    // updatedAt past the sweep's grace period (raw SQL: repository.update()
    // would let the ORM stamp its own `now()` over our value).
    const orphanedJob = await queueService.getJob(fiscalDocumentId);
    if (orphanedJob) await orphanedJob.remove();
    await ds.query(
      `UPDATE fiscal_documents SET updated_at = $1 WHERE id = $2`,
      [new Date(Date.now() - 5 * 60 * 1000), fiscalDocumentId],
    );

    const sweepService = new FiscalReconciliationSweepService(
      ds,
      queueService,
      app.get(ConfigService),
    );
    const requeued = await sweepService.sweep();

    expect(requeued).toBeGreaterThanOrEqual(1);
    const job = await queueService.getJob(fiscalDocumentId);
    expect(job).toBeDefined();
  });
});
