import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
  AccountReceivableMovementType,
  AccountReceivableStatus,
  CheckStatus,
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
import { Supplier } from '../src/modules/suppliers/entities/supplier.entity';
import { Product } from '../src/modules/products/entities/product.entity';
import { StockService } from '../src/modules/stock/stock.service';
import { Unit } from '../src/modules/units/entities/unit.entity';
import { User } from '../src/modules/users/entities/user.entity';

describe('Check lifecycle and rejection (E2E)', () => {
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
      adminEmail: 'chk-admin@erp.com',
      adminPassword: 'AdminPassword123!',
      vendedorEmail: 'chk-seller@erp.com',
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
      .findOneByOrFail({ email: 'chk-seller@erp.com' });
    adminToken = (
      await http().post('/api/v1/auth/login').send({
        email: 'chk-admin@erp.com',
        password: 'AdminPassword123!',
      })
    ).body.accessToken;
    sellerToken = (
      await http().post('/api/v1/auth/login').send({
        email: 'chk-seller@erp.com',
        password: 'SellerPassword123!',
      })
    ).body.accessToken;
  });

  beforeEach(async () => {
    await ds.query(`
      TRUNCATE TABLE checks, receipts, payment_allocations, account_receivable_movements, payments, account_receivables, fiscal_documents,
        quarantine_stocks, sale_return_items, sale_returns, sale_items, sales,
        stock_movements, stocks, customer_special_prices, customers, products,
        categories, units, suppliers, audit_logs RESTART IDENTITY CASCADE
    `);
    await ds.query('UPDATE receipt_counters SET last_number = 0');
    const category = await ds
      .getRepository(Category)
      .save({ name: 'Categoría cheques', description: 'Test' });
    const unit = await ds
      .getRepository(Unit)
      .save({ name: 'Unidad cheques', symbol: 'ul' });
    product = await ds.getRepository(Product).save({
      internalCode: 'PROD-CHEQUES',
      name: 'Producto cheques',
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
      reason: 'Stock inicial para test de cheques',
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

  const addDays = (days: number) =>
    new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

  const patch = (path: string, body: object = {}, token = adminToken) =>
    http()
      .patch(`/api/v1/checks/${path}`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  const adminGet = (path: string) =>
    http().get(path).set('Authorization', `Bearer ${adminToken}`);

  /** Cobro con cheque por antigüedad; devuelve el cheque creado. */
  async function chequePayment(
    customerId: string,
    totalAmount: string,
    checkNumber: string,
    dueInDays = 30,
    mode: object = {
      mode: PaymentAllocationType.GLOBAL_AGE,
      totalAmount,
    },
  ) {
    const res = await post({
      customerId,
      paymentMethod: PaymentMethod.CHEQUE,
      check: {
        bankName: 'Galicia',
        checkNumber,
        drawerName: 'Juan Paz',
        dueDate: addDays(dueInDays),
      },
      ...mode,
    }).expect(201);
    const [check] = await ds.query(
      'SELECT id, status, amount::text AS amount FROM checks WHERE payment_id = $1',
      [res.body.payment.id],
    );
    return { payment: res.body.payment, receipt: res.body.receipt, check };
  }

  const balanceOf = async (saleId: string) =>
    (
      await ds.query(
        'SELECT current_balance::text AS balance, status FROM account_receivables WHERE sale_id = $1',
        [saleId],
      )
    )[0];

  describe('cobro con cheque', () => {
    it('creates a RECIBIDO check with the applied total and the receipt', async () => {
      const customer = await createCustomer('Cliente Cheque', '30710000101');
      await seedThree(customer.id);
      const { receipt, check } = await chequePayment(
        customer.id,
        '200.00',
        '1001',
      );
      expect(receipt.receiptNumber).toBe('0001-00000001');
      expect(check).toMatchObject({
        status: CheckStatus.RECIBIDO,
        amount: '200.00',
      });
    });

    it('answers 400 without check data and 409 for a duplicated bank + number, changing nothing', async () => {
      const customer = await createCustomer('Cliente Dup', '30710000102');
      await seedThree(customer.id);
      await post({
        customerId: customer.id,
        paymentMethod: PaymentMethod.CHEQUE,
        mode: PaymentAllocationType.GLOBAL_AGE,
        totalAmount: '10.00',
      }).expect(400);
      await chequePayment(customer.id, '100.00', '2002');
      const dup = await post({
        customerId: customer.id,
        paymentMethod: PaymentMethod.CHEQUE,
        check: {
          bankName: 'Galicia',
          checkNumber: '2002',
          drawerName: 'Otro',
          dueDate: addDays(10),
        },
        mode: PaymentAllocationType.GLOBAL_AGE,
        totalAmount: '50.00',
      }).expect(409);
      expect(dup.body.code ?? dup.body.message?.code).toBe('CHECK_DUPLICATE');
      expect(await ds.query('SELECT 1 FROM payments')).toHaveLength(1);
      expect((await account(customer.id)).summary.totalBalance).toBe('626.00');
    });
  });

  describe('listado y transiciones', () => {
    it('lists with filters, counts checks due within 7 days and restricts to ADMINISTRADOR', async () => {
      const customer = await createCustomer('Cliente Lista', '30710000103');
      await seedThree(customer.id);
      await chequePayment(customer.id, '100.00', '3001', 3);
      const far = await chequePayment(customer.id, '50.00', '3002', 60);
      await patch(`${far.check.id}/to-cartera`).expect(200);

      const all = (await adminGet('/api/v1/checks').expect(200)).body;
      expect(all.data.map((c: any) => c.checkNumber)).toEqual(['3001', '3002']);
      expect(all.dueSoonCount).toBe(1);

      const cartera = (
        await adminGet('/api/v1/checks?status=EN_CARTERA').expect(200)
      ).body;
      expect(cartera.data.map((c: any) => c.checkNumber)).toEqual(['3002']);

      const ranged = (
        await adminGet(`/api/v1/checks?dueTo=${addDays(10)}`).expect(200)
      ).body;
      expect(ranged.data.map((c: any) => c.checkNumber)).toEqual(['3001']);

      await get('/api/v1/checks').expect(403);
      await http().get('/api/v1/checks').expect(401);
      await adminGet(`/api/v1/checks/${far.check.id}`).expect(200);
      await adminGet(
        '/api/v1/checks/00000000-0000-4000-8000-000000000000',
      ).expect(404);
    });

    it('walks the five valid transitions and rejects the invalid ones', async () => {
      const customer = await createCustomer('Cliente Estados', '30710000104');
      await seedThree(customer.id);
      const supplier = await ds.getRepository(Supplier).save({
        businessName: 'Proveedor Endoso',
        cuit: '30700000001',
        taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
      });
      const a = await chequePayment(customer.id, '100.00', '4001');
      const b = await chequePayment(customer.id, '100.00', '4002');

      // RECIBIDO -> EN_CARTERA -> DEPOSITADO
      await patch(`${a.check.id}/deposit`).expect(409);
      await patch(`${a.check.id}/to-cartera`).expect(200);
      await patch(`${a.check.id}/to-cartera`).expect(409);
      await patch(`${a.check.id}/deposit`).expect(200);
      await patch(`${a.check.id}/to-cartera`).expect(409);
      await patch(`${a.check.id}/endorse`, { supplierId: supplier.id }).expect(
        409,
      );

      // EN_CARTERA -> ENDOSADO
      await patch(`${b.check.id}/to-cartera`).expect(200);
      await patch(`${b.check.id}/endorse`, {
        supplierId: '00000000-0000-4000-8000-000000000000',
      }).expect(404);
      await patch(`${b.check.id}/endorse`, { supplierId: supplier.id }).expect(
        200,
      );
      const [row] = await ds.query(
        'SELECT status, endorsed_to_supplier_id FROM checks WHERE id = $1',
        [b.check.id],
      );
      expect(row).toEqual({
        status: CheckStatus.ENDOSADO,
        endorsed_to_supplier_id: supplier.id,
      });
      await patch(`${b.check.id}/deposit`).expect(409);

      // VENDEDOR no mueve cheques
      await patch(`${a.check.id}/deposit`, {}, sellerToken).expect(403);

      const audits = await ds.query(
        "SELECT 1 FROM audit_logs WHERE entity_name = 'Check'",
      );
      expect(audits).toHaveLength(4);
    });

    it('applies only one of two concurrent transitions', async () => {
      const customer = await createCustomer('Cliente Carrera', '30710000105');
      await seedThree(customer.id);
      const supplier = await ds.getRepository(Supplier).save({
        businessName: 'Proveedor Carrera',
        cuit: '30700000002',
        taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
      });
      const { check } = await chequePayment(customer.id, '100.00', '5001');
      await patch(`${check.id}/to-cartera`).expect(200);
      const codes = (
        await Promise.all([
          patch(`${check.id}/deposit`),
          patch(`${check.id}/endorse`, { supplierId: supplier.id }),
        ])
      )
        .map((r) => r.status)
        .sort();
      expect(codes).toEqual([200, 409]);
    });
  });

  const invariantViolations = () =>
    ds.query(`
      SELECT ar.id FROM account_receivables ar
      WHERE ar.current_balance <> ar.original_amount
        - COALESCE((SELECT SUM(amount) FROM account_receivable_movements m WHERE m.account_receivable_id = ar.id AND m.movement_type = 'NOTA_CREDITO'), 0)
        - COALESCE((SELECT SUM(amount) FROM account_receivable_movements m WHERE m.account_receivable_id = ar.id AND m.movement_type = 'PAGO'), 0)
        + COALESCE((SELECT SUM(amount) FROM account_receivable_movements m WHERE m.account_receivable_id = ar.id AND m.movement_type = 'REVERSION_CHEQUE'), 0)
    `);

  describe('rechazo con reversión', () => {
    it('reopens two paid invoices, writes reversal movements and keeps the ledger consistent', async () => {
      const customer = await createCustomer('Cliente Rechazo', '30710000201');
      const s1 = await creditSale(customer.id, 1); // 121
      const s2 = await creditSale(customer.id, 2); // 242
      const { payment, receipt, check } = await chequePayment(
        customer.id,
        '363.00',
        '6001',
      );
      expect((await account(customer.id)).summary.totalBalance).toBe('0.00');
      expect((await balanceOf(s1.id)).status).toBe(
        AccountReceivableStatus.CANCELADO,
      );

      await patch(`${check.id}/to-cartera`).expect(200);
      const detail = (await adminGet(`/api/v1/checks/${check.id}`).expect(200))
        .body;
      expect(detail.rejectionImpact.totalIncrease).toBe('363.00');
      expect(detail.rejectionImpact.lines).toHaveLength(2);

      await patch(`${check.id}/reject`, { reason: 'Sin fondos' }).expect(200);

      expect(await balanceOf(s1.id)).toEqual({
        balance: '121.00',
        status: AccountReceivableStatus.PENDIENTE,
      });
      expect(await balanceOf(s2.id)).toEqual({
        balance: '242.00',
        status: AccountReceivableStatus.PENDIENTE,
      });
      const reversals = await ds.query(
        `SELECT amount::text, previous_balance::text AS prev, subsequent_balance::text AS next, payment_id
         FROM account_receivable_movements WHERE movement_type = 'REVERSION_CHEQUE' ORDER BY amount`,
      );
      expect(reversals).toEqual([
        {
          amount: '121.00',
          prev: '0.00',
          next: '121.00',
          payment_id: payment.id,
        },
        {
          amount: '242.00',
          prev: '0.00',
          next: '242.00',
          payment_id: payment.id,
        },
      ]);
      const [row] = await ds.query(
        'SELECT c.status, c.rejection_reason, p.status AS payment_status FROM checks c JOIN payments p ON p.id = c.payment_id WHERE c.id = $1',
        [check.id],
      );
      expect(row).toEqual({
        status: CheckStatus.RECHAZADO,
        rejection_reason: 'Sin fondos',
        payment_status: 'REVERTIDO',
      });
      expect(
        await ds.query(
          "SELECT 1 FROM audit_logs WHERE entity_name IN ('Check','Payment') AND new_values->>'status' IN ('RECHAZADO','REVERTIDO')",
        ),
      ).toHaveLength(2);

      const body = await account(customer.id);
      expect(body.summary.totalBalance).toBe('363.00');
      expect(body.ledger.data.at(-1).movementType).toBe('REVERSION_CHEQUE');
      expect(body.ledger.data.at(-1).runningBalance).toBe('363.00');
      expect(await invariantViolations()).toHaveLength(0);

      const receiptDetail = (
        await get(`/api/v1/receipts/${receipt.id}`).expect(200)
      ).body;
      expect(receiptDetail).toMatchObject({
        paymentStatus: 'REVERTIDO',
        check: { bankName: 'Galicia', checkNumber: '6001' },
      });
      await get(`/api/v1/receipts/${receipt.id}/pdf`).expect(200);
    });

    it('restores only the applied amount when the invoice had earlier payments', async () => {
      const customer = await createCustomer('Cliente Parcial', '30710000202');
      const s1 = await creditSale(customer.id, 2); // 242
      await post({
        customerId: customer.id,
        paymentMethod: PaymentMethod.EFECTIVO,
        mode: PaymentAllocationType.GLOBAL_AGE,
        totalAmount: '42.00',
      }).expect(201); // saldo 200
      const { check } = await chequePayment(customer.id, '100.00', '6002');
      await patch(`${check.id}/to-cartera`).expect(200);
      await patch(`${check.id}/deposit`).expect(200);

      await patch(`${check.id}/reject`).expect(200); // desde DEPOSITADO

      expect(await balanceOf(s1.id)).toEqual({
        balance: '200.00',
        status: AccountReceivableStatus.PARCIAL,
      });
      expect(await invariantViolations()).toHaveLength(0);
    });

    it('answers 409 for states that cannot be rejected and never duplicates movements', async () => {
      const customer = await createCustomer('Cliente Estados R', '30710000203');
      await creditSale(customer.id, 3);
      const supplier = await ds.getRepository(Supplier).save({
        businessName: 'Proveedor Rechazo',
        cuit: '30700000003',
        taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
      });
      const recibido = await chequePayment(customer.id, '50.00', '6003');
      await patch(`${recibido.check.id}/reject`).expect(409);

      const endosado = await chequePayment(customer.id, '50.00', '6004');
      await patch(`${endosado.check.id}/to-cartera`).expect(200);
      await patch(`${endosado.check.id}/endorse`, {
        supplierId: supplier.id,
      }).expect(200);
      await patch(`${endosado.check.id}/reject`).expect(409);

      const rechazado = await chequePayment(customer.id, '50.00', '6005');
      await patch(`${rechazado.check.id}/to-cartera`).expect(200);
      await patch(`${rechazado.check.id}/reject`).expect(200);
      await patch(`${rechazado.check.id}/reject`).expect(409);

      await patch(`${rechazado.check.id}/reject`, {}, sellerToken).expect(403);
      expect(
        await ds.query(
          "SELECT 1 FROM account_receivable_movements WHERE movement_type = 'REVERSION_CHEQUE'",
        ),
      ).toHaveLength(1);
      expect(await invariantViolations()).toHaveLength(0);
    });

    it('applies only one of two concurrent rejections', async () => {
      const customer = await createCustomer('Cliente Doble', '30710000204');
      await creditSale(customer.id, 3);
      const { check } = await chequePayment(customer.id, '100.00', '6006');
      await patch(`${check.id}/to-cartera`).expect(200);
      const codes = (
        await Promise.all([
          patch(`${check.id}/reject`),
          patch(`${check.id}/reject`),
        ])
      )
        .map((r) => r.status)
        .sort();
      expect(codes).toEqual([200, 409]);
      expect(
        await ds.query(
          "SELECT 1 FROM account_receivable_movements WHERE movement_type = 'REVERSION_CHEQUE'",
        ),
      ).toHaveLength(1);
      expect(await invariantViolations()).toHaveLength(0);
    });

    it('rolls everything back when the reversal fails midway', async () => {
      const customer = await createCustomer('Cliente Rollback', '30710000205');
      const s1 = await creditSale(customer.id, 1); // 121
      const s2 = await creditSale(customer.id, 2); // 242
      const { payment, check } = await chequePayment(
        customer.id,
        '363.00',
        '6007',
      );
      await patch(`${check.id}/to-cartera`).expect(200);
      // Falla inyectada: la segunda factura ya no puede reponer su monto sin
      // superar el original (p.ej. saldo corrompido a mano).
      await ds.query(
        'UPDATE account_receivables SET current_balance = original_amount WHERE sale_id = $1',
        [s2.id],
      );

      await patch(`${check.id}/reject`).expect(409);

      expect(
        (
          await ds.query('SELECT status FROM checks WHERE id = $1', [check.id])
        )[0].status,
      ).toBe(CheckStatus.EN_CARTERA);
      expect(
        (
          await ds.query('SELECT status FROM payments WHERE id = $1', [
            payment.id,
          ])
        )[0].status,
      ).toBe('REGISTRADO');
      expect(await balanceOf(s1.id)).toEqual({
        balance: '0.00',
        status: AccountReceivableStatus.CANCELADO,
      });
      expect(
        await ds.query(
          "SELECT 1 FROM account_receivable_movements WHERE movement_type = 'REVERSION_CHEQUE'",
        ),
      ).toHaveLength(0);
      const detail = (await adminGet(`/api/v1/checks/${check.id}`).expect(200))
        .body;
      expect(detail.rejectionImpact).toBeNull();
      expect(detail.rejectionBlockedReason).toContain('más saldo');
    });
  });
});
