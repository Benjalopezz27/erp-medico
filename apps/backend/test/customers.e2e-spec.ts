import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
  CustomerDocumentType,
  CustomerErrorCode,
  TaxCondition,
} from '@erp/shared-types';
import { AppModule } from '../src/app.module';
import dataSource from '../src/database/data-source';
import { runInitialSeed } from '../src/database/seeds/initial.seed';
import { CreateCustomersTable1700000000021 } from '../src/database/migrations/1700000000021-CreateCustomersTable';
import { CreateCustomerSpecialPricesAndDiscounts1700000000022 } from '../src/database/migrations/1700000000022-CreateCustomerSpecialPricesAndDiscounts';
import { CreateSalesFiscalAndReceivablesTables1700000000023 } from '../src/database/migrations/1700000000023-CreateSalesFiscalAndReceivablesTables';

describe('Customers domain and API (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let adminToken: string;
  let sellerToken: string;
  const adminEmail = 'admin-customers@erp.com';
  const sellerEmail = 'seller-customers@erp.com';
  const adminPassword = 'AdminPassword123!';
  const sellerPassword = 'SellerPassword123!';

  beforeAll(async () => {
    ds = await dataSource.initialize();
    await ds.runMigrations();
    const migrationRunner = ds.createQueryRunner();
    await migrationRunner.connect();
    const customerMigration = new CreateCustomersTable1700000000021();
    const pricingMigration =
      new CreateCustomerSpecialPricesAndDiscounts1700000000022();
    const salesMigration =
      new CreateSalesFiscalAndReceivablesTables1700000000023();
    await salesMigration.down(migrationRunner);
    await pricingMigration.down(migrationRunner);
    await customerMigration.down(migrationRunner);
    await customerMigration.up(migrationRunner);
    await pricingMigration.up(migrationRunner);
    await salesMigration.up(migrationRunner);
    await migrationRunner.release();
    await runInitialSeed(ds, {
      adminEmail,
      adminPassword,
      vendedorEmail: sellerEmail,
      vendedorPassword: sellerPassword,
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
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: adminEmail, password: adminPassword })
    ).body.accessToken;
    sellerToken = (
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: sellerEmail, password: sellerPassword })
    ).body.accessToken;
  });

  beforeEach(async () => {
    await ds.query('TRUNCATE TABLE customers CASCADE');
    await ds.query('TRUNCATE TABLE audit_logs CASCADE');
  });

  afterAll(async () => {
    if (app) await app.close();
    if (ds?.isInitialized) {
      await runInitialSeed(ds);
      await ds.destroy();
    }
  });

  it('requires authentication and permits both operational roles', async () => {
    await request(app.getHttpServer()).get('/api/v1/customers').expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/customers')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
  });

  it('normalizes identity and decimal values without fabricating balances', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        businessName: ' Farmacia Central ',
        documentType: CustomerDocumentType.CUIT,
        cuitOrDni: '30-50001091-2',
        taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
        creditLimit: '5000.5',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      businessName: 'Farmacia Central',
      cuitOrDni: '30500010912',
      creditLimit: '5000.50',
      generalDiscountPercentage: '0.0000',
      isActive: true,
    });
    expect(response.body).not.toHaveProperty('currentBalance');
    expect(response.body).not.toHaveProperty('availableCredit');
  });

  it('rejects invalid fiscal combinations and normalized duplicates', async () => {
    const invalid = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        businessName: 'Cliente Inválido',
        documentType: CustomerDocumentType.DNI,
        cuitOrDni: '35.123.456',
        taxCondition: TaxCondition.MONOTRIBUTO,
      })
      .expect(400);
    expect(invalid.body.code).toBe(
      CustomerErrorCode.CUSTOMER_TAX_CONDITION_INCOMPATIBLE,
    );

    const payload = {
      businessName: 'Cliente Uno',
      documentType: CustomerDocumentType.DNI,
      cuitOrDni: '35.123.456',
      taxCondition: TaxCondition.CONSUMIDOR_FINAL,
    };
    await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)
      .expect(201);
    const duplicate = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...payload, businessName: 'Cliente Dos', cuitOrDni: '35123456' })
      .expect(409);
    expect(duplicate.body.code).toBe(
      CustomerErrorCode.CUSTOMER_DOCUMENT_ALREADY_EXISTS,
    );
  });

  it('enforces sensitive-field permissions and admin lifecycle operations', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        businessName: 'Cliente Operativo',
        documentType: CustomerDocumentType.DNI,
        cuitOrDni: '35.123.456',
        taxCondition: TaxCondition.CONSUMIDOR_FINAL,
      })
      .expect(201);
    expect(created.body.creditLimit).toBe('0.00');

    await request(app.getHttpServer())
      .patch(`/api/v1/customers/${created.body.id}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ phone: ' 351-555-0101 ' })
      .expect(200);
    const forbidden = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${created.body.id}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ creditLimit: '10.00' })
      .expect(403);
    expect(forbidden.body.code).toBe(
      CustomerErrorCode.CUSTOMER_FORBIDDEN_FIELD_UPDATE,
    );
    await request(app.getHttpServer())
      .delete(`/api/v1/customers/${created.body.id}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/api/v1/customers/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const defaultList = await request(app.getHttpServer())
      .get('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(defaultList.body.data).toHaveLength(0);
    const inactiveList = await request(app.getHttpServer())
      .get('/api/v1/customers?isActive=false')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(inactiveList.body.data).toHaveLength(1);

    await request(app.getHttpServer())
      .patch(`/api/v1/customers/${created.body.id}/reactivate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });
});
