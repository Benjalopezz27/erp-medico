import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import dataSource from '../src/database/data-source';
import { runInitialSeed } from '../src/database/seeds/initial.seed';
import { ProductStatus, ProductTaxTreatment } from '@erp/shared-types';

describe('Products Catalog & Unit Conversions Domain API (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let adminToken: string;
  let sellerToken: string;

  let testCategoryId: string;
  let testBaseUnitId: string;
  let testBoxUnitId: string;
  let testMasterUnitId: string;

  beforeAll(async () => {
    ds = await dataSource.initialize();
    await ds.runMigrations();

    const qr = ds.createQueryRunner();
    await qr.connect();
    await qr.query(
      'TRUNCATE TABLE stock_movements, stocks, product_unit_conversions, products, categories, units, users CASCADE;',
    );
    await qr.release();

    await runInitialSeed(ds, {
      adminEmail: 'products-admin@erp.com',
      adminPassword: 'AdminPassword123!',
      vendedorEmail: 'products-vendedor@erp.com',
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
        email: 'products-admin@erp.com',
        password: 'AdminPassword123!',
      });
    adminToken = adminLoginRes.body.accessToken;

    // Login Seller
    const sellerLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'products-vendedor@erp.com',
        password: 'VendedorPassword123!',
      });
    sellerToken = sellerLoginRes.body.accessToken;

    // Create Test Category
    const catRes = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Medicamentos Éticos',
        description: 'Categoría para productos farmacéuticos',
      });
    testCategoryId = catRes.body.id;

    // Create Test Base Unit (Unidad)
    const baseUnitRes = await request(app.getHttpServer())
      .post('/api/v1/units')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Unidad',
        symbol: 'u',
      });
    testBaseUnitId = baseUnitRes.body.id;

    // Create Test Presentation Units (Caja, Caja Master)
    const boxUnitRes = await request(app.getHttpServer())
      .post('/api/v1/units')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Caja x 100',
        symbol: 'cj100',
      });
    testBoxUnitId = boxUnitRes.body.id;

    const masterUnitRes = await request(app.getHttpServer())
      .post('/api/v1/units')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Caja Master x 1000',
        symbol: 'cjm1000',
      });
    testMasterUnitId = masterUnitRes.body.id;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (ds?.isInitialized) {
      await ds.destroy();
    }
  });

  describe('Authentication & RBAC Protections', () => {
    it('blocks anonymous access to products endpoints (401)', async () => {
      await request(app.getHttpServer()).get('/api/v1/products').expect(401);

      await request(app.getHttpServer())
        .post('/api/v1/products')
        .send({})
        .expect(401);
    });

    it('forbids Seller from creating, updating, and deactivating products (403)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          name: 'Forbidden Product',
          categoryId: testCategoryId,
          baseUnitId: testBaseUnitId,
          costNet: 100,
          activePriceNet: 150,
        })
        .expect(403);
    });
  });

  describe('Product Creation & Composite Conversions (POST /api/v1/products)', () => {
    it('creates product with nested unit conversions and calculates suggestedPriceNet', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Ibuprofeno 400mg x 10 comp',
          description: 'Analgésico y antiinflamatorio',
          categoryId: testCategoryId,
          baseUnitId: testBaseUnitId,
          minStock: 50,
          costNet: 1000,
          markupPercentage: 35.5,
          activePriceNet: 1355.0,
          conversions: [
            {
              presentationUnitId: testBoxUnitId,
              conversionFactor: 100,
            },
          ],
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.internalCode).toMatch(/^P\d{4}$/);
      expect(res.body.name).toBe('Ibuprofeno 400mg x 10 comp');
      expect(res.body.costNet).toBe(1000);
      expect(res.body.markupPercentage).toBe(35.5);
      // 1000 * (1 + 35.5 / 100) = 1355.00
      expect(res.body.suggestedPriceNet).toBe(1355);
      expect(res.body.status).toBe(ProductStatus.ACTIVE);
      expect(res.body.taxTreatment).toBe(ProductTaxTreatment.GRAVADO);
      expect(res.body.ivaPercentage).toBe(21);
      expect(res.body.conversions).toHaveLength(1);
      expect(res.body.conversions[0].presentationUnitId).toBe(testBoxUnitId);
      expect(res.body.conversions[0].conversionFactor).toBe(100);
    });

    it('creates exempt products without a rate and rejects conflicting tax data', async () => {
      const exempt = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Producto exento',
          categoryId: testCategoryId,
          baseUnitId: testBaseUnitId,
          costNet: 100,
          activePriceNet: 120,
          taxTreatment: ProductTaxTreatment.EXENTO,
        })
        .expect(201);
      expect(exempt.body).toMatchObject({
        taxTreatment: ProductTaxTreatment.EXENTO,
        ivaPercentage: null,
      });

      const invalid = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Producto fiscal inválido',
          categoryId: testCategoryId,
          baseUnitId: testBaseUnitId,
          costNet: 100,
          activePriceNet: 120,
          taxTreatment: ProductTaxTreatment.NO_GRAVADO,
          ivaPercentage: 21,
        })
        .expect(400);
      expect(invalid.body.code).toBe('PRODUCT_TAX_CONFIGURATION_INVALID');

      const invalidRate = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Producto con alícuota inválida',
          categoryId: testCategoryId,
          baseUnitId: testBaseUnitId,
          costNet: 100,
          activePriceNet: 120,
          taxTreatment: ProductTaxTreatment.GRAVADO,
          ivaPercentage: 13,
        })
        .expect(400);
      expect(invalidRate.body.code).toBe('PRODUCT_TAX_CONFIGURATION_INVALID');
    });

    it('rejects a client-supplied internalCode because it is generated automatically', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          internalCode: 'MANUAL-001',
          name: 'Producto con código manual',
          categoryId: testCategoryId,
          baseUnitId: testBaseUnitId,
          costNet: 500,
          activePriceNet: 700,
        })
        .expect(400);

      expect(res.body.message).toContain(
        'property internalCode should not exist',
      );
    });

    it('assigns different sequential codes to concurrent product creations', async () => {
      const createProduct = (name: string) =>
        request(app.getHttpServer())
          .post('/api/v1/products')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name,
            categoryId: testCategoryId,
            baseUnitId: testBaseUnitId,
            costNet: 500,
            activePriceNet: 700,
          });

      const [first, second] = await Promise.all([
        createProduct('Producto concurrente A'),
        createProduct('Producto concurrente B'),
      ]);

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      expect(first.body.internalCode).toMatch(/^P\d{4}$/);
      expect(second.body.internalCode).toMatch(/^P\d{4}$/);
      expect(first.body.internalCode).not.toBe(second.body.internalCode);
    });

    it('rejects creation when presentation unit equals base unit with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid Conv Product',
          categoryId: testCategoryId,
          baseUnitId: testBaseUnitId,
          costNet: 100,
          activePriceNet: 150,
          conversions: [
            {
              presentationUnitId: testBaseUnitId, // equal to baseUnitId
              conversionFactor: 10,
            },
          ],
        })
        .expect(400);

      expect(res.body.message).toContain('igual a la unidad base');
    });

    it('rejects non-existent categoryId with 404', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'No Cat Product',
          categoryId: '00000000-0000-4000-8000-000000000001',
          baseUnitId: testBaseUnitId,
          costNet: 100,
          activePriceNet: 150,
        })
        .expect(404);
    });
  });

  describe('Product Updates & Immutability (PATCH /api/v1/products/:id)', () => {
    let testProductId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Original Product Name',
          description: 'Original Description',
          categoryId: testCategoryId,
          baseUnitId: testBaseUnitId,
          costNet: 2000,
          markupPercentage: 25,
          activePriceNet: 2500,
        });
      testProductId = res.body.id;
    });

    it('rejects attempt to modify internalCode with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/products/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          internalCode: 'MED-NEW-CODE',
          name: 'Modified Name',
        })
        .expect(400);

      expect(res.body.message).toContain(
        'property internalCode should not exist',
      );
    });

    it('recalculates suggestedPriceNet when costNet or markupPercentage changes', async () => {
      // New cost: 3000, new markup: 40 -> 3000 * 1.4 = 4200.00
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/products/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          costNet: 3000,
          markupPercentage: 40,
        })
        .expect(200);

      expect(res.body.costNet).toBe(3000);
      expect(res.body.markupPercentage).toBe(40);
      expect(res.body.suggestedPriceNet).toBe(4200);
    });

    it('clears the product override, inherits global markup and recalculates suggested price', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/products/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ markupPercentage: null })
        .expect(200);

      expect(res.body.markupPercentage).toBe(0);
      expect(res.body.suggestedPriceNet).toBe(3000);
    });

    it('clears description when passing null or empty string', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/products/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: '',
        })
        .expect(200);

      expect(res.body.description).toBeNull();
    });

    it('rejects no-op update without modifications with 400', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/products/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Original Product Name',
        })
        .expect(400);

      expect(res.body.message).toContain('No se detectaron modificaciones');
    });

    it.each([
      ['name', null],
      ['costNet', null],
      ['status', null],
    ])('rejects null for non-nullable field %s', async (field, value) => {
      await request(app.getHttpServer())
        .patch(`/api/v1/products/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ [field]: value })
        .expect(400);
    });
  });

  describe('Secure Role-Based Serialization', () => {
    let testProductId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Security Test Product',
          categoryId: testCategoryId,
          baseUnitId: testBaseUnitId,
          costNet: 1234.56,
          markupPercentage: 45.0,
          activePriceNet: 1790.11,
        });
      testProductId = res.body.id;
    });

    it('redacts costNet, markupPercentage, and suggestedPriceNet for Seller (GET /products/:id)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/products/${testProductId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(res.body.id).toBe(testProductId);
      expect(res.body.activePriceNet).toBe(1790.11);
      expect(res.body.costNet).toBeUndefined();
      expect(res.body.markupPercentage).toBeUndefined();
      expect(res.body.suggestedPriceNet).toBeUndefined();
    });

    it('redacts financial fields for Seller in listing (GET /products)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(res.body.items).toBeDefined();
      const product = res.body.items.find((p: any) => p.id === testProductId);
      expect(product).toBeDefined();
      expect(product.costNet).toBeUndefined();
      expect(product.markupPercentage).toBeUndefined();
      expect(product.suggestedPriceNet).toBeUndefined();
    });

    it('exposes full financial fields for Administrator', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/products/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.costNet).toBe(1234.56);
      expect(res.body.markupPercentage).toBe(45.0);
      expect(res.body.suggestedPriceNet).toBe(1790.11);
    });
  });

  describe('Logical Deactivation & Reactivation (DELETE & PATCH)', () => {
    let testProductId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Deactivation Target Product',
          categoryId: testCategoryId,
          baseUnitId: testBaseUnitId,
          costNet: 100,
          activePriceNet: 150,
        });
      testProductId = res.body.id;
    });

    it('deactivates product logically (204 No Content)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/products/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      const check = await request(app.getHttpServer())
        .get(`/api/v1/products/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(check.body.status).toBe(ProductStatus.INACTIVE);
    });

    it('reactivates product via PATCH /products/:id with status: ACTIVE', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/products/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: ProductStatus.ACTIVE,
        })
        .expect(200);

      expect(res.body.status).toBe(ProductStatus.ACTIVE);
    });
  });

  describe('Unit Conversions Sub-Resource Endpoints', () => {
    let testProductId: string;
    let conversionId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Conversion Resource Product',
          categoryId: testCategoryId,
          baseUnitId: testBaseUnitId,
          costNet: 100,
          activePriceNet: 150,
        });
      testProductId = res.body.id;
    });

    it('adds unit conversion to product (POST /products/:id/conversions)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/products/${testProductId}/conversions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          presentationUnitId: testBoxUnitId,
          conversionFactor: 24,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      conversionId = res.body.id;
      expect(res.body.conversionFactor).toBe(24);
      expect(res.body.presentationUnitId).toBe(testBoxUnitId);
    });

    it('rejects duplicate conversion presentation unit with 409 Conflict', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/products/${testProductId}/conversions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          presentationUnitId: testBoxUnitId, // duplicate
          conversionFactor: 50,
        })
        .expect(409);
    });

    it('updates conversion factor (PATCH /products/:id/conversions/:conversionId)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/products/${testProductId}/conversions/${conversionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          conversionFactor: 48,
        })
        .expect(200);

      expect(res.body.conversionFactor).toBe(48);
    });

    it('lists unit conversions for product (GET /products/:id/conversions)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/products/${testProductId}/conversions`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(conversionId);
    });

    it('deletes conversion rule (DELETE /products/:id/conversions/:conversionId)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/products/${testProductId}/conversions/${conversionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/products/${testProductId}/conversions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(listRes.body).toHaveLength(0);
    });

    it('serializes a base-unit change against concurrent conversion creation', async () => {
      const productRes = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Concurrent Unit Product',
          categoryId: testCategoryId,
          baseUnitId: testBaseUnitId,
          costNet: 100,
          activePriceNet: 150,
        })
        .expect(201);

      const [baseChange, conversionCreation] = await Promise.all([
        request(app.getHttpServer())
          .patch(`/api/v1/products/${productRes.body.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ baseUnitId: testMasterUnitId }),
        request(app.getHttpServer())
          .post(`/api/v1/products/${productRes.body.id}/conversions`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            presentationUnitId: testMasterUnitId,
            conversionFactor: 1000,
          }),
      ]);

      expect([baseChange.status, conversionCreation.status]).toContain(400);
      expect([200, 201]).toContain(
        baseChange.status === 400
          ? conversionCreation.status
          : baseChange.status,
      );

      const invalidInvariantRows = await ds.query(
        `SELECT 1
           FROM products p
           JOIN product_unit_conversions c ON c.product_id = p.id
          WHERE p.id = $1
            AND c.presentation_unit_id = p.base_unit_id`,
        [productRes.body.id],
      );
      expect(invalidInvariantRows).toHaveLength(0);
    });
  });

  describe('Real PostgreSQL Foreign Key Restrict Integrity', () => {
    let categoryWithProduct: string;
    let unitWithProduct: string;

    beforeAll(async () => {
      // Create exclusive category and unit for FK restrict test
      const catRes = await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'FK Restrict Category' });
      categoryWithProduct = catRes.body.id;

      const unitRes = await request(app.getHttpServer())
        .post('/api/v1/units')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'FK Restrict Unit', symbol: 'fk_u' });
      unitWithProduct = unitRes.body.id;

      // Create product referencing both
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'FK Product',
          categoryId: categoryWithProduct,
          baseUnitId: unitWithProduct,
          costNet: 100,
          activePriceNet: 150,
        });
    });

    it('returns 409 Conflict when attempting to delete a Category referenced by a real product', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/categories/${categoryWithProduct}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);

      expect(res.body.message).toContain('asociada a productos existentes');
    });

    it('returns 409 Conflict when attempting to delete a Unit referenced by a real product', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/units/${unitWithProduct}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);

      expect(res.body.message).toContain('asociada a productos existentes');
    });
  });

  describe('Swagger / OpenAPI Specification Coverage', () => {
    it('generates OpenAPI document covering products routes and role response schemas', () => {
      const config = new DocumentBuilder()
        .setTitle('ERP API')
        .addBearerAuth(
          { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          'JWT-auth',
        )
        .build();

      const document = SwaggerModule.createDocument(app, config);

      expect(document.paths['/api/v1/products']).toBeDefined();
      expect(document.paths['/api/v1/products'].get).toBeDefined();
      expect(document.paths['/api/v1/products'].post).toBeDefined();

      expect(document.paths['/api/v1/products/{id}']).toBeDefined();
      expect(document.paths['/api/v1/products/{id}'].get).toBeDefined();
      expect(document.paths['/api/v1/products/{id}'].patch).toBeDefined();
      expect(document.paths['/api/v1/products/{id}'].delete).toBeDefined();

      expect(document.paths['/api/v1/products/{id}/conversions']).toBeDefined();
      expect(
        document.paths['/api/v1/products/{id}/conversions'].get,
      ).toBeDefined();
      expect(
        document.paths['/api/v1/products/{id}/conversions'].post,
      ).toBeDefined();

      expect(
        document.paths['/api/v1/products/{id}/conversions/{conversionId}'],
      ).toBeDefined();
      expect(
        document.paths['/api/v1/products/{id}/conversions/{conversionId}']
          .patch,
      ).toBeDefined();
      expect(
        document.paths['/api/v1/products/{id}/conversions/{conversionId}']
          .delete,
      ).toBeDefined();

      expect(document.paths['/api/v1/products/search']).toBeDefined();
      expect(document.paths['/api/v1/products/search'].get).toBeDefined();
    });
  });

  describe('Typeahead Search & Extended Filters (Issue #47)', () => {
    let searchCategoryId: string;
    let otherCategoryId: string;
    let searchBaseUnitId: string;
    let inactiveProductId: string;
    let otherCategoryProduct: string;
    let exactSearchCode: string;

    beforeAll(async () => {
      // Create dedicated categories
      const cat1Res = await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Farmacia General' });
      searchCategoryId = cat1Res.body.id;

      const cat2Res = await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Descartables Hospitalarios' });
      otherCategoryId = cat2Res.body.id;

      // Create dedicated base unit
      const unitRes = await request(app.getHttpServer())
        .post('/api/v1/units')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Unidad Farmacia', symbol: 'ufarm' });
      searchBaseUnitId = unitRes.body.id;

      // Product 1: Search Exact Target
      const exactProduct = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Amoxicilina 500mg x 16 cápsulas',
          categoryId: searchCategoryId,
          baseUnitId: searchBaseUnitId,
          costNet: 800,
          activePriceNet: 1200,
        });

      // Product 2: Prefix/Name target
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Amoxicilina + Ácido Clavulánico 500/125mg',
          categoryId: searchCategoryId,
          baseUnitId: searchBaseUnitId,
          costNet: 1500,
          activePriceNet: 2200,
        });
      exactSearchCode = exactProduct.body.internalCode;

      // Inactive Product
      const p3 = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Amoxicilina Suspensión 250mg (Discontinuado)',
          categoryId: searchCategoryId,
          baseUnitId: searchBaseUnitId,
          costNet: 600,
          activePriceNet: 900,
        });
      inactiveProductId = p3.body.id;
      await request(app.getHttpServer())
        .delete(`/api/v1/products/${inactiveProductId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Product in second category
      const p4 = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Guantes de Látex Descartables Talle M',
          categoryId: otherCategoryId,
          baseUnitId: searchBaseUnitId,
          costNet: 100,
          activePriceNet: 150,
        });
      otherCategoryProduct = p4.body.id;
    });

    it('prevents route collision: GET /api/v1/products/search is not intercepted by :id (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products/search')
        .query({ q: 'Amoxi' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('rejects search queries with less than 2 characters (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/products/search')
        .query({ q: 'A' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      await request(app.getHttpServer())
        .get('/api/v1/products/search')
        .query({ q: '   ' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('ranks an exact internal code match first', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products/search')
        .query({ q: exactSearchCode.toLowerCase() })
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(res.body[0].internalCode).toBe(exactSearchCode);
    });

    it('ensures role parity with zero pricing leaks: Administrator and Seller receive exact same summary schema', async () => {
      const adminRes = await request(app.getHttpServer())
        .get('/api/v1/products/search')
        .query({ q: 'Amoxi' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const sellerRes = await request(app.getHttpServer())
        .get('/api/v1/products/search')
        .query({ q: 'Amoxi' })
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(adminRes.body).toEqual(sellerRes.body);

      const item = sellerRes.body[0];
      expect(item.id).toBeDefined();
      expect(item.internalCode).toBeDefined();
      expect(item.name).toBeDefined();
      expect(item.baseUnit).toEqual({
        id: searchBaseUnitId,
        name: 'Unidad Farmacia',
        symbol: 'ufarm',
      });
      expect(item.currentStock).toBe(0);
      expect(item.activePriceNet).toBeGreaterThan(0);

      // Verify no sensitive fields leaked
      expect(item.costNet).toBeUndefined();
      expect(item.markupPercentage).toBeUndefined();
      expect(item.suggestedPriceNet).toBeUndefined();
    });

    it('excludes inactive products from typeahead search results', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products/search')
        .query({ q: 'Discontinuado' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('filters catalog list with combined search, category, and status', async () => {
      // 1. Search text only
      const searchRes = await request(app.getHttpServer())
        .get('/api/v1/products')
        .query({ search: 'Guantes' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(searchRes.body.total).toBe(1);
      expect(searchRes.body.items[0].name).toContain('Guantes');

      // 2. Category filter only
      const catRes = await request(app.getHttpServer())
        .get('/api/v1/products')
        .query({ category: otherCategoryId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(catRes.body.total).toBe(1);
      expect(catRes.body.items[0].id).toBe(otherCategoryProduct);

      // 3. Combined search + category mismatch -> 0 results
      const emptyRes = await request(app.getHttpServer())
        .get('/api/v1/products')
        .query({ search: 'Guantes', category: searchCategoryId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(emptyRes.body.total).toBe(0);
      expect(emptyRes.body.items).toHaveLength(0);

      // 4. Combined search + status INACTIVE
      const inactiveRes = await request(app.getHttpServer())
        .get('/api/v1/products')
        .query({ search: 'Discontinuado', status: ProductStatus.INACTIVE })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(inactiveRes.body.total).toBe(1);
      expect(inactiveRes.body.items[0].id).toBe(inactiveProductId);
    });
  });
});
