import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import * as crypto from 'crypto';
import Decimal from 'decimal.js';
import { AppModule } from '../src/app.module';
import dataSource from '../src/database/data-source';
import { runInitialSeed } from '../src/database/seeds/initial.seed';
import { Supplier } from '../src/modules/suppliers/entities/supplier.entity';
import { Product } from '../src/modules/products/entities/product.entity';
import { Unit } from '../src/modules/units/entities/unit.entity';
import { Category } from '../src/modules/categories/entities/category.entity';
import { SupplierProduct } from '../src/modules/suppliers/supplier-products/entities/supplier-product.entity';
import { SupplierImportBatch } from '../src/modules/importer/entities/supplier-import-batch.entity';
import { AuditLog } from '../src/modules/audit/entities/audit-log.entity';
import {
  AuditAction,
  ImporterErrorCode,
  ProductStatus,
  TaxCondition,
} from '@erp/shared-types';

describe('Supplier Importer Confirmation (E2E)', () => {
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
  let sp1: SupplierProduct;
  let sp2: SupplierProduct;

  const validCsvContent =
    'Cod Prov,Descripcion,Costo,Bulto,Unidad\nMED-001,Ibuprofeno 400mg x 100 Nuevo,1250.50,10,Caja\nMED-002,Paracetamol 500mg,500.00,50,Caja\n';
  const validCsvBuffer = Buffer.from(validCsvContent, 'utf8');
  const validFileChecksum = crypto
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

  let previewResponse: any;

  beforeAll(async () => {
    process.env.JWT_SECRET =
      process.env.JWT_SECRET ||
      'test_ci_jwt_secret_key_minimum_32_characters_long!';
    process.env.JWT_EXPIRATION = process.env.JWT_EXPIRATION || '8h';
    ds = await dataSource.initialize();
    await ds.runMigrations();

    await ds.query('TRUNCATE TABLE supplier_import_batch_items CASCADE');
    await ds.query('TRUNCATE TABLE supplier_import_batches CASCADE');
    await ds.query('TRUNCATE TABLE supplier_products CASCADE');
    await ds.query('TRUNCATE TABLE products CASCADE');
    await ds.query('TRUNCATE TABLE suppliers CASCADE');
    await ds.query('TRUNCATE TABLE categories CASCADE');
    await ds.query('TRUNCATE TABLE units CASCADE');

    await runInitialSeed(ds, {
      adminEmail: 'confirm-admin@erp.com',
      adminPassword: 'AdminPassword123!',
      vendedorEmail: 'confirm-seller@erp.com',
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
        email: 'confirm-admin@erp.com',
        password: 'AdminPassword123!',
      })
    ).body.accessToken;

    sellerToken = (
      await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'confirm-seller@erp.com',
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
        name: 'Farmacia Confirm',
        description: 'Categoría para test de confirmación',
      }),
    );

    const supplierRepo = ds.getRepository(Supplier);
    activeSupplier = await supplierRepo.save(
      supplierRepo.create({
        businessName: 'Droguería Confirmadora S.A.',
        cuit: '30712345678',
        taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
        isActive: true,
      }),
    );

    const productRepo = ds.getRepository(Product);
    activeProduct1 = await productRepo.save(
      productRepo.create({
        internalCode: 'P-CONF-001',
        name: 'Ibuprofeno 400',
        categoryId: testCategory.id,
        baseUnitId: unitComprimido.id,
        costNet: '100.0000',
        markupPercentage: '30.00',
        suggestedPriceNet: '130.0000',
        activePriceNet: '130.0000',
        status: ProductStatus.ACTIVE,
      }),
    );

    activeProduct2 = await productRepo.save(
      productRepo.create({
        internalCode: 'P-CONF-002',
        name: 'Paracetamol 500',
        categoryId: testCategory.id,
        baseUnitId: unitComprimido.id,
        costNet: '200.0000',
        markupPercentage: '30.00',
        suggestedPriceNet: '260.0000',
        activePriceNet: '260.0000',
        status: ProductStatus.ACTIVE,
      }),
    );

    const spRepo = ds.getRepository(SupplierProduct);
    sp1 = await spRepo.save(
      spRepo.create({
        supplierId: activeSupplier.id,
        productId: activeProduct1.id,
        supplierExternalCode: 'MED-001',
        supplierDescription: 'Ibuprofeno 400mg x 100 Anterior',
        purchaseUnitId: unitCaja.id,
        conversionFactorToBase: '100.0000',
        usualCostNet: '1000.0000', // Old cost -> will change to 1250.5000
        isPrimarySupplier: true,
      }),
    );

    sp2 = await spRepo.save(
      spRepo.create({
        supplierId: activeSupplier.id,
        productId: activeProduct2.id,
        supplierExternalCode: 'MED-002',
        supplierDescription: 'Paracetamol 500mg', // Same description
        purchaseUnitId: unitCaja.id,
        conversionFactorToBase: '50.0000',
        usualCostNet: '500.0000', // Same cost -> unchanged row
        isPrimarySupplier: false,
      }),
    );
  });

  afterAll(async () => {
    await app.close();
    if (ds.isInitialized) {
      await ds.destroy();
    }
  });

  beforeEach(async () => {
    // Generate fresh preview response before test
    const previewRes = await request(app.getHttpServer())
      .post('/api/v1/importer/preview')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', validCsvBuffer, 'valid.csv')
      .field('supplierId', activeSupplier.id)
      .field('expectedFileChecksum', validFileChecksum)
      .field('mapping', validMappingJson);

    expect(previewRes.status).toBe(200);
    previewResponse = previewRes.body;
  });

  describe('Security & RBAC', () => {
    it('should reject unauthenticated confirmation with 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/importer/confirm')
        .attach('file', validCsvBuffer, 'valid.csv')
        .field('supplierId', activeSupplier.id)
        .field('mapping', validMappingJson)
        .field('expectedFileChecksum', validFileChecksum)
        .field('expectedMappingChecksum', previewResponse.mappingChecksum)
        .field('expectedContentChecksum', previewResponse.contentChecksum);

      expect(res.status).toBe(401);
    });

    it('should reject non-ADMINISTRADOR user (VENDEDOR) with 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/importer/confirm')
        .set('Authorization', `Bearer ${sellerToken}`)
        .attach('file', validCsvBuffer, 'valid.csv')
        .field('supplierId', activeSupplier.id)
        .field('mapping', validMappingJson)
        .field('expectedFileChecksum', validFileChecksum)
        .field('expectedMappingChecksum', previewResponse.mappingChecksum)
        .field('expectedContentChecksum', previewResponse.contentChecksum);

      expect(res.status).toBe(403);
    });
  });

  describe('Validation & Checksum Drift', () => {
    it('should reject with 409 when file checksum does not match expected', async () => {
      const tamperedBuffer = Buffer.from('Tampered content');
      const res = await request(app.getHttpServer())
        .post('/api/v1/importer/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', tamperedBuffer, 'tampered.csv')
        .field('supplierId', activeSupplier.id)
        .field('mapping', validMappingJson)
        .field('expectedFileChecksum', validFileChecksum)
        .field('expectedMappingChecksum', previewResponse.mappingChecksum)
        .field('expectedContentChecksum', previewResponse.contentChecksum);

      expect(res.status).toBe(409);
      expect(res.body.code).toBe(ImporterErrorCode.IMPORTER_CHECKSUM_MISMATCH);
    });

    it('should reject with 409 when mapping checksum does not match expected', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/importer/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', validCsvBuffer, 'valid.csv')
        .field('supplierId', activeSupplier.id)
        .field('mapping', validMappingJson)
        .field('expectedFileChecksum', validFileChecksum)
        .field('expectedMappingChecksum', '0'.repeat(64))
        .field('expectedContentChecksum', previewResponse.contentChecksum);

      expect(res.status).toBe(409);
      expect(res.body.code).toBe(
        ImporterErrorCode.IMPORTER_CONFIRM_MAPPING_MISMATCH,
      );
    });

    it('should reject with 409 when content checksum does not match expected', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/importer/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', validCsvBuffer, 'valid.csv')
        .field('supplierId', activeSupplier.id)
        .field('mapping', validMappingJson)
        .field('expectedFileChecksum', validFileChecksum)
        .field('expectedMappingChecksum', previewResponse.mappingChecksum)
        .field('expectedContentChecksum', '0'.repeat(64));

      expect(res.status).toBe(409);
      expect(res.body.code).toBe(
        ImporterErrorCode.IMPORTER_CONFIRM_CONTENT_MISMATCH,
      );
    });
  });

  describe('Transactional Confirmation & Non-Mutation Invariants', () => {
    let confirmedBatchId: string;

    it('should confirm and atomically apply price changes (201 Created)', async () => {
      // Fetch product states before confirmation
      const p1Before = await ds
        .getRepository(Product)
        .findOneByOrFail({ id: activeProduct1.id });
      const p2Before = await ds
        .getRepository(Product)
        .findOneByOrFail({ id: activeProduct2.id });

      const res = await request(app.getHttpServer())
        .post('/api/v1/importer/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', validCsvBuffer, 'valid.csv')
        .field('supplierId', activeSupplier.id)
        .field('mapping', validMappingJson)
        .field('expectedFileChecksum', validFileChecksum)
        .field('expectedMappingChecksum', previewResponse.mappingChecksum)
        .field('expectedContentChecksum', previewResponse.contentChecksum);

      expect(res.status).toBe(201);
      expect(res.body.batchId).toBeDefined();
      expect(res.body.totalRows).toBe(2);
      expect(res.body.appliedRows).toBe(2);
      expect(res.body.changedRows).toBe(1);
      expect(res.body.unchangedRows).toBe(1);
      confirmedBatchId = res.body.batchId;

      // 1. Verify SupplierProduct updates
      const sp1After = await ds
        .getRepository(SupplierProduct)
        .findOneByOrFail({ id: sp1.id });
      const sp2After = await ds
        .getRepository(SupplierProduct)
        .findOneByOrFail({ id: sp2.id });

      expect(new Decimal(sp1After.usualCostNet!).toFixed(4)).toBe('1250.5000');
      expect(sp1After.supplierDescription).toBe('Ibuprofeno 400mg x 100 Nuevo');

      expect(new Decimal(sp2After.usualCostNet!).toFixed(4)).toBe('500.0000');
      expect(sp2After.supplierDescription).toBe('Paracetamol 500mg');

      // 2. Strict non-mutation invariants: Product fields NEVER modified
      const p1After = await ds
        .getRepository(Product)
        .findOneByOrFail({ id: activeProduct1.id });
      const p2After = await ds
        .getRepository(Product)
        .findOneByOrFail({ id: activeProduct2.id });

      expect(p1After.costNet).toBe(p1Before.costNet);
      expect(p1After.markupPercentage).toBe(p1Before.markupPercentage);
      expect(p1After.activePriceNet).toBe(p1Before.activePriceNet);
      expect(p1After.status).toBe(p1Before.status);

      expect(p2After.costNet).toBe(p2Before.costNet);
      expect(p2After.markupPercentage).toBe(p2Before.markupPercentage);
      expect(p2After.activePriceNet).toBe(p2Before.activePriceNet);
      expect(p2After.status).toBe(p2Before.status);

      // 3. Batch and items persisted
      const batch = await ds.getRepository(SupplierImportBatch).findOne({
        where: { id: confirmedBatchId },
        relations: ['items'],
      });
      expect(batch).toBeDefined();
      expect(batch!.changedRows).toBe(1);
      expect(batch!.unchangedRows).toBe(1);
      expect(batch!.items!.length).toBe(2);

      // 4. Transactional audit logs created
      const auditRepo = ds.getRepository(AuditLog);
      const batchAudit = await auditRepo.findOne({
        where: {
          entityName: 'SupplierImportBatch',
          entityId: confirmedBatchId,
        },
      });
      expect(batchAudit).toBeDefined();
      expect(batchAudit!.action).toBe(AuditAction.CREATE);

      const sp1Audit = await auditRepo.findOne({
        where: { entityName: 'SupplierProduct', entityId: sp1.id },
      });
      expect(sp1Audit).toBeDefined();
      expect(sp1Audit!.action).toBe(AuditAction.UPDATE);
    });

    it('should reject sequential duplicate confirmation with 409 and existingBatchId', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/importer/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', validCsvBuffer, 'valid.csv')
        .field('supplierId', activeSupplier.id)
        .field('mapping', validMappingJson)
        .field('expectedFileChecksum', validFileChecksum)
        .field('expectedMappingChecksum', previewResponse.mappingChecksum)
        .field('expectedContentChecksum', previewResponse.contentChecksum);

      expect(res.status).toBe(409);
      expect(res.body.code).toBe(
        ImporterErrorCode.IMPORTER_BATCH_ALREADY_CONFIRMED,
      );
      expect(res.body.existingBatchId).toBe(confirmedBatchId);
    });

    it('should retrieve confirmed batch receipt via GET /api/v1/importer/batches/:batchId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/importer/batches/${confirmedBatchId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.batch.batchId).toBe(confirmedBatchId);
      expect(res.body.batch.supplier.id).toBe(activeSupplier.id);
      expect(res.body.items.length).toBe(2);
      expect(res.body.items[0].supplierSku).toBe('MED-001');
      expect(res.body.items[0].costChanged).toBe(true);
      expect(res.body.items[1].supplierSku).toBe('MED-002');
      expect(res.body.items[1].costChanged).toBe(false);
    });

    it('should return 404 when batch is not found in GET /api/v1/importer/batches/:batchId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/importer/batches/550e8400-e29b-41d4-a716-446655440999`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe(ImporterErrorCode.IMPORTER_BATCH_NOT_FOUND);
    });
  });
});
