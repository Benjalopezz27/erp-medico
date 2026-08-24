import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import dataSource from '../src/database/data-source';
import { AppModule } from '../src/app.module';
import { StockService } from '../src/modules/stock/stock.service';
import {
  ProductStatus,
  StockMovementType,
  StockStatus,
} from '@erp/shared-types';
import { User } from '../src/modules/users/entities/user.entity';
import { Category } from '../src/modules/categories/entities/category.entity';
import { Unit } from '../src/modules/units/entities/unit.entity';
import { Product } from '../src/modules/products/entities/product.entity';
import { Stock } from '../src/modules/stock/entities/stock.entity';
import { runInitialSeed } from '../src/database/seeds/initial.seed';

describe('Stock Queries, Ledger History & Evolution Graph API (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let stockService: StockService;
  let adminToken: string;
  let sellerToken: string;
  let adminUser: User;

  let testCategory1: Category;
  let testCategory2: Category;
  let testUnit: Unit;

  let activeProductNormal: Product;
  let activeProductLow: Product;
  let activeProductCritical: Product;
  let inactiveProductWithMovements: Product;

  beforeAll(async () => {
    process.env.JWT_SECRET =
      process.env.JWT_SECRET ||
      'test_ci_jwt_secret_key_minimum_32_characters_long!';
    process.env.JWT_EXPIRATION = process.env.JWT_EXPIRATION || '15m';

    ds = await dataSource.initialize();
    await ds.runMigrations();

    const qr = ds.createQueryRunner();
    await qr.connect();
    await qr.query(
      'TRUNCATE TABLE stock_movements, stocks, product_unit_conversions, products, categories, units, users CASCADE;',
    );
    await qr.release();

    await runInitialSeed(ds, {
      adminEmail: 'stock-query-admin@erp.com',
      adminPassword: 'AdminPassword123!',
      vendedorEmail: 'stock-query-vendedor@erp.com',
      vendedorPassword: 'VendedorPassword123!',
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    stockService = app.get<StockService>(StockService);

    // Login Admin
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'stock-query-admin@erp.com',
        password: 'AdminPassword123!',
      });
    adminToken = adminLoginRes.body.accessToken;

    // Login Seller
    const sellerLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'stock-query-vendedor@erp.com',
        password: 'VendedorPassword123!',
      });
    sellerToken = sellerLoginRes.body.accessToken;

    const userRepo = ds.getRepository(User);
    adminUser = (await userRepo.findOneBy({
      email: 'stock-query-admin@erp.com',
    })) as User;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (ds?.isInitialized) {
      await ds.destroy();
    }
  });

  beforeEach(async () => {
    const queryRunner = ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.query('TRUNCATE TABLE stock_movements CASCADE');
    await queryRunner.query('TRUNCATE TABLE stocks CASCADE');
    await queryRunner.query('TRUNCATE TABLE product_unit_conversions CASCADE');
    await queryRunner.query('TRUNCATE TABLE products CASCADE');
    await queryRunner.query('TRUNCATE TABLE categories CASCADE');
    await queryRunner.query('TRUNCATE TABLE units CASCADE');

    // 1. Categories & Units
    testCategory1 = queryRunner.manager.create(Category, {
      name: 'Descartables',
    });
    await queryRunner.manager.save(Category, testCategory1);

    testCategory2 = queryRunner.manager.create(Category, {
      name: 'Soluciones',
    });
    await queryRunner.manager.save(Category, testCategory2);

    testUnit = queryRunner.manager.create(Unit, {
      name: 'Unidad',
      symbol: 'u',
    });
    await queryRunner.manager.save(Unit, testUnit);

    // 2. Active Product - Normal Stock (minStock: 50, balance: 150)
    activeProductNormal = queryRunner.manager.create(Product, {
      internalCode: 'P0001',
      name: 'Jeringa 5ml x100',
      categoryId: testCategory1.id,
      baseUnitId: testUnit.id,
      minStock: 50,
      costNet: 100,
      suggestedPriceNet: 140,
      activePriceNet: 140,
      status: ProductStatus.ACTIVE,
    });
    await queryRunner.manager.save(Product, activeProductNormal);
    const stockNormal = queryRunner.manager.create(Stock, {
      productId: activeProductNormal.id,
      currentBaseStock: '0.00',
    });
    await queryRunner.manager.save(Stock, stockNormal);

    // 3. Active Product - Low Stock (minStock: 100, balance: 45)
    activeProductLow = queryRunner.manager.create(Product, {
      internalCode: 'P0002',
      name: 'Suero Fisiológico 1L',
      categoryId: testCategory2.id,
      baseUnitId: testUnit.id,
      minStock: 100,
      costNet: 200,
      suggestedPriceNet: 280,
      activePriceNet: 280,
      status: ProductStatus.ACTIVE,
    });
    await queryRunner.manager.save(Product, activeProductLow);
    const stockLow = queryRunner.manager.create(Stock, {
      productId: activeProductLow.id,
      currentBaseStock: '0.00',
    });
    await queryRunner.manager.save(Stock, stockLow);

    // 4. Active Product - Critical Stock (minStock: 50, balance: 0)
    activeProductCritical = queryRunner.manager.create(Product, {
      internalCode: 'P0003',
      name: 'Catéter IV 20G',
      categoryId: testCategory1.id,
      baseUnitId: testUnit.id,
      minStock: 50,
      costNet: 300,
      suggestedPriceNet: 420,
      activePriceNet: 420,
      status: ProductStatus.ACTIVE,
    });
    await queryRunner.manager.save(Product, activeProductCritical);
    const stockCritical = queryRunner.manager.create(Stock, {
      productId: activeProductCritical.id,
      currentBaseStock: '0.00',
    });
    await queryRunner.manager.save(Stock, stockCritical);

    // 5. Inactive Product (minStock: 10, balance: 0)
    inactiveProductWithMovements = queryRunner.manager.create(Product, {
      internalCode: 'P0004',
      name: 'Producto Discontinuado',
      categoryId: testCategory1.id,
      baseUnitId: testUnit.id,
      minStock: 10,
      costNet: 50,
      suggestedPriceNet: 70,
      activePriceNet: 70,
      status: ProductStatus.INACTIVE,
    });
    await queryRunner.manager.save(Product, inactiveProductWithMovements);
    const stockInactive = queryRunner.manager.create(Stock, {
      productId: inactiveProductWithMovements.id,
      currentBaseStock: '0.00',
    });
    await queryRunner.manager.save(Stock, stockInactive);

    await queryRunner.release();

    // 6. Record movements to set balances
    // For activeProductNormal: Inward 150 -> balance 150 (NORMAL)
    await stockService.recordMovement({
      productId: activeProductNormal.id,
      movementType: StockMovementType.ENTRADA_COMPRA,
      quantityBase: 150,
      reason: 'Stock inicial normal',
      userId: adminUser.id,
    });

    // For activeProductLow: Inward 100 -> Outward 55 -> balance 45 (LOW, min 100)
    await stockService.recordMovement({
      productId: activeProductLow.id,
      movementType: StockMovementType.ENTRADA_COMPRA,
      quantityBase: 100,
      reason: 'Compra inicial',
      documentReference: 'REM-101',
      userId: adminUser.id,
    });
    await stockService.recordMovement({
      productId: activeProductLow.id,
      movementType: StockMovementType.SALIDA_VENTA,
      quantityBase: 55,
      reason: 'Venta mostrador',
      documentReference: 'FAC-201',
      userId: adminUser.id,
    });

    // For inactiveProductWithMovements: Inward 20 -> Outward 20 -> balance 0
    await stockService.recordMovement({
      productId: inactiveProductWithMovements.id,
      movementType: StockMovementType.ENTRADA_COMPRA,
      quantityBase: 20,
      reason: 'Histórico lote anterior',
      userId: adminUser.id,
    });
    await stockService.recordMovement({
      productId: inactiveProductWithMovements.id,
      movementType: StockMovementType.SALIDA_VENTA,
      quantityBase: 20,
      reason: 'Liquidación final',
      userId: adminUser.id,
    });
  });

  describe('GET /api/v1/stock (Stock Overview Catalog)', () => {
    it('blocks unauthenticated requests with 401 Unauthorized', async () => {
      await request(app.getHttpServer()).get('/api/v1/stock').expect(401);
    });

    it('returns all active products with derived status and excludes inactive products', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/stock')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(3);
      expect(res.body.meta.total).toBe(3);

      const codes = res.body.items.map((i: any) => i.internalCode);
      expect(codes).toContain('P0001');
      expect(codes).toContain('P0002');
      expect(codes).toContain('P0003');
      expect(codes).not.toContain('P0004'); // Inactive excluded

      // Verify health statuses
      const normalItem = res.body.items.find(
        (i: any) => i.internalCode === 'P0001',
      );
      expect(normalItem.currentBaseStock).toBe(150);
      expect(normalItem.minStock).toBe(50);
      expect(normalItem.stockStatus).toBe(StockStatus.NORMAL);

      const lowItem = res.body.items.find(
        (i: any) => i.internalCode === 'P0002',
      );
      expect(lowItem.currentBaseStock).toBe(45);
      expect(lowItem.minStock).toBe(100);
      expect(lowItem.stockStatus).toBe(StockStatus.LOW);

      const criticalItem = res.body.items.find(
        (i: any) => i.internalCode === 'P0003',
      );
      expect(criticalItem.currentBaseStock).toBe(0);
      expect(criticalItem.minStock).toBe(50);
      expect(criticalItem.stockStatus).toBe(StockStatus.CRITICAL);
    });

    it('ensures zero price and cost leaks for both Administrator and Seller', async () => {
      const adminRes = await request(app.getHttpServer())
        .get('/api/v1/stock')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const sellerRes = await request(app.getHttpServer())
        .get('/api/v1/stock')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      // Verify exact role parity
      expect(adminRes.body).toEqual(sellerRes.body);

      // Verify no financial columns in JSON payload
      for (const item of adminRes.body.items) {
        expect(item.costNet).toBeUndefined();
        expect(item.markupPercentage).toBeUndefined();
        expect(item.suggestedPriceNet).toBeUndefined();
        expect(item.activePriceNet).toBeUndefined();
      }
    });

    it('filters by category UUID', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/stock')
        .query({ categoryId: testCategory2.id })
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].internalCode).toBe('P0002');
      expect(res.body.items[0].category.name).toBe('Soluciones');
    });

    it('filters by stockStatus (CRITICAL, LOW, NORMAL)', async () => {
      const criticalRes = await request(app.getHttpServer())
        .get('/api/v1/stock')
        .query({ stockStatus: StockStatus.CRITICAL })
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);
      expect(criticalRes.body.items).toHaveLength(1);
      expect(criticalRes.body.items[0].internalCode).toBe('P0003');

      const lowRes = await request(app.getHttpServer())
        .get('/api/v1/stock')
        .query({ stockStatus: StockStatus.LOW })
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);
      expect(lowRes.body.items).toHaveLength(1);
      expect(lowRes.body.items[0].internalCode).toBe('P0002');

      const normalRes = await request(app.getHttpServer())
        .get('/api/v1/stock')
        .query({ stockStatus: StockStatus.NORMAL })
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);
      expect(normalRes.body.items).toHaveLength(1);
      expect(normalRes.body.items[0].internalCode).toBe('P0001');
    });

    it('searches by name or internal code with wildcard escaping', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/stock')
        .query({ search: 'Suero' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].internalCode).toBe('P0002');
    });
  });

  describe('GET /api/v1/stock/:productId/movements (Product Ledger)', () => {
    it('returns paginated ledger sorted createdAt DESC, id DESC with product summary', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/stock/${activeProductLow.id}/movements`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(res.body.product.productId).toBe(activeProductLow.id);
      expect(res.body.product.productName).toBe('Suero Fisiológico 1L');
      expect(res.body.product.currentBaseStock).toBe(45);
      expect(res.body.product.stockStatus).toBe(StockStatus.LOW);

      expect(res.body.items).toHaveLength(2);
      expect(res.body.items[0].movementType).toBe(
        StockMovementType.SALIDA_VENTA,
      );
      expect(res.body.items[0].quantityBase).toBe(55);
      expect(res.body.items[0].previousStock).toBe(100);
      expect(res.body.items[0].subsequentStock).toBe(45);
      expect(res.body.items[0].user.name).toBe(adminUser.name);

      expect(res.body.items[1].movementType).toBe(
        StockMovementType.ENTRADA_COMPRA,
      );
      expect(res.body.items[1].quantityBase).toBe(100);
      expect(res.body.items[1].previousStock).toBe(0);
      expect(res.body.items[1].subsequentStock).toBe(100);
    });

    it('allows querying ledger for INACTIVE product (audit invariance)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/stock/${inactiveProductWithMovements.id}/movements`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.product.productId).toBe(inactiveProductWithMovements.id);
      expect(res.body.product.status).toBe(ProductStatus.INACTIVE);
      expect(res.body.items).toHaveLength(2);
    });

    it('filters movements by movementType', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/stock/${activeProductLow.id}/movements`)
        .query({ movementType: StockMovementType.SALIDA_VENTA })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].movementType).toBe(
        StockMovementType.SALIDA_VENTA,
      );
    });

    it('returns 400 when from > to', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/stock/${activeProductLow.id}/movements`)
        .query({
          from: '2026-08-31T23:59:59.999Z',
          to: '2026-08-01T00:00:00.000Z',
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('returns 404 when product does not exist', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/stock/a0000000-0000-4000-8000-000000000000/movements')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('GET /api/v1/stock/:productId/evolution (Evolution Chart)', () => {
    it('returns chronologically ascending series with baseline and minStock reference', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/stock/${activeProductLow.id}/evolution`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(res.body.productId).toBe(activeProductLow.id);
      expect(res.body.minStock).toBe(100);
      expect(res.body.truncated).toBe(false);
      expect(res.body.points).toHaveLength(3);

      // Baseline
      expect(res.body.points[0].event).toBe('BASELINE');
      expect(res.body.points[0].balance).toBe(0);

      // Movement 1: Inward +100 -> balance 100
      expect(res.body.points[1].event).toBe(StockMovementType.ENTRADA_COMPRA);
      expect(res.body.points[1].balance).toBe(100);

      // Movement 2: Outward -55 -> balance 45
      expect(res.body.points[2].event).toBe(StockMovementType.SALIDA_VENTA);
      expect(res.body.points[2].balance).toBe(45);
    });

    it('handles 0 movements in product and returns empty points array with effective balance', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/stock/${activeProductCritical.id}/evolution`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(res.body.productId).toBe(activeProductCritical.id);
      expect(res.body.points).toHaveLength(0);
      expect(res.body.truncated).toBe(false);
    });

    it('returns 400 for invalid date range', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/stock/${activeProductLow.id}/evolution`)
        .query({
          from: '2026-08-31T23:59:59.999Z',
          to: '2026-08-01T00:00:00.000Z',
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('returns 404 for non-existent product', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/stock/a0000000-0000-4000-8000-000000000000/evolution')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  afterAll(async () => {
    if (ds?.isInitialized) {
      const qr = ds.createQueryRunner();
      await qr.connect();
      await qr.query(
        'TRUNCATE TABLE stock_movements, stocks, product_unit_conversions, products, categories, units, users CASCADE;',
      );
      await qr.release();
      await ds.destroy();
    }
    if (app) {
      await app.close();
    }
  });
});
