import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { User } from '../src/modules/users/entities/user.entity';
import { AuditLog } from '../src/modules/audit/entities/audit-log.entity';
import { UserRole, AuditAction } from '@erp/shared-types';
import dataSource from '../src/database/data-source';

describe('Users Administrative CRUD & Audit Trail (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;

  const adminPassword = 'AdminPassword123!';
  const sellerPassword = 'SellerPassword123!';

  let adminUser: User;
  let adminToken: string;
  let sellerUser: User;
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
    await queryRunner.query('ALTER TABLE audit_logs DISABLE TRIGGER ALL');
    await queryRunner.query('TRUNCATE TABLE audit_logs CASCADE');
    await queryRunner.query('ALTER TABLE audit_logs ENABLE TRIGGER ALL');
    await queryRunner.query('TRUNCATE TABLE users CASCADE');
    await queryRunner.release();

    const userRepo = ds.getRepository(User);
    const adminHash = await bcrypt.hash(adminPassword, 12);
    const sellerHash = await bcrypt.hash(sellerPassword, 12);

    adminUser = await userRepo.save(
      userRepo.create({
        name: 'Master Admin',
        email: 'admin@erp.com',
        passwordHash: adminHash,
        role: UserRole.ADMINISTRADOR,
        isActive: true,
      }),
    );

    sellerUser = await userRepo.save(
      userRepo.create({
        name: 'Seller One',
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

  describe('Role-Based Access Control', () => {
    it('should return 401 Unauthorized without token', async () => {
      await request(app.getHttpServer()).get('/api/v1/users').expect(401);
    });

    it('should return 403 Forbidden for non-ADMINISTRADOR users', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(403);
    });

    it('should return 200 OK for ADMINISTRADOR users', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.meta).toBeDefined();
    });
  });

  describe('POST /api/v1/users', () => {
    it('should create user, hash password with cost 12, and record an audit log', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Jane Doe',
          email: '  Jane.Doe@ERP.com  ',
          password: 'Password123!',
          role: UserRole.VENDEDOR,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.email).toBe('jane.doe@erp.com');
      expect(res.body.name).toBe('Jane Doe');
      expect(res.body.role).toBe(UserRole.VENDEDOR);
      expect(res.body.isActive).toBe(true);
      expect(res.body.passwordHash).toBeUndefined();

      const userInDb = await ds.getRepository(User).findOne({
        where: { id: res.body.id },
        select: ['id', 'passwordHash'],
      });
      expect(userInDb?.passwordHash).toMatch(/^\$2[aby]\$12\$/);

      const auditLogs = await ds.getRepository(AuditLog).find({
        where: { entityId: res.body.id },
      });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].action).toBe(AuditAction.CREATE);
      expect(auditLogs[0].actorId).toBe(adminUser.id);
      expect(auditLogs[0].previousValues).toBeNull();
      expect(auditLogs[0].newValues).toMatchObject({
        email: 'jane.doe@erp.com',
        role: UserRole.VENDEDOR,
        isActive: true,
      });
      expect(auditLogs[0].newValues).not.toHaveProperty('passwordHash');
    });

    it('should reject creation with 409 Conflict if email already exists', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate Admin',
          email: 'admin@erp.com',
          password: 'Password123!',
          role: UserRole.ADMINISTRADOR,
        })
        .expect(409);
    });

    it('should reject invalid password format with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Weak User',
          email: 'weak@erp.com',
          password: 'short',
          role: UserRole.VENDEDOR,
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/users', () => {
    it('should support pagination, searching, and filtering', async () => {
      const res = await request(app.getHttpServer())
        .get(
          '/api/v1/users?search=seller&role=VENDEDOR&isActive=true&page=1&limit=10',
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].email).toBe('seller@erp.com');
      expect(res.body.meta.total).toBe(1);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(10);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should return user details for existing user', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${sellerUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(sellerUser.id);
      expect(res.body.email).toBe(sellerUser.email);
    });

    it('should return 404 for non-existent user UUID', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/v1/users/:id', () => {
    it('should reject empty body with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${sellerUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });

    it('should reject no-op updates with 400 Bad Request without logging audit', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${sellerUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: sellerUser.name, email: sellerUser.email })
        .expect(400);

      const logs = await ds.getRepository(AuditLog).find({
        where: { entityId: sellerUser.id },
      });
      expect(logs).toHaveLength(0);
    });

    it('should update name/email and create UPDATE audit log', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${sellerUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Seller Updated', email: 'seller.updated@erp.com' })
        .expect(200);

      expect(res.body.name).toBe('Seller Updated');
      expect(res.body.email).toBe('seller.updated@erp.com');

      const logs = await ds.getRepository(AuditLog).find({
        where: { entityId: sellerUser.id },
      });
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe(AuditAction.UPDATE);
      expect(logs[0].previousValues).toMatchObject({
        name: 'Seller One',
        email: 'seller@erp.com',
      });
      expect(logs[0].newValues).toMatchObject({
        name: 'Seller Updated',
        email: 'seller.updated@erp.com',
      });
    });

    it('should record ROLE_CHANGE audit log when role is modified', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${sellerUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.ADMINISTRADOR })
        .expect(200);

      expect(res.body.role).toBe(UserRole.ADMINISTRADOR);

      const logs = await ds.getRepository(AuditLog).find({
        where: { entityId: sellerUser.id, action: AuditAction.ROLE_CHANGE },
      });
      expect(logs).toHaveLength(1);
    });

    it('should reject self-deactivation with 409 Conflict', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(409);
    });

    it('should reject demoting the last active administrator with 409 Conflict', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: UserRole.VENDEDOR })
        .expect(409);
    });
  });

  describe('DELETE /api/v1/users/:id (Soft-delete)', () => {
    it('should soft-delete user and prevent subsequent login', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/users/${sellerUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.isActive).toBe(false);

      const logs = await ds.getRepository(AuditLog).find({
        where: { entityId: sellerUser.id, action: AuditAction.DEACTIVATE },
      });
      expect(logs).toHaveLength(1);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'seller@erp.com', password: sellerPassword })
        .expect(401);
    });

    it('should reject deactivating the last active administrator with 409 Conflict', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);
    });
  });

  describe('GET /api/v1/users/:id/audit-logs', () => {
    it('should retrieve paginated audit trail for user', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Audit Subject',
          email: 'subject@erp.com',
          password: 'Password123!',
          role: UserRole.VENDEDOR,
        })
        .expect(201);

      const userId = createRes.body.id;

      await request(app.getHttpServer())
        .patch(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Audit Subject Updated' })
        .expect(200);

      const auditRes = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}/audit-logs?page=1&limit=10`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(auditRes.body.data).toHaveLength(2);
      expect(auditRes.body.meta.total).toBe(2);
      expect(auditRes.body.data[0].action).toBe(AuditAction.UPDATE);
      expect(auditRes.body.data[1].action).toBe(AuditAction.CREATE);
      expect(auditRes.body.data[0].actor.email).toBe('admin@erp.com');
    });
  });

  describe('Database Immutability Trigger', () => {
    it('should raise PostgreSQL exception when direct UPDATE on audit_logs is attempted', async () => {
      const auditRepo = ds.getRepository(AuditLog);
      const log = await auditRepo.save(
        auditRepo.create({
          actorId: adminUser.id,
          action: AuditAction.CREATE,
          entityName: 'Test',
          entityId: '123',
          previousValues: null,
          newValues: { test: true },
        }),
      );

      await expect(
        ds.query(
          `UPDATE audit_logs SET action = 'UPDATE' WHERE id = '${log.id}'`,
        ),
      ).rejects.toThrow(/Audit logs are immutable/i);
    });

    it('should raise PostgreSQL exception when direct DELETE on audit_logs is attempted', async () => {
      const auditRepo = ds.getRepository(AuditLog);
      const log = await auditRepo.save(
        auditRepo.create({
          actorId: adminUser.id,
          action: AuditAction.CREATE,
          entityName: 'Test',
          entityId: '456',
          previousValues: null,
          newValues: { test: true },
        }),
      );

      await expect(
        ds.query(`DELETE FROM audit_logs WHERE id = '${log.id}'`),
      ).rejects.toThrow(/Audit logs are immutable/i);
    });
  });

  describe('Concurrency & Advisory Lock', () => {
    it('should serialize simultaneous admin demotions and prevent leaving zero active admins', async () => {
      // Create a second active admin
      const userRepo = ds.getRepository(User);
      const admin2Hash = await bcrypt.hash('Admin2Password123!', 12);
      const admin2 = await userRepo.save(
        userRepo.create({
          name: 'Admin Two',
          email: 'admin2@erp.com',
          passwordHash: admin2Hash,
          role: UserRole.ADMINISTRADOR,
          isActive: true,
        }),
      );

      const admin2LoginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin2@erp.com', password: 'Admin2Password123!' });
      const admin2Token = admin2LoginRes.body.accessToken;

      // Concurrently attempt to demote both admins
      const [req1, req2] = await Promise.all([
        request(app.getHttpServer())
          .patch(`/api/v1/users/${adminUser.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ role: UserRole.VENDEDOR }),
        request(app.getHttpServer())
          .patch(`/api/v1/users/${admin2.id}`)
          .set('Authorization', `Bearer ${admin2Token}`)
          .send({ role: UserRole.VENDEDOR }),
      ]);

      const statuses = [req1.status, req2.status].sort();
      // Exactly one should succeed (200) and the other fail with conflict (409)
      expect(statuses).toEqual([200, 409]);

      // Verify that exactly 1 active admin remains in DB
      const remainingAdmins = await userRepo.count({
        where: { role: UserRole.ADMINISTRADOR, isActive: true },
      });
      expect(remainingAdmins).toBe(1);
    });
  });
});
