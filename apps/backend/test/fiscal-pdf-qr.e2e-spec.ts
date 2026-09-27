import { ConfigService } from '@nestjs/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import * as QRCode from 'qrcode';
import { DataSource } from 'typeorm';
import {
  ArcaStatus,
  CustomerDocumentType,
  PaymentMethod,
  PdfArtifactStatus,
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
import { PdfGenerateProcessor } from '../src/modules/queue/processors/pdf-generate.processor';
import { PdfGenerateQueueService } from '../src/modules/queue/services/pdf-generate.queue';
import { FiscalQrPayloadService } from '../src/modules/sales/services/fiscal-qr-payload.service';
import { FiscalPdfTemplateService } from '../src/modules/sales/services/fiscal-pdf-template.service';

/**
 * Runs wsfe-emit and pdf-generate in-process (no BullMQ/Redis worker
 * involved) against the real Postgres datasource, exercising the full
 * sale -> EMITIDO -> PDF/QR artifact -> download pipeline for #225.
 */
function buildFiscalInvoiceProcessor(app: INestApplication, ds: DataSource) {
  const redisStub = {} as any;
  return new FiscalInvoiceProcessor(
    redisStub,
    ds,
    app.get<IArcaService>(ARCA_SERVICE),
    app.get(InvoiceTypeResolverService),
    new FiscalNumberingService(ds),
    app.get(ConfigService),
    app.get(PdfGenerateQueueService),
  );
}

function buildPdfGenerateProcessor(app: INestApplication, ds: DataSource) {
  const redisStub = {} as any;
  const configService = app.get(ConfigService);
  // FiscalQrPayloadService/FiscalPdfTemplateService only live in
  // QueueConsumerModule (the worker process), not in AppModule's graph —
  // both have no other dependencies, so they're constructed directly here,
  // same as FiscalNumberingService above.
  return new PdfGenerateProcessor(
    redisStub,
    ds,
    new FiscalQrPayloadService(configService),
    new FiscalPdfTemplateService(),
    configService,
  );
}

describe('Fiscal PDF/QR artifact pipeline (E2E)', () => {
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
      adminEmail: 'fiscal-pdf-admin@erp.com',
      adminPassword: 'AdminPassword123!',
      vendedorEmail: 'fiscal-pdf-seller@erp.com',
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
      .findOneByOrFail({ email: 'fiscal-pdf-seller@erp.com' });
    adminToken = (
      await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'fiscal-pdf-admin@erp.com',
        password: 'AdminPassword123!',
      })
    ).body.accessToken;
    sellerToken = (
      await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'fiscal-pdf-seller@erp.com',
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
      symbol: `pq${productSequence}`,
    });
    const product = await ds.getRepository(Product).save({
      internalCode: `PQ-${productSequence}`,
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
      reason: 'Stock inicial test PDF/QR',
      userId: seller.id,
    });
    return product;
  }

  async function createCustomer(): Promise<Customer> {
    return ds.getRepository(Customer).save({
      businessName: 'Cliente Test PDF/QR SA',
      documentType: CustomerDocumentType.CUIT,
      cuitOrDni: '30712345678',
      taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
      email: null,
      phone: null,
      address: null,
      creditLimit: '10000.00',
      generalDiscountPercentage: '0.0000',
      isActive: true,
    });
  }

  it('generates a downloadable PDF and a decodable QR after CAE issuance', async () => {
    const product = await createProduct('PDF1', 10);
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

    await buildFiscalInvoiceProcessor(app, ds).process({
      data: { fiscalDocumentId: saleRes.body.fiscalDocument.id },
    } as any);

    // Artifact not ready yet: pdf-generate was only enqueued, not processed.
    await request(app.getHttpServer())
      .get(`/api/v1/sales/${saleRes.body.id}/fiscal-document/pdf`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(409);

    await buildPdfGenerateProcessor(app, ds).process({
      data: { fiscalDocumentId: saleRes.body.fiscalDocument.id },
    } as any);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/sales/${saleRes.body.id}/fiscal-document`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    expect(detail.body).toMatchObject({
      arcaStatus: ArcaStatus.EMITIDO,
      pdfStatus: PdfArtifactStatus.DISPONIBLE,
      qrAvailable: true,
    });

    const pdfRes = await request(app.getHttpServer())
      .get(`/api/v1/sales/${saleRes.body.id}/fiscal-document/pdf`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    expect(pdfRes.headers['content-type']).toBe('application/pdf');
    expect(pdfRes.headers['content-disposition']).toMatch(
      /attachment; filename="factura-a-/,
    );
    expect(Buffer.from(pdfRes.body).slice(0, 5).toString('ascii')).toBe(
      '%PDF-',
    );

    const qrRes = await request(app.getHttpServer())
      .get(`/api/v1/sales/${saleRes.body.id}/fiscal-document/qr`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(qrRes.headers['content-type']).toBe('image/png');

    const fiscalDocument = await ds
      .getRepository(FiscalDocument)
      .findOneByOrFail({ id: saleRes.body.fiscalDocument.id });
    expect(fiscalDocument.qrCodeData).toBeTruthy();
    const decoded = await QRCode.toString(fiscalDocument.qrCodeData!, {
      type: 'utf8',
    });
    expect(decoded).toBeTruthy();
    const payloadUrl = fiscalDocument.qrCodeData!;
    const encoded = payloadUrl.split('?p=')[1];
    const payload = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    expect(payload).toMatchObject({
      cuit: 20345678901,
      codAut: Number(fiscalDocument.cae),
    });
  });

  it('does not duplicate the artifact when pdf-generate runs twice concurrently', async () => {
    const product = await createProduct('PDF2', 10);
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

    await buildFiscalInvoiceProcessor(app, ds).process({
      data: { fiscalDocumentId: saleRes.body.fiscalDocument.id },
    } as any);

    const jobData = {
      data: { fiscalDocumentId: saleRes.body.fiscalDocument.id },
    } as any;
    const [first, second] = await Promise.all([
      buildPdfGenerateProcessor(app, ds).process(jobData),
      buildPdfGenerateProcessor(app, ds).process(jobData),
    ]);

    // One run generates, the other serializes on the row lock and then
    // no-ops (already DISPONIBLE at the current template version).
    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual(['generated', 'skipped']);

    const fiscalDocument = await ds
      .getRepository(FiscalDocument)
      .findOneByOrFail({ id: saleRes.body.fiscalDocument.id });
    expect(fiscalDocument.pdfStatus).toBe(PdfArtifactStatus.DISPONIBLE);
  });

  it('links the Nota de Crédito PDF/QR to the return without touching the original Factura', async () => {
    const product = await createProduct('NC1', 10);
    const customer = await createCustomer();

    const saleRes = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: customer.id,
        isCreditSale: true,
        requiresFiscalInvoice: true,
        paymentMethod: PaymentMethod.CTA_CTE,
        items: [{ productId: product.id, quantityBase: 2 }],
      })
      .expect(201);

    await buildFiscalInvoiceProcessor(app, ds).process({
      data: { fiscalDocumentId: saleRes.body.fiscalDocument.id },
    } as any);
    await buildPdfGenerateProcessor(app, ds).process({
      data: { fiscalDocumentId: saleRes.body.fiscalDocument.id },
    } as any);

    const saleItemId = saleRes.body.items[0].id;
    const returnRes = await request(app.getHttpServer())
      .post(`/api/v1/sales/${saleRes.body.id}/returns`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        reason: 'Producto defectuoso',
        items: [
          {
            saleItemId,
            quantityBase: 1,
            quality: SaleReturnItemQuality.NO_APTO,
          },
        ],
      })
      .expect(201);

    await buildFiscalInvoiceProcessor(app, ds).process({
      data: { fiscalDocumentId: returnRes.body.fiscalDocument.id },
    } as any);
    await buildPdfGenerateProcessor(app, ds).process({
      data: { fiscalDocumentId: returnRes.body.fiscalDocument.id },
    } as any);

    const ncPdf = await request(app.getHttpServer())
      .get(
        `/api/v1/sales/${saleRes.body.id}/returns/${returnRes.body.id}/fiscal-document/pdf`,
      )
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    expect(Buffer.from(ncPdf.body).slice(0, 5).toString('ascii')).toBe('%PDF-');

    const originalFiscalDoc = await ds
      .getRepository(FiscalDocument)
      .findOneByOrFail({ id: saleRes.body.fiscalDocument.id });
    expect(originalFiscalDoc.arcaStatus).toBe(ArcaStatus.EMITIDO);
    expect(originalFiscalDoc.pdfStatus).toBe(PdfArtifactStatus.DISPONIBLE);

    const ncFiscalDoc = await ds
      .getRepository(FiscalDocument)
      .findOneByOrFail({ id: returnRes.body.fiscalDocument.id });
    expect(ncFiscalDoc.saleReturnId).toBe(returnRes.body.id);
    expect(ncFiscalDoc.pdfStatus).toBe(PdfArtifactStatus.DISPONIBLE);
    expect(ncFiscalDoc.pdfData).not.toEqual(originalFiscalDoc.pdfData);
  });
});
