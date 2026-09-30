import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
  AccountReceivableMovementType,
  AccountReceivableStatus,
  CustomerDocumentType,
  PaymentAllocationType,
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
import { StockService } from '../src/modules/stock/stock.service';
import { Unit } from '../src/modules/units/entities/unit.entity';
import { User } from '../src/modules/users/entities/user.entity';

describe('Payments and receipts (E2E)', () => {
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
      adminEmail: 'pay-admin@erp.com',
      adminPassword: 'AdminPassword123!',
      vendedorEmail: 'pay-seller@erp.com',
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
      .findOneByOrFail({ email: 'pay-seller@erp.com' });
    adminToken = (
      await http().post('/api/v1/auth/login').send({
        email: 'pay-admin@erp.com',
        password: 'AdminPassword123!',
      })
    ).body.accessToken;
    sellerToken = (
      await http().post('/api/v1/auth/login').send({
        email: 'pay-seller@erp.com',
        password: 'SellerPassword123!',
      })
    ).body.accessToken;
  });

  beforeEach(async () => {
    await ds.query(`
      TRUNCATE TABLE receipts, payment_allocations, account_receivable_movements, payments, account_receivables, fiscal_documents,
        quarantine_stocks, sale_return_items, sale_returns, sale_items, sales,
        stock_movements, stocks, customer_special_prices, customers, products,
        categories, units, audit_logs RESTART IDENTITY CASCADE
    `);
    await ds.query('UPDATE receipt_counters SET last_number = 0');
    const category = await ds
      .getRepository(Category)
      .save({ name: 'Categoría pagos', description: 'Test' });
    const unit = await ds
      .getRepository(Unit)
      .save({ name: 'Unidad pagos', symbol: 'ul' });
    product = await ds.getRepository(Product).save({
      internalCode: 'PROD-PAGOS',
      name: 'Producto pagos',
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
      reason: 'Stock inicial para test de pagos',
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

  const post = (body: object, token = sellerToken) =>
    http()
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const account = async (customerId: string) =>
    (
      await get(`/api/v1/customers/${customerId}/account-receivable`).expect(
        200,
      )
    ).body;

  /** 3 facturas de $121, $242 y $363 (la más vieja primero). */
  async function seedThree(customerId: string) {
    return [
      await creditSale(customerId, 1),
      await creditSale(customerId, 2),
      await creditSale(customerId, 3),
    ];
  }

  const arIdOf = async (saleId: string): Promise<string> =>
    (
      await ds.query('SELECT id FROM account_receivables WHERE sale_id = $1', [
        saleId,
      ])
    )[0].id;

  describe('access control', () => {
    it('returns 401 without token', async () => {
      await http().post('/api/v1/payments').send({}).expect(401);
      await http()
        .get('/api/v1/receipts/00000000-0000-4000-8000-000000000000')
        .expect(401);
    });

    it('keeps GET /payments/status answering', async () => {
      await http().get('/api/v1/payments/status').expect(200);
    });

    it('lets ADMINISTRADOR register a payment too', async () => {
      const customer = await createCustomer('Cliente Admin', '30710000011');
      await creditSale(customer.id, 1);
      await post(
        {
          customerId: customer.id,
          paymentMethod: PaymentMethod.EFECTIVO,
          mode: PaymentAllocationType.GLOBAL_AGE,
          totalAmount: '10.00',
        },
        adminToken,
      ).expect(201);
    });

    it('returns 404 for an unknown customer and for an unknown receipt', async () => {
      await post({
        customerId: '00000000-0000-4000-8000-000000000000',
        paymentMethod: PaymentMethod.EFECTIVO,
        mode: PaymentAllocationType.GLOBAL_AGE,
        totalAmount: '10.00',
      }).expect(404);
      await get('/api/v1/receipts/00000000-0000-4000-8000-000000000000').expect(
        404,
      );
    });
  });

  describe('directed payment', () => {
    it('applies a partial and a full payment, writes PAGO movements and issues a receipt', async () => {
      const customer = await createCustomer('Cliente Dirigido', '30710000001');
      const [s1, s2] = await seedThree(customer.id);
      const [ar1, ar2] = [await arIdOf(s1.id), await arIdOf(s2.id)];

      const res = await post({
        customerId: customer.id,
        paymentMethod: PaymentMethod.EFECTIVO,
        mode: PaymentAllocationType.DIRECTED,
        allocations: [
          { accountReceivableId: ar1, amount: '121.00' },
          { accountReceivableId: ar2, amount: '100.00' },
        ],
      }).expect(201);

      expect(res.body.payment.totalAmount).toBe('221.00');
      expect(res.body.receipt).toMatchObject({
        receiptNumber: '0001-00000001',
        totalAmount: '221.00',
      });

      const ars = await ds.query(
        'SELECT id, current_balance::text AS b, status FROM account_receivables WHERE id = ANY($1) ORDER BY created_at',
        [[ar1, ar2]],
      );
      expect(ars).toEqual([
        { id: ar1, b: '0.00', status: AccountReceivableStatus.CANCELADO },
        { id: ar2, b: '142.00', status: AccountReceivableStatus.PARCIAL },
      ]);
      const pagos = await ds.query(
        `SELECT amount::text, previous_balance::text AS prev, subsequent_balance::text AS next, payment_id
         FROM account_receivable_movements WHERE movement_type = 'PAGO' ORDER BY amount DESC`,
      );
      expect(pagos).toEqual([
        {
          amount: '121.00',
          prev: '121.00',
          next: '0.00',
          payment_id: res.body.payment.id,
        },
        {
          amount: '100.00',
          prev: '242.00',
          next: '142.00',
          payment_id: res.body.payment.id,
        },
      ]);

      const body = await account(customer.id);
      expect(body.summary.totalBalance).toBe('505.00'); // 726 - 221
      expect(body.ledger.data.at(-1).movementType).toBe(
        AccountReceivableMovementType.PAGO,
      );
      expect(body.ledger.data.at(-1).runningBalance).toBe(
        body.summary.totalBalance,
      );
    });

    it('returns 409 when the amount exceeds the invoice balance and changes nothing', async () => {
      const customer = await createCustomer('Cliente Exceso', '30710000002');
      const [s1] = await seedThree(customer.id);
      await post({
        customerId: customer.id,
        paymentMethod: PaymentMethod.TRANSFERENCIA,
        mode: PaymentAllocationType.DIRECTED,
        allocations: [
          { accountReceivableId: await arIdOf(s1.id), amount: '121.01' },
        ],
      }).expect(409);
      expect((await account(customer.id)).summary.totalBalance).toBe('726.00');
      expect(await ds.query('SELECT 1 FROM payments')).toHaveLength(0);
      expect(await ds.query('SELECT 1 FROM receipts')).toHaveLength(0);
    });

    it('returns 400 for another customer invoice, CHEQUE and bad amounts', async () => {
      const a = await createCustomer('Cliente A', '30710000003');
      const b = await createCustomer('Cliente B', '30710000004');
      const [sa] = await seedThree(a.id);
      const arA = await arIdOf(sa.id);
      const base = {
        paymentMethod: PaymentMethod.EFECTIVO,
        mode: PaymentAllocationType.DIRECTED,
      };
      await post({
        ...base,
        customerId: b.id,
        allocations: [{ accountReceivableId: arA, amount: '10.00' }],
      }).expect(400);
      await post({
        ...base,
        customerId: a.id,
        paymentMethod: PaymentMethod.CHEQUE,
        allocations: [{ accountReceivableId: arA, amount: '10.00' }],
      }).expect(400);
      await post({
        ...base,
        customerId: a.id,
        allocations: [{ accountReceivableId: arA, amount: '10.001' }],
      }).expect(400);
      expect((await account(a.id)).summary.totalBalance).toBe('726.00');
    });
  });

  describe('payment by age', () => {
    it('cancels the oldest invoices first and numbers receipts consecutively', async () => {
      const customer = await createCustomer('Cliente Cascada', '30710000005');
      await seedThree(customer.id); // 121, 242, 363

      const first = await post({
        customerId: customer.id,
        paymentMethod: PaymentMethod.EFECTIVO,
        mode: PaymentAllocationType.GLOBAL_AGE,
        totalAmount: '200.00',
      }).expect(201);
      const second = await post({
        customerId: customer.id,
        paymentMethod: PaymentMethod.TRANSFERENCIA,
        mode: PaymentAllocationType.GLOBAL_AGE,
        totalAmount: '100.00',
      }).expect(201);
      expect(first.body.receipt.receiptNumber).toBe('0001-00000001');
      expect(second.body.receipt.receiptNumber).toBe('0001-00000002');

      const rows = await ds.query(
        'SELECT current_balance::text AS b, status FROM account_receivables ORDER BY created_at',
      );
      // 200 → 121 cancela la 1ª y 79 a la 2ª; 100 → 100 a la 2ª (saldo 63).
      expect(rows).toEqual([
        { b: '0.00', status: AccountReceivableStatus.CANCELADO },
        { b: '63.00', status: AccountReceivableStatus.PARCIAL },
        { b: '363.00', status: AccountReceivableStatus.PENDIENTE },
      ]);
    });

    it('returns 409 when paying more than the customer owes', async () => {
      const customer = await createCustomer('Cliente Deuda', '30710000006');
      await seedThree(customer.id);
      await post({
        customerId: customer.id,
        paymentMethod: PaymentMethod.EFECTIVO,
        mode: PaymentAllocationType.GLOBAL_AGE,
        totalAmount: '726.01',
      }).expect(409);
      expect((await account(customer.id)).summary.totalBalance).toBe('726.00');
    });

    it('lets exactly one of two concurrent payments win when the balance covers only one', async () => {
      const customer = await createCustomer('Cliente Carrera', '30710000007');
      const sale = await creditSale(customer.id, 1); // $121.00
      const arId = await arIdOf(sale.id);
      const attempt = () =>
        post({
          customerId: customer.id,
          paymentMethod: PaymentMethod.EFECTIVO,
          mode: PaymentAllocationType.DIRECTED,
          allocations: [{ accountReceivableId: arId, amount: '100.00' }],
        });

      const results = await Promise.all([attempt(), attempt()]);
      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      const [{ b }] = await ds.query(
        'SELECT current_balance::text AS b FROM account_receivables WHERE id = $1',
        [arId],
      );
      expect(b).toBe('21.00');
    });
  });

  describe('ledger invariant', () => {
    it('keeps customer balance and every account equal to the signed sum of movements after mixed payments', async () => {
      const customer = await createCustomer(
        'Cliente Invariante',
        '30710000010',
      );
      const [s1] = await seedThree(customer.id);
      await post({
        customerId: customer.id,
        paymentMethod: PaymentMethod.EFECTIVO,
        mode: PaymentAllocationType.DIRECTED,
        allocations: [
          { accountReceivableId: await arIdOf(s1.id), amount: '50.50' },
        ],
      }).expect(201);
      await post({
        customerId: customer.id,
        paymentMethod: PaymentMethod.TRANSFERENCIA,
        mode: PaymentAllocationType.GLOBAL_AGE,
        totalAmount: '300.00',
      }).expect(201);

      const rows = await ds.query(`
        SELECT ar.current_balance::text AS balance,
               COALESCE(SUM(CASE WHEN m.movement_type IN ('FACTURA','REVERSION_CHEQUE')
                                 THEN m.amount ELSE -m.amount END), 0)::numeric(14,2)::text AS ledger
        FROM account_receivables ar
        LEFT JOIN account_receivable_movements m ON m.account_receivable_id = ar.id
        GROUP BY ar.id`);
      expect(rows).toHaveLength(3);
      for (const row of rows) expect(row.balance).toBe(row.ledger);

      const { body } = await get(
        `/api/v1/customers/${customer.id}/account-receivable`,
      ).expect(200);
      expect(body.summary.totalBalance).toBe('375.50'); // 726 - 50.50 - 300
      expect(body.ledger.data.at(-1).runningBalance).toBe('375.50');
    });
  });

  describe('receipt', () => {
    it('returns the receipt with applied invoices', async () => {
      const customer = await createCustomer('Cliente Recibo', '30710000008');
      const [s1, s2] = await seedThree(customer.id);
      const paid = await post({
        customerId: customer.id,
        paymentMethod: PaymentMethod.EFECTIVO,
        mode: PaymentAllocationType.DIRECTED,
        allocations: [
          { accountReceivableId: await arIdOf(s1.id), amount: '121.00' },
          { accountReceivableId: await arIdOf(s2.id), amount: '100.00' },
        ],
      }).expect(201);

      const { body } = await get(
        `/api/v1/receipts/${paid.body.receipt.id}`,
      ).expect(200);
      expect(body).toMatchObject({
        receiptNumber: '0001-00000001',
        customerName: 'Cliente Recibo',
        paymentMethod: PaymentMethod.EFECTIVO,
        totalAmount: '221.00',
      });
      expect(body.applied.map((a) => a.amountApplied)).toEqual([
        '121.00',
        '100.00',
      ]);
      expect(body.applied.map((a) => a.originalAmount)).toEqual([
        '121.00',
        '242.00',
      ]);
    });

    it('downloads the receipt as a PDF', async () => {
      const customer = await createCustomer('Cliente PDF', '30710000009');
      const [s1] = await seedThree(customer.id);
      const paid = await post({
        customerId: customer.id,
        paymentMethod: PaymentMethod.EFECTIVO,
        mode: PaymentAllocationType.DIRECTED,
        allocations: [
          { accountReceivableId: await arIdOf(s1.id), amount: '121.00' },
        ],
      }).expect(201);

      const res = await http()
        .get(`/api/v1/receipts/${paid.body.receipt.id}/pdf`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .buffer(true)
        .parse((response, cb) => {
          const chunks: Buffer[] = [];
          response.on('data', (c: Buffer) => chunks.push(c));
          response.on('end', () => cb(null, Buffer.concat(chunks)));
        })
        .expect(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toContain(
        'recibo-0001-00000001.pdf',
      );
      expect((res.body as Buffer).subarray(0, 4).toString()).toBe('%PDF');
    });

    it('returns 404 and 401 on the PDF endpoint', async () => {
      const id = '00000000-0000-4000-8000-000000000000';
      await get(`/api/v1/receipts/${id}/pdf`).expect(404);
      await http().get(`/api/v1/receipts/${id}/pdf`).expect(401);
    });
  });
});
