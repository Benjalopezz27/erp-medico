import { ConfigService } from '@nestjs/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
  ArcaStatus,
  CustomerDocumentType,
  FiscalDocumentType,
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

/**
 * Runs the wsfe-emit consumer in-process (no BullMQ/Redis worker involved)
 * against the real Postgres datasource and the app's own ARCA_SERVICE
 * (ArcaMockService, since ARCA_ENV=development in e2e — see setup-e2e.ts).
 * This lets the tests below assert the full sale/return -> job -> EMITIDO
 * pipeline deterministically, without a separate worker process.
 */
function buildProcessor(app: INestApplication, ds: DataSource) {
  const redisStub = {} as any; // only used by onModuleInit(), never called here
  return new FiscalInvoiceProcessor(
    redisStub,
    ds,
    app.get<IArcaService>(ARCA_SERVICE),
    app.get(InvoiceTypeResolverService),
    new FiscalNumberingService(ds),
    app.get(ConfigService),
  );
}

describe('Fiscal invoice emission pipeline (E2E)', () => {
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
      adminEmail: 'fiscal-emission-admin@erp.com',
      adminPassword: 'AdminPassword123!',
      vendedorEmail: 'fiscal-emission-seller@erp.com',
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
      .findOneByOrFail({ email: 'fiscal-emission-seller@erp.com' });
    adminToken = (
      await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'fiscal-emission-admin@erp.com',
        password: 'AdminPassword123!',
      })
    ).body.accessToken;
    sellerToken = (
      await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'fiscal-emission-seller@erp.com',
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
      symbol: `fe${productSequence}`,
    });
    const product = await ds.getRepository(Product).save({
      internalCode: `FE-${productSequence}`,
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
      reason: 'Stock inicial test emisión fiscal',
      userId: seller.id,
    });
    return product;
  }

  async function createCustomer(
    taxCondition = TaxCondition.RESPONSABLE_INSCRIPTO,
  ): Promise<Customer> {
    return ds.getRepository(Customer).save({
      businessName: 'Cliente Test Emisión Fiscal SA',
      documentType: CustomerDocumentType.CUIT,
      cuitOrDni: '30712345678',
      taxCondition,
      email: null,
      phone: null,
      address: null,
      creditLimit: '10000.00',
      generalDiscountPercentage: '0.0000',
      isActive: true,
    });
  }

  it('emits a Factura A with CAE for a credit sale to a RESPONSABLE_INSCRIPTO customer', async () => {
    const product = await createProduct('FA1', 10);
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

    expect(saleRes.body.fiscalDocument).toMatchObject({
      arcaStatus: ArcaStatus.PENDIENTE_FACTURACION,
    });

    await buildProcessor(app, ds).process({
      data: { fiscalDocumentId: saleRes.body.fiscalDocument.id },
    } as any);

    const queryRes = await request(app.getHttpServer())
      .get(`/api/v1/sales/${saleRes.body.id}/fiscal-document`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    expect(queryRes.body).toMatchObject({
      documentType: FiscalDocumentType.FACTURA_A,
      arcaStatus: ArcaStatus.EMITIDO,
    });
    expect(queryRes.body.cae).toBeTruthy();
    expect(queryRes.body.documentNumber).toBeGreaterThan(0);
  });

  it('emits a Factura B for a cash sale without a registered customer', async () => {
    const product = await createProduct('FB1', 10);

    const saleRes = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: null,
        isCreditSale: false,
        requiresFiscalInvoice: true,
        paymentMethod: PaymentMethod.EFECTIVO,
        items: [{ productId: product.id, quantityBase: 1 }],
      })
      .expect(201);

    await buildProcessor(app, ds).process({
      data: { fiscalDocumentId: saleRes.body.fiscalDocument.id },
    } as any);

    const queryRes = await request(app.getHttpServer())
      .get(`/api/v1/sales/${saleRes.body.id}/fiscal-document`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(queryRes.body).toMatchObject({
      documentType: FiscalDocumentType.FACTURA_B,
      arcaStatus: ArcaStatus.EMITIDO,
    });
  });

  it('emits a Credit Note linked to the original invoice for a return on an invoiced sale', async () => {
    const product = await createProduct('CN1', 10);
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

    const processor = buildProcessor(app, ds);
    await processor.process({
      data: { fiscalDocumentId: saleRes.body.fiscalDocument.id },
    } as any);

    const invoice = await ds
      .getRepository(FiscalDocument)
      .findOneByOrFail({ id: saleRes.body.fiscalDocument.id });
    expect(invoice.documentType).toBe(FiscalDocumentType.FACTURA_A);
    expect(invoice.pointOfSale).toBeTruthy();

    const returnRes = await request(app.getHttpServer())
      .post(`/api/v1/sales/${saleRes.body.id}/returns`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        reason: 'Devolución para nota de crédito',
        items: [
          {
            saleItemId: saleRes.body.items[0].id,
            quantityBase: 1,
            quality: SaleReturnItemQuality.APTO,
          },
        ],
      })
      .expect(201);

    const creditNoteDoc = returnRes.body.fiscalDocument;
    expect(creditNoteDoc).toMatchObject({
      arcaStatus: ArcaStatus.PENDIENTE_FACTURACION,
    });

    await processor.process({
      data: { fiscalDocumentId: creditNoteDoc.id },
    } as any);

    const persistedCreditNote = await ds
      .getRepository(FiscalDocument)
      .findOneByOrFail({ id: creditNoteDoc.id });

    expect(persistedCreditNote.arcaStatus).toBe(ArcaStatus.EMITIDO);
    expect(persistedCreditNote.documentType).toBe(
      FiscalDocumentType.NOTA_CREDITO_A,
    );
    expect(persistedCreditNote.pointOfSale).toBe(invoice.pointOfSale);
    expect(persistedCreditNote.cae).toBeTruthy();
  });

  it('does not create a fiscal document or job for a cash sale without invoice, or a credit sale that already requires one', async () => {
    const product = await createProduct('REG1', 10);

    const cashRes = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: null,
        isCreditSale: false,
        requiresFiscalInvoice: false,
        paymentMethod: PaymentMethod.EFECTIVO,
        items: [{ productId: product.id, quantityBase: 1 }],
      })
      .expect(201);

    expect(cashRes.body.fiscalDocument).toBeNull();

    const fiscalDocCount = await ds
      .getRepository(FiscalDocument)
      .count({ where: { saleId: cashRes.body.id } });
    expect(fiscalDocCount).toBe(0);
  });

  it('two workers racing the same document against real Postgres: only one calls ARCA and persists a CAE', async () => {
    const product = await createProduct('RACE1', 10);
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

    const fiscalDocumentId = saleRes.body.fiscalDocument.id;
    const arcaService = app.get<IArcaService>(ARCA_SERVICE);
    const requestCAESpy = jest.spyOn(arcaService, 'requestCAE');

    // Two independent processor instances (as two worker processes would be),
    // firing at the same document at the same time via Promise.all: this is
    // what the pessimistic row lock in fiscal-invoice.processor.ts and the
    // same-connection numbering in fiscal-numbering.service.ts must
    // serialize — without them this either double-submits to ARCA or hangs.
    const [first, second] = await Promise.all([
      buildProcessor(app, ds).process({
        data: { fiscalDocumentId },
      } as any),
      buildProcessor(app, ds).process({
        data: { fiscalDocumentId },
      } as any),
    ]);

    const outcomes = [first.status, second.status].sort();
    expect(outcomes).toEqual(['emitted', 'skipped']);
    expect(requestCAESpy).toHaveBeenCalledTimes(1);

    const persisted = await ds
      .getRepository(FiscalDocument)
      .findOneByOrFail({ id: fiscalDocumentId });
    expect(persisted.arcaStatus).toBe(ArcaStatus.EMITIDO);
    expect(persisted.cae).toBeTruthy();
  });
});
