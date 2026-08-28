import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { MarkupLevel } from '@erp/shared-types';
import { AppModule } from '../src/app.module';
import dataSource from '../src/database/data-source';
import { runInitialSeed } from '../src/database/seeds/initial.seed';

describe('Markup hierarchy API (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let adminToken: string;
  let sellerToken: string;
  let categoryId: string;
  let productId: string;

  beforeAll(async () => {
    ds = await dataSource.initialize();
    await ds.runMigrations();
    await ds.query(
      'TRUNCATE TABLE stock_movements, stocks, product_unit_conversions, products, categories, units, users CASCADE;',
    );
    await runInitialSeed(ds, {
      adminEmail: 'markups-admin@erp.com',
      adminPassword: 'AdminPassword123!',
      vendedorEmail: 'markups-seller@erp.com',
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
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    adminToken = (
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'markups-admin@erp.com', password: 'AdminPassword123!' })
    ).body.accessToken;
    sellerToken = (
      await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'markups-seller@erp.com',
        password: 'SellerPassword123!',
      })
    ).body.accessToken;
    categoryId = (
      await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Insumos markup' })
        .expect(201)
    ).body.id;
    const unitId = (
      await request(app.getHttpServer())
        .post('/api/v1/units')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Unidad markup', symbol: 'um' })
        .expect(201)
    ).body.id;
    productId = (
      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Producto jerarquía',
          categoryId,
          baseUnitId: unitId,
          costNet: 100,
          activePriceNet: 120,
        })
        .expect(201)
    ).body.id;
  });

  afterAll(async () => {
    if (app) await app.close();
    if (ds?.isInitialized) await ds.destroy();
  });

  it('protects pricing configuration from sellers', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/prices/markups')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(403);
  });

  it('resolves product, category and global fallback without changing active price', async () => {
    const configurations = await request(app.getHttpServer())
      .get('/api/v1/prices/markups')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const global = configurations.body.find(
      (row: { level: MarkupLevel }) => row.level === MarkupLevel.GLOBAL,
    );
    await request(app.getHttpServer())
      .patch(`/api/v1/prices/markups/${global.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ percentage: '15.0000' })
      .expect(200);
    const category = (
      await request(app.getHttpServer())
        .post('/api/v1/prices/markups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          level: MarkupLevel.CATEGORY,
          percentage: '20.0000',
          categoryId,
        })
        .expect(201)
    ).body;
    const product = (
      await request(app.getHttpServer())
        .post('/api/v1/prices/markups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          level: MarkupLevel.PRODUCT,
          percentage: '25.0000',
          productId,
        })
        .expect(201)
    ).body;

    const simulate = async () =>
      (
        await request(app.getHttpServer())
          .get(`/api/v1/prices/markups/simulate/${productId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
      ).body;
    expect((await simulate()).effectiveMarkup).toMatchObject({
      level: MarkupLevel.PRODUCT,
      percentage: '25.0000',
    });
    await request(app.getHttpServer())
      .delete(`/api/v1/prices/markups/${product.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
    expect((await simulate()).effectiveMarkup).toMatchObject({
      level: MarkupLevel.CATEGORY,
      percentage: '20.0000',
    });
    await request(app.getHttpServer())
      .delete(`/api/v1/prices/markups/${category.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
    expect((await simulate()).effectiveMarkup).toMatchObject({
      level: MarkupLevel.GLOBAL,
      percentage: '15.0000',
    });

    const catalog = await request(app.getHttpServer())
      .get(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(catalog.body.activePriceNet).toBe(120);
    expect(catalog.body.suggestedPriceNet).toBe(115);

    const auditActions = await ds.query(
      `SELECT action FROM audit_logs
       WHERE entity_name = 'MarkupConfiguration' AND entity_id = $1
       ORDER BY created_at ASC`,
      [product.id],
    );
    expect(auditActions.map((row: { action: string }) => row.action)).toEqual([
      'CREATE',
      'DELETE',
    ]);
  });

  it('serializes concurrent attempts to configure the same target', async () => {
    const concurrentCategoryId = (
      await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Categoría concurrente' })
        .expect(201)
    ).body.id;
    const createRule = () =>
      request(app.getHttpServer())
        .post('/api/v1/prices/markups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          level: MarkupLevel.CATEGORY,
          percentage: '12.5000',
          categoryId: concurrentCategoryId,
        });

    const responses = await Promise.all([createRule(), createRule()]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);

    const created = responses.find((response) => response.status === 201)!;
    await request(app.getHttpServer())
      .delete(`/api/v1/prices/markups/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });

  it('rejects duplicate targets and deletion of the mandatory global rule', async () => {
    const rows = (
      await request(app.getHttpServer())
        .get('/api/v1/prices/markups')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
    ).body;
    const global = rows.find(
      (row: { level: MarkupLevel }) => row.level === MarkupLevel.GLOBAL,
    );
    await request(app.getHttpServer())
      .post('/api/v1/prices/markups')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ level: MarkupLevel.GLOBAL, percentage: '10.0000' })
      .expect(409);
    await request(app.getHttpServer())
      .delete(`/api/v1/prices/markups/${global.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });
});
