import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { PaymentMethod } from '@erp/shared-types';
import { AppModule } from '../src/app.module';
import dataSource from '../src/database/data-source';
import { runInitialSeed } from '../src/database/seeds/initial.seed';
import { runVolumeSeed } from '../src/database/seeds/volume.seed';
import { User } from '../src/modules/users/entities/user.entity';

/**
 * Umbrales documentados en docs/qa-regression.md. Son techos de regresión, no
 * objetivos: THRESHOLD_FACTOR los escala en runners más lentos (default 1).
 */
const FACTOR = Number(process.env.THRESHOLD_FACTOR) || 1;
const RUNS = 5;
const VOLUME = { products: 5000, customers: 2000, sales: 5000 };

describe('Critical endpoint timings with seeded volume', () => {
  let app: INestApplication;
  let ds: DataSource;
  let token: string;
  let seededProductId: string;

  const median = (xs: number[]) =>
    [...xs].sort((a, b) => a - b)[xs.length >> 1];

  async function measure(call: () => request.Test): Promise<number> {
    const times: number[] = [];
    for (let i = 0; i < RUNS; i++) {
      const start = process.hrtime.bigint();
      await call().expect(200);
      times.push(Number(process.hrtime.bigint() - start) / 1e6);
    }
    return median(times);
  }

  const get = (url: string) =>
    request(app.getHttpServer())
      .get(url)
      .set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    ds = await dataSource.initialize();
    await ds.runMigrations();
    await ds.query(`
      TRUNCATE TABLE receipts, payment_allocations, account_receivable_movements, payments,
        account_receivables, fiscal_documents, quarantine_stocks, sale_return_items,
        sale_returns, sale_items, sales, stock_movements, stocks,
        customer_special_prices, customers, products, categories, units,
        audit_logs RESTART IDENTITY CASCADE
    `);
    await runInitialSeed(ds, {
      adminEmail: 'volume-admin@erp.com',
      adminPassword: 'AdminPassword123!',
      vendedorEmail: 'volume-seller@erp.com',
      vendedorPassword: 'SellerPassword123!',
    });
    const admin = await ds
      .getRepository(User)
      .findOneByOrFail({ email: 'volume-admin@erp.com' });
    const result = await runVolumeSeed(ds, { ...VOLUME, userId: admin.id });
    expect(result).toEqual(VOLUME);
    // Re-sembrar es idempotente: no duplica ni rompe unicidad.
    expect(await runVolumeSeed(ds, { ...VOLUME, userId: admin.id })).toEqual(
      VOLUME,
    );

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
    token = (
      await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'volume-admin@erp.com',
        password: 'AdminPassword123!',
      })
    ).body.accessToken;
    seededProductId = (
      await ds.query(
        `SELECT id FROM products WHERE internal_code = 'VOL-P-004999'`,
      )
    )[0].id;
  });

  afterAll(async () => {
    if (app) await app.close();
    if (ds?.isInitialized) {
      await ds.query(`
        TRUNCATE TABLE fiscal_documents, sale_items, sales, stock_movements, stocks,
          customers, products, categories, units, audit_logs RESTART IDENTITY CASCADE
      `);
      await runInitialSeed(ds);
      await ds.destroy();
    }
  });

  const cases: Array<[string, number, () => request.Test]> = [
    [
      'GET /products (page of 100)',
      500,
      () => get('/api/v1/products?limit=100&page=20'),
    ],
    [
      'GET /products?search=',
      500,
      () => get('/api/v1/products?search=volumen%204999'),
    ],
    [
      'GET /products/search (POS typeahead)',
      300,
      () => get('/api/v1/products/search?q=VOL-P-0049&limit=20'),
    ],
    ['GET /customers', 500, () => get('/api/v1/customers?limit=50')],
    ['GET /sales (page)', 500, () => get('/api/v1/sales?page=10&limit=50')],
    ['GET /reports/sales', 3000, () => get('/api/v1/reports/sales')],
    [
      'GET /reports/stock-valuation',
      3000,
      () => get('/api/v1/reports/stock-valuation'),
    ],
    [
      'GET /reports/profitability',
      3000,
      () => get('/api/v1/reports/profitability'),
    ],
    [
      'GET /reports/receivables-aging',
      3000,
      () => get('/api/v1/reports/receivables-aging'),
    ],
  ];

  it.each(cases)(
    '%s stays under %ims (median of 5)',
    async (_n, limit, call) => {
      const ms = await measure(call);
      console.log(
        `[TIMING] ${_n}: ${ms.toFixed(0)}ms (limit ${limit * FACTOR}ms)`,
      );
      expect(ms).toBeLessThan(limit * FACTOR);
    },
  );

  it('reports actually aggregate the seeded volume (timings are not on empty data)', async () => {
    const sales = await get('/api/v1/reports/sales').expect(200);
    expect(sales.body.rows.length).toBeGreaterThanOrEqual(VOLUME.sales);
    const valuation = await get('/api/v1/reports/stock-valuation').expect(200);
    expect(valuation.body.rows.length).toBeGreaterThanOrEqual(VOLUME.products);
  });

  it('POST /sales (POS) stays under 500ms and keeps stock consistent', async () => {
    const times: number[] = [];
    for (let i = 0; i < RUNS; i++) {
      const start = process.hrtime.bigint();
      await request(app.getHttpServer())
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${token}`)
        .send({
          customerId: null,
          isCreditSale: false,
          requiresFiscalInvoice: false,
          paymentMethod: PaymentMethod.EFECTIVO,
          items: [{ productId: seededProductId, quantityBase: 1 }],
        })
        .expect(201);
      times.push(Number(process.hrtime.bigint() - start) / 1e6);
    }
    const ms = median(times);
    console.log(
      `[TIMING] POST /sales: ${ms.toFixed(0)}ms (limit ${500 * FACTOR}ms)`,
    );
    expect(ms).toBeLessThan(500 * FACTOR);
    const [{ s }] = await ds.query(
      `SELECT current_base_stock::int AS s FROM stocks WHERE product_id = $1`,
      [seededProductId],
    );
    expect(s).toBe(1000 - RUNS);
  });
});
