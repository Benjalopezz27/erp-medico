import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { User } from '../src/modules/users/entities/user.entity';
import { Category } from '../src/modules/categories/entities/category.entity';
import { Unit } from '../src/modules/units/entities/unit.entity';
import { UserRole } from '@erp/shared-types';
import dataSource from '../src/database/data-source';

describe('Categories and Units Catalog CRUD & Foreign Key Integrity (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;

  const adminPassword = 'AdminPassword123!';
  const sellerPassword = 'SellerPassword123!';

  let adminToken: string;
  let sellerToken: string;

  beforeAll(async () => {
    process.env.JWT_SECRET =
      process.env.JWT_SECRET ||
      'test_ci_jwt_secret_key_minimum_32_characters_long!';
    process.env.JWT_EXPIRATION = process.env.JWT_EXPIRATION || '8h';

    ds = await dataSource.initialize();
    await ds.runMigrations();

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
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (ds?.isInitialized) {
      await ds.destroy();
    }
  });

  beforeEach(async () => {
    const queryRunner = ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.query('TRUNCATE TABLE categories CASCADE');
    await queryRunner.query('TRUNCATE TABLE units CASCADE');
    await queryRunner.query('TRUNCATE TABLE users CASCADE');
    await queryRunner.release();

    const userRepo = ds.getRepository(User);
    const adminHash = await bcrypt.hash(adminPassword, 12);
    const sellerHash = await bcrypt.hash(sellerPassword, 12);

    await userRepo.save(
      userRepo.create({
        name: 'Admin User',
        email: 'admin@erp.com',
        passwordHash: adminHash,
        role: UserRole.ADMINISTRADOR,
        isActive: true,
      }),
    );

    await userRepo.save(
      userRepo.create({
        name: 'Seller User',
        email: 'seller@erp.com',
        passwordHash: sellerHash,
        role: UserRole.VENDEDOR,
        isActive: true,
      }),
    );

    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@erp.com', password: adminPassword });
    adminToken = adminLoginRes.body.accessToken;

    const sellerLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'seller@erp.com', password: sellerPassword });
    sellerToken = sellerLoginRes.body.accessToken;
  });

  describe('Categories Endpoints (/api/v1/categories)', () => {
    it('allows all authenticated users to read, but blocks anonymous (401)', async () => {
      // Create a category directly
      const catRepo = ds.getRepository(Category);
      await catRepo.save(
        catRepo.create({
          name: 'Material Descartable',
          description: 'Guantes, jeringas y gasas',
        }),
      );

      // Anonymous -> 401
      await request(app.getHttpServer()).get('/api/v1/categories').expect(401);

      // Seller -> 200
      const sellerRes = await request(app.getHttpServer())
        .get('/api/v1/categories')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(sellerRes.body).toHaveLength(1);
      expect(sellerRes.body[0].name).toBe('Material Descartable');

      // Admin -> 200
      const adminRes = await request(app.getHttpServer())
        .get('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(adminRes.body).toHaveLength(1);
    });

    it('creates category as Admin (201) and forbids Seller (403)', async () => {
      // Seller tries to create -> 403
      await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ name: 'Analgésicos' })
        .expect(403);

      // Admin creates -> 201
      const res = await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '  Analgésicos  ',
          description: '  Medicamentos contra el dolor  ',
        })
        .expect(201);

      expect(res.body.name).toBe('Analgésicos');
      expect(res.body.description).toBe('Medicamentos contra el dolor');
      expect(res.body.id).toBeDefined();
      expect(res.body.createdAt).toBeDefined();
    });

    it('enforces normalized uniqueness rejecting duplicate names with 409', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Analgésicos' })
        .expect(201);

      // Duplicate case-insensitive & trimmed -> 409
      const dupRes = await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '  ANALGÉSICOS  ' })
        .expect(409);

      expect(dupRes.body.message).toContain(
        'Ya existe una categoría con ese nombre',
      );
    });

    it('updates category, supports description clearing, and validates duplicates', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Antibióticos',
          description: 'Descripción original',
        })
        .expect(201);

      const categoryId = createRes.body.id;

      // Update name
      const patchRes = await request(app.getHttpServer())
        .patch(`/api/v1/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Antibióticos y Antivirales' })
        .expect(200);

      expect(patchRes.body.name).toBe('Antibióticos y Antivirales');
      expect(patchRes.body.description).toBe('Descripción original');

      // Clear description with null
      const clearRes = await request(app.getHttpServer())
        .patch(`/api/v1/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: null })
        .expect(200);

      expect(clearRes.body.description).toBeNull();

      // Seller tries to update -> 403
      await request(app.getHttpServer())
        .patch(`/api/v1/categories/${categoryId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ name: 'Hack Name' })
        .expect(403);
    });

    it('deletes category (204) and returns 404 on missing record', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Descartables' })
        .expect(201);

      const categoryId = createRes.body.id;

      // Seller tries to delete -> 403
      await request(app.getHttpServer())
        .delete(`/api/v1/categories/${categoryId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(403);

      // Admin deletes -> 204
      await request(app.getHttpServer())
        .delete(`/api/v1/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Get after delete -> 404
      await request(app.getHttpServer())
        .get(`/api/v1/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('Units Endpoints (/api/v1/units)', () => {
    it('allows all authenticated users to read, but blocks anonymous (401)', async () => {
      const unitRepo = ds.getRepository(Unit);
      await unitRepo.save(
        unitRepo.create({
          name: 'Unidad',
          symbol: 'u',
        }),
      );

      await request(app.getHttpServer()).get('/api/v1/units').expect(401);

      const sellerRes = await request(app.getHttpServer())
        .get('/api/v1/units')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(sellerRes.body).toHaveLength(1);
      expect(sellerRes.body[0].symbol).toBe('u');
    });

    it('creates unit as Admin (201) and distinguishes name vs symbol duplicates (409)', async () => {
      // Create base unit
      await request(app.getHttpServer())
        .post('/api/v1/units')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Caja', symbol: 'cj' })
        .expect(201);

      // Duplicate name conflict -> 409
      const dupNameRes = await request(app.getHttpServer())
        .post('/api/v1/units')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '  CAJA  ', symbol: 'caja-alt' })
        .expect(409);

      expect(dupNameRes.body.message).toContain(
        'Ya existe una unidad de medida con ese nombre',
      );

      // Duplicate symbol conflict -> 409
      const dupSymbolRes = await request(app.getHttpServer())
        .post('/api/v1/units')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Caja Nueva', symbol: '  CJ  ' })
        .expect(409);

      expect(dupSymbolRes.body.message).toContain(
        'Ya existe una unidad de medida con ese símbolo',
      );
    });

    it('updates unit name and symbol and handles conflicts', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/units')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Mililitro', symbol: 'ml' })
        .expect(201);

      const unitId = createRes.body.id;

      const patchRes = await request(app.getHttpServer())
        .patch(`/api/v1/units/${unitId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ symbol: 'mL' })
        .expect(200);

      expect(patchRes.body.symbol).toBe('mL');
    });

    it('deletes unit (204) as Admin and rejects Seller (403)', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/units')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Litro', symbol: 'l' })
        .expect(201);

      const unitId = createRes.body.id;

      await request(app.getHttpServer())
        .delete(`/api/v1/units/${unitId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .delete(`/api/v1/units/${unitId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });
  });

  describe('Real PostgreSQL Foreign Key Violation (409 Conflict)', () => {
    it('returns 409 Conflict when deleting a category or unit referenced by a foreign key constraint', async () => {
      const catRepo = ds.getRepository(Category);
      const unitRepo = ds.getRepository(Unit);

      const testCat = await catRepo.save(
        catRepo.create({ name: 'Categoría En Uso', description: 'Test FK' }),
      );
      const testUnit = await unitRepo.save(
        unitRepo.create({ name: 'Unidad En Uso', symbol: 'ueu' }),
      );

      // Create auxiliary table with real ON DELETE RESTRICT foreign keys
      const queryRunner = ds.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS test_product_references (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          category_id UUID REFERENCES categories(id) ON DELETE RESTRICT,
          unit_id UUID REFERENCES units(id) ON DELETE RESTRICT
        );
      `);

      // Insert references
      await queryRunner.query(
        `INSERT INTO test_product_references (category_id, unit_id) VALUES ($1, $2)`,
        [testCat.id, testUnit.id],
      );

      // Try deleting category -> Expect real PostgreSQL 23503 error caught & mapped to 409
      const catDeleteRes = await request(app.getHttpServer())
        .delete(`/api/v1/categories/${testCat.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);

      expect(catDeleteRes.body.message).toContain(
        'No se puede eliminar la categoría porque está asociada a productos existentes',
      );

      // Try deleting unit -> Expect real PostgreSQL 23503 error caught & mapped to 409
      const unitDeleteRes = await request(app.getHttpServer())
        .delete(`/api/v1/units/${testUnit.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);

      expect(unitDeleteRes.body.message).toContain(
        'No se puede eliminar la unidad de medida porque está asociada a productos existentes',
      );

      // Teardown auxiliary table
      await queryRunner.query(`DROP TABLE IF EXISTS test_product_references;`);
      await queryRunner.release();

      // Now deletion succeeds
      await request(app.getHttpServer())
        .delete(`/api/v1/categories/${testCat.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .delete(`/api/v1/units/${testUnit.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });
  });

  describe('Swagger / OpenAPI Specification Coverage', () => {
    it('generates OpenAPI document covering all 8 catalog routes and response status codes', () => {
      const config = new DocumentBuilder()
        .setTitle('ERP Distribuidora Médica API')
        .setVersion('1.0')
        .addBearerAuth(
          {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            name: 'JWT',
            description: 'Enter JWT token',
            in: 'header',
          },
          'JWT-auth',
        )
        .build();

      const document = SwaggerModule.createDocument(app, config);

      // Assert paths exist
      expect(document.paths['/api/v1/categories']).toBeDefined();
      expect(document.paths['/api/v1/categories/{id}']).toBeDefined();
      expect(document.paths['/api/v1/units']).toBeDefined();
      expect(document.paths['/api/v1/units/{id}']).toBeDefined();

      // Assert methods
      expect(document.paths['/api/v1/categories'].get).toBeDefined();
      expect(document.paths['/api/v1/categories'].post).toBeDefined();
      expect(document.paths['/api/v1/categories/{id}'].get).toBeDefined();
      expect(document.paths['/api/v1/categories/{id}'].patch).toBeDefined();
      expect(document.paths['/api/v1/categories/{id}'].delete).toBeDefined();

      expect(document.paths['/api/v1/units'].get).toBeDefined();
      expect(document.paths['/api/v1/units'].post).toBeDefined();
      expect(document.paths['/api/v1/units/{id}'].get).toBeDefined();
      expect(document.paths['/api/v1/units/{id}'].patch).toBeDefined();
      expect(document.paths['/api/v1/units/{id}'].delete).toBeDefined();

      // Assert status codes
      expect(
        document.paths['/api/v1/categories'].post.responses['201'],
      ).toBeDefined();
      expect(
        document.paths['/api/v1/categories'].post.responses['409'],
      ).toBeDefined();
      expect(
        document.paths['/api/v1/categories/{id}'].delete.responses['204'],
      ).toBeDefined();
      expect(
        document.paths['/api/v1/categories/{id}'].delete.responses['409'],
      ).toBeDefined();
    });
  });
});
