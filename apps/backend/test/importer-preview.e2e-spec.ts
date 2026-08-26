import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import * as crypto from 'crypto';
import { AppModule } from '../src/app.module';
import dataSource from '../src/database/data-source';
import { runInitialSeed } from '../src/database/seeds/initial.seed';
import { Supplier } from '../src/modules/suppliers/entities/supplier.entity';
import { Product } from '../src/modules/products/entities/product.entity';
import { Unit } from '../src/modules/units/entities/unit.entity';
import { Category } from '../src/modules/categories/entities/category.entity';
import { SupplierProduct } from '../src/modules/suppliers/supplier-products/entities/supplier-product.entity';
import { AuditLog } from '../src/modules/audit/entities/audit-log.entity';
import {
  AuditAction,
  ImporterErrorCode,
  ProductStatus,
  TaxCondition,
} from '@erp/shared-types';

describe('Supplier Importer Preview & Resolution (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let adminToken: string;
  let sellerToken: string;
  let activeSupplier: Supplier;
  let unitComprimido: Unit;
  let unitCaja: Unit;
  let testCategory: Category;
  let activeProduct1: Product;
  let activeProduct2: Product;

  const validCsvContent =
    'Cod Prov,Descripcion,Costo,Bulto,Unidad\nMED-001,Ibuprofeno 400mg x 100,1250.50,10,Caja\nPAR-500,Paracetamol 500mg x 50,890.00,50,Caja\nDIP-ERR,Dipirona Invalida,-50.00,0,Caja\n';
  const validCsvBuffer = Buffer.from(validCsvContent, 'utf8');
  const validChecksum = crypto
    .createHash('sha256')
    .update(validCsvBuffer)
    .digest('hex');

  const validMappingJson = JSON.stringify({
    supplierSku: 'cod prov',
    usualCostNet: 'costo',
    supplierDescription: 'descripcion',
    rawQuantity: 'bulto',
    purchaseUnit: 'unidad',
  });

  beforeAll(async () => {
    process.env.JWT_SECRET =
      process.env.JWT_SECRET ||
      'test_ci_jwt_secret_key_minimum_32_characters_long!';
    process.env.JWT_EXPIRATION = process.env.JWT_EXPIRATION || '8h';
    ds = await dataSource.initialize();
    await ds.runMigrations();

    await ds.query('TRUNCATE TABLE supplier_products CASCADE');
    await ds.query('TRUNCATE TABLE products CASCADE');
    await ds.query('TRUNCATE TABLE suppliers CASCADE');
    await ds.query('TRUNCATE TABLE categories CASCADE');
    await ds.query('TRUNCATE TABLE units CASCADE');

    await runInitialSeed(ds, {
      adminEmail: 'preview-admin@erp.com',
      adminPassword: 'AdminPassword123!',
      vendedorEmail: 'preview-seller@erp.com',
      vendedorPassword: 'SellerPassword123!',
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

    adminToken = (
      await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'preview-admin@erp.com',
        password: 'AdminPassword123!',
      })
    ).body.accessToken;

    sellerToken = (
      await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'preview-seller@erp.com',
        password: 'SellerPassword123!',
      })
    ).body.accessToken;

    // Seed test entities
    const unitRepo = ds.getRepository(Unit);
    unitComprimido = await unitRepo.save(
      unitRepo.create({
        name: 'Comprimido',
        symbol: 'COMP',
      }),
    );
    unitCaja = await unitRepo.save(
      unitRepo.create({
        name: 'Caja',
        symbol: 'CJA',
      }),
    );

    const catRepo = ds.getRepository(Category);
    testCategory = await catRepo.save(
      catRepo.create({
        name: 'Medicamentos Generales',
        description: 'Categoría de prueba',
      }),
    );

    const prodRepo = ds.getRepository(Product);
    activeProduct1 = await prodRepo.save(
      prodRepo.create({
        internalCode: 'P0001',
        name: 'Ibuprofeno 400mg',
        categoryId: testCategory.id,
        baseUnitId: unitComprimido.id,
        costNet: '12.0000',
        activePriceNet: '18.0000',
        status: ProductStatus.ACTIVE,
      }),
    );
    activeProduct2 = await prodRepo.save(
      prodRepo.create({
        internalCode: 'P0002',
        name: 'Paracetamol 500mg',
        categoryId: testCategory.id,
        baseUnitId: unitComprimido.id,
        costNet: '8.0000',
        activePriceNet: '12.0000',
        status: ProductStatus.ACTIVE,
      }),
    );

    const supplierRepo = ds.getRepository(Supplier);
    activeSupplier = await supplierRepo.save(
      supplierRepo.create({
        businessName: 'Droguería Médica Test S.A.',
        cuit: '30712345678',
        taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
        isActive: true,
      }),
    );

    const spRepo = ds.getRepository(SupplierProduct);
    await spRepo.save(
      spRepo.create({
        supplierId: activeSupplier.id,
        productId: activeProduct1.id,
        supplierExternalCode: 'MED-001',
        supplierDescription: 'Ibuprofeno 400mg x 100 comp',
        purchaseUnitId: unitCaja.id,
        conversionFactorToBase: '100.0000',
        usualCostNet: '1200.0000',
        isPrimarySupplier: true,
      }),
    );
  });

  afterAll(async () => {
    if (app) await app.close();
    if (ds?.isInitialized) await ds.destroy();
  });

  describe('Security & RBAC', () => {
    it('returns 401 when calling POST /importer/preview without token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/importer/preview')
        .expect(401);
    });

    it('returns 403 when calling POST /importer/preview as seller', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/importer/preview')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(403);
    });

    it('returns 401 when calling POST /importer/resolve-unknown without token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/importer/resolve-unknown')
        .send({})
        .expect(401);
    });

    it('returns 403 when calling POST /importer/resolve-unknown as seller', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/importer/resolve-unknown')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({})
        .expect(403);
    });
  });

  describe('POST /api/v1/importer/preview', () => {
    it('returns 409 Conflict when expectedFileChecksum does not match file', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/importer/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('supplierId', activeSupplier.id)
        .field('expectedFileChecksum', '0'.repeat(64))
        .field('mapping', validMappingJson)
        .attach('file', validCsvBuffer, 'lista.csv')
        .expect(409);

      expect(response.body.code).toBe(
        ImporterErrorCode.IMPORTER_CHECKSUM_MISMATCH,
      );
    });

    it('returns 400 when mapping is invalid JSON', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/importer/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('supplierId', activeSupplier.id)
        .field('expectedFileChecksum', validChecksum)
        .field('mapping', 'not-valid-json')
        .attach('file', validCsvBuffer, 'lista.csv')
        .expect(400);

      expect(response.body.code).toBe(
        ImporterErrorCode.IMPORTER_MAPPING_INVALID_JSON,
      );
    });

    it('generates tri-state preview with non-mutation invariant', async () => {
      // Capture snapshots before preview
      const productsBefore = await ds.query(
        'SELECT * FROM products ORDER BY id',
      );
      const stockBefore = await ds.query('SELECT * FROM stocks ORDER BY id');
      const movementsBefore = await ds.query(
        'SELECT * FROM stock_movements ORDER BY id',
      );
      const supplierProductsBefore = await ds.query(
        'SELECT * FROM supplier_products ORDER BY id',
      );

      const response = await request(app.getHttpServer())
        .post('/api/v1/importer/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('supplierId', activeSupplier.id)
        .field('expectedFileChecksum', validChecksum)
        .field('mapping', validMappingJson)
        .attach('file', validCsvBuffer, 'lista.csv')
        .expect(200);

      const body = response.body;
      expect(body.summary).toEqual({
        totalRows: 3,
        validRows: 1,
        unknownRows: 1,
        errorRows: 1,
        canContinue: false,
      });

      expect(body.validRows).toHaveLength(1);
      expect(body.validRows[0].normalizedSku).toBe('MED-001');
      expect(body.validRows[0].usualCostNet).toBe('1250.5000');
      expect(body.validRows[0].product.internalCode).toBe('P0001');

      expect(body.unknownRows).toHaveLength(1);
      expect(body.unknownRows[0].normalizedSku).toBe('PAR-500');
      expect(body.unknownRows[0].usualCostNet).toBe('890.0000');

      expect(body.errorRows).toHaveLength(1);
      expect(body.errorRows[0].rawSku).toBe('DIP-ERR');

      expect(body.contentChecksum).toHaveLength(64);
      expect(body.fileChecksum).toBe(validChecksum);

      // Verify zero DB mutations
      const productsAfter = await ds.query(
        'SELECT * FROM products ORDER BY id',
      );
      const stockAfter = await ds.query('SELECT * FROM stocks ORDER BY id');
      const movementsAfter = await ds.query(
        'SELECT * FROM stock_movements ORDER BY id',
      );
      const supplierProductsAfter = await ds.query(
        'SELECT * FROM supplier_products ORDER BY id',
      );

      expect(productsAfter).toEqual(productsBefore);
      expect(stockAfter).toEqual(stockBefore);
      expect(movementsAfter).toEqual(movementsBefore);
      expect(supplierProductsAfter).toEqual(supplierProductsBefore);
    });
  });

  describe('POST /api/v1/importer/resolve-unknown & Re-Preview', () => {
    it('resolves unknown SKU, creates SupplierProduct, and updates preview on re-fetch', async () => {
      // 1. Resolve PAR-500
      const resolveResponse = await request(app.getHttpServer())
        .post('/api/v1/importer/resolve-unknown')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          supplierId: activeSupplier.id,
          supplierSku: 'PAR-500',
          productId: activeProduct2.id,
          purchaseUnitId: unitCaja.id,
          conversionFactorToBase: 50,
          usualCostNet: 890.0,
        })
        .expect(201);

      expect(resolveResponse.body.supplierExternalCode).toBe('PAR-500');
      expect(resolveResponse.body.isPrimarySupplier).toBe(false);

      // Verify audit log
      const auditLog = await ds.getRepository(AuditLog).findOne({
        where: {
          entityName: 'SupplierProduct',
          entityId: resolveResponse.body.id,
          action: AuditAction.CREATE,
        },
      });
      expect(auditLog).toBeDefined();

      // 2. Conflict when resolving the same SKU again
      await request(app.getHttpServer())
        .post('/api/v1/importer/resolve-unknown')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          supplierId: activeSupplier.id,
          supplierSku: 'PAR-500',
          productId: activeProduct2.id,
          purchaseUnitId: unitCaja.id,
          conversionFactorToBase: 50,
        })
        .expect(409);

      // 3. Re-run preview with the exact same file and mapping
      const rePreviewResponse = await request(app.getHttpServer())
        .post('/api/v1/importer/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('supplierId', activeSupplier.id)
        .field('expectedFileChecksum', validChecksum)
        .field('mapping', validMappingJson)
        .attach('file', validCsvBuffer, 'lista.csv')
        .expect(200);

      // Previously unknown SKU PAR-500 is now valid!
      expect(rePreviewResponse.body.summary).toEqual({
        totalRows: 3,
        validRows: 2,
        unknownRows: 0,
        errorRows: 1,
        canContinue: false, // Error row DIP-ERR still remains
      });

      const validSkus = rePreviewResponse.body.validRows.map(
        (r: any) => r.normalizedSku,
      );
      expect(validSkus).toContain('MED-001');
      expect(validSkus).toContain('PAR-500');
    });
  });
});
