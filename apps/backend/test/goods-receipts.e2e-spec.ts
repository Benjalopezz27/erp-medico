import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Supplier } from '../src/modules/suppliers/entities/supplier.entity';
import { Product } from '../src/modules/products/entities/product.entity';
import { Unit } from '../src/modules/units/entities/unit.entity';
import { Category } from '../src/modules/categories/entities/category.entity';
import { SupplierProduct } from '../src/modules/suppliers/supplier-products/entities/supplier-product.entity';
import { PurchaseOrder } from '../src/modules/purchases/entities/purchase-order.entity';
import { PurchaseOrderItem } from '../src/modules/purchases/entities/purchase-order-item.entity';
import { GoodsReceipt } from '../src/modules/purchases/entities/goods-receipt.entity';
import { User } from '../src/modules/users/entities/user.entity';
import { GoodsReceiptsService } from '../src/modules/purchases/services/goods-receipts.service';
import { Stock } from '../src/modules/stock/entities/stock.entity';
import { StockMovement } from '../src/modules/stock/entities/stock-movement.entity';
import { StockService } from '../src/modules/stock/stock.service';
import { AuditService } from '../src/modules/audit/audit.service';
import {
  TaxCondition,
  ProductStatus,
  PurchaseOrderStatus,
  StockMovementType,
  GoodsReceiptErrorCode,
} from '@erp/shared-types';
import { runInitialSeed } from '../src/database/seeds/initial.seed';

