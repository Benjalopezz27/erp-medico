import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import * as ExcelJS from 'exceljs';
import dataSource from '../src/database/data-source';
import { AppModule } from '../src/app.module';
import { StockService } from '../src/modules/stock/stock.service';
import {
  ProductStatus,
  StockMovementType,
  AuditAction,
  StockBulkRowErrorCode,
  StockBulkFileErrorCode,
  StockBulkLoadRowStatus,
} from '@erp/shared-types';
import { User } from '../src/modules/users/entities/user.entity';
import { Category } from '../src/modules/categories/entities/category.entity';
import { Unit } from '../src/modules/units/entities/unit.entity';
import { Product } from '../src/modules/products/entities/product.entity';
import { Stock } from '../src/modules/stock/entities/stock.entity';
import { AuditLog } from '../src/modules/audit/entities/audit-log.entity';
import { StockMovement } from '../src/modules/stock/entities/stock-movement.entity';
import { StockImportBatch } from '../src/modules/stock/entities/stock-import-batch.entity';
import { runInitialSeed } from '../src/database/seeds/initial.seed';

describe('Stock Initial Bulk Load API (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let stockService: StockService;
  let adminToken: string;
  let sellerToken: string;
  let adminUser: User;

  let testCategory: Category;
  let testUnit: Unit;
  let activeProduct1: Product;
  let activeProduct2: Product;

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
      'TRUNCATE TABLE stock_import_batches, audit_logs, stock_movements, stocks, product_unit_conversions, products, categories, units, users CASCADE;',
    );
    await qr.release();

    await runInitialSeed(ds, {
      adminEmail: 'bulk-admin@erp.com',
      adminPassword: 'AdminPassword123!',
      vendedorEmail: 'bulk-vendedor@erp.com',
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
        email: 'bulk-admin@erp.com',
        password: 'AdminPassword123!',
      });
    adminToken = adminLoginRes.body.accessToken;

    // Login Seller
    const sellerLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'bulk-vendedor@erp.com',
        password: 'VendedorPassword123!',
      });
    sellerToken = sellerLoginRes.body.accessToken;

    adminUser = await ds
      .getRepository(User)
      .findOneByOrFail({ email: 'bulk-admin@erp.com' });

    // Seed master catalog records
    testCategory = await ds.getRepository(Category).save({
      name: 'Medicamentos Bulk',
      description: 'Categoría para tests de carga inicial',
    });

    testUnit = await ds.getRepository(Unit).save({
      name: 'Unidad Bulk',
      symbol: 'ub',
    });

    activeProduct1 = await ds.getRepository(Product).save({
      internalCode: 'BLK001',
      barcode: '7790001000011',
      name: 'Amoxicilina 500mg, cápsulas',
      description: 'Antibiótico',
      categoryId: testCategory.id,
      baseUnitId: testUnit.id,
      minStock: '10.00',
      status: ProductStatus.ACTIVE,
    });

    activeProduct2 = await ds.getRepository(Product).save({
      internalCode: 'BLK002',
      barcode: '7790001000022',
      name: 'Ibuprofeno 600mg',
      description: 'Antiinflamatorio',
      categoryId: testCategory.id,
      baseUnitId: testUnit.id,
      minStock: '20.00',
      status: ProductStatus.ACTIVE,
    });

    await ds.getRepository(Product).save({
      internalCode: 'BLK003',
      barcode: '7790001000033',
      name: 'Producto Inactivo',
      description: 'Inactivo',
      categoryId: testCategory.id,
      baseUnitId: testUnit.id,
      minStock: '5.00',
      status: ProductStatus.INACTIVE,
    });

    // Initialize stock for BLK001 with 10.00 initial balance
    await stockService.ensureStockExists(activeProduct1.id);
    await ds
      .getRepository(Stock)
      .update({ productId: activeProduct1.id }, { currentBaseStock: '10.00' });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (ds && ds.isInitialized) {
      await ds.destroy();
    }
  });

  describe('1. Pre-Populated Template Download (GET /api/v1/stock/bulk-load/template)', () => {
    it('downloads pre-populated XLSX template with active products only', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/stock/bulk-load/template?format=xlsx')
        .set('Authorization', `Bearer ${adminToken}`)
        .buffer()
        .parse((res: any, callback: any) => {
          const data: Buffer[] = [];
          res.on('data', (chunk: Buffer) => data.push(chunk));
          res.on('end', () => callback(null, Buffer.concat(data)));
        })
        .expect(200);

      expect(res.headers['content-type']).toContain('spreadsheetml');
      expect(res.headers['content-disposition']).toContain(
        'plantilla_carga_stock.xlsx',
      );

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(res.body);

      const worksheet = workbook.getWorksheet('Inventario');
      expect(worksheet).toBeDefined();
      expect(worksheet?.rowCount).toBe(3); // 1 header + 2 active products (BLK003 inactive excluded)

      const row2 = worksheet?.getRow(2);
      expect(row2?.getCell(1).value).toBe('BLK001');
      expect(row2?.getCell(2).value).toBe('Amoxicilina 500mg, cápsulas');
      expect(row2?.getCell(3).value).toBe('Unidad Bulk (ub)');
      expect(row2?.getCell(4).value).toBeNull();
    });

    it('downloads pre-populated CSV template with active products and RFC-4180 escaping', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/stock/bulk-load/template?format=csv')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain(
        'internalCode,productName,baseUnit,quantityBase',
      );
      expect(res.text).toContain('BLK001');
      expect(res.text).toContain('"Amoxicilina 500mg, cápsulas"');
      expect(res.text).toContain('BLK002');
      expect(res.text).not.toContain('BLK003'); // Inactive excluded
    });

    it('rejects seller access to template with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/stock/bulk-load/template')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(403);
    });

    it('rejects unauthenticated access with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/stock/bulk-load/template')
        .expect(401);
    });
  });

  describe('2. Preview Endpoint (POST /api/v1/stock/bulk-load/preview)', () => {
    it('returns valid preview with SKIPPED rows for empty quantities', async () => {
      const csvContent =
        'internalCode,productName,baseUnit,quantityBase\nBLK001,Amoxicilina,ub,50.00\nBLK002,Ibuprofeno,ub,\n';
      const res = await request(app.getHttpServer())
        .post('/api/v1/stock/bulk-load/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from(csvContent, 'utf8'), 'carga.csv')
        .expect(200);

      expect(res.body.valid).toBe(true);
      expect(res.body.fileChecksum).toBeDefined();
      expect(res.body.contentChecksum).toBeDefined();
      expect(res.body.summary).toEqual({
        totalRows: 2,
        includedRows: 1,
        skippedRows: 1,
        validRows: 1,
        invalidRows: 0,
        totalQuantityBase: 50,
      });
      expect(res.body.rows[0].status).toBe(
        StockBulkLoadRowStatus.INCLUDED_VALID,
      );
      expect(res.body.rows[0].quantityBase).toBe(50);
      expect(res.body.rows[1].status).toBe(StockBulkLoadRowStatus.SKIPPED);
      expect(res.body.rows[1].quantityBase).toBeNull();
      expect(res.body.rows[1].product).toBeDefined(); // Catalog metadata attached
    });

    it('returns valid: false, contentChecksum: null when all rows are SKIPPED', async () => {
      const csvContent =
        'internalCode,productName,baseUnit,quantityBase\nBLK001,Amox,ub,\nBLK002,Ibu,ub,\n';
      const res = await request(app.getHttpServer())
        .post('/api/v1/stock/bulk-load/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from(csvContent, 'utf8'), 'all_skipped.csv')
        .expect(200);

      expect(res.body.valid).toBe(false);
      expect(res.body.contentChecksum).toBeNull();
      expect(res.body.summary.includedRows).toBe(0);
      expect(res.body.summary.skippedRows).toBe(2);
      expect(res.body.summary.invalidRows).toBe(0);
    });

    it('produces identical contentChecksum regardless of informative column modifications', async () => {
      const originalCsv =
        'internalCode,productName,baseUnit,quantityBase\nBLK001,Amoxicilina,ub,50.00\n';
      const modifiedCsv =
        'internalCode,productName,baseUnit,quantityBase\nBLK001,Modified Name,Modified Unit,50.00\n';

      const res1 = await request(app.getHttpServer())
        .post('/api/v1/stock/bulk-load/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from(originalCsv, 'utf8'), 'orig.csv')
        .expect(200);

      const res2 = await request(app.getHttpServer())
        .post('/api/v1/stock/bulk-load/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from(modifiedCsv, 'utf8'), 'mod.csv')
        .expect(200);

      expect(res1.body.contentChecksum).toBe(res2.body.contentChecksum);
    });

    it('flags PRODUCT_NOT_FOUND when included row targets non-existent code', async () => {
      const csvContent = 'internalCode,quantityBase\nUNKNOWN01,10\n';
      const res = await request(app.getHttpServer())
        .post('/api/v1/stock/bulk-load/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from(csvContent, 'utf8'), 'carga.csv')
        .expect(200);

      expect(res.body.valid).toBe(false);
      expect(res.body.contentChecksum).toBeNull();
      expect(res.body.rows[0].status).toBe(
        StockBulkLoadRowStatus.INCLUDED_INVALID,
      );
      expect(res.body.rows[0].errors[0].code).toBe(
        StockBulkRowErrorCode.PRODUCT_NOT_FOUND,
      );
    });

    it('flags PRODUCT_INACTIVE when included row targets inactive product', async () => {
      const csvContent = 'internalCode,quantityBase\nBLK003,10\n';
      const res = await request(app.getHttpServer())
        .post('/api/v1/stock/bulk-load/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from(csvContent, 'utf8'), 'carga.csv')
        .expect(200);

      expect(res.body.valid).toBe(false);
      expect(res.body.rows[0].status).toBe(
        StockBulkLoadRowStatus.INCLUDED_INVALID,
      );
      expect(res.body.rows[0].errors[0].code).toBe(
        StockBulkRowErrorCode.PRODUCT_INACTIVE,
      );
    });

    it('rejects corrupt or invalid file buffer with 400 Bad Request', async () => {
      const corruptBuffer = Buffer.from('NOT_VALID_SPREADSHEET', 'utf8');
      await request(app.getHttpServer())
        .post('/api/v1/stock/bulk-load/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', corruptBuffer, 'corrupt.xlsx')
        .expect(400);
    });
  });

  describe('3. Confirm Endpoint (POST /api/v1/stock/bulk-load/confirm)', () => {
    it('returns 400 Bad Request with BULK_LOAD_NO_INCLUDED_ROWS when direct confirm has 0 included rows', async () => {
      const csvContent =
        'internalCode,productName,baseUnit,quantityBase\nBLK001,Amox,ub,\n';
      const buffer = Buffer.from(csvContent, 'utf8');

      const previewRes = await request(app.getHttpServer())
        .post('/api/v1/stock/bulk-load/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'empty.csv')
        .expect(200);

      const confirmRes = await request(app.getHttpServer())
        .post('/api/v1/stock/bulk-load/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'empty.csv')
        .field('previewFileChecksum', previewRes.body.fileChecksum)
        .expect(400);

      expect(confirmRes.body.code).toBe(
        StockBulkFileErrorCode.BULK_LOAD_NO_INCLUDED_ROWS,
      );
    });

    it('atomically confirms valid bulk load, creates movements only for included rows, updates stocks, and logs audit', async () => {
      const csvContent =
        'internalCode,productName,baseUnit,quantityBase\nBLK001,Amox,ub,50.00\nBLK002,Ibu,ub,\n';
      const buffer = Buffer.from(csvContent, 'utf8');

      const previewRes = await request(app.getHttpServer())
        .post('/api/v1/stock/bulk-load/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'partial.csv')
        .expect(200);

      const initialStock1 = await ds
        .getRepository(Stock)
        .findOneByOrFail({ productId: activeProduct1.id });
      const initialBal1 = Number(initialStock1.currentBaseStock);

      const res = await request(app.getHttpServer())
        .post('/api/v1/stock/bulk-load/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'partial.csv')
        .field('previewFileChecksum', previewRes.body.fileChecksum)
        .expect(201);

      expect(res.body.batchId).toBeDefined();
      expect(res.body.rowCount).toBe(1); // rowCount = includedRows
      expect(res.body.movementCount).toBe(1);
      expect(res.body.totalQuantityBase).toBe(50);

      // Verify updated stock balances in DB (BLK001 updated, BLK002 untouched)
      const updatedStock1 = await ds
        .getRepository(Stock)
        .findOneByOrFail({ productId: activeProduct1.id });
      expect(Number(updatedStock1.currentBaseStock)).toBe(initialBal1 + 50);

      const stock2 = await ds
        .getRepository(Stock)
        .findOneBy({ productId: activeProduct2.id });
      expect(stock2).toBeNull(); // No stock row created for skipped product

      // Verify movements generated in DB (only 1)
      const movements = await ds.getRepository(StockMovement).find({
        where: { documentReference: `BULK_LOAD:${res.body.batchId}` },
      });
      expect(movements).toHaveLength(1);
      expect(movements[0].movementType).toBe(StockMovementType.AJUSTE_ENTRADA);

      // Verify batch record in DB
      const batch = await ds
        .getRepository(StockImportBatch)
        .findOneByOrFail({ id: res.body.batchId });
      expect(batch.rowCount).toBe(1);
      expect(batch.movementCount).toBe(1);
      expect(batch.actorId).toBe(adminUser.id);

      // Verify audit log emitted in DB with included and skipped metrics
      const auditLog = await ds.getRepository(AuditLog).findOneByOrFail({
        entityName: 'StockBulkLoad',
        entityId: res.body.batchId,
      });
      expect(auditLog.action).toBe(AuditAction.CREATE);
      expect(auditLog.newValues.totalRows).toBe(2);
      expect(auditLog.newValues.includedRows).toBe(1);
      expect(auditLog.newValues.skippedRows).toBe(1);
    });

    it('rejects second attempt with same content as 409 Conflict (BULK_LOAD_ALREADY_CONFIRMED)', async () => {
      const csvContent =
        'internalCode,productName,baseUnit,quantityBase\nBLK001,Amox,ub,50.00\n';
      const buffer = Buffer.from(csvContent, 'utf8');

      const previewRes = await request(app.getHttpServer())
        .post('/api/v1/stock/bulk-load/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'duplicate.csv')
        .expect(200);

      const res = await request(app.getHttpServer())
        .post('/api/v1/stock/bulk-load/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'duplicate.csv')
        .field('previewFileChecksum', previewRes.body.fileChecksum)
        .expect(409);

      expect(res.body.code).toBe(
        StockBulkFileErrorCode.BULK_LOAD_ALREADY_CONFIRMED,
      );
    });

    it('prevents direct UPDATE or DELETE on stock_import_batches table via PostgreSQL trigger', async () => {
      const batches = await ds.getRepository(StockImportBatch).find();
      expect(batches.length).toBeGreaterThan(0);
      const batchId = batches[0].id;

      await expect(
        ds.query(
          `UPDATE stock_import_batches SET row_count = 999 WHERE id = $1`,
          [batchId],
        ),
      ).rejects.toThrow(/append-only/i);

      await expect(
        ds.query(`DELETE FROM stock_import_batches WHERE id = $1`, [batchId]),
      ).rejects.toThrow(/append-only/i);
    });
  });
});
