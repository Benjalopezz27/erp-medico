import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
  MarkupLevel,
  PriceReviewApprovalMode,
  PriceReviewDecisionAction,
  PriceReviewErrorCode,
  PriceReviewStatus,
  ProductStatus,
  SupplierInvoiceStatus,
  TaxCondition,
} from '@erp/shared-types';
import { AppModule } from '../src/app.module';
import { runInitialSeed } from '../src/database/seeds/initial.seed';
import { AuditService } from '../src/modules/audit/audit.service';
import { Category } from '../src/modules/categories/entities/category.entity';
import { Product } from '../src/modules/products/entities/product.entity';
import { MarkupConfiguration } from '../src/modules/prices/entities/markup-configuration.entity';
import { PurchaseOrderItem } from '../src/modules/purchases/entities/purchase-order-item.entity';
import { PriceReview } from '../src/modules/purchases/entities/price-review.entity';
import { Stock } from '../src/modules/stock/entities/stock.entity';
import { Supplier } from '../src/modules/suppliers/entities/supplier.entity';
import { SupplierProduct } from '../src/modules/suppliers/supplier-products/entities/supplier-product.entity';
import { Unit } from '../src/modules/units/entities/unit.entity';

describe('Price review workflow (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let auditService: AuditService;
  let adminToken: string;
  let sellerToken: string;
  let category: Category;
  let product: Product;
  let supplier: Supplier;
  let supplierProduct: SupplierProduct;
  let invoiceSequence = 1;

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
    auditService = app.get(AuditService);
    await ds.runMigrations();
    await ds.query(`
      TRUNCATE TABLE
        price_reviews, supplier_cost_adjustments, supplier_invoice_items,
        supplier_invoices, goods_receipt_items, goods_receipts,
        purchase_order_items, purchase_orders, stock_movements, stocks,
        supplier_products, suppliers, markup_configurations, products, units,
        categories, audit_logs, users
      CASCADE
    `);
    await runInitialSeed(ds, {
      adminEmail: 'price-review-admin@erp.com',
      adminPassword: 'AdminPassword123!',
      vendedorEmail: 'price-review-seller@erp.com',
      vendedorPassword: 'SellerPassword123!',
    });
    await ds.query(
      `INSERT INTO purchase_settings (id, cost_tolerance_percentage) VALUES (1, 5.0000)`,
    );

    adminToken = (
      await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'price-review-admin@erp.com',
        password: 'AdminPassword123!',
      })
    ).body.accessToken;
    sellerToken = (
      await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'price-review-seller@erp.com',
        password: 'SellerPassword123!',
      })
    ).body.accessToken;

    category = await ds
      .getRepository(Category)
      .save({ name: 'Revisión de precios E2E' });
    const baseUnit = await ds
      .getRepository(Unit)
      .save({ name: 'Unidad revisión', symbol: 'UR' });
    const purchaseUnit = await ds
      .getRepository(Unit)
      .save({ name: 'Caja revisión', symbol: 'CR' });
    product = await ds.getRepository(Product).save({
      internalCode: 'REV-001',
      name: 'Producto con revisiones',
      description: null,
      categoryId: category.id,
      baseUnitId: baseUnit.id,
      minStock: '0.00',
      costNet: '50.0000',
      suggestedPriceNet: '60.00',
      activePriceNet: '60.00',
      status: ProductStatus.ACTIVE,
    });
    await ds.getRepository(MarkupConfiguration).save({
      level: MarkupLevel.PRODUCT,
      percentage: '20.0000',
      categoryId: null,
      productId: product.id,
    });
    await ds
      .getRepository(Stock)
      .save({ productId: product.id, currentBaseStock: '0.00' });
    supplier = await ds.getRepository(Supplier).save({
      businessName: 'Proveedor revisiones E2E',
      cuit: '30709999784',
      taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
      isActive: true,
    });
    supplierProduct = await ds.getRepository(SupplierProduct).save({
      supplierId: supplier.id,
      productId: product.id,
      supplierExternalCode: 'REV-SKU-1',
      purchaseUnitId: purchaseUnit.id,
      conversionFactorToBase: '10.0000',
      usualCostNet: '500.0000',
    });
  });

  afterAll(async () => app?.close());

  async function createReview(purchaseUnitCost: string): Promise<any> {
    const purchaseOrder = await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplierId: supplier.id,
        items: [
          {
            supplierProductId: supplierProduct.id,
            orderedQty: 1,
            expectedCostUnitNet: Number(purchaseUnitCost),
          },
        ],
      })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/v1/purchase-orders/${purchaseOrder.body.id}/emit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const orderItem = await ds
      .getRepository(PurchaseOrderItem)
      .findOneByOrFail({ purchaseOrderId: purchaseOrder.body.id });
    const receipt = await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${purchaseOrder.body.id}/receipts`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        deliveryNoteNumber: `REV-${invoiceSequence}-${Date.now()}`,
        items: [
          { purchaseOrderItemId: orderItem.id, receivedQtyPurchaseUnit: 1 },
        ],
      })
      .expect(201);
    const invoice = await request(app.getHttpServer())
      .post('/api/v1/supplier-invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        goodsReceiptId: receipt.body.receipt.id,
        invoiceNumber: `A 0001-${String(invoiceSequence++).padStart(8, '0')}`,
        invoiceDate: '2026-08-28',
        taxTotal: '0.0000',
        items: [
          {
            goodsReceiptItemId: receipt.body.receipt.items[0].id,
            invoicedQtyPurchaseUnit: '1.0000',
            unitPriceNet: purchaseUnitCost,
            discountNet: '0.0000',
            bonusNet: '0.0000',
            surchargeNet: '0.0000',
          },
        ],
      })
      .expect(201);
    if (invoice.body.status === SupplierInvoiceStatus.OBSERVADA) {
      await request(app.getHttpServer())
        .patch(`/api/v1/supplier-invoices/${invoice.body.id}/authorize`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    }
    const confirmed = await request(app.getHttpServer())
      .patch(`/api/v1/supplier-invoices/${invoice.body.id}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    return confirmed.body.confirmation.priceReviews[0];
  }

  const auth = (builder: request.Test) =>
    builder.set('Authorization', `Bearer ${adminToken}`);

  it('enforces authentication, role and not-found contracts', async () => {
    await request(app.getHttpServer()).get('/api/v1/price-reviews').expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/price-reviews')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(403);
    const response = await auth(
      request(app.getHttpServer()).get(
        '/api/v1/price-reviews/00000000-0000-4000-8000-000000000001',
      ),
    ).expect(404);
    expect(response.body.code).toBe(
      PriceReviewErrorCode.PRICE_REVIEW_NOT_FOUND,
    );
  });

  it('lists, filters, details and counts pending reviews with stable contracts', async () => {
    const review = await createReview('550.0000');
    const count = await auth(
      request(app.getHttpServer()).get('/api/v1/price-reviews/pending-count'),
    ).expect(200);
    expect(count.body.count).toBeGreaterThanOrEqual(1);

    const list = await auth(
      request(app.getHttpServer()).get('/api/v1/price-reviews').query({
        status: PriceReviewStatus.PENDIENTE,
        productId: product.id,
        categoryId: category.id,
        supplierId: supplier.id,
        supplierInvoiceId: review.supplierInvoiceId,
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
        page: 1,
        limit: 10,
      }),
    ).expect(200);
    expect(list.body.meta).toMatchObject({ page: 1, limit: 10, total: 1 });
    expect(list.body.data[0]).toMatchObject({
      id: review.id,
      status: PriceReviewStatus.PENDIENTE,
      isStale: false,
      product: {
        id: product.id,
        categoryId: category.id,
        costNet: '55.0000',
      },
      origin: {
        supplierInvoiceId: review.supplierInvoiceId,
        supplierId: supplier.id,
      },
    });
    expect(list.body.data[0].allowedActions).toEqual(
      expect.arrayContaining([
        PriceReviewDecisionAction.APPROVE_SUGGESTED,
        PriceReviewDecisionAction.APPROVE_CUSTOM,
        PriceReviewDecisionAction.REJECT,
        PriceReviewDecisionAction.POSTPONE,
      ]),
    );
    const detail = await auth(
      request(app.getHttpServer()).get(`/api/v1/price-reviews/${review.id}`),
    ).expect(200);
    expect(detail.body.id).toBe(review.id);

    await auth(
      request(app.getHttpServer())
        .patch(`/api/v1/price-reviews/${review.id}/reject`)
        .send({ reason: 'Conservar precio vigente' }),
    ).expect(200);
  });

  it('approves suggested price idempotently under concurrent retries', async () => {
    const review = await createReview('600.0000');
    const approve = () =>
      auth(
        request(app.getHttpServer())
          .patch(`/api/v1/price-reviews/${review.id}/approve`)
          .send({ mode: PriceReviewApprovalMode.SUGGESTED }),
      );
    const responses = await Promise.all([approve(), approve()]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(responses[0].body.approvedPriceNet).toBe(review.suggestedPriceNet);
    const persistedProduct = await ds
      .getRepository(Product)
      .findOneByOrFail({ id: product.id });
    expect(persistedProduct.activePriceNet).toBe(review.suggestedPriceNet);
    const audits = await ds.query(
      `SELECT id FROM audit_logs WHERE entity_name = 'PriceReview' AND entity_id = $1`,
      [review.id],
    );
    expect(audits).toHaveLength(1);
  });

  it('validates and applies a canonical custom price', async () => {
    const review = await createReview('650.0000');
    for (const customPriceNet of ['0', '-1', '1.001', '1e3']) {
      await auth(
        request(app.getHttpServer())
          .patch(`/api/v1/price-reviews/${review.id}/approve`)
          .send({ mode: PriceReviewApprovalMode.CUSTOM, customPriceNet }),
      ).expect(400);
    }
    const approved = await auth(
      request(app.getHttpServer())
        .patch(`/api/v1/price-reviews/${review.id}/approve`)
        .send({
          mode: PriceReviewApprovalMode.CUSTOM,
          customPriceNet: '80.5',
          reason: 'Precio comercial definido',
        }),
    ).expect(200);
    expect(approved.body).toMatchObject({
      status: PriceReviewStatus.APROBADO,
      decisionAction: PriceReviewDecisionAction.APPROVE_CUSTOM,
      approvedPriceNet: '80.50',
    });
  });

  it('postpones, reopens and rejects without changing active price', async () => {
    const review = await createReview('700.0000');
    const activeBefore = (
      await ds.getRepository(Product).findOneByOrFail({ id: product.id })
    ).activePriceNet;
    await auth(
      request(app.getHttpServer())
        .patch(`/api/v1/price-reviews/${review.id}/postpone`)
        .send({ reason: 'Esperar nueva lista' }),
    ).expect(200);
    const reopened = await auth(
      request(app.getHttpServer())
        .patch(`/api/v1/price-reviews/${review.id}/reopen`)
        .send({ reason: 'Lista disponible' }),
    ).expect(200);
    expect(reopened.body).toMatchObject({
      status: PriceReviewStatus.PENDIENTE,
      decisionAction: PriceReviewDecisionAction.REOPEN,
    });
    await auth(
      request(app.getHttpServer())
        .patch(`/api/v1/price-reviews/${review.id}/reject`)
        .send({ reason: 'Mantener precio acordado' }),
    ).expect(200);
    const activeAfter = (
      await ds.getRepository(Product).findOneByOrFail({ id: product.id })
    ).activePriceNet;
    expect(activeAfter).toBe(activeBefore);
  });

  it('blocks a superseded review and returns authoritative conflict state', async () => {
    const older = await createReview('750.0000');
    const newer = await createReview('800.0000');
    const conflict = await auth(
      request(app.getHttpServer())
        .patch(`/api/v1/price-reviews/${older.id}/approve`)
        .send({ mode: PriceReviewApprovalMode.SUGGESTED }),
    ).expect(409);
    expect(conflict.body).toMatchObject({
      code: PriceReviewErrorCode.PRICE_REVIEW_STALE,
      details: {
        supersededByReviewId: newer.id,
        currentReview: { id: older.id, isStale: true },
      },
    });
    expect(conflict.body.details.currentReview.staleReasons).toEqual(
      expect.arrayContaining(['SUPERSEDED', 'COST_CHANGED']),
    );
    await auth(
      request(app.getHttpServer())
        .patch(`/api/v1/price-reviews/${older.id}/reject`)
        .send({ reason: 'Propuesta reemplazada' }),
    ).expect(200);
    await auth(
      request(app.getHttpServer())
        .patch(`/api/v1/price-reviews/${newer.id}/approve`)
        .send({ mode: PriceReviewApprovalMode.SUGGESTED }),
    ).expect(200);
  });

  it('allows only one of two different concurrent custom decisions', async () => {
    const review = await createReview('850.0000');
    const approve = (customPriceNet: string) =>
      auth(
        request(app.getHttpServer())
          .patch(`/api/v1/price-reviews/${review.id}/approve`)
          .send({ mode: PriceReviewApprovalMode.CUSTOM, customPriceNet }),
      );
    const responses = await Promise.all([approve('105.00'), approve('106.00')]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    const persisted = await ds
      .getRepository(PriceReview)
      .findOneByOrFail({ id: review.id });
    expect(['105.00', '106.00']).toContain(persisted.approvedPriceNet);
    const audits = await ds.query(
      `SELECT id FROM audit_logs WHERE entity_name = 'PriceReview' AND entity_id = $1`,
      [review.id],
    );
    expect(audits).toHaveLength(1);
  });

  it('rolls back the decision and active price when auditing fails', async () => {
    const review = await createReview('900.0000');
    const activeBefore = (
      await ds.getRepository(Product).findOneByOrFail({ id: product.id })
    ).activePriceNet;
    const auditSpy = jest
      .spyOn(auditService, 'record')
      .mockRejectedValueOnce(new Error('forced price-review audit failure'));
    await auth(
      request(app.getHttpServer())
        .patch(`/api/v1/price-reviews/${review.id}/approve`)
        .send({ mode: PriceReviewApprovalMode.SUGGESTED }),
    ).expect(500);
    auditSpy.mockRestore();

    const persistedReview = await ds
      .getRepository(PriceReview)
      .findOneByOrFail({ id: review.id });
    const persistedProduct = await ds
      .getRepository(Product)
      .findOneByOrFail({ id: product.id });
    expect(persistedReview.status).toBe(PriceReviewStatus.PENDIENTE);
    expect(persistedReview.decisionAction).toBeNull();
    expect(persistedProduct.activePriceNet).toBe(activeBefore);
    const audits = await ds.query(
      `SELECT id FROM audit_logs WHERE entity_name = 'PriceReview' AND entity_id = $1`,
      [review.id],
    );
    expect(audits).toHaveLength(0);
  });
});
