import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import * as ExcelJS from 'exceljs';
import dataSource from '../src/database/data-source';
import { AppModule } from '../src/app.module';
import {
  AuditAction,
  ProductBulkFileErrorCode,
  ProductBulkRowErrorCode,
  ProductBulkLoadRowStatus,
  StockMovementType,
} from '@erp/shared-types';
import { User } from '../src/modules/users/entities/user.entity';
import { Category } from '../src/modules/categories/entities/category.entity';
import { Unit } from '../src/modules/units/entities/unit.entity';
import { Product } from '../src/modules/products/entities/product.entity';
import { Stock } from '../src/modules/stock/entities/stock.entity';
import { StockMovement } from '../src/modules/stock/entities/stock-movement.entity';
import { ProductImportBatch } from '../src/modules/products/entities/product-import-batch.entity';
import { AuditLog } from '../src/modules/audit/entities/audit-log.entity';
import { runInitialSeed } from '../src/database/seeds/initial.seed';

describe('Product Bulk Load API (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let adminToken: string;
  let sellerToken: string;
  let adminUser: User;

  let testCategory: Category;
  let testUnit1: Unit;
  let testUnit2: Unit;

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
      'TRUNCATE TABLE product_import_batches, audit_logs, stock_movements, stocks, product_unit_conversions, products, categories, units, users CASCADE;',
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
      name: 'Farmacia E2E',
      description: 'Categoría para tests e2e',
    });

    testUnit1 = await ds.getRepository(Unit).save({
      name: 'Comprimido',
      symbol: 'cmp',
    });

    testUnit2 = await ds.getRepository(Unit).save({
      name: 'Caja',
      symbol: 'caja',
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (ds && ds.isInitialized) {
      await ds.destroy();
    }
  });

  describe('1. Security & RBAC', () => {
    it('rejects unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/products/bulk-load/template?format=csv')
        .expect(401);

      await request(app.getHttpServer())
        .post('/api/v1/products/bulk-load/preview')
        .expect(401);

      await request(app.getHttpServer())
        .post('/api/v1/products/bulk-load/confirm')
        .expect(401);
    });

    it('rejects VENDEDOR role with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/products/bulk-load/template?format=csv')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .post('/api/v1/products/bulk-load/preview')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .post('/api/v1/products/bulk-load/confirm')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(403);
    });
  });

  describe('2. Template Generation', () => {
    it('downloads CSV template with 12 column headers and attachment header', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products/bulk-load/template?format=csv')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain(
        'attachment; filename="plantilla_productos.csv"',
      );
      expect(res.text).toContain(
        'name,category,baseUnit,costNet,activePriceNet,description,minStock,initialStock,markupPercentage,taxTreatment,ivaPercentage,conversions',
      );
    });

    it('downloads XLSX template with Productos and Referencia worksheets', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products/bulk-load/template?format=xlsx')
        .set('Authorization', `Bearer ${adminToken}`)
        .responseType('blob')
        .expect(200);

      expect(res.headers['content-type']).toContain('spreadsheetml');
      expect(res.headers['content-disposition']).toContain(
        'attachment; filename="plantilla_productos.xlsx"',
      );

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(res.body);

      const prodSheet = workbook.getWorksheet('Productos');
      expect(prodSheet).toBeDefined();
      expect(prodSheet!.getRow(1).getCell(1).value).toBe('name');
      expect(prodSheet!.getRow(1).getCell(2).value).toBe('category');
      expect(prodSheet!.getRow(1).getCell(3).value).toBe('baseUnit');

      const refSheet = workbook.getWorksheet('Referencia');
      expect(refSheet).toBeDefined();
      expect(refSheet!.getRow(1).getCell(1).value).toBe('Categoría');
    });
  });

  describe('3. Preview Bulk Load', () => {
    it('returns 400 when no file is uploaded', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/products/bulk-load/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.code).toBe(
        ProductBulkFileErrorCode.BULK_LOAD_MISSING_FILE,
      );
    });

    it('returns 400 when missing required columns', async () => {
      const csv = 'name,description\nProd1,Desc1\n';
      const buffer = Buffer.from(csv, 'utf8');

      const res = await request(app.getHttpServer())
        .post('/api/v1/products/bulk-load/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'missing_cols.csv')
        .expect(400);

      expect(res.body.code).toBe(
        ProductBulkFileErrorCode.BULK_LOAD_MISSING_HEADERS,
      );
    });

    it('returns validation errors for row with unknown category or invalid numeric values', async () => {
      const csv =
        'name,category,baseUnit,costNet,activePriceNet,description,minStock,initialStock,markupPercentage,taxTreatment,ivaPercentage,conversions\n' +
        'Prod Invalido,CategoriaInexistente,cmp,-10,50,,0,0,50,GRAVADO,21,\n';
      const buffer = Buffer.from(csv, 'utf8');

      const res = await request(app.getHttpServer())
        .post('/api/v1/products/bulk-load/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'invalid_rows.csv')
        .expect(200);

      expect(res.body.valid).toBe(false);
      expect(res.body.contentChecksum).toBeNull();
      expect(res.body.summary.invalidRows).toBe(1);
      expect(res.body.rows[0].status).toBe(ProductBulkLoadRowStatus.INVALID);
      const errorCodes = res.body.rows[0].errors.map((e: any) => e.code);
      expect(errorCodes).toContain(ProductBulkRowErrorCode.CATEGORY_NOT_FOUND);
      expect(errorCodes).toContain(ProductBulkRowErrorCode.INVALID_COST_NET);
    });

    it('previews successfully for valid CSV data', async () => {
      const csv =
        'name,category,baseUnit,costNet,activePriceNet,description,minStock,initialStock,markupPercentage,taxTreatment,ivaPercentage,conversions\n' +
        'Amoxicilina 500mg,Farmacia E2E,cmp,100.50,150.75,Antibiótico,10,25,50,GRAVADO,21,Caja:10\n';
      const buffer = Buffer.from(csv, 'utf8');

      const res = await request(app.getHttpServer())
        .post('/api/v1/products/bulk-load/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'valid_preview.csv')
        .expect(200);

      expect(res.body.valid).toBe(true);
      expect(res.body.contentChecksum).toBeDefined();
      expect(res.body.summary.validRows).toBe(1);
      expect(res.body.rows[0].status).toBe(ProductBulkLoadRowStatus.VALID);
      expect(res.body.rows[0].product.name).toBe('Amoxicilina 500mg');
      expect(res.body.rows[0].product.conversions).toHaveLength(1);
    });
  });

  describe('4. Confirm Bulk Load & Atomicity', () => {
    it('returns 409 Conflict when preview checksum does not match uploaded file', async () => {
      const csv =
        'name,category,baseUnit,costNet,activePriceNet,description,minStock,initialStock,markupPercentage,taxTreatment,ivaPercentage,conversions\n' +
        'Prod Mismatch,Farmacia E2E,cmp,50,100,,,0,50,GRAVADO,21,\n';
      const buffer = Buffer.from(csv, 'utf8');

      const res = await request(app.getHttpServer())
        .post('/api/v1/products/bulk-load/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'mismatch.csv')
        .field('previewFileChecksum', 'tampered_or_wrong_checksum_value')
        .expect(409);

      expect(res.body.code).toBe(
        ProductBulkFileErrorCode.BULK_LOAD_PREVIEW_MISMATCH,
      );
    });

    it('returns 400 Bad Request when confirm receives invalid rows', async () => {
      const csv =
        'name,category,baseUnit,costNet,activePriceNet,description,minStock,initialStock,markupPercentage,taxTreatment,ivaPercentage,conversions\n' +
        'Bad Row,NoCat,cmp,50,100,,,0,50,GRAVADO,21,\n';
      const buffer = Buffer.from(csv, 'utf8');

      const previewRes = await request(app.getHttpServer())
        .post('/api/v1/products/bulk-load/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'bad.csv')
        .expect(200);

      const res = await request(app.getHttpServer())
        .post('/api/v1/products/bulk-load/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'bad.csv')
        .field('previewFileChecksum', previewRes.body.fileChecksum)
        .expect(400);

      expect(res.body.code).toBe(
        ProductBulkFileErrorCode.BULK_LOAD_VALIDATION_FAILED,
      );
    });

    it('atomically confirms valid bulk load, creates products, initial stock, stock movements, and audit log', async () => {
      const csv =
        'name,category,baseUnit,costNet,activePriceNet,description,minStock,initialStock,markupPercentage,taxTreatment,ivaPercentage,conversions\n' +
        'Ibuprofeno 400mg E2E,Farmacia E2E,cmp,80,120,Analgésico,5,30,50,GRAVADO,21,Caja:20\n' +
        'Paracetamol 500mg E2E,Farmacia E2E,cmp,40,60,Antitérmico,10,0,50,GRAVADO,21,\n';
      const buffer = Buffer.from(csv, 'utf8');

      const previewRes = await request(app.getHttpServer())
        .post('/api/v1/products/bulk-load/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'catalog_load.csv')
        .expect(200);

      expect(previewRes.body.valid).toBe(true);

      const res = await request(app.getHttpServer())
        .post('/api/v1/products/bulk-load/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'catalog_load.csv')
        .field('previewFileChecksum', previewRes.body.fileChecksum)
        .expect(201);

      expect(res.body.batchId).toBeDefined();
      expect(res.body.rowCount).toBe(2);
      expect(res.body.movementCount).toBe(1); // Only Ibuprofeno has initialStock > 0
      expect(res.body.totalQuantityBase).toBe(30);

      // Verify batch in DB
      const batch = await ds.getRepository(ProductImportBatch).findOneByOrFail({
        id: res.body.batchId,
      });
      expect(batch.rowCount).toBe(2);
      expect(batch.movementCount).toBe(1);
      expect(batch.actorId).toBe(adminUser.id);

      // Verify Products created in DB
      const prod1 = await ds.getRepository(Product).findOneOrFail({
        where: { name: 'Ibuprofeno 400mg E2E' },
        relations: ['conversions'],
      });
      expect(prod1.categoryId).toBe(testCategory.id);
      expect(prod1.baseUnitId).toBe(testUnit1.id);
      expect(prod1.conversions).toHaveLength(1);
      expect(prod1.conversions[0].presentationUnitId).toBe(testUnit2.id);
      expect(Number(prod1.conversions[0].conversionFactor)).toBe(20);

      const prod2 = await ds.getRepository(Product).findOneOrFail({
        where: { name: 'Paracetamol 500mg E2E' },
      });
      expect(prod2.categoryId).toBe(testCategory.id);

      // Verify Stock balances
      const stock1 = await ds.getRepository(Stock).findOneByOrFail({
        productId: prod1.id,
      });
      expect(Number(stock1.currentBaseStock)).toBe(30);

      const stock2 = await ds.getRepository(Stock).findOneByOrFail({
        productId: prod2.id,
      });
      expect(Number(stock2.currentBaseStock)).toBe(0);

      // Verify Stock Movements (only for initialStock > 0)
      const movements = await ds.getRepository(StockMovement).find({
        where: { documentReference: `BULK_LOAD:${batch.id}` },
      });
      expect(movements).toHaveLength(1);
      expect(movements[0].productId).toBe(prod1.id);
      expect(movements[0].movementType).toBe(StockMovementType.AJUSTE_ENTRADA);
      expect(Number(movements[0].quantityBase)).toBe(30);

      // Verify Audit Log
      const audit = await ds.getRepository(AuditLog).findOneByOrFail({
        entityName: 'ProductBulkLoad',
        entityId: batch.id,
      });
      expect(audit.action).toBe(AuditAction.CREATE);
      expect(audit.newValues.batchId).toBe(batch.id);
      expect(audit.newValues.rowCount).toBe(2);
      expect(audit.newValues.movementCount).toBe(1);
    });

    it('rejects second attempt with same content as 409 Conflict (BULK_LOAD_ALREADY_CONFIRMED)', async () => {
      const csv =
        'name,category,baseUnit,costNet,activePriceNet,description,minStock,initialStock,markupPercentage,taxTreatment,ivaPercentage,conversions\n' +
        'Ibuprofeno 400mg E2E,Farmacia E2E,cmp,80,120,Analgésico,5,30,50,GRAVADO,21,Caja:20\n' +
        'Paracetamol 500mg E2E,Farmacia E2E,cmp,40,60,Antitérmico,10,0,50,GRAVADO,21,\n';
      const buffer = Buffer.from(csv, 'utf8');

      const previewRes = await request(app.getHttpServer())
        .post('/api/v1/products/bulk-load/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'duplicate.csv')
        .expect(200);

      const res = await request(app.getHttpServer())
        .post('/api/v1/products/bulk-load/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'duplicate.csv')
        .field('previewFileChecksum', previewRes.body.fileChecksum)
        .expect(409);

      expect(res.body.code).toBe(
        ProductBulkFileErrorCode.BULK_LOAD_ALREADY_CONFIRMED,
      );
    });

    it('prevents direct UPDATE or DELETE on product_import_batches table via PostgreSQL append-only trigger', async () => {
      const batches = await ds.getRepository(ProductImportBatch).find();
      expect(batches.length).toBeGreaterThan(0);
      const batchId = batches[0].id;

      await expect(
        ds.query(
          `UPDATE product_import_batches SET row_count = 999 WHERE id = $1`,
          [batchId],
        ),
      ).rejects.toThrow(/append-only/i);

      await expect(
        ds.query(`DELETE FROM product_import_batches WHERE id = $1`, [batchId]),
      ).rejects.toThrow(/append-only/i);
    });
  });
});
