import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
  CustomerDocumentType,
  CustomerPricingErrorCode,
  CustomerPricingRuleApplied,
  CustomerSpecialPriceMode,
  ProductStatus,
  TaxCondition,
} from '@erp/shared-types';
import { AppModule } from '../src/app.module';
import dataSource from '../src/database/data-source';
import { CreateCustomerSpecialPricesAndDiscounts1700000000022 } from '../src/database/migrations/1700000000022-CreateCustomerSpecialPricesAndDiscounts';
import { runInitialSeed } from '../src/database/seeds/initial.seed';
import { Category } from '../src/modules/categories/entities/category.entity';
import { Product } from '../src/modules/products/entities/product.entity';
import { Unit } from '../src/modules/units/entities/unit.entity';

describe('Customer pricing domain and API (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let adminToken: string;
  let sellerToken: string;
  let documentSequence = 35123000;

  beforeAll(async () => {
    ds = await dataSource.initialize();
    await ds.runMigrations();
    const runner = ds.createQueryRunner();
    await runner.connect();
    const migration =
      new CreateCustomerSpecialPricesAndDiscounts1700000000022();
    await migration.down(runner);
    await migration.up(runner);
    await runner.release();
    await runInitialSeed(ds, {
      adminEmail: 'customer-pricing-admin@erp.com',
      adminPassword: 'AdminPassword123!',
      vendedorEmail: 'customer-pricing-seller@erp.com',
      vendedorPassword: 'SellerPassword123!',
    });
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
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
        email: 'customer-pricing-admin@erp.com',
        password: 'AdminPassword123!',
      })
    ).body.accessToken;
    sellerToken = (
      await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'customer-pricing-seller@erp.com',
        password: 'SellerPassword123!',
      })
    ).body.accessToken;
  });

  beforeEach(async () => {
    await ds.query(`
      TRUNCATE TABLE customer_special_prices, customers, products, units,
        categories, audit_logs RESTART IDENTITY CASCADE
    `);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (ds?.isInitialized) {
      await runInitialSeed(ds);
      await ds.destroy();
    }
  });

  async function createProduct(activePriceNet = '120.00'): Promise<Product> {
    const category = await ds
      .getRepository(Category)
      .save({ name: `Categoría precios ${Date.now()}` });
    const unit = await ds
      .getRepository(Unit)
      .save({ name: `Unidad precios ${Date.now()}`, symbol: `U${Date.now()}` });
    return ds.getRepository(Product).save({
      internalCode: `PRICE-${Date.now()}`,
      name: 'Producto con precio especial',
      description: null,
      categoryId: category.id,
      baseUnitId: unit.id,
      minStock: '0.00',
      costNet: '50.0000',
      suggestedPriceNet: '999.00',
      activePriceNet,
      status: ProductStatus.ACTIVE,
    });
  }

  async function createCustomer(generalDiscountPercentage = '15.0000') {
    const response = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        businessName: 'Cliente con condiciones',
        documentType: CustomerDocumentType.DNI,
        cuitOrDni: String(documentSequence++),
        taxCondition: TaxCondition.CONSUMIDOR_FINAL,
        generalDiscountPercentage,
      })
      .expect(201);
    return response.body;
  }

  it('resolves the complete hierarchy without changing catalog prices', async () => {
    const customer = await createCustomer();
    const product = await createProduct();
    const fixed = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customer.id}/special-prices`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: product.id,
        mode: CustomerSpecialPriceMode.FIXED_PRICE,
        specialPriceNet: '100.00',
      })
      .expect(201);
    expect(fixed.body).toMatchObject({
      activeCatalogPriceNet: '120.00',
      finalPriceNet: '100.00',
    });

    const fixedResolution = await request(app.getHttpServer())
      .get(
        `/api/v1/customers/${customer.id}/special-prices/resolve/${product.id}`,
      )
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    expect(fixedResolution.body.ruleApplied).toBe(
      CustomerPricingRuleApplied.FIXED_PRICE,
    );

    await request(app.getHttpServer())
      .patch(`/api/v1/customers/${customer.id}/special-prices/${fixed.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        expectedVersion: fixed.body.version,
        mode: CustomerSpecialPriceMode.DISCOUNT_PERCENTAGE,
        discountPercentage: '10.0000',
      })
      .expect(200);
    const specific = await request(app.getHttpServer())
      .get(
        `/api/v1/customers/${customer.id}/special-prices/resolve/${product.id}`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(specific.body).toMatchObject({
      ruleApplied: CustomerPricingRuleApplied.PRODUCT_DISCOUNT,
      discountAmountNet: '12.00',
      finalPriceNet: '108.00',
    });

    await request(app.getHttpServer())
      .delete(
        `/api/v1/customers/${customer.id}/special-prices/${fixed.body.id}`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
    const general = await request(app.getHttpServer())
      .get(
        `/api/v1/customers/${customer.id}/special-prices/resolve/${product.id}`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(general.body).toMatchObject({
      ruleApplied: CustomerPricingRuleApplied.GENERAL_DISCOUNT,
      finalPriceNet: '102.00',
    });

    await request(app.getHttpServer())
      .patch(`/api/v1/customers/${customer.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ generalDiscountPercentage: '0' })
      .expect(200);
    const catalog = await request(app.getHttpServer())
      .get(
        `/api/v1/customers/${customer.id}/special-prices/resolve/${product.id}`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(catalog.body).toMatchObject({
      ruleApplied: CustomerPricingRuleApplied.CATALOG_PRICE,
      finalPriceNet: '120.00',
    });

    const persistedProduct = await ds
      .getRepository(Product)
      .findOneByOrFail({ id: product.id });
    expect(persistedProduct.activePriceNet).toBe('120.00');
    expect(persistedProduct.suggestedPriceNet).toBe('999.00');
    const audits = await ds.query(
      `SELECT action FROM audit_logs WHERE entity_name = 'CustomerSpecialPrice' ORDER BY created_at`,
    );
    expect(audits.map((audit: { action: string }) => audit.action)).toEqual([
      'CREATE',
      'UPDATE',
      'DELETE',
    ]);
  });

  it('allows both roles to read but only administrators to mutate pricing', async () => {
    const customer = await createCustomer('0');
    const product = await createProduct();
    await request(app.getHttpServer())
      .get(`/api/v1/customers/${customer.id}/special-prices`)
      .expect(401);
    await request(app.getHttpServer())
      .get(`/api/v1/customers/${customer.id}/special-prices`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/customers/${customer.id}/special-prices`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        productId: product.id,
        mode: CustomerSpecialPriceMode.FIXED_PRICE,
        specialPriceNet: '100.00',
      })
      .expect(403);
    const forbiddenDiscount = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${customer.id}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ generalDiscountPercentage: '5.0000' })
      .expect(403);
    expect(forbiddenDiscount.body.code).toBe('CUSTOMER_FORBIDDEN_FIELD_UPDATE');
  });

  it('rejects ambiguous, duplicate and inactive references with stable errors', async () => {
    const customer = await createCustomer();
    const product = await createProduct();
    const ambiguous = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customer.id}/special-prices`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: product.id,
        mode: CustomerSpecialPriceMode.FIXED_PRICE,
        specialPriceNet: '100.00',
        discountPercentage: '5.0000',
      })
      .expect(400);
    expect(ambiguous.body.code).toBe(
      CustomerPricingErrorCode.CUSTOMER_SPECIAL_PRICE_INVALID_MODE,
    );

    const invalidDiscount = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customer.id}/special-prices`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: product.id,
        mode: CustomerSpecialPriceMode.DISCOUNT_PERCENTAGE,
        discountPercentage: '100.0001',
      })
      .expect(400);
    expect(invalidDiscount.body.code).toBe(
      CustomerPricingErrorCode.CUSTOMER_SPECIAL_PRICE_INVALID_DISCOUNT,
    );

    const payload = {
      productId: product.id,
      mode: CustomerSpecialPriceMode.FIXED_PRICE,
      specialPriceNet: '100.00',
    };
    await request(app.getHttpServer())
      .post(`/api/v1/customers/${customer.id}/special-prices`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)
      .expect(201);
    const duplicate = await request(app.getHttpServer())
      .post(`/api/v1/customers/${customer.id}/special-prices`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)
      .expect(409);
    expect(duplicate.body.code).toBe(
      CustomerPricingErrorCode.CUSTOMER_SPECIAL_PRICE_ALREADY_EXISTS,
    );

    product.status = ProductStatus.INACTIVE;
    await ds.getRepository(Product).save(product);
    const inactiveProduct = await request(app.getHttpServer())
      .get(
        `/api/v1/customers/${customer.id}/special-prices/resolve/${product.id}`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
    expect(inactiveProduct.body.code).toBe(
      CustomerPricingErrorCode.CUSTOMER_PRICING_PRODUCT_INACTIVE,
    );
    product.status = ProductStatus.ACTIVE;
    await ds.getRepository(Product).save(product);

    await request(app.getHttpServer())
      .delete(`/api/v1/customers/${customer.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const inactive = await request(app.getHttpServer())
      .get(
        `/api/v1/customers/${customer.id}/special-prices/resolve/${product.id}`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
    expect(inactive.body.code).toBe(
      CustomerPricingErrorCode.CUSTOMER_PRICING_CUSTOMER_INACTIVE,
    );
  });

  it('serializes duplicate concurrent creation into one success and one 409', async () => {
    const customer = await createCustomer();
    const product = await createProduct();
    const makeRequest = () =>
      request(app.getHttpServer())
        .post(`/api/v1/customers/${customer.id}/special-prices`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: product.id,
          mode: CustomerSpecialPriceMode.DISCOUNT_PERCENTAGE,
          discountPercentage: '12.5000',
        });
    const responses = await Promise.all([makeRequest(), makeRequest()]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
    const conflict = responses.find((response) => response.status === 409)!;
    expect(conflict.body.code).toBe(
      CustomerPricingErrorCode.CUSTOMER_SPECIAL_PRICE_ALREADY_EXISTS,
    );
    const count = await ds.query(
      `SELECT COUNT(*)::int AS count FROM customer_special_prices WHERE customer_id = $1 AND product_id = $2`,
      [customer.id, product.id],
    );
    expect(count[0].count).toBe(1);

    const created = responses.find((response) => response.status === 201)!;
    const updateRequest = (price: string) =>
      request(app.getHttpServer())
        .patch(
          `/api/v1/customers/${customer.id}/special-prices/${created.body.id}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          expectedVersion: created.body.version,
          mode: CustomerSpecialPriceMode.FIXED_PRICE,
          specialPriceNet: price,
        });
    const updates = await Promise.all([
      updateRequest('80.00'),
      updateRequest('90.00'),
    ]);
    expect(updates.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    const stale = updates.find((response) => response.status === 409)!;
    expect(stale.body).toMatchObject({
      code: CustomerPricingErrorCode.CUSTOMER_SPECIAL_PRICE_CONCURRENCY_CONFLICT,
      details: { currentRule: { version: 2 } },
    });
  });
});
