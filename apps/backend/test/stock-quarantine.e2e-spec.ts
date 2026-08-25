import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import dataSource from '../src/database/data-source';
import { AppModule } from '../src/app.module';
import {
  ProductStatus,
  StockMovementType,
  QuarantineStatus,
  QuarantineResolution,
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

describe('Stock Quarantine API (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let adminToken: string;
  let sellerToken: string;
  let adminUser: User;

  let testCategory: Category;
  let testUnit: Unit;
  let activeProduct: Product;
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
      'TRUNCATE TABLE quarantine_stocks, stock_import_batches, audit_logs, stock_movements, stocks, product_unit_conversions, products, categories, units, users CASCADE;',
    );
    await qr.release();

    await runInitialSeed(ds, {
      adminEmail: 'quar-admin@erp.com',
      adminPassword: 'AdminPassword123!',
      vendedorEmail: 'quar-vendedor@erp.com',
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

    // Login Admin
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'quar-admin@erp.com',
        password: 'AdminPassword123!',
      });
    adminToken = adminLoginRes.body.accessToken;

    // Login Vendedor
    const sellerLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'quar-vendedor@erp.com',
        password: 'VendedorPassword123!',
      });
    sellerToken = sellerLoginRes.body.accessToken;

    adminUser = (await ds
      .getRepository(User)
      .findOneBy({ email: 'quar-admin@erp.com' }))!;

    // Create Test Master Data
    testCategory = await ds.getRepository(Category).save({
      name: 'Medicamentos Cuarentena',
      description: 'Categoría para test de cuarentena',
    });

    testUnit = await ds.getRepository(Unit).save({
      name: 'Comprimido',
      symbol: 'cmp',
    });

    activeProduct = await ds.getRepository(Product).save({
      internalCode: 'QUAR-001',
      name: 'Amoxicilina 500mg Cuarentena',
      categoryId: testCategory.id,
      baseUnitId: testUnit.id,
      minStock: 10,
      status: ProductStatus.ACTIVE,
    });

    inactiveProduct = await ds.getRepository(Product).save({
      internalCode: 'QUAR-INACT',
      name: 'Producto Inactivo Test',
      categoryId: testCategory.id,
      baseUnitId: testUnit.id,
      minStock: 5,
      status: ProductStatus.INACTIVE,
    });
  });

  beforeEach(async () => {
    // Reset stock of activeProduct to 100 before each test
    const stockRepo = ds.getRepository(Stock);
    let stock = await stockRepo.findOneBy({ productId: activeProduct.id });
    if (!stock) {
      stock = stockRepo.create({
        productId: activeProduct.id,
        currentBaseStock: '100.00',
      });
    } else {
      stock.currentBaseStock = '100.00';
    }
    await stockRepo.save(stock);
  });

  afterAll(async () => {
    await app.close();
    if (ds.isInitialized) {
      await ds.destroy();
    }
  });

  describe('1. Security & RBAC Policies', () => {
    it('POST /api/v1/quarantine returns 401 without JWT', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/quarantine')
        .send({
          productId: activeProduct.id,
          quantityBase: 5,
          reason: 'Test',
        })
        .expect(401);
    });

    it('POST /api/v1/quarantine returns 403 for VENDEDOR', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/quarantine')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          productId: activeProduct.id,
          quantityBase: 5,
          reason: 'Test',
        })
        .expect(403);
    });

    it('GET /api/v1/quarantine returns 403 for VENDEDOR', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/quarantine')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(403);
    });

    it('PATCH /api/v1/quarantine/:id/resolve returns 403 for VENDEDOR', async () => {
      await request(app.getHttpServer())
        .patch(
          '/api/v1/quarantine/00000000-0000-0000-0000-000000000000/resolve',
        )
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          resolution: QuarantineResolution.MERMA,
          resolutionNotes: 'Notas',
        })
        .expect(403);
    });
  });

  describe('2. Quarantine Entry Flow (POST /api/v1/quarantine)', () => {
    it('rejects with 400 Bad Request when product is inactive', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/quarantine')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: inactiveProduct.id,
          quantityBase: 5,
          reason: 'Mercadería dañada',
        })
        .expect(400);

      expect(res.body.message).toContain('inactivo');
    });

    it('rejects with 422 Unprocessable Entity when available stock is insufficient', async () => {
      const initialStock = await ds
        .getRepository(Stock)
        .findOneBy({ productId: activeProduct.id });

      const res = await request(app.getHttpServer())
        .post('/api/v1/quarantine')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: activeProduct.id,
          quantityBase: 500, // Available is 100
          reason: 'Lote sospechoso',
        })
        .expect(422);

      expect(res.body.code).toBe('INSUFFICIENT_STOCK');

      // Verify no movements or quarantine records were created
      const stockAfter = await ds
        .getRepository(Stock)
        .findOneBy({ productId: activeProduct.id });
      expect(Number(stockAfter?.currentBaseStock)).toBe(
        Number(initialStock?.currentBaseStock),
      );
    });

    it('successfully transfers stock from available to quarantine (AJUSTE_SALIDA)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/quarantine')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: activeProduct.id,
          quantityBase: 20,
          reason: 'Cajas con humedad',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBe(QuarantineStatus.EN_CUARENTENA);
      expect(res.body.quantityBase).toBe(20);
      expect(res.body.product.internalCode).toBe('QUAR-001');
      expect(res.body.entryActor.name).toBe(adminUser.name);
      expect(res.body.entryMovementId).toBeDefined();

      // Check available stock was reduced to 80
      const stockAfter = await ds
        .getRepository(Stock)
        .findOneBy({ productId: activeProduct.id });
      expect(Number(stockAfter?.currentBaseStock)).toBe(80);

      // Verify Audit Log was recorded
      const auditLog = await ds.getRepository(AuditLog).findOne({
        where: { entityId: res.body.id, action: AuditAction.CREATE },
      });
      expect(auditLog).toBeDefined();
      expect(auditLog?.actorId).toBe(adminUser.id);
    });
  });

  describe('3. Quarantine Listing & Filters (GET /api/v1/quarantine)', () => {
    it('returns paginated quarantine list with product and actor metadata', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/quarantine')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(res.body.items).toBeInstanceOf(Array);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
      expect(res.body.items[0].product.name).toBe(
        'Amoxicilina 500mg Cuarentena',
      );
    });

    it('filters quarantine entries by status and search text', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/quarantine')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          status: QuarantineStatus.EN_CUARENTENA,
          search: 'QUAR-001',
        })
        .expect(200);

      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.items[0].status).toBe(QuarantineStatus.EN_CUARENTENA);
    });
  });

  describe('4. Quarantine Resolution Flows (PATCH /api/v1/quarantine/:id/resolve)', () => {
    it('resolves as MERMA without deducting additional stock balance', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/quarantine')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: activeProduct.id,
          quantityBase: 10,
          reason: 'Para Merma',
        })
        .expect(201);

      const quarantineId = createRes.body.id;
      const stockBefore = await ds
        .getRepository(Stock)
        .findOneBy({ productId: activeProduct.id });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/quarantine/${quarantineId}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resolution: QuarantineResolution.MERMA,
          resolutionNotes: 'Destrucción de mercadería autorizada',
        })
        .expect(200);

      expect(res.body.status).toBe(QuarantineStatus.MERMA_CONFIRMADA);
      expect(res.body.resolutionNotes).toBe(
        'Destrucción de mercadería autorizada',
      );
      expect(res.body.resolvedByActor.name).toBe(adminUser.name);
      expect(res.body.resolutionMovementId).toBeNull();

      const stockAfter = await ds
        .getRepository(Stock)
        .findOneBy({ productId: activeProduct.id });
      expect(Number(stockAfter?.currentBaseStock)).toBe(
        Number(stockBefore?.currentBaseStock),
      );
    });

    it('resolves as DEVOLUCION_PROVEEDOR without changing balance', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/quarantine')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: activeProduct.id,
          quantityBase: 5,
          reason: 'Para Devolucion',
        })
        .expect(201);

      const quarantineId = createRes.body.id;
      const stockBefore = await ds
        .getRepository(Stock)
        .findOneBy({ productId: activeProduct.id });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/quarantine/${quarantineId}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resolution: QuarantineResolution.DEVOLUCION_PROVEEDOR,
          resolutionNotes: 'Devuelto a distribuidora con nota de crédito',
        })
        .expect(200);

      expect(res.body.status).toBe(QuarantineStatus.DEVOLUCION_PROVEEDOR);
      expect(res.body.resolutionMovementId).toBeNull();

      const stockAfter = await ds
        .getRepository(Stock)
        .findOneBy({ productId: activeProduct.id });
      expect(Number(stockAfter?.currentBaseStock)).toBe(
        Number(stockBefore?.currentBaseStock),
      );
    });

    it('resolves as REINGRESO adding stock back to available via AJUSTE_ENTRADA', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/quarantine')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: activeProduct.id,
          quantityBase: 15,
          reason: 'Para Reingreso',
        })
        .expect(201);

      const quarantineId = createRes.body.id;
      const stockBefore = await ds
        .getRepository(Stock)
        .findOneBy({ productId: activeProduct.id });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/quarantine/${quarantineId}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resolution: QuarantineResolution.REINGRESO,
          resolutionNotes: 'Mercadería revisada en laboratorio, apta',
        })
        .expect(200);

      expect(res.body.status).toBe(QuarantineStatus.REINGRESADO_STOCK);
      expect(res.body.resolutionMovementId).toBeDefined();

      const stockAfter = await ds
        .getRepository(Stock)
        .findOneBy({ productId: activeProduct.id });
      expect(Number(stockAfter?.currentBaseStock)).toBe(
        Number(stockBefore?.currentBaseStock) + 15,
      );

      // Verify the resolution stock movement exists
      const mov = await ds
        .getRepository(StockMovement)
        .findOneBy({ id: res.body.resolutionMovementId });
      expect(mov?.movementType).toBe(StockMovementType.AJUSTE_ENTRADA);
      expect(Number(mov?.quantityBase)).toBe(15);
    });

    it('rejects sequential double resolution with 409 Conflict', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/quarantine')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: activeProduct.id,
          quantityBase: 10,
          reason: 'Para Double Resolve',
        })
        .expect(201);

      const quarantineId = createRes.body.id;

      // First resolution
      await request(app.getHttpServer())
        .patch(`/api/v1/quarantine/${quarantineId}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resolution: QuarantineResolution.MERMA,
          resolutionNotes: 'Primera resolución',
        })
        .expect(200);

      // Second resolution on same ID
      const secondRes = await request(app.getHttpServer())
        .patch(`/api/v1/quarantine/${quarantineId}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resolution: QuarantineResolution.REINGRESO,
          resolutionNotes: 'Intento duplicado',
        })
        .expect(409);

      expect(secondRes.body.message).toContain('ya ha sido resuelto');
    });
  });

  describe('5. Concurrency Race Condition Control (Pessimistic FOR UPDATE Lock)', () => {
    it('handles concurrent resolutions deterministically: exactly 1 succeeds (200), other receives 409', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/quarantine')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: activeProduct.id,
          quantityBase: 10,
          reason: 'Test de concurrencia',
        })
        .expect(201);

      const quarantineId = createRes.body.id;

      const stockBefore = await ds
        .getRepository(Stock)
        .findOneBy({ productId: activeProduct.id });

      // Execute 2 concurrent resolution requests simultaneously
      const [res1, res2] = await Promise.all([
        request(app.getHttpServer())
          .patch(`/api/v1/quarantine/${quarantineId}/resolve`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            resolution: QuarantineResolution.REINGRESO,
            resolutionNotes: 'Resolución concurrente hilo 1',
          }),
        request(app.getHttpServer())
          .patch(`/api/v1/quarantine/${quarantineId}/resolve`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            resolution: QuarantineResolution.REINGRESO,
            resolutionNotes: 'Resolución concurrente hilo 2',
          }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 409]);

      // Stock should have incremented exactly once (+10)
      const stockAfter = await ds
        .getRepository(Stock)
        .findOneBy({ productId: activeProduct.id });
      expect(Number(stockAfter?.currentBaseStock)).toBe(
        Number(stockBefore?.currentBaseStock) + 10,
      );
    });
  });
});
