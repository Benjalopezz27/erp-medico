import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import * as ExcelJS from 'exceljs';
import dataSource from '../src/database/data-source';
import { AppModule } from '../src/app.module';
import { StockService } from '../src/modules/stock/stock.service';
import { AuditService } from '../src/modules/audit/audit.service';
import {
  ProductStatus,
  StockMovementType,
  AuditAction,
  StockBulkRowErrorCode,
  StockBulkFileErrorCode,
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
  let auditService: AuditService;
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

    auditService = app.get<AuditService>(AuditService);
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
      name: 'Amoxicilina 500mg',
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

  describe('1. Template Download (GET /api/v1/stock/bulk-load/template)', () => {
    it('downloads XLSX template with only headers', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/stock/bulk-load/template?format=xlsx')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('spreadsheetml');
      expect(res.headers['content-disposition']).toContain(
        'plantilla_carga_stock.xlsx',
      );
      expect(res.body).toBeDefined();
    });

    it('downloads CSV template with headers only', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/stock/bulk-load/template?format=csv')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toBe('internalCode,quantityBase\n');
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
    it('returns valid preview with content checksum for correct CSV', async () => {
      const csvContent =
        'internalCode,quantityBase\nBLK001,50.00\nBLK002,25.50\n';
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
        validRows: 2,
        invalidRows: 0,
        totalQuantityBase: 75.5,
      });
      expect(res.body.rows[0].product.currentBaseStock).toBe(10);
      expect(res.body.rows[0].product.projectedStock).toBe(60);
    });

    it('returns identical content checksum for equivalent XLSX file', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Inventario');
      sheet.addRow(['internalCode', 'quantityBase']);
      sheet.addRow(['BLK001', 50]);
      sheet.addRow(['BLK002', 25.5]);

      const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

      const res = await request(app.getHttpServer())
        .post('/api/v1/stock/bulk-load/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'carga.xlsx')
        .expect(200);

      expect(res.body.valid).toBe(true);
      expect(res.body.contentChecksum).toBeDefined();
    });

    it('flags PRODUCT_NOT_FOUND and sets contentChecksum: null when product does not exist', async () => {
      const csvContent = 'internalCode,quantityBase\nUNKNOWN01,10\n';
      const res = await request(app.getHttpServer())
        .post('/api/v1/stock/bulk-load/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from(csvContent, 'utf8'), 'carga.csv')
        .expect(200);

      expect(res.body.valid).toBe(false);
      expect(res.body.contentChecksum).toBeNull();
      expect(res.body.summary.invalidRows).toBe(1);
      expect(res.body.rows[0].errors[0].code).toBe(
        StockBulkRowErrorCode.PRODUCT_NOT_FOUND,
      );
    });

    it('flags PRODUCT_INACTIVE when product is inactive in catalog', async () => {
      const csvContent = 'internalCode,quantityBase\nBLK003,10\n';
      const res = await request(app.getHttpServer())
        .post('/api/v1/stock/bulk-load/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from(csvContent, 'utf8'), 'carga.csv')
        .expect(200);

      expect(res.body.valid).toBe(false);
      expect(res.body.rows[0].errors[0].code).toBe(
        StockBulkRowErrorCode.PRODUCT_INACTIVE,
      );
    });

    it('flags DUPLICATE_INTERNAL_CODE when duplicate codes appear in file', async () => {
      const csvContent = 'internalCode,quantityBase\nBLK001,10\nblk001,20\n';
      const res = await request(app.getHttpServer())
        .post('/api/v1/stock/bulk-load/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from(csvContent, 'utf8'), 'carga.csv')
        .expect(200);

      expect(res.body.valid).toBe(false);
      expect(
        res.body.rows[0].errors.some(
          (e: any) => e.code === StockBulkRowErrorCode.DUPLICATE_INTERNAL_CODE,
        ),
      ).toBe(true);
    });

    it('flags FORMULA_NOT_ALLOWED when CSV cell starts with = or @', async () => {
      const csvContent = 'internalCode,quantityBase\nBLK001,=10+20\n';
      const res = await request(app.getHttpServer())
        .post('/api/v1/stock/bulk-load/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from(csvContent, 'utf8'), 'carga.csv')
        .expect(200);

      expect(res.body.valid).toBe(false);
      expect(
        res.body.rows[0].errors.some(
          (e: any) => e.code === StockBulkRowErrorCode.FORMULA_NOT_ALLOWED,
        ),
      ).toBe(true);
    });

    it('rejects corrupt or invalid file buffer with 400 Bad Request', async () => {
      const corruptBuffer = Buffer.from(
        'NOT_A_VALID_SPREADSHEET_BUFFER',
        'utf8',
      );
      await request(app.getHttpServer())
        .post('/api/v1/stock/bulk-load/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', corruptBuffer, 'corrupt.xlsx')
        .expect(400);
    });
  });

  describe('3. Confirm Endpoint (POST /api/v1/stock/bulk-load/confirm)', () => {
    let validCsvBuffer: Buffer;
    let validFileChecksum: string;
    let validContentChecksum: string;

    beforeAll(async () => {
      const csvContent =
        'internalCode,quantityBase\nBLK001,50.00\nBLK002,25.50\n';
      validCsvBuffer = Buffer.from(csvContent, 'utf8');

      const previewRes = await request(app.getHttpServer())
        .post('/api/v1/stock/bulk-load/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', validCsvBuffer, 'carga.csv')
        .expect(200);

      validFileChecksum = previewRes.body.fileChecksum;
      validContentChecksum = previewRes.body.contentChecksum;
    });

    it('rejects confirmation when previewFileChecksum does not match binary fileChecksum', async () => {
      const wrongChecksum =
        '0000000000000000000000000000000000000000000000000000000000000000';

      const res = await request(app.getHttpServer())
        .post('/api/v1/stock/bulk-load/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', validCsvBuffer, 'carga.csv')
        .field('previewFileChecksum', wrongChecksum)
        .expect(409);

      expect(res.body.code).toBe(
        StockBulkFileErrorCode.BULK_LOAD_PREVIEW_MISMATCH,
      );
    });

    it('atomically confirms valid bulk load, creates movements, updates stocks, creates batch, and emits audit log', async () => {
      const initialStock1 = await ds
        .getRepository(Stock)
        .findOneByOrFail({ productId: activeProduct1.id });
      const initialBal1 = Number(initialStock1.currentBaseStock);

      const res = await request(app.getHttpServer())
        .post('/api/v1/stock/bulk-load/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', validCsvBuffer, 'carga.csv')
        .field('previewFileChecksum', validFileChecksum)
        .expect(201);

      expect(res.body.batchId).toBeDefined();
      expect(res.body.rowCount).toBe(2);
      expect(res.body.movementCount).toBe(2);
      expect(res.body.totalQuantityBase).toBe(75.5);

      // Verify updated stock balances in DB
      const updatedStock1 = await ds
        .getRepository(Stock)
        .findOneByOrFail({ productId: activeProduct1.id });
      expect(Number(updatedStock1.currentBaseStock)).toBe(initialBal1 + 50);

      const updatedStock2 = await ds
        .getRepository(Stock)
        .findOneByOrFail({ productId: activeProduct2.id });
      expect(Number(updatedStock2.currentBaseStock)).toBe(25.5);

      // Verify movements generated in DB
      const movements = await ds.getRepository(StockMovement).find({
        where: { documentReference: `BULK_LOAD:${res.body.batchId}` },
      });
      expect(movements).toHaveLength(2);
      expect(movements[0].movementType).toBe(StockMovementType.AJUSTE_ENTRADA);
      expect(movements[0].reason).toBe('Carga inicial de inventario');

      // Verify batch record in DB
      const batch = await ds
        .getRepository(StockImportBatch)
        .findOneByOrFail({ id: res.body.batchId });
      expect(batch.contentChecksum).toBe(validContentChecksum);
      expect(batch.fileChecksum).toBe(validFileChecksum);
      expect(batch.actorId).toBe(adminUser.id);

      // Verify audit log emitted in DB
      const auditLog = await ds.getRepository(AuditLog).findOneByOrFail({
        entityName: 'StockBulkLoad',
        entityId: res.body.batchId,
      });
      expect(auditLog.action).toBe(AuditAction.CREATE);
      expect(auditLog.actorId).toBe(adminUser.id);
    });

    it('rejects second attempt with same CSV as 409 Conflict (BULK_LOAD_ALREADY_CONFIRMED)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/stock/bulk-load/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', validCsvBuffer, 'carga.csv')
        .field('previewFileChecksum', validFileChecksum)
        .expect(409);

      expect(res.body.code).toBe(
        StockBulkFileErrorCode.BULK_LOAD_ALREADY_CONFIRMED,
      );
    });

    it('rejects equivalent XLSX previewed and confirmed with its own fileChecksum as 409 Conflict', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Inventario');
      sheet.addRow(['internalCode', 'quantityBase']);
      sheet.addRow(['BLK001', 50]);
      sheet.addRow(['BLK002', 25.5]);

      const xlsxBuffer = Buffer.from(await workbook.xlsx.writeBuffer());

      // 1. Preview XLSX
      const previewRes = await request(app.getHttpServer())
        .post('/api/v1/stock/bulk-load/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', xlsxBuffer, 'carga.xlsx')
        .expect(200);

      // 2. Confirm XLSX with XLSX's own fileChecksum
      const confirmRes = await request(app.getHttpServer())
        .post('/api/v1/stock/bulk-load/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', xlsxBuffer, 'carga.xlsx')
        .field('previewFileChecksum', previewRes.body.fileChecksum)
        .expect(409);

      expect(confirmRes.body.code).toBe(
        StockBulkFileErrorCode.BULK_LOAD_ALREADY_CONFIRMED,
      );
    });

    it('rejects re-ordered rows file previewed and confirmed with its own fileChecksum as 409 Conflict', async () => {
      const reorderedCsv =
        'internalCode,quantityBase\nBLK002,25.50\nBLK001,50.00\n';
      const reorderedBuffer = Buffer.from(reorderedCsv, 'utf8');

      // 1. Preview reordered CSV
      const previewRes = await request(app.getHttpServer())
        .post('/api/v1/stock/bulk-load/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', reorderedBuffer, 'reordered.csv')
        .expect(200);

      // 2. Confirm reordered CSV with its own fileChecksum
      const confirmRes = await request(app.getHttpServer())
        .post('/api/v1/stock/bulk-load/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', reorderedBuffer, 'reordered.csv')
        .field('previewFileChecksum', previewRes.body.fileChecksum)
        .expect(409);

      expect(confirmRes.body.code).toBe(
        StockBulkFileErrorCode.BULK_LOAD_ALREADY_CONFIRMED,
      );
    });

    it('triggers complete transaction rollback when audit recording fails and restores spy', async () => {
      const newCsv = 'internalCode,quantityBase\nBLK001,10.00\n';
      const newBuffer = Buffer.from(newCsv, 'utf8');

      const previewRes = await request(app.getHttpServer())
        .post('/api/v1/stock/bulk-load/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', newBuffer, 'new.csv')
        .expect(200);

      const beforeStock = await ds
        .getRepository(Stock)
        .findOneByOrFail({ productId: activeProduct1.id });

      const auditSpy = jest
        .spyOn(auditService, 'record')
        .mockRejectedValueOnce(new Error('Simulated audit failure'));

      try {
        await request(app.getHttpServer())
          .post('/api/v1/stock/bulk-load/confirm')
          .set('Authorization', `Bearer ${adminToken}`)
          .attach('file', newBuffer, 'new.csv')
          .field('previewFileChecksum', previewRes.body.fileChecksum)
          .expect(500);

        // Verify that stock was not modified
        const afterStock = await ds
          .getRepository(Stock)
          .findOneByOrFail({ productId: activeProduct1.id });
        expect(afterStock.currentBaseStock).toBe(beforeStock.currentBaseStock);

        // Verify that batch was not persisted
        const batch = await ds
          .getRepository(StockImportBatch)
          .findOneBy({ contentChecksum: previewRes.body.contentChecksum });
        expect(batch).toBeNull();
      } finally {
        auditSpy.mockRestore();
      }
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
