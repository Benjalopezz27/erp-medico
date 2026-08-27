import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
  ProductStatus,
  SupplierInvoiceAdjustmentMode,
  SupplierInvoiceObservationReason,
  SupplierInvoiceStatus,
  TaxCondition,
} from '@erp/shared-types';
import { AppModule } from '../src/app.module';
import { runInitialSeed } from '../src/database/seeds/initial.seed';
import { AuditLog } from '../src/modules/audit/entities/audit-log.entity';
import { Category } from '../src/modules/categories/entities/category.entity';
import { Product } from '../src/modules/products/entities/product.entity';
import { PurchaseOrderItem } from '../src/modules/purchases/entities/purchase-order-item.entity';
import { Stock } from '../src/modules/stock/entities/stock.entity';
import { Supplier } from '../src/modules/suppliers/entities/supplier.entity';
import { SupplierProduct } from '../src/modules/suppliers/supplier-products/entities/supplier-product.entity';
import { Unit } from '../src/modules/units/entities/unit.entity';

describe('Supplier invoices (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let adminToken: string;
  let sellerToken: string;
  let supplier: Supplier;
  let supplierProduct: SupplierProduct;
  let product: Product;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    ds = app.get(DataSource);
    await ds.runMigrations();
    await ds.query(
      `TRUNCATE TABLE supplier_invoice_items, supplier_invoices, goods_receipt_items, goods_receipts, purchase_order_items, purchase_orders, stock_movements, stocks, supplier_products, suppliers, products, units, categories, audit_logs, users CASCADE`,
    );
    await runInitialSeed(ds, {
      adminEmail: 'admin-invoices@erp.com',
      adminPassword: 'AdminPassword123!',
      vendedorEmail: 'seller-invoices@erp.com',
      vendedorPassword: 'SellerPassword123!',
    });
    // The broad users CASCADE cleanup also truncates this singleton table.
    await ds.query(
      `INSERT INTO purchase_settings (id, cost_tolerance_percentage) VALUES (1, 5.0000)`,
    );
    adminToken = (
      await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'admin-invoices@erp.com',
        password: 'AdminPassword123!',
      })
    ).body.accessToken;
    sellerToken = (
      await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'seller-invoices@erp.com',
        password: 'SellerPassword123!',
      })
    ).body.accessToken;

    const category = await ds
      .getRepository(Category)
      .save({ name: 'Facturación E2E' });
    const baseUnit = await ds
      .getRepository(Unit)
      .save({ name: 'Unidad E2E', symbol: 'UE' });
    const purchaseUnit = await ds
      .getRepository(Unit)
      .save({ name: 'Caja E2E', symbol: 'CE' });
    product = await ds.getRepository(Product).save({
      internalCode: 'INV-001',
      name: 'Producto facturable',
      description: null,
      categoryId: category.id,
      baseUnitId: baseUnit.id,
      minStock: '0.00',
      costNet: '50.0000',
      markupPercentage: '20.0000',
      suggestedPriceNet: '60.00',
      activePriceNet: '60.00',
      status: ProductStatus.ACTIVE,
    });
    await ds
      .getRepository(Stock)
      .save({ productId: product.id, currentBaseStock: '0.00' });
    supplier = await ds.getRepository(Supplier).save({
      businessName: 'Proveedor Facturas E2E',
      cuit: '30709999881',
      taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
      isActive: true,
    });
    supplierProduct = await ds.getRepository(SupplierProduct).save({
      supplierId: supplier.id,
      productId: product.id,
      supplierExternalCode: 'SKU-INV-1',
      purchaseUnitId: purchaseUnit.id,
      conversionFactorToBase: '10.0000',
      usualCostNet: '500.0000',
    });
  });

  afterAll(async () => app?.close());

  async function createReceipt(quantity = 10) {
    const poResponse = await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplierId: supplier.id,
        items: [
          {
            supplierProductId: supplierProduct.id,
            orderedQty: quantity,
            expectedCostUnitNet: 500,
          },
        ],
      })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/v1/purchase-orders/${poResponse.body.id}/emit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const poItem = (await ds
      .getRepository(PurchaseOrderItem)
      .findOneBy({ purchaseOrderId: poResponse.body.id }))!;
    const receipt = await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${poResponse.body.id}/receipts`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        deliveryNoteNumber: `R-${Date.now()}-${Math.random()}`,
        items: [
          { purchaseOrderItemId: poItem.id, receivedQtyPurchaseUnit: quantity },
        ],
      })
      .expect(201);
    return {
      receiptId: receipt.body.receipt.id as string,
      receiptItemId: receipt.body.receipt.items[0].id as string,
    };
  }

  const payload = (
    receiptId: string,
    receiptItemId: string,
    invoiceNumber: string,
    quantity: string,
  ) => ({
    goodsReceiptId: receiptId,
    invoiceNumber,
    invoiceDate: '2026-08-27',
    taxTotal: '21.0000',
    items: [
      {
        goodsReceiptItemId: receiptItemId,
        invoicedQtyPurchaseUnit: quantity,
        unitPriceNet: '500.0000',
        discountNet: '0.0000',
        bonusNet: '0.0000',
        surchargeNet: '0.0000',
      },
    ],
  });

  it('enforces authentication and ADMINISTRADOR role', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/supplier-invoices')
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/supplier-invoices')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(403);
  });

  it('automatically authorizes an invoice within tolerance without changing stock or product cost', async () => {
    const receipt = await createReceipt();
    const stockBefore = await ds
      .getRepository(Stock)
      .findOneByOrFail({ productId: product.id });
    const costBefore = (
      await ds.getRepository(Product).findOneByOrFail({ id: product.id })
    ).costNet;
    const response = await request(app.getHttpServer())
      .post('/api/v1/supplier-invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        payload(
          receipt.receiptId,
          receipt.receiptItemId,
          'A 0001-00000001',
          '10.0000',
        ),
      )
      .expect(201);
    expect(response.body.status).toBe(SupplierInvoiceStatus.AUTORIZADA);
    expect(response.body.costTolerancePercentageSnapshot).toBe('5.0000');
    expect(response.body.netTotal).toBe('5000.0000');
    expect(response.body.totalAmount).toBe('5021.0000');
    expect(response.body.items[0]).toMatchObject({
      allocatedReceivedQtyPurchaseUnit: '10.0000',
      allocatedReceivedQtyBase: '100.00',
      pendingQtyAfter: '0.0000',
      costVariationPercentage: '0.0000',
      observationReasons: [],
    });
    expect(
      (await ds.getRepository(Stock).findOneByOrFail({ productId: product.id }))
        .currentBaseStock,
    ).toBe(stockBefore.currentBaseStock);
    expect(
      (await ds.getRepository(Product).findOneByOrFail({ id: product.id }))
        .costNet,
    ).toBe(costBefore);
  });

  it('reconciles cumulatively, exposes pending balance and limits an excess invoice', async () => {
    const receipt = await createReceipt();
    await request(app.getHttpServer())
      .post('/api/v1/supplier-invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        payload(
          receipt.receiptId,
          receipt.receiptItemId,
          'A 0001-00000002',
          '4.0000',
        ),
      )
      .expect(201);
    const pending = await request(app.getHttpServer())
      .get('/api/v1/supplier-invoices/pending-receipts?search=SKU-INV-1')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const found = pending.body.data.find(
      (item: any) => item.id === receipt.receiptId,
    );
    expect(found.items[0].availableQtyPurchaseUnit).toBe('6.0000');

    const observed = await request(app.getHttpServer())
      .post('/api/v1/supplier-invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        payload(
          receipt.receiptId,
          receipt.receiptItemId,
          'A 0001-00000003',
          '8.0000',
        ),
      )
      .expect(201);
    expect(observed.body.status).toBe(SupplierInvoiceStatus.OBSERVADA);
    expect(observed.body.items[0]).toMatchObject({
      allocatedReceivedQtyPurchaseUnit: '6.0000',
      quantityExcess: '2.0000',
      pendingQtyAfter: '0.0000',
    });
    const after = await request(app.getHttpServer())
      .get(
        `/api/v1/supplier-invoices/pending-receipts?supplierId=${supplier.id}`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(
      after.body.data.some((item: any) => item.id === receipt.receiptId),
    ).toBe(false);
  });

  it('normalizes duplicate invoice numbers and supports list/detail search', async () => {
    const receipt = await createReceipt(1);
    const created = await request(app.getHttpServer())
      .post('/api/v1/supplier-invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        payload(
          receipt.receiptId,
          receipt.receiptItemId,
          'B 0002 - 00000001',
          '1.0000',
        ),
      )
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/supplier-invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        payload(
          receipt.receiptId,
          receipt.receiptItemId,
          'b 0002-00000001',
          '1.0000',
        ),
      )
      .expect(409);
    const list = await request(app.getHttpServer())
      .get('/api/v1/supplier-invoices?search=SKU-INV-1')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(
      list.body.data.some((item: any) => item.id === created.body.id),
    ).toBe(true);
    await request(app.getHttpServer())
      .get(`/api/v1/supplier-invoices/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.items).toHaveLength(1));
  });

  it('serializes concurrent invoices without double allocation', async () => {
    const receipt = await createReceipt(5);
    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/v1/supplier-invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(
          payload(
            receipt.receiptId,
            receipt.receiptItemId,
            'C 0003-00000001',
            '5.0000',
          ),
        ),
      request(app.getHttpServer())
        .post('/api/v1/supplier-invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(
          payload(
            receipt.receiptId,
            receipt.receiptItemId,
            'C 0003-00000002',
            '5.0000',
          ),
        ),
    ]);
    expect([first.status, second.status]).toEqual([201, 201]);
    const allocated = [first.body, second.body].reduce(
      (sum, invoice) =>
        sum + Number(invoice.items[0].allocatedReceivedQtyPurchaseUnit),
      0,
    );
    expect(allocated).toBe(5);
    expect([first.body.status, second.body.status].sort()).toEqual(
      [
        SupplierInvoiceStatus.AUTORIZADA,
        SupplierInvoiceStatus.OBSERVADA,
      ].sort(),
    );
  });

  it('supports percentage adjustments and VAT with authoritative decimal amounts', async () => {
    const receipt = await createReceipt(2);
    const response = await request(app.getHttpServer())
      .post('/api/v1/supplier-invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        goodsReceiptId: receipt.receiptId,
        invoiceNumber: 'P 0005-00000001',
        invoiceDate: '2026-08-27',
        taxTotal: '0.0000',
        taxMode: SupplierInvoiceAdjustmentMode.PERCENTAGE,
        taxPercentage: '21.0000',
        items: [
          {
            goodsReceiptItemId: receipt.receiptItemId,
            invoicedQtyPurchaseUnit: '2.0000',
            unitPriceNet: '500.0000',
            discountNet: '0.0000',
            discountMode: SupplierInvoiceAdjustmentMode.PERCENTAGE,
            discountPercentage: '10.0000',
            bonusNet: '0.0000',
            bonusMode: SupplierInvoiceAdjustmentMode.PERCENTAGE,
            bonusPercentage: '5.0000',
            surchargeNet: '0.0000',
            surchargeMode: SupplierInvoiceAdjustmentMode.PERCENTAGE,
            surchargePercentage: '2.0000',
          },
        ],
      })
      .expect(201);

    expect(response.body).toMatchObject({
      taxMode: SupplierInvoiceAdjustmentMode.PERCENTAGE,
      taxPercentage: '21.0000',
      netTotal: '870.0000',
      taxTotal: '182.7000',
      totalAmount: '1052.7000',
    });
    expect(response.body.items[0]).toMatchObject({
      discountMode: SupplierInvoiceAdjustmentMode.PERCENTAGE,
      discountPercentage: '10.0000',
      discountNet: '100.0000',
      bonusPercentage: '5.0000',
      bonusNet: '50.0000',
      surchargePercentage: '2.0000',
      surchargeNet: '20.0000',
      realCostUnitNet: '435.0000',
    });
  });

  it('configures tolerance, accumulates observation reasons and resolves observed invoices', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/config/purchases')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .patch('/api/v1/config/purchases')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ costTolerancePercentage: '4.0000' })
      .expect(200)
      .expect(({ body }) =>
        expect(body.costTolerancePercentage).toBe('4.0000'),
      );

    const rejectedReceipt = await createReceipt(5);
    const observed = await request(app.getHttpServer())
      .post('/api/v1/supplier-invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...payload(
          rejectedReceipt.receiptId,
          rejectedReceipt.receiptItemId,
          'O 0006-00000001',
          '6.0000',
        ),
        items: [
          {
            ...payload(
              rejectedReceipt.receiptId,
              rejectedReceipt.receiptItemId,
              'unused',
              '6.0000',
            ).items[0],
            unitPriceNet: '525.0001',
          },
        ],
      })
      .expect(201);

    expect(observed.body.status).toBe(SupplierInvoiceStatus.OBSERVADA);
    expect(observed.body.costTolerancePercentageSnapshot).toBe('4.0000');
    expect(observed.body.items[0].observationReasons).toEqual(
      expect.arrayContaining([
        SupplierInvoiceObservationReason.QUANTITY_EXCESS,
        SupplierInvoiceObservationReason.COST_VARIATION,
      ]),
    );

    const rejected = await request(app.getHttpServer())
      .patch(`/api/v1/supplier-invoices/${observed.body.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'La factura no coincide con lo acordado.' })
      .expect(200);
    expect(rejected.body.status).toBe(SupplierInvoiceStatus.RECHAZADA);
    expect(rejected.body.decision.reason).toBe(
      'La factura no coincide con lo acordado.',
    );

    const pending = await request(app.getHttpServer())
      .get('/api/v1/supplier-invoices/pending-receipts')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const restored = pending.body.data.find(
      (item: any) => item.id === rejectedReceipt.receiptId,
    );
    expect(restored.items[0].availableQtyPurchaseUnit).toBe('5.0000');

    const authorizedReceipt = await createReceipt(1);
    const secondObserved = await request(app.getHttpServer())
      .post('/api/v1/supplier-invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ...payload(
          authorizedReceipt.receiptId,
          authorizedReceipt.receiptItemId,
          'O 0006-00000002',
          '1.0000',
        ),
        items: [
          {
            ...payload(
              authorizedReceipt.receiptId,
              authorizedReceipt.receiptItemId,
              'unused',
              '1.0000',
            ).items[0],
            unitPriceNet: '530.0000',
          },
        ],
      })
      .expect(201);
    const auditCountBefore = await ds.getRepository(AuditLog).countBy({
      entityName: 'SupplierInvoice',
      entityId: secondObserved.body.id,
    });
    const decisions = await Promise.all([
      request(app.getHttpServer())
        .patch(`/api/v1/supplier-invoices/${secondObserved.body.id}/authorize`)
        .set('Authorization', `Bearer ${adminToken}`),
      request(app.getHttpServer())
        .patch(`/api/v1/supplier-invoices/${secondObserved.body.id}/authorize`)
        .set('Authorization', `Bearer ${adminToken}`),
    ]);
    expect(decisions.map((response) => response.status)).toEqual([200, 200]);
    for (const decision of decisions) {
      expect(decision.body.status).toBe(SupplierInvoiceStatus.AUTORIZADA);
      expect(decision.body.decision.action).toBe('AUTHORIZE');
    }
    expect(
      await ds.getRepository(AuditLog).countBy({
        entityName: 'SupplierInvoice',
        entityId: secondObserved.body.id,
      }),
    ).toBe(auditCountBefore + 1);

    await request(app.getHttpServer())
      .patch('/api/v1/config/purchases')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ costTolerancePercentage: '5.0000' })
      .expect(200);
  });

  it('accepts historical receipts after deactivating masters and rejects crossed items', async () => {
    const first = await createReceipt(1);
    const second = await createReceipt(1);
    await ds.getRepository(Supplier).update(supplier.id, { isActive: false });
    await ds.getRepository(Product).update(product.id, {
      status: ProductStatus.INACTIVE,
    });
    await request(app.getHttpServer())
      .post('/api/v1/supplier-invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        payload(
          first.receiptId,
          first.receiptItemId,
          'D 0004-00000001',
          '1.0000',
        ),
      )
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/supplier-invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(
        payload(
          first.receiptId,
          second.receiptItemId,
          'D 0004-00000002',
          '1.0000',
        ),
      )
      .expect(404);
  });
});
