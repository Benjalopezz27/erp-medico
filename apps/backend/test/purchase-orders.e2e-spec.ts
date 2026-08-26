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
import { Stock } from '../src/modules/stock/entities/stock.entity';
import { StockMovement } from '../src/modules/stock/entities/stock-movement.entity';

import {
  TaxCondition,
  ProductStatus,
  PurchaseOrderStatus,
  PurchaseOrderErrorCode,
} from '@erp/shared-types';
import dataSource from '../src/database/data-source';
import { runInitialSeed } from '../src/database/seeds/initial.seed';

describe('Purchase Orders Domain & Lifecycle (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;

  const adminPassword = 'AdminPassword123!';
  const sellerPassword = 'SellerPassword123!';

  let adminToken: string;
  let sellerToken: string;

  let testSupplier: Supplier;
  let secondSupplier: Supplier;
  let testCategory: Category;
  let testUnitBase: Unit;
  let testUnitPack: Unit;
  let testProduct1: Product;
  let testProduct2: Product;
  let testSp1: SupplierProduct;
  let testSp2: SupplierProduct;

  beforeAll(async () => {
    process.env.JWT_SECRET =
      process.env.JWT_SECRET ||
      'test_ci_jwt_secret_key_minimum_32_characters_long!';
    process.env.JWT_EXPIRATION = process.env.JWT_EXPIRATION || '8h';

    ds = await dataSource.initialize();
    await ds.runMigrations();

    const qr = ds.createQueryRunner();
    await qr.connect();
    await qr.query('TRUNCATE TABLE purchase_order_items CASCADE;');
    await qr.query('TRUNCATE TABLE purchase_orders CASCADE;');
    await qr.query('TRUNCATE TABLE supplier_products CASCADE;');
    await qr.query('TRUNCATE TABLE suppliers CASCADE;');
    await qr.query('TRUNCATE TABLE products CASCADE;');
    await qr.query('TRUNCATE TABLE units CASCADE;');
    await qr.query('TRUNCATE TABLE categories CASCADE;');
    await qr.query('TRUNCATE TABLE users CASCADE;');
    await qr.release();

    await runInitialSeed(ds, {
      adminEmail: 'admin-po@erp.com',
      adminPassword: adminPassword,
      vendedorEmail: 'seller-po@erp.com',
      vendedorPassword: sellerPassword,
    });

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

    // Authenticate Admin
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin-po@erp.com', password: adminPassword });
    adminToken = adminLoginRes.body.accessToken;

    // Authenticate Seller
    const sellerLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'seller-po@erp.com', password: sellerPassword });
    sellerToken = sellerLoginRes.body.accessToken;

    // Seed master catalog records for testing
    const catRepo = ds.getRepository(Category);
    testCategory = await catRepo.save(
      catRepo.create({
        name: 'Insumos Médicos PO',
        description: 'Test Category',
      }),
    );

    const unitRepo = ds.getRepository(Unit);
    testUnitBase = await unitRepo.save(
      unitRepo.create({ name: 'Unidad PO', symbol: 'un' }),
    );
    testUnitPack = await unitRepo.save(
      unitRepo.create({ name: 'Paquete PO', symbol: 'paq' }),
    );

    const prodRepo = ds.getRepository(Product);
    testProduct1 = await prodRepo.save(
      prodRepo.create({
        name: 'Gasa Estéril 10x10',
        categoryId: testCategory.id,
        baseUnitId: testUnitBase.id,
        minStock: 100,
        costNet: 100,
        markupPercentage: 30,
        suggestedPriceNet: 130,
        activePriceNet: 130,
        status: ProductStatus.ACTIVE,
      }),
    );
    testProduct2 = await prodRepo.save(
      prodRepo.create({
        name: 'Venda Elástica 10cm',
        categoryId: testCategory.id,
        baseUnitId: testUnitBase.id,
        minStock: 50,
        costNet: 2000,
        markupPercentage: 30,
        suggestedPriceNet: 2600,
        activePriceNet: 2600,
        status: ProductStatus.ACTIVE,
      }),
    );

    const supRepo = ds.getRepository(Supplier);
    testSupplier = await supRepo.save(
      supRepo.create({
        businessName: 'Droguería Médica Test',
        cuit: '30712345678',
        taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
        email: 'ventas@drogueria.com',
        phone: '+541145678900',
        isActive: true,
      }),
    );
    secondSupplier = await supRepo.save(
      supRepo.create({
        businessName: 'Distribuidora Farma Test',
        cuit: '30712345679',
        taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
        isActive: true,
      }),
    );

    const spRepo = ds.getRepository(SupplierProduct);
    testSp1 = await spRepo.save(
      spRepo.create({
        supplierId: testSupplier.id,
        productId: testProduct1.id,
        purchaseUnitId: testUnitPack.id,
        supplierExternalCode: 'MED-001',
        supplierDescription: 'Gasa estéril paquete x 10',
        conversionFactorToBase: 10,
        usualCostNet: 1200,
        isPrimarySupplier: true,
      }),
    );
    testSp2 = await spRepo.save(
      spRepo.create({
        supplierId: testSupplier.id,
        productId: testProduct2.id,
        purchaseUnitId: testUnitBase.id,
        supplierExternalCode: 'SKU-00123',
        supplierDescription: 'Venda elástica unidad',
        conversionFactorToBase: 1,
        usualCostNet: 2300,
        isPrimarySupplier: true,
      }),
    );
  });

  afterAll(async () => {
    if (app) await app.close();
    if (ds?.isInitialized) await ds.destroy();
  });

  describe('RBAC & Authentication', () => {
    it('returns 401 Unauthorized for unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/purchase-orders')
        .send({
          supplierId: testSupplier.id,
          items: [{ supplierProductId: testSp1.id, orderedQty: 10 }],
        })
        .expect(401);
    });

    it('returns 403 Forbidden for VENDEDOR role across all purchase order endpoints', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/purchase-orders')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .post('/api/v1/purchase-orders')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          supplierId: testSupplier.id,
          items: [{ supplierProductId: testSp1.id, orderedQty: 10 }],
        })
        .expect(403);
    });
  });

  describe('Concurrent Sequence Numbering (PostgreSQL)', () => {
    it('generates 10 sequential, distinct, conflict-free order numbers concurrently', async () => {
      const payload = {
        supplierId: testSupplier.id,
        notes: 'Concurrent test order',
        items: [{ supplierProductId: testSp1.id, orderedQty: 1 }],
      };

      const requests = Array.from({ length: 10 }).map(() =>
        request(app.getHttpServer())
          .post('/api/v1/purchase-orders')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(payload),
      );

      const responses = await Promise.all(requests);

      const orderNumbers: string[] = [];
      for (const res of responses) {
        expect(res.status).toBe(201);
        expect(res.body.orderNumber).toMatch(/^OC-[0-9]{6}$/);
        orderNumbers.push(res.body.orderNumber);
      }

      const uniqueOrderNumbers = new Set(orderNumbers);
      expect(uniqueOrderNumbers.size).toBe(10);
    });
  });

  describe('Draft CRUD, Cost Resolution & Atomic Replacement', () => {
    let createdPoId: string;

    it('creates a draft resolving usualCostNet when expected cost is omitted', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          supplierId: testSupplier.id,
          expectedDeliveryDate: '2026-09-15',
          notes: 'Entrega en depósito principal',
          items: [
            {
              supplierProductId: testSp1.id,
              orderedQty: 24,
              expectedCostUnitNet: 1250.5,
            },
            {
              supplierProductId: testSp2.id,
              orderedQty: 10,
              // expectedCostUnitNet omitted -> defaults to usualCostNet (2300)
            },
          ],
        })
        .expect(201);

      createdPoId = res.body.id;
      expect(res.body.status).toBe(PurchaseOrderStatus.BORRADOR);
      expect(res.body.items).toHaveLength(2);

      // Item 1: 24 * 1250.5 = 30012.0000
      expect(res.body.items[0].expectedCostUnitNet).toBe('1250.5000');
      expect(res.body.items[0].subtotalNet).toBe('30012.0000');
      expect(res.body.items[0].pendingQty).toBe('24.0000');

      // Item 2: 10 * 2300 = 23000.0000
      expect(res.body.items[1].expectedCostUnitNet).toBe('2300.0000');
      expect(res.body.items[1].subtotalNet).toBe('23000.0000');

      // Total: 30012 + 23000 = 53012.0000
      expect(res.body.totalNet).toBe('53012.0000');
    });

    it('updates draft notes, expected delivery, and replaces line items atomically', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/purchase-orders/${createdPoId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          notes: 'Nota modificada',
          expectedDeliveryDate: '2026-09-20',
          items: [
            {
              supplierProductId: testSp1.id,
              orderedQty: 5,
              expectedCostUnitNet: 1200,
            },
          ],
        })
        .expect(200);

      expect(res.body.notes).toBe('Nota modificada');
      expect(res.body.expectedDeliveryDate).toBe('2026-09-20');
      expect(res.body.items).toHaveLength(1);
      expect(res.body.totalNet).toBe('6000.0000');
      expect(res.body.items[0].orderedQty).toBe('5.0000');
    });

    it('rejects changing supplier on draft without providing new items', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/purchase-orders/${createdPoId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          supplierId: secondSupplier.id,
        })
        .expect(400);

      expect(res.body.code).toBe(
        PurchaseOrderErrorCode.PURCHASE_ORDER_SUPPLIER_CHANGE_REQUIRES_ITEMS,
      );
    });
  });

  describe('Emission, Snapshot Immutability & Zero Stock Invariant', () => {
    let orderToEmitId: string;
    let initialStocksCount: number;
    let initialMovementsCount: number;

    beforeAll(async () => {
      const stockRepo = ds.getRepository(Stock);
      const movementRepo = ds.getRepository(StockMovement);
      initialStocksCount = await stockRepo.count();
      initialMovementsCount = await movementRepo.count();

      const createRes = await request(app.getHttpServer())
        .post('/api/v1/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          supplierId: testSupplier.id,
          items: [
            {
              supplierProductId: testSp1.id,
              orderedQty: 10,
              expectedCostUnitNet: 1250,
            },
          ],
        })
        .expect(201);

      orderToEmitId = createRes.body.id;
    });

    it('emits the draft PO, transitions to EMITIDA, and verifies ZERO stock writes', async () => {
      const emitRes = await request(app.getHttpServer())
        .patch(`/api/v1/purchase-orders/${orderToEmitId}/emit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(emitRes.body.status).toBe(PurchaseOrderStatus.EMITIDA);
      expect(emitRes.body.emittedAt).not.toBeNull();

      // Verify ZERO writes in Stock & StockMovement
      const stockRepo = ds.getRepository(Stock);
      const movementRepo = ds.getRepository(StockMovement);
      const finalStocksCount = await stockRepo.count();
      const finalMovementsCount = await movementRepo.count();

      expect(finalStocksCount).toBe(initialStocksCount);
      expect(finalMovementsCount).toBe(initialMovementsCount);
    });

    it('preserves line snapshots when master SupplierProduct or Product are altered', async () => {
      // Modify SupplierProduct and Product in database
      const spRepo = ds.getRepository(SupplierProduct);
      await spRepo.update(testSp1.id, {
        usualCostNet: 9999,
        supplierExternalCode: 'MUTATED-SKU',
      });

      const prodRepo = ds.getRepository(Product);
      await prodRepo.update(testProduct1.id, {
        name: 'MUTATED PRODUCT NAME',
      });

      // Retrieve emitted PO detail
      const detailRes = await request(app.getHttpServer())
        .get(`/api/v1/purchase-orders/${orderToEmitId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const item = detailRes.body.items[0];
      // Snapshots remain immutable
      expect(item.supplierSku).toBe('MED-001');
      expect(item.productName).toBe('Gasa Estéril 10x10');
      expect(item.expectedCostUnitNet).toBe('1250.0000');
      expect(item.conversionFactor).toBe('10.0000');

      // Revert master product mutations for subsequent tests
      await spRepo.update(testSp1.id, {
        usualCostNet: 1200,
        supplierExternalCode: 'MED-001',
      });
      await prodRepo.update(testProduct1.id, {
        name: 'Gasa Estéril 10x10',
      });
    });

    it('rejects editing an already emitted purchase order', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/purchase-orders/${orderToEmitId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Attempt edit on emitted PO' })
        .expect(409);

      expect(res.body.code).toBe(
        PurchaseOrderErrorCode.PURCHASE_ORDER_CANNOT_EDIT_NON_DRAFT,
      );
    });

    it('rejects re-emitting an already emitted purchase order', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/purchase-orders/${orderToEmitId}/emit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);

      expect(res.body.code).toBe(
        PurchaseOrderErrorCode.PURCHASE_ORDER_CANNOT_EMIT_NON_DRAFT,
      );
    });
  });

  describe('Pre-Emission Drift Protection', () => {
    it('rejects emission with 409 Conflict if association configuration drifted', async () => {
      // 1. Create draft
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          supplierId: testSupplier.id,
          items: [{ supplierProductId: testSp1.id, orderedQty: 5 }],
        })
        .expect(201);

      const draftId = createRes.body.id;

      // 2. Mutate association conversion factor in DB
      const spRepo = ds.getRepository(SupplierProduct);
      await spRepo.update(testSp1.id, { conversionFactorToBase: 20 });

      // 3. Attempt emit
      const emitRes = await request(app.getHttpServer())
        .patch(`/api/v1/purchase-orders/${draftId}/emit`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);

      expect(emitRes.body.code).toBe(
        PurchaseOrderErrorCode.PURCHASE_ORDER_ASSOCIATION_CHANGED,
      );

      // Revert factor
      await spRepo.update(testSp1.id, { conversionFactorToBase: 10 });
    });
  });

  describe('Cancellation Lifecycle', () => {
    it('cancels from BORRADOR with cancelReason', async () => {
      const draftRes = await request(app.getHttpServer())
        .post('/api/v1/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          supplierId: testSupplier.id,
          items: [{ supplierProductId: testSp1.id, orderedQty: 2 }],
        })
        .expect(201);

      const cancelRes = await request(app.getHttpServer())
        .patch(`/api/v1/purchase-orders/${draftRes.body.id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cancelReason: 'Orden duplicada' })
        .expect(200);

      expect(cancelRes.body.status).toBe(PurchaseOrderStatus.CANCELADA);
      expect(cancelRes.body.cancelReason).toBe('Orden duplicada');
      expect(cancelRes.body.cancelledAt).not.toBeNull();
    });

    it('rejects cancelling an already cancelled purchase order', async () => {
      const draftRes = await request(app.getHttpServer())
        .post('/api/v1/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          supplierId: testSupplier.id,
          items: [{ supplierProductId: testSp1.id, orderedQty: 2 }],
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/purchase-orders/${draftRes.body.id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cancelReason: 'Cancelada primera vez' })
        .expect(200);

      const secondCancelRes = await request(app.getHttpServer())
        .patch(`/api/v1/purchase-orders/${draftRes.body.id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cancelReason: 'Cancelada segunda vez' })
        .expect(409);

      expect(secondCancelRes.body.code).toBe(
        PurchaseOrderErrorCode.PURCHASE_ORDER_CANNOT_CANCEL,
      );
    });
  });

  describe('Listing, Semi-Open Date Filters & Pagination', () => {
    it('filters purchase orders by supplierId, status, and semi-open date range', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/purchase-orders')
        .query({
          supplierId: testSupplier.id,
          status: PurchaseOrderStatus.BORRADOR,
          dateFrom: '2026-08-01',
          dateTo: '2026-08-30',
          page: 1,
          limit: 10,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(10);
    });
  });
});
