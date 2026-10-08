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
  StockMovementType,
  TaxCondition,
} from '@erp/shared-types';
import { AppModule } from '../src/app.module';
import dataSource from '../src/database/data-source';
import { runInitialSeed } from '../src/database/seeds/initial.seed';
import { Category } from '../src/modules/categories/entities/category.entity';
import { Customer } from '../src/modules/customers/entities/customer.entity';
import { FiscalDocument } from '../src/modules/sales/entities/fiscal-document.entity';
import { Product } from '../src/modules/products/entities/product.entity';
import { Stock } from '../src/modules/stock/entities/stock.entity';
import { StockMovement } from '../src/modules/stock/entities/stock-movement.entity';
import { StockService } from '../src/modules/stock/stock.service';
import { Unit } from '../src/modules/units/entities/unit.entity';
import { User } from '../src/modules/users/entities/user.entity';

describe('Sales domain and API (E2E)', () => {
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
      adminEmail: 'sales-admin@erp.com',
      adminPassword: 'AdminPassword123!',
      vendedorEmail: 'sales-seller@erp.com',
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
      .findOneByOrFail({ email: 'sales-seller@erp.com' });
    adminToken = (
      await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'sales-admin@erp.com',
        password: 'AdminPassword123!',
      })
    ).body.accessToken;
    sellerToken = (
      await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'sales-seller@erp.com',
        password: 'SellerPassword123!',
      })
    ).body.accessToken;
  });

  beforeEach(async () => {
    productSequence = 0;
    await ds.query(`
      TRUNCATE TABLE account_receivables, fiscal_documents, sale_items, sales,
        stock_movements, stocks, customer_special_prices, customers, products,
        categories, units, audit_logs RESTART IDENTITY CASCADE
    `);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (ds?.isInitialized) {
      await runInitialSeed(ds);
      await ds.destroy();
    }
  });

  async function createProduct(
    id: string,
    stock: number,
    activePriceNet = '100.00',
    ivaPercentage: string | null = '21.00',
    taxTreatment = ProductTaxTreatment.GRAVADO,
  ): Promise<Product> {
    productSequence += 1;
    const category = await ds.getRepository(Category).save({
      name: `Categoría ${id}`,
      description: null,
    });
    const unit = await ds.getRepository(Unit).save({
      name: `Unidad ${id}`,
      symbol: `s${productSequence}`,
    });
    const product = await ds.getRepository(Product).save({
      id,
      internalCode: `SALE-${productSequence}`,
      name: `Producto ${id}`,
      description: null,
      categoryId: category.id,
      baseUnitId: unit.id,
      minStock: '0.00',
      costNet: '50.0000',
      suggestedPriceNet: activePriceNet,
      activePriceNet,
      taxTreatment,
      ivaPercentage,
      status: ProductStatus.ACTIVE,
    });
    await ds.getRepository(Stock).save({
      productId: product.id,
      currentBaseStock: '0.00',
    });
    if (stock > 0) {
      await stockService.recordMovement({
        productId: product.id,
        movementType: StockMovementType.ENTRADA_COMPRA,
        quantityBase: stock,
        reason: 'Stock inicial test ventas',
        userId: seller.id,
      });
    }
    return product;
  }

  async function createCustomer(): Promise<Customer> {
    return ds.getRepository(Customer).save({
      businessName: 'Cliente crédito',
      documentType: CustomerDocumentType.DNI,
      cuitOrDni: '35123456',
      taxCondition: TaxCondition.CONSUMIDOR_FINAL,
      email: null,
      phone: null,
      address: null,
      creditLimit: '10000.00',
      generalDiscountPercentage: '0.0000',
      isActive: true,
    });
  }

  const cashPayload = (productId: string, quantityBase = 1) => ({
    customerId: null,
    isCreditSale: false,
    requiresFiscalInvoice: false,
    paymentMethod: PaymentMethod.EFECTIVO,
    items: [{ productId, quantityBase }],
  });

  it('permits both roles and confirms an anonymous cash sale with product IVA', async () => {
    const product = await createProduct(
      '10000000-0000-4000-8000-000000000001',
      10,
      '100.00',
      '10.50',
    );
    await request(app.getHttpServer()).get('/api/v1/sales').expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/sales')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    const created = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(cashPayload(product.id, 2))
      .expect(201);
    expect(created.body).toMatchObject({
      status: 'CONFIRMADA',
      customer: null,
      totalNet: '200.00',
      ivaTotal: '21.00',
      totalGross: '221.00',
      fiscalDocument: null,
    });
    expect(created.body.items[0]).toMatchObject({
      catalogPriceNet: '100.00',
      unitPriceNet: '100.00',
      ivaPercentage: '10.50',
    });
  });

  it('replays the same sale for a repeated idempotencyKey and rejects a different body', async () => {
    const product = await createProduct(
      '10000000-0000-4000-8000-000000000002',
      10,
      '100.00',
      '10.50',
    );
    const send = (body: object) =>
      request(app.getHttpServer())
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(body);
    const payload = {
      ...cashPayload(product.id, 2),
      idempotencyKey: 'sale-key-1',
    };

    // Double click: both requests in flight at once.
    const [first, second] = await Promise.all([send(payload), send(payload)]);
    expect([first.status, second.status]).toEqual([201, 201]);
    expect(second.body.id).toBe(first.body.id);

    const [{ count }] = await ds.query(
      `SELECT COUNT(*)::int AS count FROM sales WHERE idempotency_key = 'sale-key-1'`,
    );
    expect(count).toBe(1);
    const stock = await ds.query(
      `SELECT current_base_stock FROM stocks WHERE product_id = $1`,
      [product.id],
    );
    expect(Number(stock[0].current_base_stock)).toBe(8);

    const conflict = await send({
      ...cashPayload(product.id, 3),
      idempotencyKey: 'sale-key-1',
    }).expect(409);
    expect(conflict.body.code).toBe('SALE_IDEMPOTENCY_CONFLICT');
  });

  it('requires authentication for the fiscal document endpoint and 404s without one', async () => {
    const product = await createProduct(
      '10000000-0000-4000-8000-000000000002',
      10,
    );
    const created = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(cashPayload(product.id, 1))
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/sales/${created.body.id}/fiscal-document`)
      .expect(401);

    // The cash sale above did not request an invoice, so no fiscal document
    // exists for it — both authorized roles get 404.
    await request(app.getHttpServer())
      .get(`/api/v1/sales/${created.body.id}/fiscal-document`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/api/v1/sales/${created.body.id}/fiscal-document`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('requires authentication for the fiscal PDF/QR endpoints and 409s while pending', async () => {
    const product = await createProduct(
      '10000000-0000-4000-8000-000000000009',
      10,
    );
    const created = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...cashPayload(product.id, 1),
        requiresFiscalInvoice: true,
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/sales/${created.body.id}/fiscal-document/pdf`)
      .expect(401);
    await request(app.getHttpServer())
      .get(`/api/v1/sales/${created.body.id}/fiscal-document/qr`)
      .expect(401);

    // A fiscal invoice sale gets its FiscalDocument created
    // PENDIENTE_FACTURACION and stays there — sale creation no longer
    // auto-enqueues the wsfe-emit job (manual-invoice-emission change) — so
    // the artifact endpoints must 409, not 200 or 500.
    await request(app.getHttpServer())
      .get(`/api/v1/sales/${created.body.id}/fiscal-document/pdf`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(409);
    await request(app.getHttpServer())
      .get(`/api/v1/sales/${created.body.id}/fiscal-document/qr`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
  });

  describe('fiscal-document preview and manual emission', () => {
    it('previews the computed invoice type, receiver and totals while pending, without touching ARCA', async () => {
      const product = await createProduct(
        '10000000-0000-4000-8000-000000000010',
        10,
      );
      const customer = await createCustomer();
      const created = await request(app.getHttpServer())
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          ...cashPayload(product.id),
          customerId: customer.id,
          requiresFiscalInvoice: true,
        })
        .expect(201);

      const preview = await request(app.getHttpServer())
        .get(`/api/v1/sales/${created.body.id}/fiscal-document/preview`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(preview.body).toMatchObject({
        saleId: created.body.id,
        isEmitted: false,
        invoiceType: 'FACTURA_B',
        cae: null,
        receiver: {
          businessName: 'Cliente crédito',
          documentType: 96,
          documentNumber: '35123456',
        },
        totals: { totalGross: '121.00' },
      });

      // Preview must not have reserved numbering or a CAE as a side effect.
      const stillPending = await request(app.getHttpServer())
        .get(`/api/v1/sales/${created.body.id}/fiscal-document`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(stillPending.body).toMatchObject({
        arcaStatus: 'PENDIENTE_FACTURACION',
        cae: null,
      });
    });

    it('previews the real emitted data once the document has a CAE', async () => {
      const product = await createProduct(
        '10000000-0000-4000-8000-000000000011',
        10,
      );
      const created = await request(app.getHttpServer())
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...cashPayload(product.id), requiresFiscalInvoice: true })
        .expect(201);

      await ds.getRepository(FiscalDocument).update(
        { id: created.body.fiscalDocument.id },
        {
          arcaStatus: ArcaStatus.EMITIDO,
          documentType: FiscalDocumentType.FACTURA_B,
          pointOfSale: 1,
          documentNumber: 555,
          cae: '75123456789012',
        },
      );

      const preview = await request(app.getHttpServer())
        .get(`/api/v1/sales/${created.body.id}/fiscal-document/preview`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(preview.body).toMatchObject({
        isEmitted: true,
        invoiceType: 'FACTURA_B',
        documentNumber: 555,
        cae: '75123456789012',
      });
    });

    it('404s previewing a sale that does not require a fiscal document', async () => {
      const product = await createProduct(
        '10000000-0000-4000-8000-000000000012',
        10,
      );
      const created = await request(app.getHttpServer())
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(cashPayload(product.id))
        .expect(201);

      await request(app.getHttpServer())
        .get(`/api/v1/sales/${created.body.id}/fiscal-document/preview`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('lets a VENDEDOR trigger manual emission, is idempotent, and 409s once EMITIDO', async () => {
      const product = await createProduct(
        '10000000-0000-4000-8000-000000000013',
        10,
      );
      const created = await request(app.getHttpServer())
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...cashPayload(product.id), requiresFiscalInvoice: true })
        .expect(201);
      const fiscalDocumentId = created.body.fiscalDocument.id;

      const firstEmit = await request(app.getHttpServer())
        .post(`/api/v1/sales/${created.body.id}/fiscal-document/emit`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(201);
      expect(firstEmit.body).toMatchObject({
        fiscalDocumentId,
        created: true,
      });

      const secondEmit = await request(app.getHttpServer())
        .post(`/api/v1/sales/${created.body.id}/fiscal-document/emit`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(201);
      expect(secondEmit.body).toMatchObject({
        fiscalDocumentId,
        created: false,
        jobId: firstEmit.body.jobId,
      });

      await ds
        .getRepository(FiscalDocument)
        .update({ id: fiscalDocumentId }, { arcaStatus: ArcaStatus.EMITIDO });

      await request(app.getHttpServer())
        .post(`/api/v1/sales/${created.body.id}/fiscal-document/emit`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(409);
    });
  });

  it('persists and totals a mixed taxable, exempt and non-taxed sale', async () => {
    const taxable = await createProduct(
      '11000000-0000-4000-8000-000000000001',
      10,
      '100.00',
      '21.00',
      ProductTaxTreatment.GRAVADO,
    );
    const exempt = await createProduct(
      '11000000-0000-4000-8000-000000000002',
      10,
      '20.00',
      null,
      ProductTaxTreatment.EXENTO,
    );
    const nonTaxed = await createProduct(
      '11000000-0000-4000-8000-000000000003',
      10,
      '10.00',
      null,
      ProductTaxTreatment.NO_GRAVADO,
    );

    const created = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        customerId: null,
        isCreditSale: false,
        requiresFiscalInvoice: false,
        paymentMethod: PaymentMethod.EFECTIVO,
        items: [taxable, exempt, nonTaxed].map((product) => ({
          productId: product.id,
          quantityBase: 1,
        })),
      })
      .expect(201);

    expect(created.body).toMatchObject({
      totalNet: '130.00',
      taxableNet: '100.00',
      exemptAmount: '20.00',
      nonTaxedAmount: '10.00',
      ivaTotal: '21.00',
      totalGross: '151.00',
    });
    expect(
      created.body.items.map(
        (item: { taxTreatment: ProductTaxTreatment }) => item.taxTreatment,
      ),
    ).toEqual([
      ProductTaxTreatment.GRAVADO,
      ProductTaxTreatment.EXENTO,
      ProductTaxTreatment.NO_GRAVADO,
    ]);
  });

  it('rejects frontend prices and creates fiscal debt only for valid credit', async () => {
    const product = await createProduct(
      '20000000-0000-4000-8000-000000000001',
      10,
    );
    const rejectedPrice = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        ...cashPayload(product.id),
        items: [{ productId: product.id, quantityBase: 1, unitPriceNet: 1 }],
      })
      .expect(400);
    expect(rejectedPrice.body.code).toBe('SALE_PRICE_FIELDS_NOT_ALLOWED');

    const customer = await createCustomer();
    await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        ...cashPayload(product.id),
        customerId: customer.id,
        isCreditSale: true,
        paymentMethod: PaymentMethod.CTA_CTE,
      })
      .expect(400);

    const credit = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        ...cashPayload(product.id),
        customerId: customer.id,
        isCreditSale: true,
        requiresFiscalInvoice: true,
        paymentMethod: PaymentMethod.CTA_CTE,
      })
      .expect(201);
    expect(credit.body.fiscalDocument).toMatchObject({
      documentType: null,
      pointOfSale: null,
      documentNumber: null,
      arcaStatus: 'PENDIENTE_FACTURACION',
    });
    expect(credit.body.accountReceivable).toMatchObject({
      originalAmount: '121.00',
      currentBalance: '121.00',
      status: 'PENDIENTE',
    });

    // Sale creation no longer auto-enqueues emission — the document sits
    // PENDIENTE_FACTURACION until manually emitted, which is exactly what
    // the pending-fiscal admin listing must surface.
    const pendingList = await request(app.getHttpServer())
      .get('/api/v1/sales/pending-fiscal')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(
      pendingList.body.data.some(
        (d: any) => d.id === credit.body.fiscalDocument.id,
      ),
    ).toBe(true);
  });

  it('rolls back earlier item deductions when a later item lacks stock', async () => {
    const first = await createProduct(
      '30000000-0000-4000-8000-000000000001',
      5,
    );
    const second = await createProduct(
      '40000000-0000-4000-8000-000000000001',
      1,
    );
    const response = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        ...cashPayload(first.id),
        items: [
          { productId: first.id, quantityBase: 2 },
          { productId: second.id, quantityBase: 2 },
        ],
      })
      .expect(422);
    expect(response.body.code).toBe('INSUFFICIENT_STOCK');
    expect(
      await ds.getRepository(StockMovement).countBy({
        movementType: StockMovementType.SALIDA_VENTA,
      }),
    ).toBe(0);
    expect(await ds.query(`SELECT count(*)::int AS count FROM sales`)).toEqual([
      { count: 0 },
    ]);
  });

  it('serializes competing sales without negative stock and exposes list/detail', async () => {
    const product = await createProduct(
      '50000000-0000-4000-8000-000000000001',
      10,
    );
    const submit = () =>
      request(app.getHttpServer())
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(cashPayload(product.id, 7));
    const responses = await Promise.all([submit(), submit()]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 422,
    ]);
    const list = await request(app.getHttpServer())
      .get('/api/v1/sales?status=CONFIRMADA&page=1&limit=10')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    expect(list.body.meta.total).toBe(1);
    const detail = await request(app.getHttpServer())
      .get(`/api/v1/sales/${list.body.data[0].id}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    expect(detail.body.items).toHaveLength(1);
    const stock = await ds.getRepository(Stock).findOneByOrFail({
      productId: product.id,
    });
    expect(Number(stock.currentBaseStock)).toBe(3);
  });
});