describe('Transactional Goods Receipts & Stock Intake (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;

  const adminPassword = 'AdminPassword123!';
  const sellerPassword = 'SellerPassword123!';

  let adminToken: string;
  let sellerToken: string;
  let adminUser: User;

  let testSupplier: Supplier;
  let testCategory: Category;
  let testUnitBase: Unit;
  let testUnitBox: Unit;
  let testProduct1: Product;
  let testProduct2: Product;
  let testSp1: SupplierProduct;
  let testSp2: SupplierProduct;

  beforeAll(async () => {
    process.env.JWT_SECRET =
      process.env.JWT_SECRET ||
      'test_ci_jwt_secret_key_minimum_32_characters_long!';
    process.env.JWT_EXPIRATION = process.env.JWT_EXPIRATION || '8h';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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

    const qr = ds.createQueryRunner();
    await qr.connect();
    await qr.query('TRUNCATE TABLE goods_receipt_items CASCADE;');
    await qr.query('TRUNCATE TABLE goods_receipts CASCADE;');
    await qr.query('TRUNCATE TABLE purchase_order_items CASCADE;');
    await qr.query('TRUNCATE TABLE purchase_orders CASCADE;');
    await qr.query('TRUNCATE TABLE stock_movements CASCADE;');
    await qr.query('TRUNCATE TABLE stocks CASCADE;');
    await qr.query('TRUNCATE TABLE supplier_products CASCADE;');
    await qr.query('TRUNCATE TABLE suppliers CASCADE;');
    await qr.query('TRUNCATE TABLE products CASCADE;');
    await qr.query('TRUNCATE TABLE units CASCADE;');
    await qr.query('TRUNCATE TABLE categories CASCADE;');
    await qr.query('TRUNCATE TABLE users CASCADE;');
    await qr.release();

    await runInitialSeed(ds, {
      adminEmail: 'admin-gr@erp.com',
      adminPassword: adminPassword,
      vendedorEmail: 'seller-gr@erp.com',
      vendedorPassword: sellerPassword,
    });

    adminUser = (await ds
      .getRepository(User)
      .findOneBy({ email: 'admin-gr@erp.com' }))!;

    // Authenticate Admin

    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin-gr@erp.com', password: adminPassword });
    adminToken = adminLoginRes.body.accessToken;

    // Authenticate Seller
    const sellerLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'seller-gr@erp.com', password: sellerPassword });
    sellerToken = sellerLoginRes.body.accessToken;

    // Seed master catalog
    const catRepo = ds.getRepository(Category);
    testCategory = await catRepo.save(
      catRepo.create({ name: 'Descartables Médicos' }),
    );

    const unitRepo = ds.getRepository(Unit);
    testUnitBase = await unitRepo.save(
      unitRepo.create({ name: 'Unidad', symbol: 'UN' }),
    );
    testUnitBox = await unitRepo.save(
      unitRepo.create({ name: 'Caja x 100', symbol: 'CJA' }),
    );

    const prodRepo = ds.getRepository(Product);
    const stockRepo = ds.getRepository(Stock);

    testProduct1 = await prodRepo.save(
      prodRepo.create({
        internalCode: 'MED-001',
        name: 'Jeringa 5ml',
        description: 'Jeringa descartable con aguja',
        categoryId: testCategory.id,
        baseUnitId: testUnitBase.id,
        costNet: '15.0000',
        markupPercentage: '30.0000',
        suggestedPriceNet: '19.50',
        activePriceNet: '19.50',
        minStock: '10.00',
        status: ProductStatus.ACTIVE,
      }),
    );
    await stockRepo.save(
      stockRepo.create({
        productId: testProduct1.id,
        currentBaseStock: '0.00',
      }),
    );

    testProduct2 = await prodRepo.save(
      prodRepo.create({
        internalCode: 'MED-002',
        name: 'Guantes de Látex M',
        description: 'Guantes descartables tamaño M',
        categoryId: testCategory.id,
        baseUnitId: testUnitBase.id,
        costNet: '25.0000',
        markupPercentage: '30.0000',
        suggestedPriceNet: '32.50',
        activePriceNet: '32.50',
        minStock: '10.00',
        status: ProductStatus.ACTIVE,
      }),
    );
    await stockRepo.save(
      stockRepo.create({
        productId: testProduct2.id,
        currentBaseStock: '0.00',
      }),
    );

    const supRepo = ds.getRepository(Supplier);
    testSupplier = await supRepo.save(
      supRepo.create({
        businessName: 'Droguería Médica del Sur',
        cuit: '30112233445',
        taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
        isActive: true,
      }),
    );

    const spRepo = ds.getRepository(SupplierProduct);
    testSp1 = await spRepo.save(
      spRepo.create({
        supplierId: testSupplier.id,
        productId: testProduct1.id,
        supplierExternalCode: 'SUP-JER-05',
        purchaseUnitId: testUnitBox.id,
        conversionFactorToBase: '100.0000',
        usualCostNet: '1400.0000',
      }),
    );

    testSp2 = await spRepo.save(
      spRepo.create({
        supplierId: testSupplier.id,
        productId: testProduct2.id,
        supplierExternalCode: 'SUP-GUA-M',
        purchaseUnitId: testUnitBox.id,
        conversionFactorToBase: '100.0000',
        usualCostNet: '2400.0000',
      }),
    );
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  // Helper to create and emit a purchase order
  async function createAndEmitPo(
    items: Array<{
      supplierProductId: string;
      orderedQty: number;
      expectedCostUnitNet: number;
    }>,
  ): Promise<{ po: PurchaseOrder; items: PurchaseOrderItem[] }> {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplierId: testSupplier.id,
        items,
      })
      .expect(201);

    const poId = createRes.body.id;

    await request(app.getHttpServer())
      .patch(`/api/v1/purchase-orders/${poId}/emit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const poRepo = ds.getRepository(PurchaseOrder);
    const poiRepo = ds.getRepository(PurchaseOrderItem);

    const po = (await poRepo.findOne({
      where: { id: poId },
      relations: ['supplier', 'user'],
    }))!;

    const poItems = await poiRepo.find({
      where: { purchaseOrderId: poId },
      order: { itemIndex: 'ASC' },
    });

    return { po, items: poItems };
  }

  describe('1. Authentication & Authorization', () => {
    it('returns 401 Unauthorized without JWT token', async () => {
      await request(app.getHttpServer())
        .post(
          '/api/v1/purchase-orders/00000000-0000-0000-0000-000000000000/receipts',
        )
        .send({ deliveryNoteNumber: 'REM-001', items: [] })
        .expect(401);
    });

    it('returns 403 Forbidden for VENDEDOR role', async () => {
      await request(app.getHttpServer())
        .post(
          '/api/v1/purchase-orders/00000000-0000-0000-0000-000000000000/receipts',
        )
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ deliveryNoteNumber: 'REM-001', items: [] })
        .expect(403);
    });
  });

  describe('2. Goods Receipt Creation (Happy Paths)', () => {
    it('records full goods receipt: converts Box x 100 to base units, updates Stock, sets PO to COMPLETADA', async () => {
      const { po, items } = await createAndEmitPo([
        {
          supplierProductId: testSp1.id,
          orderedQty: 5,
          expectedCostUnitNet: 1400,
        },
      ]);

      const initialStock = await ds
        .getRepository(Stock)
        .findOne({ where: { productId: testProduct1.id } });
      const initialStockQty = Number(initialStock?.currentBaseStock || 0);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${po.id}/receipts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          deliveryNoteNumber: ' 0001 - 00001001 ',
          items: [
            {
              purchaseOrderItemId: items[0].id,
              receivedQtyPurchaseUnit: 5,
              provisionalCostUnitNet: 1450.5,
            },
          ],
        })
        .expect(201);

      expect(res.body.receipt.receiptNumber).toMatch(/^REC-\d{6}$/);
      expect(res.body.receipt.deliveryNoteNumber).toBe('0001 - 00001001');
      expect(res.body.receipt.items[0].receivedQtyBase).toBe('500.00'); // 5 boxes * 100 = 500 UN
      expect(res.body.receipt.items[0].provisionalCostUnitNet).toBe(
        '1450.5000',
      );
      expect(res.body.receipt.items[0].provisionalSubtotalNet).toBe(
        '7252.5000',
      ); // 5 * 1450.5
      expect(res.body.resultingPurchaseOrder.status).toBe(
        PurchaseOrderStatus.COMPLETADA,
      );

      // Verify Stock table incremented by 500
      const updatedStock = await ds
        .getRepository(Stock)
        .findOne({ where: { productId: testProduct1.id } });
      expect(Number(updatedStock?.currentBaseStock)).toBe(
        initialStockQty + 500,
      );

      // Verify StockMovement entry
      const movement = await ds
        .getRepository(StockMovement)
        .findOne({ where: { id: res.body.receipt.items[0].stockMovementId } });
      expect(movement).toBeDefined();
      expect(movement?.movementType).toBe(StockMovementType.ENTRADA_COMPRA);
      expect(Number(movement?.quantityBase)).toBe(500);
      expect(movement?.documentReference).toBe('0001 - 00001001');

      // Verify Product.costNet and SupplierProduct.usualCostNet did NOT change
      const prod = await ds
        .getRepository(Product)
        .findOne({ where: { id: testProduct1.id } });
      expect(Number(prod?.costNet)).toBe(15);
      const sp = await ds
        .getRepository(SupplierProduct)
        .findOne({ where: { id: testSp1.id } });
      expect(Number(sp?.usualCostNet)).toBe(1400);
    });

    it('records 3 cumulative partial receipts until order completion with zero rounding error', async () => {
      const { po, items } = await createAndEmitPo([
        {
          supplierProductId: testSp2.id,
          orderedQty: 10,
          expectedCostUnitNet: 2400,
        },
      ]);

      // Partial Receipt 1: 3 boxes
      const r1 = await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${po.id}/receipts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          deliveryNoteNumber: 'REM-PART-01',
          items: [
            { purchaseOrderItemId: items[0].id, receivedQtyPurchaseUnit: 3 },
          ],
        })
        .expect(201);

      expect(r1.body.resultingPurchaseOrder.status).toBe(
        PurchaseOrderStatus.PARCIAL,
      );
      expect(r1.body.resultingPurchaseOrder.items[0].receivedQty).toBe(
        '3.0000',
      );
      expect(r1.body.resultingPurchaseOrder.items[0].pendingQty).toBe('7.0000');

      // Partial Receipt 2: 4 boxes
      const r2 = await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${po.id}/receipts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          deliveryNoteNumber: 'REM-PART-02',
          items: [
            { purchaseOrderItemId: items[0].id, receivedQtyPurchaseUnit: 4 },
          ],
        })
        .expect(201);

      expect(r2.body.resultingPurchaseOrder.status).toBe(
        PurchaseOrderStatus.PARCIAL,
      );
      expect(r2.body.resultingPurchaseOrder.items[0].receivedQty).toBe(
        '7.0000',
      );
      expect(r2.body.resultingPurchaseOrder.items[0].pendingQty).toBe('3.0000');

      // Final Receipt 3: 3 boxes -> completes order
      const r3 = await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${po.id}/receipts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          deliveryNoteNumber: 'REM-PART-03',
          items: [
            { purchaseOrderItemId: items[0].id, receivedQtyPurchaseUnit: 3 },
          ],
        })
        .expect(201);

      expect(r3.body.resultingPurchaseOrder.status).toBe(
        PurchaseOrderStatus.COMPLETADA,
      );
      expect(r3.body.resultingPurchaseOrder.items[0].receivedQty).toBe(
        '10.0000',
      );
      expect(r3.body.resultingPurchaseOrder.items[0].pendingQty).toBe('0.0000');
    });

    it('records a multi-line purchase order receipt with distinct products', async () => {
      const { po, items } = await createAndEmitPo([
        {
          supplierProductId: testSp1.id,
          orderedQty: 2,
          expectedCostUnitNet: 1400,
        },
        {
          supplierProductId: testSp2.id,
          orderedQty: 2,
          expectedCostUnitNet: 2400,
        },
      ]);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${po.id}/receipts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          deliveryNoteNumber: 'REM-MULTI-001',
          items: [
            { purchaseOrderItemId: items[0].id, receivedQtyPurchaseUnit: 2 },
            { purchaseOrderItemId: items[1].id, receivedQtyPurchaseUnit: 2 },
          ],
        })
        .expect(201);

      expect(res.body.receipt.items).toHaveLength(2);
      expect(res.body.resultingPurchaseOrder.status).toBe(
        PurchaseOrderStatus.COMPLETADA,
      );
    });
  });

  describe('3. Validations & Error Handling', () => {
    it('returns 409 Conflict when attempting receipt on a BORRADOR purchase order', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          supplierId: testSupplier.id,
          items: [{ supplierProductId: testSp1.id, orderedQty: 1 }],
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${createRes.body.id}/receipts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          deliveryNoteNumber: 'REM-DRAFT-01',
          items: [
            {
              purchaseOrderItemId: createRes.body.items[0].id,
              receivedQtyPurchaseUnit: 1,
            },
          ],
        })
        .expect(409);
    });

    it('returns 409 Conflict when attempting receipt on a CANCELADA purchase order', async () => {
      const { po, items } = await createAndEmitPo([
        {
          supplierProductId: testSp1.id,
          orderedQty: 1,
          expectedCostUnitNet: 1400,
        },
      ]);

      await request(app.getHttpServer())
        .patch(`/api/v1/purchase-orders/${po.id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cancelReason: 'Proveedor canceló entrega' })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${po.id}/receipts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          deliveryNoteNumber: 'REM-CANC-01',
          items: [
            { purchaseOrderItemId: items[0].id, receivedQtyPurchaseUnit: 1 },
          ],
        })
        .expect(409);
    });

    it('returns 409 Conflict when attempting to receive more than remaining pending quantity', async () => {
      const { po, items } = await createAndEmitPo([
        {
          supplierProductId: testSp1.id,
          orderedQty: 5,
          expectedCostUnitNet: 1400,
        },
      ]);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${po.id}/receipts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          deliveryNoteNumber: 'REM-OVER-01',
          items: [
            { purchaseOrderItemId: items[0].id, receivedQtyPurchaseUnit: 6 },
          ],
        })
        .expect(409);

      expect(res.body.code).toBe(
        GoodsReceiptErrorCode.GOODS_RECEIPT_EXCEEDS_PENDING,
      );
    });

    it('returns 409 Conflict on duplicate delivery note for same supplier', async () => {
      const { po, items } = await createAndEmitPo([
        {
          supplierProductId: testSp1.id,
          orderedQty: 10,
          expectedCostUnitNet: 1400,
        },
      ]);

      // First receipt
      await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${po.id}/receipts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          deliveryNoteNumber: '0001-00009999',
          items: [
            { purchaseOrderItemId: items[0].id, receivedQtyPurchaseUnit: 2 },
          ],
        })
        .expect(201);

      // Second receipt with equivalent normalized delivery note: " 0001 - 00009999 "
      const dupRes = await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${po.id}/receipts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          deliveryNoteNumber: ' 0001 - 00009999 ',
          items: [
            { purchaseOrderItemId: items[0].id, receivedQtyPurchaseUnit: 2 },
          ],
        })
        .expect(409);

      expect(dupRes.body.code).toBe(
        GoodsReceiptErrorCode.GOODS_RECEIPT_DUPLICATE_DELIVERY_NOTE,
      );
    });
  });

  describe('4. Inactive Master Data Acceptance', () => {
    it('permits goods receipt even if supplier is deactivated after PO emission', async () => {
      const { po, items } = await createAndEmitPo([
        {
          supplierProductId: testSp1.id,
          orderedQty: 1,
          expectedCostUnitNet: 1400,
        },
      ]);

      // Deactivate supplier in database
      await ds
        .getRepository(Supplier)
        .update(testSupplier.id, { isActive: false });

      try {
        // Receipt must succeed
        await request(app.getHttpServer())
          .post(`/api/v1/purchase-orders/${po.id}/receipts`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            deliveryNoteNumber: 'REM-INACT-SUP',
            items: [
              { purchaseOrderItemId: items[0].id, receivedQtyPurchaseUnit: 1 },
            ],
          })
          .expect(201);
      } finally {
        // Restore supplier
        await ds
          .getRepository(Supplier)
          .update(testSupplier.id, { isActive: true });
      }
    });
  });

  describe('5. Coordinated Concurrency & Cancellation', () => {
    it('handles concurrent receipts against exact same pending balance: exactly one succeeds, 0 over-reception', async () => {
      const { po, items } = await createAndEmitPo([
        {
          supplierProductId: testSp1.id,
          orderedQty: 5,
          expectedCostUnitNet: 1400,
        },
      ]);

      const goodsReceiptsService = app.get(GoodsReceiptsService);

      const op1 = goodsReceiptsService.createGoodsReceipt(
        po.id,
        {
          deliveryNoteNumber: 'REM-CONC-A',
          items: [
            { purchaseOrderItemId: items[0].id, receivedQtyPurchaseUnit: 5 },
          ],
        },
        adminUser.id,
      );

      const op2 = goodsReceiptsService.createGoodsReceipt(
        po.id,
        {
          deliveryNoteNumber: 'REM-CONC-B',
          items: [
            { purchaseOrderItemId: items[0].id, receivedQtyPurchaseUnit: 5 },
          ],
        },
        adminUser.id,
      );

      const results = await Promise.allSettled([op1, op2]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      // Check item received qty in DB is exactly 5
      const poi = await ds
        .getRepository(PurchaseOrderItem)
        .findOne({ where: { id: items[0].id } });
      expect(Number(poi?.receivedQty)).toBe(5);
    });

    it('handles total receipt winning over subsequent cancellation: cancel fails with 409', async () => {
      const { po, items } = await createAndEmitPo([
        {
          supplierProductId: testSp1.id,
          orderedQty: 2,
          expectedCostUnitNet: 1400,
        },
      ]);

      // Complete receipt
      await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${po.id}/receipts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          deliveryNoteNumber: 'REM-WIN-TOTAL',
          items: [
            { purchaseOrderItemId: items[0].id, receivedQtyPurchaseUnit: 2 },
          ],
        })
        .expect(201);

      // Cancel must fail because PO is COMPLETADA
      await request(app.getHttpServer())
        .patch(`/api/v1/purchase-orders/${po.id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cancelReason: 'Cancelar completada' })
        .expect(409);
    });

    it('handles partial receipt winning: subsequent cancellation closes the unreceived balance', async () => {
      const { po, items } = await createAndEmitPo([
        {
          supplierProductId: testSp1.id,
          orderedQty: 4,
          expectedCostUnitNet: 1400,
        },
      ]);

      // Partial receipt: 2 units
      await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${po.id}/receipts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          deliveryNoteNumber: 'REM-WIN-PART',
          items: [
            { purchaseOrderItemId: items[0].id, receivedQtyPurchaseUnit: 2 },
          ],
        })
        .expect(201);

      // Cancel remaining balance succeeds
      const cancelRes = await request(app.getHttpServer())
        .patch(`/api/v1/purchase-orders/${po.id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cancelReason: 'Cancelar saldo restante' })
        .expect(200);

      expect(cancelRes.body.status).toBe(PurchaseOrderStatus.CANCELADA);

      // Further receipts on this now-cancelled order must be rejected
      await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${po.id}/receipts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          deliveryNoteNumber: 'REM-AFTER-CANCEL',
          items: [
            { purchaseOrderItemId: items[0].id, receivedQtyPurchaseUnit: 2 },
          ],
        })
        .expect(409);
    });
  });

  describe('6. Query Goods Receipts History', () => {
    it('returns paginated historical receipts for a purchase order in any state', async () => {
      const { po, items } = await createAndEmitPo([
        {
          supplierProductId: testSp1.id,
          orderedQty: 10,
          expectedCostUnitNet: 1400,
        },
      ]);

      // Create 2 receipts
      await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${po.id}/receipts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          deliveryNoteNumber: 'REM-HIST-01',
          items: [
            { purchaseOrderItemId: items[0].id, receivedQtyPurchaseUnit: 2 },
          ],
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${po.id}/receipts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          deliveryNoteNumber: 'REM-HIST-02',
          items: [
            { purchaseOrderItemId: items[0].id, receivedQtyPurchaseUnit: 3 },
          ],
        })
        .expect(201);

      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/purchase-orders/${po.id}/receipts?page=1&limit=10`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(listRes.body.data).toHaveLength(2);
      expect(listRes.body.meta.total).toBe(2);
      // Ordered DESC: newest first
      expect(listRes.body.data[0].deliveryNoteNumber).toBe('REM-HIST-02');
      expect(listRes.body.data[1].deliveryNoteNumber).toBe('REM-HIST-01');
    });
  });

  describe('7. Transactional Rollback (Injected Failures)', () => {
    it('rolls back completely when an injected failure occurs on the second stock movement', async () => {
      const { po, items } = await createAndEmitPo([
        {
          supplierProductId: testSp1.id,
          orderedQty: 5,
          expectedCostUnitNet: 1400,
        },
        {
          supplierProductId: testSp2.id,
          orderedQty: 5,
          expectedCostUnitNet: 2400,
        },
      ]);

      const initialStock1 = Number(
        (
          await ds
            .getRepository(Stock)
            .findOneBy({ productId: testProduct1.id })
        )?.currentBaseStock || 0,
      );
      const initialStock2 = Number(
        (
          await ds
            .getRepository(Stock)
            .findOneBy({ productId: testProduct2.id })
        )?.currentBaseStock || 0,
      );

      const stockService = app.get(StockService);
      let callCount = 0;
      const originalRecordMovement =
        stockService.recordMovement.bind(stockService);

      const spy = jest
        .spyOn(stockService, 'recordMovement')
        .mockImplementation(async (dto, manager) => {
          callCount++;
          if (callCount === 2) {
            throw new Error(
              'Simulated database failure on second stock movement',
            );
          }
          return originalRecordMovement(dto, manager);
        });

      await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${po.id}/receipts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          deliveryNoteNumber: 'REM-FAIL-STOCK-E2E',
          items: [
            { purchaseOrderItemId: items[0].id, receivedQtyPurchaseUnit: 2 },
            { purchaseOrderItemId: items[1].id, receivedQtyPurchaseUnit: 2 },
          ],
        })
        .expect(500);

      spy.mockRestore();

      // Verify 0 GoodsReceipt records created
      const grCount = await ds
        .getRepository(GoodsReceipt)
        .count({ where: { purchaseOrderId: po.id } });
      expect(grCount).toBe(0);

      // Verify stock balances unchanged
      const afterStock1 = Number(
        (
          await ds
            .getRepository(Stock)
            .findOneBy({ productId: testProduct1.id })
        )?.currentBaseStock || 0,
      );
      const afterStock2 = Number(
        (
          await ds
            .getRepository(Stock)
            .findOneBy({ productId: testProduct2.id })
        )?.currentBaseStock || 0,
      );
      expect(afterStock1).toBe(initialStock1);
      expect(afterStock2).toBe(initialStock2);

      // Verify PO items received quantities unchanged
      const poi1 = await ds
        .getRepository(PurchaseOrderItem)
        .findOneBy({ id: items[0].id });
      expect(Number(poi1?.receivedQty)).toBe(0);
    });

    it('rolls back completely when an injected failure occurs during audit logging', async () => {
      const { po, items } = await createAndEmitPo([
        {
          supplierProductId: testSp1.id,
          orderedQty: 5,
          expectedCostUnitNet: 1400,
        },
      ]);

      const initialStock1 = Number(
        (
          await ds
            .getRepository(Stock)
            .findOneBy({ productId: testProduct1.id })
        )?.currentBaseStock || 0,
      );

      const auditService = app.get(AuditService);
      const spy = jest
        .spyOn(auditService, 'record')
        .mockRejectedValueOnce(new Error('Simulated audit crash'));

      await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${po.id}/receipts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          deliveryNoteNumber: 'REM-FAIL-AUDIT-E2E',
          items: [
            { purchaseOrderItemId: items[0].id, receivedQtyPurchaseUnit: 2 },
          ],
        })
        .expect(500);

      spy.mockRestore();

      const grCount = await ds
        .getRepository(GoodsReceipt)
        .count({ where: { purchaseOrderId: po.id } });
      expect(grCount).toBe(0);

      const afterStock1 = Number(
        (
          await ds
            .getRepository(Stock)
            .findOneBy({ productId: testProduct1.id })
        )?.currentBaseStock || 0,
      );
      expect(afterStock1).toBe(initialStock1);

      const poi1 = await ds
        .getRepository(PurchaseOrderItem)
        .findOneBy({ id: items[0].id });
      expect(Number(poi1?.receivedQty)).toBe(0);
    });
  });
});
