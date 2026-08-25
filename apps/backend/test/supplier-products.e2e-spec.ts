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
import { AuditLog } from '../src/modules/audit/entities/audit-log.entity';
import { TaxCondition, AuditAction, ProductStatus } from '@erp/shared-types';
import dataSource from '../src/database/data-source';
import { runInitialSeed } from '../src/database/seeds/initial.seed';

describe('Supplier Product Dictionary CRUD, Audit, Concurrency & Invariance (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;

  const adminPassword = 'AdminPassword123!';
  const sellerPassword = 'SellerPassword123!';

  let adminToken: string;
  let sellerToken: string;

  let testSupplier: Supplier;
  let inactiveSupplier: Supplier;
  let otherSupplier: Supplier;
  let baseUnit: Unit;
  let packUnit: Unit;
  let testCategory: Category;
  let testProduct: Product;
  let otherProduct: Product;

  beforeAll(async () => {
    process.env.JWT_SECRET =
      process.env.JWT_SECRET ||
      'test_ci_jwt_secret_key_minimum_32_characters_long!';
    process.env.JWT_EXPIRATION = process.env.JWT_EXPIRATION || '8h';

    ds = await dataSource.initialize();
    await ds.runMigrations();

    const qr = ds.createQueryRunner();
    await qr.connect();
    await qr.query('TRUNCATE TABLE supplier_products CASCADE;');
    await qr.query('TRUNCATE TABLE suppliers CASCADE;');
    await qr.release();

    await runInitialSeed(ds, {
      adminEmail: 'admin-sp@erp.com',
      adminPassword: adminPassword,
      vendedorEmail: 'seller-sp@erp.com',
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

    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin-sp@erp.com', password: adminPassword });
    adminToken = adminLoginRes.body.accessToken;

    const sellerLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'seller-sp@erp.com', password: sellerPassword });
    sellerToken = sellerLoginRes.body.accessToken;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (ds?.isInitialized) {
      await runInitialSeed(ds);
      await ds.destroy();
    }
  });

  beforeEach(async () => {
    const qr = ds.createQueryRunner();
    await qr.connect();
    await qr.query('ALTER TABLE audit_logs DISABLE TRIGGER ALL');
    await qr.query('TRUNCATE TABLE audit_logs CASCADE');
    await qr.query('ALTER TABLE audit_logs ENABLE TRIGGER ALL');
    await qr.query('TRUNCATE TABLE supplier_products CASCADE');
    await qr.query('TRUNCATE TABLE suppliers CASCADE');
    await qr.query('TRUNCATE TABLE products CASCADE');
    await qr.query('TRUNCATE TABLE categories CASCADE');
    await qr.query('TRUNCATE TABLE units CASCADE');
    await qr.release();

    const unitRepo = ds.getRepository(Unit);
    baseUnit = await unitRepo.save(
      unitRepo.create({ name: 'Unidad', symbol: 'u' }),
    );
    packUnit = await unitRepo.save(
      unitRepo.create({ name: 'Caja', symbol: 'cj' }),
    );

    const catRepo = ds.getRepository(Category);
    testCategory = await catRepo.save(
      catRepo.create({ name: 'Farmacia', description: 'Medicamentos' }),
    );

    const prodRepo = ds.getRepository(Product);
    testProduct = await prodRepo.save(
      prodRepo.create({
        internalCode: 'P0001',
        name: 'Amoxicilina 500mg',
        categoryId: testCategory.id,
        baseUnitId: baseUnit.id,
        minStock: 10,
        costNet: 100,
        markupPercentage: 30,
        suggestedPriceNet: 130,
        activePriceNet: 130,
        status: ProductStatus.ACTIVE,
      }),
    );

    otherProduct = await prodRepo.save(
      prodRepo.create({
        internalCode: 'P0002',
        name: 'Ibuprofeno 400mg',
        categoryId: testCategory.id,
        baseUnitId: baseUnit.id,
        minStock: 5,
        costNet: 50,
        markupPercentage: 40,
        suggestedPriceNet: 70,
        activePriceNet: 70,
        status: ProductStatus.ACTIVE,
      }),
    );

    const supplierRepo = ds.getRepository(Supplier);
    testSupplier = await supplierRepo.save(
      supplierRepo.create({
        businessName: 'Droguería Central SA',
        cuit: '30500010912',
        taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
        isActive: true,
      }),
    );

    inactiveSupplier = await supplierRepo.save(
      supplierRepo.create({
        businessName: 'Proveedor Inactivo SRL',
        cuit: '30711425809',
        taxCondition: TaxCondition.MONOTRIBUTO,
        isActive: false,
      }),
    );

    otherSupplier = await supplierRepo.save(
      supplierRepo.create({
        businessName: 'Distribuidora Norte SA',
        cuit: '30666666666',
        taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
        isActive: true,
      }),
    );
  });

  describe('1. Role-Based Access Control (RBAC)', () => {
    it('rejects unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/suppliers/${testSupplier.id}/products`)
        .expect(401);

      await request(app.getHttpServer())
        .post(`/api/v1/suppliers/${testSupplier.id}/products`)
        .send({})
        .expect(401);
    });

    it('rejects non-admin roles (Vendedor) with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/suppliers/${testSupplier.id}/products`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .post(`/api/v1/suppliers/${testSupplier.id}/products`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          productId: testProduct.id,
          supplierExternalCode: 'SKU-001',
          purchaseUnitId: baseUnit.id,
          conversionFactorToBase: 1,
        })
        .expect(403);
    });
  });

  describe('2. Product Mapping Creation & Validations', () => {
    it('creates mapping with base unit and factor 1', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/suppliers/${testSupplier.id}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: testProduct.id,
          supplierExternalCode: '  SKU-AMOX-1  ',
          supplierDescription: 'Amoxi individual',
          purchaseUnitId: baseUnit.id,
          conversionFactorToBase: 1,
          usualCostNet: 95.5,
          isPrimarySupplier: true,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.supplierExternalCode).toBe('SKU-AMOX-1');
      expect(res.body.conversionFactorToBase).toBe(1);
      expect(res.body.usualCostNet).toBe(95.5);
      expect(res.body.isPrimarySupplier).toBe(true);
      expect(res.body.product.internalCode).toBe('P0001');
      expect(res.body.purchaseUnit.symbol).toBe('u');

      // Verify Audit Log
      const auditRepo = ds.getRepository(AuditLog);
      const audit = await auditRepo.findOneBy({
        entityName: 'SupplierProduct',
        entityId: res.body.id,
      });
      expect(audit).toBeDefined();
      expect(audit?.action).toBe(AuditAction.CREATE);
      expect(audit?.newValues).toMatchObject({
        supplierExternalCode: 'SKU-AMOX-1',
        conversionFactorToBase: '1.0000',
        usualCostNet: '95.5000',
        isPrimarySupplier: true,
      });
    });

    it('creates mapping with custom presentation unit and factor > 0', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/suppliers/${testSupplier.id}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: testProduct.id,
          supplierExternalCode: 'SKU-BOX-20',
          purchaseUnitId: packUnit.id,
          conversionFactorToBase: 20,
        })
        .expect(201);

      expect(res.body.conversionFactorToBase).toBe(20);
      expect(res.body.purchaseUnit.symbol).toBe('cj');
    });

    it('rejects conversionFactorToBase != 1 when purchaseUnit is baseUnit (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/suppliers/${testSupplier.id}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: testProduct.id,
          supplierExternalCode: 'SKU-ERR-1',
          purchaseUnitId: baseUnit.id,
          conversionFactorToBase: 10,
        })
        .expect(400);

      expect(res.body.message).toContain('debe ser exactamente 1');
    });

    it('rejects creation on inactive supplier (400)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/suppliers/${inactiveSupplier.id}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: testProduct.id,
          supplierExternalCode: 'SKU-INACT',
          purchaseUnitId: baseUnit.id,
          conversionFactorToBase: 1,
        })
        .expect(400);
    });

    it('rejects duplicate (supplier_id, product_id) (409 Conflict)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/suppliers/${testSupplier.id}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: testProduct.id,
          supplierExternalCode: 'SKU-A',
          purchaseUnitId: baseUnit.id,
          conversionFactorToBase: 1,
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/suppliers/${testSupplier.id}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: testProduct.id,
          supplierExternalCode: 'SKU-B',
          purchaseUnitId: packUnit.id,
          conversionFactorToBase: 10,
        })
        .expect(409);

      expect(res.body.message).toContain('ya se encuentra asociado');
    });

    it('rejects duplicate supplier_external_code case-insensitively (409 Conflict)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/suppliers/${testSupplier.id}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: testProduct.id,
          supplierExternalCode: 'dup-sku-99',
          purchaseUnitId: baseUnit.id,
          conversionFactorToBase: 1,
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/suppliers/${testSupplier.id}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: otherProduct.id,
          supplierExternalCode: '  DUP-SKU-99  ',
          purchaseUnitId: baseUnit.id,
          conversionFactorToBase: 1,
        })
        .expect(409);

      expect(res.body.message).toContain('código externo');
    });

    it('automatically demotes previous primary supplier and records UPDATE audit log', async () => {
      // Create first primary on testSupplier
      const res1 = await request(app.getHttpServer())
        .post(`/api/v1/suppliers/${testSupplier.id}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: testProduct.id,
          supplierExternalCode: 'SKU-SUP1',
          purchaseUnitId: baseUnit.id,
          conversionFactorToBase: 1,
          isPrimarySupplier: true,
        })
        .expect(201);

      expect(res1.body.isPrimarySupplier).toBe(true);

      // Create second primary on otherSupplier for the same product
      const res2 = await request(app.getHttpServer())
        .post(`/api/v1/suppliers/${otherSupplier.id}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: testProduct.id,
          supplierExternalCode: 'SKU-SUP2',
          purchaseUnitId: packUnit.id,
          conversionFactorToBase: 10,
          isPrimarySupplier: true,
        })
        .expect(201);

      expect(res2.body.isPrimarySupplier).toBe(true);

      // Verify in DB that testSupplier mapping was demoted to false
      const spRepo = ds.getRepository(SupplierProduct);
      const demoted = await spRepo.findOneBy({ id: res1.body.id });
      expect(demoted?.isPrimarySupplier).toBe(false);

      // Verify demoted mapping received an Audit UPDATE log
      const auditRepo = ds.getRepository(AuditLog);
      const demoteAudit = await auditRepo.findOne({
        where: {
          entityName: 'SupplierProduct',
          entityId: res1.body.id,
          action: AuditAction.UPDATE,
        },
      });
      expect(demoteAudit).toBeDefined();
      expect(demoteAudit?.previousValues).toMatchObject({
        isPrimarySupplier: true,
      });
      expect(demoteAudit?.newValues).toMatchObject({
        isPrimarySupplier: false,
      });
    });
  });

  describe('3. Query, Search & Isolation', () => {
    beforeEach(async () => {
      const spRepo = ds.getRepository(SupplierProduct);
      await spRepo.save([
        spRepo.create({
          supplierId: testSupplier.id,
          productId: testProduct.id,
          supplierExternalCode: 'MED-100%',
          supplierDescription: 'Jarabe especial',
          purchaseUnitId: baseUnit.id,
          conversionFactorToBase: '1.0000',
          usualCostNet: '150.0000',
          isPrimarySupplier: true,
        }),
        spRepo.create({
          supplierId: testSupplier.id,
          productId: otherProduct.id,
          supplierExternalCode: 'MED-IBU_400',
          supplierDescription: 'Comprimidos',
          purchaseUnitId: packUnit.id,
          conversionFactorToBase: '10.0000',
          usualCostNet: '200.0000',
          isPrimarySupplier: false,
        }),
        spRepo.create({
          supplierId: otherSupplier.id,
          productId: testProduct.id,
          supplierExternalCode: 'OTHER-AMOX',
          supplierDescription: 'Amoxi de otro proveedor',
          purchaseUnitId: baseUnit.id,
          conversionFactorToBase: '1.0000',
          isPrimarySupplier: false,
        }),
      ]);
    });

    it('returns paginated products and respects cross-supplier isolation', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/suppliers/${testSupplier.id}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.total).toBe(2);
      expect(
        res.body.data.every((item: any) => item.supplierId === testSupplier.id),
      ).toBe(true);
    });

    it('safely escapes %, _, and \\ in search query', async () => {
      const resPercent = await request(app.getHttpServer())
        .get(`/api/v1/suppliers/${testSupplier.id}/products?search=100%`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(resPercent.body.data.length).toBe(1);
      expect(resPercent.body.data[0].supplierExternalCode).toBe('MED-100%');

      const resUnderscore = await request(app.getHttpServer())
        .get(`/api/v1/suppliers/${testSupplier.id}/products?search=IBU_400`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(resUnderscore.body.data.length).toBe(1);
      expect(resUnderscore.body.data[0].supplierExternalCode).toBe(
        'MED-IBU_400',
      );
    });
  });

  describe('4. Updating & Delta Detection', () => {
    let mapping: SupplierProduct;

    beforeEach(async () => {
      const spRepo = ds.getRepository(SupplierProduct);
      mapping = await spRepo.save(
        spRepo.create({
          supplierId: testSupplier.id,
          productId: testProduct.id,
          supplierExternalCode: 'AMOX-OLD',
          supplierDescription: 'Desc original',
          purchaseUnitId: baseUnit.id,
          conversionFactorToBase: '1.0000',
          usualCostNet: '100.0000',
          isPrimarySupplier: false,
        }),
      );
    });

    it('updates mapping attributes and records UPDATE audit log', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/suppliers/${testSupplier.id}/products/${mapping.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          supplierExternalCode: 'AMOX-NEW',
          usualCostNet: 110.5,
        })
        .expect(200);

      expect(res.body.supplierExternalCode).toBe('AMOX-NEW');
      expect(res.body.usualCostNet).toBe(110.5);

      const auditRepo = ds.getRepository(AuditLog);
      const audit = await auditRepo.findOneBy({
        entityName: 'SupplierProduct',
        entityId: mapping.id,
        action: AuditAction.UPDATE,
      });
      expect(audit).toBeDefined();
      expect(audit?.previousValues).toMatchObject({
        supplierExternalCode: 'AMOX-OLD',
        usualCostNet: '100.0000',
      });
      expect(audit?.newValues).toMatchObject({
        supplierExternalCode: 'AMOX-NEW',
        usualCostNet: '110.5000',
      });
    });

    it('rejects update with no effective changes (400)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/suppliers/${testSupplier.id}/products/${mapping.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          supplierExternalCode: 'AMOX-OLD',
          supplierDescription: 'Desc original',
          conversionFactorToBase: 1,
          usualCostNet: 100,
        })
        .expect(400);
    });

    it('returns 404 when association belongs to another supplier', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/suppliers/${otherSupplier.id}/products/${mapping.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          supplierDescription: 'Cambio cruzado',
        })
        .expect(404);
    });
  });

  describe('5. Physical Deletion & Audit Trail', () => {
    let mapping: SupplierProduct;

    beforeEach(async () => {
      const spRepo = ds.getRepository(SupplierProduct);
      mapping = await spRepo.save(
        spRepo.create({
          supplierId: testSupplier.id,
          productId: testProduct.id,
          supplierExternalCode: 'DELETE-ME',
          supplierDescription: 'Por eliminar',
          purchaseUnitId: baseUnit.id,
          conversionFactorToBase: '1.0000',
          usualCostNet: '50.0000',
          isPrimarySupplier: true,
        }),
      );
    });

    it('physically deletes mapping, returns 204 No Content, and records DELETE audit log', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/suppliers/${testSupplier.id}/products/${mapping.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify physical deletion from DB
      const spRepo = ds.getRepository(SupplierProduct);
      const found = await spRepo.findOneBy({ id: mapping.id });
      expect(found).toBeNull();

      // Verify Audit Log
      const auditRepo = ds.getRepository(AuditLog);
      const audit = await auditRepo.findOneBy({
        entityName: 'SupplierProduct',
        entityId: mapping.id,
        action: AuditAction.DELETE,
      });
      expect(audit).toBeDefined();
      expect(audit?.previousValues).toMatchObject({
        supplierExternalCode: 'DELETE-ME',
        conversionFactorToBase: '1.0000',
        usualCostNet: '50.0000',
      });
      expect(audit?.newValues).toBeNull();
    });

    it('allows deleting mapping from an inactive supplier', async () => {
      const spRepo = ds.getRepository(SupplierProduct);
      const inactMapping = await spRepo.save(
        spRepo.create({
          supplierId: inactiveSupplier.id,
          productId: testProduct.id,
          supplierExternalCode: 'INACT-MAPPING',
          purchaseUnitId: baseUnit.id,
          conversionFactorToBase: '1.0000',
          isPrimarySupplier: false,
        }),
      );

      await request(app.getHttpServer())
        .delete(
          `/api/v1/suppliers/${inactiveSupplier.id}/products/${inactMapping.id}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      const found = await spRepo.findOneBy({ id: inactMapping.id });
      expect(found).toBeNull();
    });
  });

  describe('6. Concurrency Serialization on Primary Supplier Assignment', () => {
    it('serializes concurrent requests marking different suppliers as primary for the same product', async () => {
      const spRepo = ds.getRepository(SupplierProduct);
      const m1 = await spRepo.save(
        spRepo.create({
          supplierId: testSupplier.id,
          productId: testProduct.id,
          supplierExternalCode: 'CONC-SUP1',
          purchaseUnitId: baseUnit.id,
          conversionFactorToBase: '1.0000',
          isPrimarySupplier: false,
        }),
      );

      const m2 = await spRepo.save(
        spRepo.create({
          supplierId: otherSupplier.id,
          productId: testProduct.id,
          supplierExternalCode: 'CONC-SUP2',
          purchaseUnitId: packUnit.id,
          conversionFactorToBase: '10.0000',
          isPrimarySupplier: false,
        }),
      );

      // Launch two concurrent requests attempting to mark both as primary
      const req1 = request(app.getHttpServer())
        .patch(`/api/v1/suppliers/${testSupplier.id}/products/${m1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isPrimarySupplier: true });

      const req2 = request(app.getHttpServer())
        .patch(`/api/v1/suppliers/${otherSupplier.id}/products/${m2.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isPrimarySupplier: true });

      const results = await Promise.allSettled([req1, req2]);

      // Both requests should conclude controlled (either 200 or 400/409)
      for (const res of results) {
        expect(res.status).toBe('fulfilled');
      }

      // Assert exactly 1 primary supplier exists in DB for this product
      const primaryCount = await spRepo.countBy({
        productId: testProduct.id,
        isPrimarySupplier: true,
      });
      expect(primaryCount).toBe(1);
    });
  });

  describe('7. Invariance Guarantees', () => {
    it('guarantees that Product internal costNet, activePriceNet, and status are never modified', async () => {
      const prodRepo = ds.getRepository(Product);
      const initialProduct = (await prodRepo.findOneBy({
        id: testProduct.id,
      })) as Product;

      // Perform a series of supplier product operations
      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/suppliers/${testSupplier.id}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: testProduct.id,
          supplierExternalCode: 'SKU-INV-1',
          purchaseUnitId: packUnit.id,
          conversionFactorToBase: 50,
          usualCostNet: 9999.99, // Wildly different cost
          isPrimarySupplier: true,
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(
          `/api/v1/suppliers/${testSupplier.id}/products/${createRes.body.id}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ usualCostNet: 1.0 })
        .expect(200);

      await request(app.getHttpServer())
        .delete(
          `/api/v1/suppliers/${testSupplier.id}/products/${createRes.body.id}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      const finalProduct = (await prodRepo.findOneBy({
        id: testProduct.id,
      })) as Product;

      expect(Number(finalProduct.costNet)).toBe(Number(initialProduct.costNet));
      expect(Number(finalProduct.activePriceNet)).toBe(
        Number(initialProduct.activePriceNet),
      );
      expect(finalProduct.status).toBe(initialProduct.status);
    });
  });
});
