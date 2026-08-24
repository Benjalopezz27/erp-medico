import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import dataSource from '../src/database/data-source';
import { AppModule } from '../src/app.module';
import { StockService } from '../src/modules/stock/stock.service';
import { AuditService } from '../src/modules/audit/audit.service';
import {
  ProductStatus,
  StockMovementType,
  AuditAction,
} from '@erp/shared-types';
import { User } from '../src/modules/users/entities/user.entity';
import { Category } from '../src/modules/categories/entities/category.entity';
import { Unit } from '../src/modules/units/entities/unit.entity';
import { Product } from '../src/modules/products/entities/product.entity';
import { Stock } from '../src/modules/stock/entities/stock.entity';
import { AuditLog } from '../src/modules/audit/entities/audit-log.entity';
import { StockMovement } from '../src/modules/stock/entities/stock-movement.entity';
import { runInitialSeed } from '../src/database/seeds/initial.seed';

describe('Stock Adjustments & Low Stock Alerts API (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let stockService: StockService;
  let auditService: AuditService;
  let adminToken: string;
  let sellerToken: string;
  let adminUser: User;

  let testCategory: Category;
  let testUnit: Unit;

  let normalProduct: Product;
  let lowProduct: Product;
  let criticalProduct: Product;
  let zeroZeroProduct: Product;
  let inactiveProduct: Product;

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
      'TRUNCATE TABLE audit_logs, stock_movements, stocks, product_unit_conversions, products, categories, units, users CASCADE;',
    );
    await qr.release();

    await runInitialSeed(ds, {
      adminEmail: 'stock-adj-admin@erp.com',
      adminPassword: 'AdminPassword123!',
      vendedorEmail: 'stock-adj-vendedor@erp.com',
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
    auditService = app.get<AuditService>(AuditService);

    // Login Admin
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'stock-adj-admin@erp.com',
        password: 'AdminPassword123!',
      });
    adminToken = adminLoginRes.body.accessToken;

    // Login Seller
    const sellerLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'stock-adj-vendedor@erp.com',
        password: 'VendedorPassword123!',
      });
    sellerToken = sellerLoginRes.body.accessToken;

    const userRepo = ds.getRepository(User);
    adminUser = (await userRepo.findOneBy({
      email: 'stock-adj-admin@erp.com',
    })) as User;

    // Seed master catalog
    const catRepo = ds.getRepository(Category);
    testCategory = await catRepo.save(
      catRepo.create({
        name: 'Medicamentos E2E',
        description: 'Categoría para test de ajustes',
      }),
    );

    const unitRepo = ds.getRepository(Unit);
    testUnit = await unitRepo.save(
      unitRepo.create({
        name: 'Caja',
        symbol: 'cj',
      }),
    );

    const prodRepo = ds.getRepository(Product);

    // 1. Normal product: initial stock 100, minStock 50 (stockStatus: NORMAL)
    normalProduct = await prodRepo.save(
      prodRepo.create({
        internalCode: 'ADJ-NORM',
        name: 'Producto Normal Ajustes',
        description: 'Stock inicial 100',
        categoryId: testCategory.id,
        baseUnitId: testUnit.id,
        costNet: 50,
        suggestedPriceNet: 100,
        activePriceNet: 100,
        minStock: 50,
        status: ProductStatus.ACTIVE,
      }),
    );
    await stockService.recordMovement({
      productId: normalProduct.id,
      movementType: StockMovementType.ENTRADA_COMPRA,
      quantityBase: 100,
      reason: 'Carga inicial',
      userId: adminUser.id,
    });

    // 2. Low product: initial stock 20, minStock 50 (stockStatus: LOW)
    lowProduct = await prodRepo.save(
      prodRepo.create({
        internalCode: 'ADJ-LOW',
        name: 'Producto Stock Bajo',
        description: 'Stock inicial 20, min 50',
        categoryId: testCategory.id,
        baseUnitId: testUnit.id,
        costNet: 10,
        suggestedPriceNet: 20,
        activePriceNet: 20,
        minStock: 50,
        status: ProductStatus.ACTIVE,
      }),
    );
    await stockService.recordMovement({
      productId: lowProduct.id,
      movementType: StockMovementType.ENTRADA_COMPRA,
      quantityBase: 20,
      reason: 'Carga inicial baja',
      userId: adminUser.id,
    });

    // 3. Critical product: initial stock 0, minStock 10 (stockStatus: CRITICAL)
    criticalProduct = await prodRepo.save(
      prodRepo.create({
        internalCode: 'ADJ-CRIT',
        name: 'Producto Stock Crítico',
        description: 'Stock 0, min 10',
        categoryId: testCategory.id,
        baseUnitId: testUnit.id,
        costNet: 10,
        suggestedPriceNet: 20,
        activePriceNet: 20,
        minStock: 10,
        status: ProductStatus.ACTIVE,
      }),
    );

    // 4. Zero/Zero product: initial stock 0, minStock 0 (stockStatus: CRITICAL or <= 0)
    zeroZeroProduct = await prodRepo.save(
      prodRepo.create({
        internalCode: 'ADJ-ZERO',
        name: 'Producto Cero Cero',
        description: 'Stock 0, min 0',
        categoryId: testCategory.id,
        baseUnitId: testUnit.id,
        costNet: 10,
        suggestedPriceNet: 20,
        activePriceNet: 20,
        minStock: 0,
        status: ProductStatus.ACTIVE,
      }),
    );

    // 5. Inactive product: stock 5, minStock 50, status INACTIVE
    inactiveProduct = await prodRepo.save(
      prodRepo.create({
        internalCode: 'ADJ-INACT',
        name: 'Producto Inactivo',
        description: 'Inactivo con saldo',
        categoryId: testCategory.id,
        baseUnitId: testUnit.id,
        costNet: 10,
        suggestedPriceNet: 20,
        activePriceNet: 20,
        minStock: 50,
        status: ProductStatus.INACTIVE,
      }),
    );
    await stockService.recordMovement({
      productId: inactiveProduct.id,
      movementType: StockMovementType.ENTRADA_COMPRA,
      quantityBase: 5,
      reason: 'Carga previa',
      userId: adminUser.id,
    });
  });

  afterAll(async () => {
    if (ds && ds.isInitialized) {
      const qr = ds.createQueryRunner();
      await qr.connect();
      await qr.query(
        'TRUNCATE TABLE audit_logs, stock_movements, stocks, product_unit_conversions, products, categories, units, users CASCADE;',
      );
      await qr.release();
      await ds.destroy();
    }
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/v1/stock/adjustments', () => {
    it('rejects unauthenticated requests with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/stock/adjustments')
        .send({
          productId: normalProduct.id,
          movementType: StockMovementType.AJUSTE_ENTRADA,
          quantityBase: 10,
          reason: 'Test sin auth',
        })
        .expect(401);
    });

    it('rejects sellers (VENDEDOR) with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/stock/adjustments')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          productId: normalProduct.id,
          movementType: StockMovementType.AJUSTE_ENTRADA,
          quantityBase: 10,
          reason: 'Vendedor intentando ajuste',
        })
        .expect(403);
    });

    it('rejects client-supplied userId with 400 Bad Request (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/stock/adjustments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: normalProduct.id,
          movementType: StockMovementType.AJUSTE_ENTRADA,
          quantityBase: 10,
          reason: 'Intento de spoofing userId',
          userId: 'some-other-uuid',
        })
        .expect(400);
    });

    it('rejects invalid movement types with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/stock/adjustments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: normalProduct.id,
          movementType: 'ENTRADA_COMPRA',
          quantityBase: 10,
          reason: 'Tipo no permitido para ajuste manual',
        })
        .expect(400);
    });

    it('rejects quantityBase <= 0 or > 2 decimals with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/stock/adjustments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: normalProduct.id,
          movementType: StockMovementType.AJUSTE_ENTRADA,
          quantityBase: 0,
          reason: 'Cantidad cero',
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/v1/stock/adjustments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: normalProduct.id,
          movementType: StockMovementType.AJUSTE_ENTRADA,
          quantityBase: 10.123,
          reason: 'Exceso de decimales',
        })
        .expect(400);
    });

    it('rejects empty or whitespace-only reason with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/stock/adjustments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: normalProduct.id,
          movementType: StockMovementType.AJUSTE_ENTRADA,
          quantityBase: 5,
          reason: '   ',
        })
        .expect(400);
    });

    it('rejects non-existent productId with 404 Not Found', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/stock/adjustments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: '99999999-9999-4999-a999-999999999999',
          movementType: StockMovementType.AJUSTE_ENTRADA,
          quantityBase: 5,
          reason: 'Producto inexistente',
        })
        .expect(404);
    });

    it('rejects adjustment on inactive product with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/stock/adjustments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: inactiveProduct.id,
          movementType: StockMovementType.AJUSTE_ENTRADA,
          quantityBase: 10,
          reason: 'Ajuste en inactivo',
        })
        .expect(400);

      expect(res.body.message).toContain(
        'No se pueden registrar ajustes de stock en productos inactivos.',
      );
    });

    it('successfully registers AJUSTE_ENTRADA and records exact AuditLog entry', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/stock/adjustments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: normalProduct.id,
          movementType: StockMovementType.AJUSTE_ENTRADA,
          quantityBase: 15,
          reason: 'Ajuste por conteo físico (+15)',
          documentReference: 'ACTA-2026-001',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        productId: normalProduct.id,
        movementType: StockMovementType.AJUSTE_ENTRADA,
        quantityBase: 15,
        previousStock: 100,
        subsequentStock: 115,
        reason: 'Ajuste por conteo físico (+15)',
        documentReference: 'ACTA-2026-001',
        userId: adminUser.id,
      });

      // Verify AuditLog in database
      const auditRepo = ds.getRepository(AuditLog);
      const logs = await auditRepo.find({
        where: { entityId: normalProduct.id, action: AuditAction.UPDATE },
        order: { createdAt: 'DESC' },
      });

      expect(logs.length).toBeGreaterThanOrEqual(1);
      const latestAudit = logs[0];
      expect(latestAudit.actorId).toBe(adminUser.id);
      expect(latestAudit.entityName).toBe('Stock');
      expect(latestAudit.previousValues).toEqual({
        productId: normalProduct.id,
        currentBaseStock: 100,
      });
      expect(latestAudit.newValues).toEqual({
        productId: normalProduct.id,
        movementId: res.body.id,
        movementType: StockMovementType.AJUSTE_ENTRADA,
        quantityBase: 15,
        previousStock: 100,
        subsequentStock: 115,
        reason: 'Ajuste por conteo físico (+15)',
        documentReference: 'ACTA-2026-001',
      });
    });

    it('successfully registers AJUSTE_SALIDA and decreases stock', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/stock/adjustments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: normalProduct.id,
          movementType: StockMovementType.AJUSTE_SALIDA,
          quantityBase: 20,
          reason: 'Ajuste de salida (-20)',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        productId: normalProduct.id,
        movementType: StockMovementType.AJUSTE_SALIDA,
        quantityBase: 20,
        previousStock: 115,
        subsequentStock: 95,
      });
    });

    it('successfully registers MERMA and decreases stock', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/stock/adjustments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: normalProduct.id,
          movementType: StockMovementType.MERMA,
          quantityBase: 5,
          reason: 'Merma por frasco roto (-5)',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        productId: normalProduct.id,
        movementType: StockMovementType.MERMA,
        quantityBase: 5,
        previousStock: 95,
        subsequentStock: 90,
      });
    });

    it('returns 422 Unprocessable Entity when outward adjustment exceeds available stock', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/stock/adjustments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: normalProduct.id,
          movementType: StockMovementType.AJUSTE_SALIDA,
          quantityBase: 500,
          reason: 'Intento de descontar más de lo disponible',
        })
        .expect(422);

      expect(res.body).toMatchObject({
        statusCode: 422,
        code: 'INSUFFICIENT_STOCK',
        details: {
          productId: normalProduct.id,
          available: 90,
          requested: 500,
        },
      });

      // Stock should remain untouched at 90
      const stockRepo = ds.getRepository(Stock);
      const stock = await stockRepo.findOneBy({ productId: normalProduct.id });
      expect(Number(stock?.currentBaseStock)).toBe(90);
    });

    it('rolls back database transaction cleanly if AuditService fails', async () => {
      const spy = jest
        .spyOn(auditService, 'record')
        .mockRejectedValueOnce(new Error('Simulated Audit Failure'));

      await request(app.getHttpServer())
        .post('/api/v1/stock/adjustments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: normalProduct.id,
          movementType: StockMovementType.AJUSTE_ENTRADA,
          quantityBase: 50,
          reason: 'Ajuste que debe hacer rollback por fallo en auditoría',
        })
        .expect(500);

      spy.mockRestore();

      // Check stock in DB: still 90
      const stockRepo = ds.getRepository(Stock);
      const stock = await stockRepo.findOneBy({ productId: normalProduct.id });
      expect(Number(stock?.currentBaseStock)).toBe(90);

      // Check movements: no movement with reason containing 'rollback'
      const movRepo = ds.getRepository(StockMovement);
      const mov = await movRepo.findOneBy({
        reason: 'Ajuste que debe hacer rollback por fallo en auditoría',
      });
      expect(mov).toBeNull();
    });
  });

  describe('GET /api/v1/stock/alerts', () => {
    it('rejects unauthenticated requests with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/stock/alerts')
        .expect(401);
    });

    it('allows both ADMINISTRADOR and VENDEDOR', async () => {
      const adminRes = await request(app.getHttpServer())
        .get('/api/v1/stock/alerts')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const sellerRes = await request(app.getHttpServer())
        .get('/api/v1/stock/alerts')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(adminRes.body.meta.total).toBe(sellerRes.body.meta.total);
    });

    it('returns only active products with currentBaseStock <= minStock', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/stock/alerts')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const returnedProductIds = res.body.items.map((i: any) => i.productId);

      // normalProduct: stock 90, minStock 50 -> NOT an alert
      expect(returnedProductIds).not.toContain(normalProduct.id);

      // lowProduct: stock 20, minStock 50 -> IS an alert
      expect(returnedProductIds).toContain(lowProduct.id);

      // criticalProduct: stock 0, minStock 10 -> IS an alert
      expect(returnedProductIds).toContain(criticalProduct.id);

      // zeroZeroProduct: stock 0, minStock 0 (0 <= 0) -> IS an alert
      expect(returnedProductIds).toContain(zeroZeroProduct.id);

      // inactiveProduct: status INACTIVE -> NOT in alerts
      expect(returnedProductIds).not.toContain(inactiveProduct.id);
    });

    it('filters alerts by search term and categoryId', async () => {
      const searchRes = await request(app.getHttpServer())
        .get('/api/v1/stock/alerts?search=ADJ-LOW')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(searchRes.body.items).toHaveLength(1);
      expect(searchRes.body.items[0].productId).toBe(lowProduct.id);

      const catRes = await request(app.getHttpServer())
        .get(`/api/v1/stock/alerts?categoryId=${testCategory.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(catRes.body.meta.total).toBeGreaterThanOrEqual(3);
    });

    it('supports pagination with page and limit', async () => {
      const p1Res = await request(app.getHttpServer())
        .get('/api/v1/stock/alerts?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(p1Res.body.items).toHaveLength(1);
      expect(p1Res.body.meta.limit).toBe(1);
      expect(p1Res.body.meta.page).toBe(1);
      expect(p1Res.body.meta.hasNextPage).toBe(true);
    });
  });
});
