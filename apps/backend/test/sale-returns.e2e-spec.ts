import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
  ArcaStatus,
  CustomerDocumentType,
  PaymentMethod,
  ProductStatus,
  ProductTaxTreatment,
  QuarantineStatus,
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
import { Stock } from '../src/modules/stock/entities/stock.entity';
import { StockMovement } from '../src/modules/stock/entities/stock-movement.entity';
import { StockService } from '../src/modules/stock/stock.service';
import { Unit } from '../src/modules/units/entities/unit.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { QuarantineStock } from '../src/modules/quarantine/entities/quarantine-stock.entity';
import { AccountReceivable } from '../src/modules/receivables/entities/account-receivable.entity';
import { AccountReceivableMovement } from '../src/modules/receivables/entities/account-receivable-movement.entity';

describe('Customer returns domain and API (E2E)', () => {
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
      adminEmail: 'returns-admin@erp.com',
      adminPassword: 'AdminPassword123!',
      vendedorEmail: 'returns-seller@erp.com',
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
      .findOneByOrFail({ email: 'returns-seller@erp.com' });
    adminToken = (
      await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'returns-admin@erp.com',
        password: 'AdminPassword123!',
      })
    ).body.accessToken;
    sellerToken = (
      await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'returns-seller@erp.com',
        password: 'SellerPassword123!',
      })
    ).body.accessToken;
  });

  beforeEach(async () => {
    productSequence = 0;
    await ds.query(`
      TRUNCATE TABLE account_receivable_movements, account_receivables, fiscal_documents,
        quarantine_stocks, sale_return_items, sale_returns, sale_items, sales,
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
      description: 'Categoría para test de devoluciones',
    });
    const unit = await ds.getRepository(Unit).save({
      name: `Unidad ${id}`,
      symbol: `u${productSequence}`,
    });
    const product = await ds.getRepository(Product).save({
      internalCode: `PROD-${id}`,
      name: `Producto ${id}`,
      description: 'Producto para test de devoluciones',
      categoryId: category.id,
      baseUnitId: unit.id,
      activePriceNet,
      ivaPercentage,
      taxTreatment,
      status: ProductStatus.ACTIVE,
    });
    await stockService.recordMovement({
      productId: product.id,
      movementType: StockMovementType.AJUSTE_ENTRADA,
      quantityBase: stock,
      reason: 'Stock inicial para test de devoluciones',
      userId: seller.id,
    });
    return product;
  }

  async function createCustomer(
    taxCondition = TaxCondition.RESPONSABLE_INSCRIPTO,
  ): Promise<Customer> {
    return ds.getRepository(Customer).save({
      businessName: 'Cliente Test Devoluciones SA',
      documentType: CustomerDocumentType.CUIT,
      cuitOrDni: '30712345678',
      taxCondition,
      email: 'cliente@test.com',
      isActive: true,
    });
  }

  it('rejects unauthenticated requests with 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/sales/00000000-0000-4000-8000-000000000000/returns')
      .send({ reason: 'Sin auth', items: [] })
      .expect(401);
  });

  it('processes an APTO return: increments stock and creates credit note stub', async () => {
    const product = await createProduct('APTO1', 10);
    const customer = await createCustomer();

    // 1. Create sale of 5 units
    const saleRes = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        customerId: customer.id,
        isCreditSale: false,
        requiresFiscalInvoice: true,
        paymentMethod: PaymentMethod.EFECTIVO,
        items: [{ productId: product.id, quantityBase: 5 }],
      })
      .expect(201);

    const sale = saleRes.body;
    const saleItemId = sale.items[0].id;

    // Available stock should now be 5
    let stock = await ds
      .getRepository(Stock)
      .findOneByOrFail({ productId: product.id });
    expect(Number(stock.currentBaseStock)).toBe(5);

    // 2. Perform APTO return of 2 units
    const returnRes = await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.id}/returns`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        reason: 'Cliente devolvió 2 unidades en buen estado',
        items: [
          {
            saleItemId,
            quantityBase: 2,
            quality: SaleReturnItemQuality.APTO,
          },
        ],
      })
      .expect(201);

    expect(returnRes.body).toMatchObject({
      saleId: sale.id,
      reason: 'Cliente devolvió 2 unidades en buen estado',
      taxableNet: '200.00',
      totalNet: '200.00',
      ivaTotal: '42.00',
      totalGross: '242.00',
      fiscalDocument: expect.objectContaining({
        arcaStatus: ArcaStatus.PENDIENTE_FACTURACION,
      }),
    });
    expect(returnRes.body.items).toHaveLength(1);
    expect(returnRes.body.items[0]).toMatchObject({
      quantityBase: 2,
      quality: SaleReturnItemQuality.APTO,
      subtotalGross: '242.00',
    });

    // Available stock should be restored to 7 (5 + 2)
    stock = await ds
      .getRepository(Stock)
      .findOneByOrFail({ productId: product.id });
    expect(Number(stock.currentBaseStock)).toBe(7);

    // Stock movement DEVOLUCION_CLIENTE recorded
    const movement = await ds.getRepository(StockMovement).findOneBy({
      id: returnRes.body.items[0].stockMovementId,
    });
    expect(movement?.movementType).toBe(StockMovementType.DEVOLUCION_CLIENTE);
  });

  it('processes a NO_APTO return: enters quarantine without altering available stock', async () => {
    const product = await createProduct('NOAPTO1', 10);

    // Create sale of 4 units
    const saleRes = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        customerId: null,
        isCreditSale: false,
        requiresFiscalInvoice: false,
        paymentMethod: PaymentMethod.EFECTIVO,
        items: [{ productId: product.id, quantityBase: 4 }],
      })
      .expect(201);

    const sale = saleRes.body;
    const saleItemId = sale.items[0].id;

    // Available stock is 6
    let stock = await ds
      .getRepository(Stock)
      .findOneByOrFail({ productId: product.id });
    expect(Number(stock.currentBaseStock)).toBe(6);

    // Perform NO_APTO return of 3 units
    const returnRes = await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.id}/returns`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        reason: 'Productos rotos',
        items: [
          {
            saleItemId,
            quantityBase: 3,
            quality: SaleReturnItemQuality.NO_APTO,
            notes: 'Envases abiertos',
          },
        ],
      })
      .expect(201);

    // Available stock remains 6 (not incremented)
    stock = await ds
      .getRepository(Stock)
      .findOneByOrFail({ productId: product.id });
    expect(Number(stock.currentBaseStock)).toBe(6);

    // Quarantine record created
    const quarantine = await ds.getRepository(QuarantineStock).findOneBy({
      saleReturnItemId: returnRes.body.items[0].id,
    });
    expect(quarantine).not.toBeNull();
    expect(quarantine?.originType).toBe('DEVOLUCION_CLIENTE');
    expect(quarantine?.status).toBe(QuarantineStatus.EN_CUARENTENA);
    expect(quarantine?.entryMovementId).toBeNull();
  });

  it('processes mixed APTO and NO_APTO return in single transaction', async () => {
    const p1 = await createProduct('MIX1', 10, '100.00');
    const p2 = await createProduct('MIX2', 10, '50.00');

    const saleRes = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        customerId: null,
        isCreditSale: false,
        requiresFiscalInvoice: false,
        paymentMethod: PaymentMethod.EFECTIVO,
        items: [
          { productId: p1.id, quantityBase: 5 },
          { productId: p2.id, quantityBase: 4 },
        ],
      })
      .expect(201);

    const sale = saleRes.body;

    const returnRes = await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.id}/returns`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        reason: 'Devolución mixta',
        items: [
          {
            saleItemId: sale.items[0].id,
            quantityBase: 2,
            quality: SaleReturnItemQuality.APTO,
          },
          {
            saleItemId: sale.items[1].id,
            quantityBase: 2,
            quality: SaleReturnItemQuality.NO_APTO,
          },
        ],
      })
      .expect(201);

    expect(returnRes.body.items).toHaveLength(2);

    // p1 stock: 5 + 2 = 7
    const stockP1 = await ds
      .getRepository(Stock)
      .findOneByOrFail({ productId: p1.id });
    expect(Number(stockP1.currentBaseStock)).toBe(7);

    // p2 stock: remained 6 (not incremented because NO_APTO)
    const stockP2 = await ds
      .getRepository(Stock)
      .findOneByOrFail({ productId: p2.id });
    expect(Number(stockP2.currentBaseStock)).toBe(6);
  });

  it('enforces accumulated return limit on successive partial returns', async () => {
    const product = await createProduct('SUCC1', 10);

    const saleRes = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        customerId: null,
        isCreditSale: false,
        requiresFiscalInvoice: false,
        paymentMethod: PaymentMethod.EFECTIVO,
        items: [{ productId: product.id, quantityBase: 10 }],
      })
      .expect(201);

    const sale = saleRes.body;
    const saleItemId = sale.items[0].id;

    // First return: 4 units (remaining 6)
    await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.id}/returns`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        reason: 'Primera devolución',
        items: [
          { saleItemId, quantityBase: 4, quality: SaleReturnItemQuality.APTO },
        ],
      })
      .expect(201);

    // Second return: 6 units (remaining 0)
    await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.id}/returns`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        reason: 'Segunda devolución',
        items: [
          { saleItemId, quantityBase: 6, quality: SaleReturnItemQuality.APTO },
        ],
      })
      .expect(201);

    // Third return: 1 unit (fails with 409)
    const failRes = await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.id}/returns`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        reason: 'Tercera devolución excesiva',
        items: [
          { saleItemId, quantityBase: 1, quality: SaleReturnItemQuality.APTO },
        ],
      })
      .expect(409);

    expect(failRes.body.code).toBe('SALE_RETURN_EXCEEDS_ORIGINAL_QUANTITY');
  });

  it('handles credit sale compensation on receivables ledger', async () => {
    const product = await createProduct('CRED1', 10, '100.00');
    const customer = await createCustomer();

    // 1. Create credit sale of 2 units ($242 gross)
    const saleRes = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        customerId: customer.id,
        isCreditSale: true,
        requiresFiscalInvoice: true,
        paymentMethod: PaymentMethod.CTA_CTE,
        items: [{ productId: product.id, quantityBase: 2 }],
      })
      .expect(201);

    const sale = saleRes.body;
    let ar = await ds
      .getRepository(AccountReceivable)
      .findOneByOrFail({ saleId: sale.id });
    expect(Number(ar.currentBalance)).toBe(242.0);

    // 2. Return 1 unit ($121 gross)
    const ret1 = await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.id}/returns`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        reason: 'Devolución parcial crédito',
        items: [
          {
            saleItemId: sale.items[0].id,
            quantityBase: 1,
            quality: SaleReturnItemQuality.APTO,
          },
        ],
      })
      .expect(201);

    ar = await ds
      .getRepository(AccountReceivable)
      .findOneByOrFail({ saleId: sale.id });
    expect(Number(ar.currentBalance)).toBe(121.0);
    expect(ar.status).toBe('PARCIAL');

    const movements = await ds.getRepository(AccountReceivableMovement).findBy({
      accountReceivableId: ar.id,
    });
    expect(movements).toHaveLength(1);
    expect(Number(movements[0].amount)).toBe(121.0);
    expect(movements[0].saleReturnId).toBe(ret1.body.id);

    // 3. Return remaining 1 unit ($121 gross)
    await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.id}/returns`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        reason: 'Devolución final crédito',
        items: [
          {
            saleItemId: sale.items[0].id,
            quantityBase: 1,
            quality: SaleReturnItemQuality.APTO,
          },
        ],
      })
      .expect(201);

    ar = await ds
      .getRepository(AccountReceivable)
      .findOneByOrFail({ saleId: sale.id });
    expect(Number(ar.currentBalance)).toBe(0.0);
    expect(ar.status).toBe('CANCELADO');
  });

  it('lists return history via GET /api/v1/sales/:id/returns', async () => {
    const product = await createProduct('HIST1', 10);
    const saleRes = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        customerId: null,
        isCreditSale: false,
        requiresFiscalInvoice: false,
        paymentMethod: PaymentMethod.EFECTIVO,
        items: [{ productId: product.id, quantityBase: 5 }],
      })
      .expect(201);

    const sale = saleRes.body;

    // Create 2 returns
    await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.id}/returns`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        reason: 'Devolución 1',
        items: [
          {
            saleItemId: sale.items[0].id,
            quantityBase: 1,
            quality: SaleReturnItemQuality.APTO,
          },
        ],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/sales/${sale.id}/returns`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        reason: 'Devolución 2',
        items: [
          {
            saleItemId: sale.items[0].id,
            quantityBase: 2,
            quality: SaleReturnItemQuality.NO_APTO,
          },
        ],
      })
      .expect(201);

    const histRes = await request(app.getHttpServer())
      .get(`/api/v1/sales/${sale.id}/returns`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    expect(histRes.body).toHaveLength(2);
    expect(histRes.body[0].reason).toBe('Devolución 2');
    expect(histRes.body[1].reason).toBe('Devolución 1');
  });
});
