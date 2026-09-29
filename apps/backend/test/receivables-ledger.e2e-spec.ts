import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
  AccountReceivableMovementType,
  CustomerDocumentType,
  DebtorStatus,
  PaymentMethod,
  ProductStatus,
  ProductTaxTreatment,
  SaleReturnItemQuality,
  StockMovementType,
  TaxCondition,
} from '@erp/shared-types';
import { AppModule } from '../src/app.module';
import { BackfillReceivableInvoiceMovements1700000000029 } from '../src/database/migrations/1700000000029-BackfillReceivableInvoiceMovements';
import dataSource from '../src/database/data-source';
import { runInitialSeed } from '../src/database/seeds/initial.seed';
import { Category } from '../src/modules/categories/entities/category.entity';
import { Customer } from '../src/modules/customers/entities/customer.entity';
import { Product } from '../src/modules/products/entities/product.entity';
import { StockService } from '../src/modules/stock/stock.service';
import { Unit } from '../src/modules/units/entities/unit.entity';
import { User } from '../src/modules/users/entities/user.entity';

describe('Receivables ledger (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let adminToken: string;
  let sellerToken: string;
  let seller: User;
  let product: Product;

  const http = () => request(app.getHttpServer());
  const get = (url: string, token = sellerToken) =>
    http().get(url).set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    ds = await dataSource.initialize();
    await ds.runMigrations();
    await runInitialSeed(ds, {
      adminEmail: 'ledger-admin@erp.com',
      adminPassword: 'AdminPassword123!',
      vendedorEmail: 'ledger-seller@erp.com',
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
    seller = await ds
      .getRepository(User)
      .findOneByOrFail({ email: 'ledger-seller@erp.com' });
    adminToken = (
      await http().post('/api/v1/auth/login').send({
        email: 'ledger-admin@erp.com',
        password: 'AdminPassword123!',
      })
    ).body.accessToken;
    sellerToken = (
      await http().post('/api/v1/auth/login').send({
        email: 'ledger-seller@erp.com',
        password: 'SellerPassword123!',
      })
    ).body.accessToken;
  });

  beforeEach(async () => {
    await ds.query(`
      TRUNCATE TABLE account_receivable_movements, account_receivables, fiscal_documents,
        quarantine_stocks, sale_return_items, sale_returns, sale_items, sales,
        stock_movements, stocks, customer_special_prices, customers, products,
        categories, units, audit_logs RESTART IDENTITY CASCADE
    `);
    const category = await ds
      .getRepository(Category)
      .save({ name: 'Categoría ledger', description: 'Test' });
    const unit = await ds
      .getRepository(Unit)
      .save({ name: 'Unidad ledger', symbol: 'ul' });
    product = await ds.getRepository(Product).save({
      internalCode: 'PROD-LEDGER',
      name: 'Producto ledger',
      description: 'Test',
      categoryId: category.id,
      baseUnitId: unit.id,
      activePriceNet: '100.00',
      ivaPercentage: '21.00',
      taxTreatment: ProductTaxTreatment.GRAVADO,
      status: ProductStatus.ACTIVE,
    });
    await app.get(StockService).recordMovement({
      productId: product.id,
      movementType: StockMovementType.AJUSTE_ENTRADA,
      quantityBase: 100,
      reason: 'Stock inicial para test de ledger',
      userId: seller.id,
    });
  });

  afterAll(async () => {
    if (app) await app.close();
    if (ds?.isInitialized) {
      await runInitialSeed(ds);
      await ds.destroy();
    }
  });

  const createCustomer = (name: string, cuit: string, creditLimit = '0.00') =>
    ds.getRepository(Customer).save({
      businessName: name,
      documentType: CustomerDocumentType.CUIT,
      cuitOrDni: cuit,
      taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
      creditLimit,
      isActive: true,
    });

  /** Venta a crédito de `units` unidades: $121.00 bruto por unidad. */
  async function creditSale(customerId: string, units: number) {
    const res = await http()
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        customerId,
        isCreditSale: true,
        requiresFiscalInvoice: true,
        paymentMethod: PaymentMethod.CTA_CTE,
        items: [{ productId: product.id, quantityBase: units }],
      })
      .expect(201);
    return res.body;
  }

  /** Nota de crédito por 1 unidad ($121.00). */
  async function returnOneUnit(sale: { id: string; items: { id: string }[] }) {
    await http()
      .post(`/api/v1/sales/${sale.id}/returns`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        reason: 'Devolución de una unidad',
        items: [
          {
            saleItemId: sale.items[0].id,
            quantityBase: 1,
            quality: SaleReturnItemQuality.APTO,
          },
        ],
      })
      .expect(201);
  }

  /** 3 facturas ($121, $242, $363) y 2 notas de crédito ($121 c/u). */
  async function seedFiveMovements(customerId: string) {
    const s1 = await creditSale(customerId, 1);
    const s2 = await creditSale(customerId, 2);
    const s3 = await creditSale(customerId, 3);
    await returnOneUnit(s2);
    await returnOneUnit(s3);
    return [s1, s2, s3];
  }

  describe('access control', () => {
    it('returns 401 without token on every new endpoint', async () => {
      const id = '00000000-0000-4000-8000-000000000000';
      await http().get('/api/v1/receivables').expect(401);
      await http()
        .get(`/api/v1/customers/${id}/account-receivable`)
        .expect(401);
    });

    it('keeps GET /receivables/status answering as before', async () => {
      await http().get('/api/v1/receivables/status').expect(200);
    });

    it('lets VENDEDOR and ADMINISTRADOR read the account', async () => {
      const customer = await createCustomer('Cliente Roles', '30700000001');
      await get(`/api/v1/customers/${customer.id}/account-receivable`).expect(
        200,
      );
      await get(
        `/api/v1/customers/${customer.id}/account-receivable`,
        adminToken,
      ).expect(200);
    });

    it('returns 404 for an unknown customer', async () => {
      await get(
        '/api/v1/customers/00000000-0000-4000-8000-000000000000/account-receivable',
      ).expect(404);
    });
  });

  describe('ledger and summary', () => {
    it('writes a FACTURA movement per credit sale and returns 5 movements with running balance', async () => {
      const customer = await createCustomer('Cliente Ledger', '30700000002');
      await seedFiveMovements(customer.id);

      const res = await get(
        `/api/v1/customers/${customer.id}/account-receivable`,
      ).expect(200);

      const { summary, ledger, pendingInvoices } = res.body;
      expect(ledger.data.map((e) => e.movementType)).toEqual([
        AccountReceivableMovementType.FACTURA,
        AccountReceivableMovementType.FACTURA,
        AccountReceivableMovementType.FACTURA,
        AccountReceivableMovementType.NOTA_CREDITO,
        AccountReceivableMovementType.NOTA_CREDITO,
      ]);
      expect(ledger.data.map((e) => e.signedAmount)).toEqual([
        '121.00',
        '242.00',
        '363.00',
        '-121.00',
        '-121.00',
      ]);
      expect(ledger.data.map((e) => e.runningBalance)).toEqual([
        '121.00',
        '363.00',
        '726.00',
        '605.00',
        '484.00',
      ]);
      expect(summary).toMatchObject({
        totalBalance: '484.00',
        pendingCount: 1,
        partialCount: 2,
        exceedsCreditLimit: false,
      });
      expect(pendingInvoices).toHaveLength(3);
      // El último saldo corrido coincide con el saldo total.
      expect(ledger.data.at(-1).runningBalance).toBe(summary.totalBalance);
    });

    it('sums three credit sales into the customer balance', async () => {
      const customer = await createCustomer('Cliente Tres', '30700000003');
      await creditSale(customer.id, 1);
      await creditSale(customer.id, 2);
      await creditSale(customer.id, 3);

      const { body } = await get(
        `/api/v1/customers/${customer.id}/account-receivable`,
      ).expect(200);
      expect(body.summary.totalBalance).toBe('726.00');
      expect(body.summary.pendingCount).toBe(3);
    });

    it('keeps the running balance across pages', async () => {
      const customer = await createCustomer('Cliente Paginas', '30700000004');
      await seedFiveMovements(customer.id);

      const { body } = await get(
        `/api/v1/customers/${customer.id}/account-receivable?page=2&limit=2`,
      ).expect(200);
      expect(body.ledger.data.map((e) => e.runningBalance)).toEqual([
        '726.00',
        '605.00',
      ]);
      expect(body.ledger.meta).toEqual({
        page: 2,
        limit: 2,
        total: 5,
        totalPages: 3,
      });
    });

    it('returns zeros for a customer without accounts', async () => {
      const customer = await createCustomer('Cliente Vacio', '30700000005');
      const { body } = await get(
        `/api/v1/customers/${customer.id}/account-receivable`,
      ).expect(200);
      expect(body.summary.totalBalance).toBe('0.00');
      expect(body.ledger.data).toEqual([]);
      expect(body.pendingInvoices).toEqual([]);
    });

    it('keeps every account balance equal to the signed sum of its movements', async () => {
      const customer = await createCustomer(
        'Cliente Invariante',
        '30700000006',
      );
      await seedFiveMovements(customer.id);

      const rows = await ds.query(`
        SELECT ar.current_balance::text AS balance,
               COALESCE(SUM(CASE WHEN m.movement_type IN ('FACTURA','REVERSION_CHEQUE')
                                 THEN m.amount ELSE -m.amount END), 0)::numeric(14,2)::text AS ledger
        FROM account_receivables ar
        LEFT JOIN account_receivable_movements m ON m.account_receivable_id = ar.id
        GROUP BY ar.id`);
      expect(rows).toHaveLength(3);
      for (const row of rows) expect(row.balance).toBe(row.ledger);
    });

    it('buckets balances by age using the invoice creation date', async () => {
      const customer = await createCustomer('Cliente Aging', '30700000007');
      const [s1, s2, s3] = await seedFiveMovements(customer.id);
      const age = (saleId: string, days: number) =>
        ds.query(
          `UPDATE account_receivables SET created_at = now() - ($2 || ' days')::interval WHERE sale_id = $1`,
          [saleId, days],
        );
      await age(s1.id, 10);
      await age(s2.id, 45);
      await age(s3.id, 70);

      const { body } = await get(
        `/api/v1/customers/${customer.id}/account-receivable`,
      ).expect(200);
      // s1 121.00 · s2 242-121 = 121.00 · s3 363-121 = 242.00
      expect(body.summary.aging).toEqual({
        days0to30: '121.00',
        days31to60: '121.00',
        days61plus: '242.00',
      });
    });

    it('excludes CANCELADO accounts from counts and balance', async () => {
      const customer = await createCustomer('Cliente Cancelado', '30700000008');
      const sale = await creditSale(customer.id, 1);
      await returnOneUnit(sale); // NC por el total: la cuenta queda CANCELADO

      const { body } = await get(
        `/api/v1/customers/${customer.id}/account-receivable`,
      ).expect(200);
      expect(body.summary).toMatchObject({
        totalBalance: '0.00',
        pendingCount: 0,
        partialCount: 0,
      });
      expect(body.pendingInvoices).toEqual([]);
      expect(body.ledger.data).toHaveLength(2);
    });

    it('flags credit limit exceeded only when a limit is set', async () => {
      const limited = await createCustomer(
        'Con Limite',
        '30700000009',
        '100.00',
      );
      const unlimited = await createCustomer(
        'Sin Limite',
        '30700000010',
        '0.00',
      );
      await creditSale(limited.id, 1);
      await creditSale(unlimited.id, 1);

      const a = await get(`/api/v1/customers/${limited.id}/account-receivable`);
      const b = await get(
        `/api/v1/customers/${unlimited.id}/account-receivable`,
      );
      expect(a.body.summary.exceedsCreditLimit).toBe(true);
      expect(b.body.summary.exceedsCreditLimit).toBe(false);
    });
  });

  describe('FACTURA backfill migration', () => {
    const facturaCount = async () =>
      Number(
        (
          await ds.query(
            `SELECT count(*) AS n FROM account_receivable_movements WHERE movement_type = 'FACTURA'`,
          )
        )[0].n,
      );

    it('restores missing FACTURA movements and does not duplicate on re-run', async () => {
      const customer = await createCustomer('Cliente Backfill', '30700000013');
      await seedFiveMovements(customer.id);
      const before = (
        await get(`/api/v1/customers/${customer.id}/account-receivable`)
      ).body.ledger.data.map((e) => [e.movementType, e.runningBalance]);

      // Estado previo a este cambio: sin FACTURA ni índice.
      const migration = new BackfillReceivableInvoiceMovements1700000000029();
      const runner = ds.createQueryRunner();
      try {
        await migration.down(runner);
        expect(await facturaCount()).toBe(0);

        await migration.up(runner);
        expect(await facturaCount()).toBe(3);
        const [row] = await ds.query(`
          SELECT m.amount::text AS amount, m.previous_balance::text AS previous,
                 m.subsequent_balance::text AS subsequent, m.user_id, s.user_id AS sale_user
          FROM account_receivable_movements m
          JOIN account_receivables ar ON ar.id = m.account_receivable_id
          JOIN sales s ON s.id = ar.sale_id
          ORDER BY ar.original_amount LIMIT 1`);
        expect(row).toMatchObject({
          amount: '121.00',
          previous: '0.00',
          subsequent: '121.00',
        });
        expect(row.user_id).toBe(row.sale_user);

        // Segunda corrida: sin el índice, un INSERT no idempotente duplicaría.
        await ds.query(`DROP INDEX "UQ_arm_factura_per_ar"`);
        await migration.up(runner);
        expect(await facturaCount()).toBe(3);
      } finally {
        await runner.release();
      }

      const after = (
        await get(`/api/v1/customers/${customer.id}/account-receivable`)
      ).body.ledger.data.map((e) => [e.movementType, e.runningBalance]);
      expect(after).toEqual(before);
    });

    it('rejects a second FACTURA for the same account', async () => {
      const customer = await createCustomer('Cliente Unico', '30700000014');
      await creditSale(customer.id, 1);
      await expect(
        ds.query(`
          INSERT INTO account_receivable_movements
            (account_receivable_id, movement_type, amount, previous_balance, subsequent_balance, user_id)
          SELECT id, 'FACTURA', 1, 0, 1, '${seller.id}' FROM account_receivables`),
      ).rejects.toThrow(/UQ_arm_factura_per_ar/);
    });
  });

  describe('account statement PDF', () => {
    const pdf = (customerId: string, token = sellerToken) =>
      http()
        .get(`/api/v1/customers/${customerId}/account-receivable/pdf`)
        .set('Authorization', `Bearer ${token}`)
        .buffer(true)
        .parse((res, done) => {
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('end', () => done(null, Buffer.concat(chunks)));
        });

    it('downloads a PDF with the customer ledger', async () => {
      const customer = await createCustomer('Cliente Pdf', '30700000011');
      await seedFiveMovements(customer.id);

      const res = await pdf(customer.id).expect(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toContain(
        'resumen-cuenta-30700000011-',
      );
      expect(res.body.subarray(0, 4).toString()).toBe('%PDF');
    });

    it('renders a PDF for a customer without movements', async () => {
      const customer = await createCustomer('Cliente Pdf Vacio', '30700000012');
      const res = await pdf(customer.id).expect(200);
      expect(res.body.subarray(0, 4).toString()).toBe('%PDF');
    });

    it('returns 404 for an unknown customer and 401 without token', async () => {
      const id = '00000000-0000-4000-8000-000000000000';
      await pdf(id).expect(404);
      await http()
        .get(`/api/v1/customers/${id}/account-receivable/pdf`)
        .expect(401);
    });
  });

  describe('debtors overview', () => {
    async function seedDebtors() {
      const late = await createCustomer('Moroso SA', '30711111111');
      const fresh = await createCustomer('Al Dia SRL', '30722222222');
      const paid = await createCustomer('Saldado SA', '30733333333');
      const lateSale = await creditSale(late.id, 3);
      await creditSale(fresh.id, 1);
      const paidSale = await creditSale(paid.id, 1);
      await returnOneUnit(paidSale);
      await ds.query(
        `UPDATE account_receivables SET created_at = now() - interval '45 days' WHERE sale_id = $1`,
        [lateSale.id],
      );
    }

    it('lists one row per customer with debt, ordered by balance, without paid-off customers', async () => {
      await seedDebtors();
      const { body } = await get('/api/v1/receivables').expect(200);
      expect(body.data.map((r) => r.customerName)).toEqual([
        'Moroso SA',
        'Al Dia SRL',
      ]);
      expect(body.data[0]).toMatchObject({
        totalBalance: '363.00',
        pendingCount: 1,
        status: DebtorStatus.MOROSO,
        aging: { days0to30: '0.00', days31to60: '363.00', days61plus: '0.00' },
      });
      expect(body.data[1].status).toBe(DebtorStatus.AL_DIA);
      expect(body.meta.total).toBe(2);
    });

    it('filters by status and keeps the pagination total in sync', async () => {
      await seedDebtors();
      const { body } = await get('/api/v1/receivables?status=MOROSO').expect(
        200,
      );
      expect(body.data.map((r) => r.customerName)).toEqual(['Moroso SA']);
      expect(body.meta.total).toBe(1);
    });

    it('filters by partial name or document', async () => {
      await seedDebtors();
      const byName = await get('/api/v1/receivables?search=dia').expect(200);
      expect(byName.body.data.map((r) => r.customerName)).toEqual([
        'Al Dia SRL',
      ]);
      const byDoc = await get('/api/v1/receivables?search=3071111').expect(200);
      expect(byDoc.body.data.map((r) => r.customerName)).toEqual(['Moroso SA']);
    });

    it('treats LIKE wildcards in search as literal text', async () => {
      await seedDebtors();
      const { body } = await get('/api/v1/receivables?search=%25').expect(200);
      expect(body.data).toEqual([]);
    });
  });
});
