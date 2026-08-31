import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
  CustomerDocumentType,
  PaymentMethod,
  ProductStatus,
  StockMovementType,
  TaxCondition,
} from '@erp/shared-types';
import { AppModule } from '../src/app.module';
import dataSource from '../src/database/data-source';
import { runInitialSeed } from '../src/database/seeds/initial.seed';
import { Category } from '../src/modules/categories/entities/category.entity';
import { Customer } from '../src/modules/customers/entities/customer.entity';
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
    ivaPercentage = '21.00',
  ): Promise<Product> {
    const category = await ds.getRepository(Category).save({
      name: `Categoría ${id}`,
      description: null,
    });
    const unit = await ds.getRepository(Unit).save({
      name: `Unidad ${id}`,
      symbol: id.slice(0, 4),
    });
    const product = await ds.getRepository(Product).save({
      id,
      internalCode: `SALE-${id.slice(0, 4)}`,
      name: `Producto ${id}`,
      description: null,
      categoryId: category.id,
      baseUnitId: unit.id,
      minStock: '0.00',
      costNet: '50.0000',
      suggestedPriceNet: activePriceNet,
      activePriceNet,
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
