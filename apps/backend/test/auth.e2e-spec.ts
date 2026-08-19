import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { TestProtectedModule } from './fixtures/test-protected.module';
import { User } from '../src/modules/users/entities/user.entity';
import { UserRole } from '@erp/shared-types';
import dataSource from '../src/database/data-source';

describe('Auth & Role Authorization (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;

  const adminPassword = 'AdminPassword123!';
  const vendedorPassword = 'VendedorPassword123!';
  const inactivePassword = 'InactivePassword123!';

  let adminUser: User;

  beforeAll(async () => {
    process.env.JWT_SECRET =
      process.env.JWT_SECRET ||
      'test_ci_jwt_secret_key_minimum_32_characters_long!';
    process.env.JWT_EXPIRATION = process.env.JWT_EXPIRATION || '8h';

    ds = await dataSource.initialize();
    await ds.runMigrations();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, TestProtectedModule],
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
    await queryRunner.query('TRUNCATE TABLE users CASCADE');
    await queryRunner.release();

    const userRepo = ds.getRepository(User);
    const adminHash = await bcrypt.hash(adminPassword, 12);
    const vendedorHash = await bcrypt.hash(vendedorPassword, 12);
    const inactiveHash = await bcrypt.hash(inactivePassword, 12);

    adminUser = await userRepo.save(
      userRepo.create({
        name: 'Admin Master',
        email: 'admin@erp.com',
        passwordHash: adminHash,
        role: UserRole.ADMINISTRADOR,
        isActive: true,
      }),
    );

    await userRepo.save(
      userRepo.create({
        name: 'Vendedor One',
        email: 'vendedor@erp.com',
        passwordHash: vendedorHash,
        role: UserRole.VENDEDOR,
        isActive: true,
      }),
    );

    await userRepo.save(
      userRepo.create({
        name: 'Inactive Staff',
        email: 'inactive@erp.com',
        passwordHash: inactiveHash,
        role: UserRole.VENDEDOR,
        isActive: false,
      }),
    );
  });

  describe('POST /api/v1/auth/login', () => {
    it('should authenticate active ADMINISTRADOR with HTTP 200 and return accessToken and sanitized user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: '  Admin@ERP.com  ',
          password: adminPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toEqual({
        id: adminUser.id,
        name: 'Admin Master',
        email: 'admin@erp.com',
        role: UserRole.ADMINISTRADOR,
        isActive: true,
      });

      // Security check: passwordHash must never be exposed
      expect(response.body.passwordHash).toBeUndefined();
      expect(response.body.user.passwordHash).toBeUndefined();
    });

    it('should authenticate active VENDEDOR with HTTP 200 and return accessToken and sanitized user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'vendedor@erp.com',
          password: vendedorPassword,
        })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.user.role).toBe(UserRole.VENDEDOR);
    });

    it('should return uniform 401 Unauthorized for non-existent email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'unknown@erp.com',
          password: 'AnyPassword123!',
        })
        .expect(401);

      expect(response.body).toEqual({
        statusCode: 401,
        message: 'Invalid email or password',
        error: 'Unauthorized',
      });
    });

    it('should return uniform 401 Unauthorized for incorrect password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@erp.com',
          password: 'WrongPassword!',
        })
        .expect(401);

      expect(response.body).toEqual({
        statusCode: 401,
        message: 'Invalid email or password',
        error: 'Unauthorized',
      });
    });

    it('should return uniform 401 Unauthorized for inactive user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'inactive@erp.com',
          password: inactivePassword,
        })
        .expect(401);

      expect(response.body).toEqual({
        statusCode: 401,
        message: 'Invalid email or password',
        error: 'Unauthorized',
      });
    });

    it('should return 400 Bad Request for invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid-email-format',
          password: adminPassword,
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toContain('Invalid email format');
    });

    it('should return 400 Bad Request for missing password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@erp.com',
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toContain('Password is required');
    });
  });

  describe('JWT Guard & Role Authorization (E2E)', () => {
    let adminToken: string;
    let vendedorToken: string;

    beforeEach(async () => {
      const adminLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@erp.com', password: adminPassword });
      adminToken = adminLogin.body.accessToken;

      const vendedorLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'vendedor@erp.com', password: vendedorPassword });
      vendedorToken = vendedorLogin.body.accessToken;
    });

    it('should reject access to protected route when token is missing (401)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/test-protected/authenticated')
        .expect(401);

      expect(response.body.statusCode).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should reject access to protected route when token is malformed (401)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/test-protected/authenticated')
        .set('Authorization', 'Bearer malformed.token.signature')
        .expect(401);

      expect(response.body.statusCode).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should allow access to authenticated route with valid token (200)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/test-protected/authenticated')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toBe('authenticated-ok');
      expect(response.body.user).toEqual({
        id: adminUser.id,
        name: 'Admin Master',
        email: 'admin@erp.com',
        role: UserRole.ADMINISTRADOR,
        isActive: true,
      });
    });

    it('should allow access to admin-only route for ADMINISTRADOR role (200)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/test-protected/admin-only')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toBe('admin-only-ok');
    });

    it('should deny access to admin-only route for VENDEDOR role (403 Forbidden)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/test-protected/admin-only')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(403);

      expect(response.body.statusCode).toBe(403);
      expect(response.body.message).toContain('Insufficient permissions');
    });

    it('should allow access to route permitting both roles for VENDEDOR (200)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/test-protected/vendedor-allowed')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);

      expect(response.body.message).toBe('vendedor-allowed-ok');
    });

    it('should immediately revoke access when active user is deactivated in DB', async () => {
      // 1. Initial request succeeds
      await request(app.getHttpServer())
        .get('/api/v1/test-protected/authenticated')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // 2. Deactivate admin user in DB
      const userRepo = ds.getRepository(User);
      await userRepo.update({ id: adminUser.id }, { isActive: false });

      // 3. Subsequent request with same valid token fails immediately with 401
      const response = await request(app.getHttpServer())
        .get('/api/v1/test-protected/authenticated')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(401);

      expect(response.body.statusCode).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
    });
  });
});
