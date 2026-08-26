import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import dataSource from '../src/database/data-source';
import { runInitialSeed } from '../src/database/seeds/initial.seed';
import { Supplier } from '../src/modules/suppliers/entities/supplier.entity';
import { ImporterErrorCode, TaxCondition } from '@erp/shared-types';

describe('Supplier importer upload (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let adminToken: string;
  let sellerToken: string;
  let activeSupplier: Supplier;
  let inactiveSupplier: Supplier;

  beforeAll(async () => {
    process.env.JWT_SECRET =
      process.env.JWT_SECRET ||
      'test_ci_jwt_secret_key_minimum_32_characters_long!';
    process.env.JWT_EXPIRATION = process.env.JWT_EXPIRATION || '8h';
    ds = await dataSource.initialize();
    await ds.runMigrations();
    await ds.query('TRUNCATE TABLE suppliers CASCADE');
    await runInitialSeed(ds, {
      adminEmail: 'importer-admin@erp.com',
      adminPassword: 'AdminPassword123!',
      vendedorEmail: 'importer-seller@erp.com',
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
        email: 'importer-admin@erp.com',
        password: 'AdminPassword123!',
      })
    ).body.accessToken;
    sellerToken = (
      await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'importer-seller@erp.com',
        password: 'SellerPassword123!',
      })
    ).body.accessToken;

    const repository = ds.getRepository(Supplier);
    activeSupplier = await repository.save(
      repository.create({
        businessName: 'Proveedor Importador Activo',
        cuit: '30712345678',
        taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
        email: null,
        phone: null,
        whatsapp: null,
        address: null,
        isActive: true,
      }),
    );
    inactiveSupplier = await repository.save(
      repository.create({
        businessName: 'Proveedor Importador Inactivo',
        cuit: '30712345686',
        taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
        email: null,
        phone: null,
        whatsapp: null,
        address: null,
        isActive: false,
      }),
    );
  });

  afterAll(async () => {
    if (app) await app.close();
    if (ds?.isInitialized) await ds.destroy();
  });

  const upload = (
    token?: string,
    supplierId = activeSupplier?.id,
    contents = 'SKU;Descripción;Costo\n001;Gasa;1250,50\n',
  ) => {
    const call = request(app.getHttpServer()).post('/api/v1/importer/upload');
    if (token) call.set('Authorization', `Bearer ${token}`);
    return call
      .field('supplierId', supplierId)
      .attach('file', Buffer.from(contents), {
        filename: 'lista.csv',
        contentType: 'text/csv',
      });
  };

  it('enforces authentication and administrator role', async () => {
    await upload().expect(401);
    await upload(sellerToken).expect(403);
  });

  it('returns deterministic metadata without changing supplier records', async () => {
    const before = await ds.getRepository(Supplier).count();
    const first = await upload(adminToken).expect(200);
    const second = await upload(adminToken).expect(200);

    expect(first.body.supplier.id).toBe(activeSupplier.id);
    expect(first.body.headers).toEqual(['SKU', 'Descripción', 'Costo']);
    expect(first.body.sampleRows[0]).toEqual({
      rowNumber: 2,
      cells: ['001', 'Gasa', '1250,50'],
    });
    expect(first.body.fileChecksum).toBe(second.body.fileChecksum);
    expect(first.body.headerFingerprint).toBe(second.body.headerFingerprint);
    expect(await ds.getRepository(Supplier).count()).toBe(before);
  });

  it('rejects inactive and missing suppliers with stable errors', async () => {
    const inactive = await upload(adminToken, inactiveSupplier.id).expect(400);
    expect(inactive.body.code).toBe(
      ImporterErrorCode.IMPORTER_SUPPLIER_INACTIVE,
    );

    const missing = await upload(
      adminToken,
      '56ab5c44-90a6-4e22-a940-3bb67939dc1f',
    ).expect(404);
    expect(missing.body.code).toBe(
      ImporterErrorCode.IMPORTER_SUPPLIER_NOT_FOUND,
    );
  });

  it('rejects formulas and files larger than the multipart limit', async () => {
    const formula = await upload(
      adminToken,
      activeSupplier.id,
      'SKU,Costo\n001,=SUM(1;2)\n',
    ).expect(400);
    expect(formula.body.code).toBe(ImporterErrorCode.IMPORTER_FORMULA_IN_DATA);

    const oversized = await request(app.getHttpServer())
      .post('/api/v1/importer/upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('supplierId', activeSupplier.id)
      .attach('file', Buffer.alloc(2 * 1024 * 1024 + 1, 0x61), {
        filename: 'grande.csv',
        contentType: 'text/csv',
      })
      .expect(413);
    expect(oversized.body.code).toBe(ImporterErrorCode.IMPORTER_FILE_TOO_LARGE);
  });
});
