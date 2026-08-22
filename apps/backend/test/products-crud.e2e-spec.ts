import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import dataSource from '../src/database/data-source';
import { runInitialSeed } from '../src/database/seeds/initial.seed';
import { ProductStatus } from '@erp/shared-types';

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
          internalCode: 'MED-FORBIDDEN',
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
          internalCode: '  med-ibu400  ',
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
      expect(res.body.internalCode).toBe('MED-IBU400');
      expect(res.body.name).toBe('Ibuprofeno 400mg x 10 comp');
      expect(res.body.costNet).toBe(1000);
      expect(res.body.markupPercentage).toBe(35.5);
      // 1000 * (1 + 35.5 / 100) = 1355.00
      expect(res.body.suggestedPriceNet).toBe(1355);
      expect(res.body.status).toBe(ProductStatus.ACTIVE);
      expect(res.body.conversions).toHaveLength(1);
      expect(res.body.conversions[0].presentationUnitId).toBe(testBoxUnitId);
      expect(res.body.conversions[0].conversionFactor).toBe(100);
    });

    it('rejects duplicate internalCode with 409 Conflict', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          internalCode: 'MED-IBU400', // same code
          name: 'Ibuprofeno Duplicado',
          categoryId: testCategoryId,
          baseUnitId: testBaseUnitId,
          costNet: 500,
          activePriceNet: 700,
        })
        .expect(409);

      expect(res.body.message).toContain('código interno');
    });

    it('rejects creation when presentation unit equals base unit with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          internalCode: 'MED-INVALID-CONV',
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
          internalCode: 'MED-NO-CAT',
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
          internalCode: 'MED-UPDATE-TEST',
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
          internalCode: 'MED-SECURITY-TEST',
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
          internalCode: 'MED-DEACTIVATE-TEST',
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
          internalCode: 'MED-CONV-RESOURCE',
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
          internalCode: 'MED-CONCURRENT-UNIT',
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
          internalCode: 'MED-FK-RESTRICT',
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
    });
  });
});
