import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/modules/users/entities/user.entity';
import { Supplier } from '../src/modules/suppliers/entities/supplier.entity';
import { AuditLog } from '../src/modules/audit/entities/audit-log.entity';
import { TaxCondition, AuditAction } from '@erp/shared-types';
import dataSource from '../src/database/data-source';
import { runInitialSeed } from '../src/database/seeds/initial.seed';

describe('Suppliers Administrative CRUD & Audit Trail (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;

  const adminPassword = 'AdminPassword123!';
  const sellerPassword = 'SellerPassword123!';

  let adminUser: User;
  let adminToken: string;
  let sellerToken: string;

  beforeAll(async () => {
    process.env.JWT_SECRET =
      process.env.JWT_SECRET ||
      'test_ci_jwt_secret_key_minimum_32_characters_long!';
    process.env.JWT_EXPIRATION = process.env.JWT_EXPIRATION || '8h';

    ds = await dataSource.initialize();
    await ds.runMigrations();

    const qr = ds.createQueryRunner();
    await qr.connect();
    await qr.query('TRUNCATE TABLE suppliers CASCADE;');
    await qr.release();

    await runInitialSeed(ds, {
      adminEmail: 'admin-suppliers@erp.com',
      adminPassword: adminPassword,
      vendedorEmail: 'seller-suppliers@erp.com',
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

    const userRepo = ds.getRepository(User);
    adminUser = (await userRepo.findOneBy({
      email: 'admin-suppliers@erp.com',
    })) as User;

    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin-suppliers@erp.com', password: adminPassword });
    adminToken = adminLoginRes.body.accessToken;

    const sellerLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'seller-suppliers@erp.com', password: sellerPassword });
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
    const queryRunner = ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.query('ALTER TABLE audit_logs DISABLE TRIGGER ALL');
    await queryRunner.query('TRUNCATE TABLE audit_logs CASCADE');
    await queryRunner.query('ALTER TABLE audit_logs ENABLE TRIGGER ALL');
    await queryRunner.query('TRUNCATE TABLE suppliers CASCADE');
    await queryRunner.release();

    const userRepo = ds.getRepository(User);
    adminUser = (await userRepo.findOneBy({
      email: 'admin-suppliers@erp.com',
    })) as User;
    if (!adminUser) {
      await runInitialSeed(ds, {
        adminEmail: 'admin-suppliers@erp.com',
        adminPassword: adminPassword,
        vendedorEmail: 'seller-suppliers@erp.com',
        vendedorPassword: sellerPassword,
      });
      adminUser = (await userRepo.findOneBy({
        email: 'admin-suppliers@erp.com',
      })) as User;
    }
  });

  describe('1. Role-Based Access Control (RBAC)', () => {
    it('rejects unauthenticated requests with HTTP 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/suppliers').expect(401);

      await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .send({
          businessName: 'Test Supplier',
          cuit: '30-50001091-2',
          taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
        })
        .expect(401);
    });

    it('rejects non-admin users (VENDEDOR) with HTTP 403', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/suppliers')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          businessName: 'Test Supplier',
          cuit: '30-50001091-2',
          taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
        })
        .expect(403);
    });

    it('allows administrator access with HTTP 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });
  });

  describe('2. Create Supplier & Validation', () => {
    it('creates supplier with canonical CUIT and records audit log', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          businessName: '  Droguería del Sol S.A.  ',
          cuit: '30-50001091-2',
          taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
          email: ' CONTACTO@drogueriadelsol.COM ',
          phone: ' 0351-4890123 ',
          whatsapp: ' +54 9 351 4890123 ',
          address: ' Av. Colón 1234, Córdoba ',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.businessName).toBe('Droguería del Sol S.A.');
      expect(res.body.cuit).toBe('30500010912');
      expect(res.body.taxCondition).toBe(TaxCondition.RESPONSABLE_INSCRIPTO);
      expect(res.body.email).toBe('contacto@drogueriadelsol.com');
      expect(res.body.phone).toBe('0351-4890123');
      expect(res.body.whatsapp).toBe('5493514890123');
      expect(res.body.address).toBe('Av. Colón 1234, Córdoba');
      expect(res.body.isActive).toBe(true);

      // Verify audit log
      const auditRepo = ds.getRepository(AuditLog);
      const logs = await auditRepo.find({ where: { entityName: 'Supplier' } });
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe(AuditAction.CREATE);
      expect(logs[0].actorId).toBe(adminUser.id);
      expect(logs[0].entityId).toBe(res.body.id);
      expect(logs[0].previousValues).toBeNull();
      expect(logs[0].newValues).toMatchObject({
        cuit: '30500010912',
        businessName: 'Droguería del Sol S.A.',
      });
    });

    it('rejects invalid CUIT format or check digit with HTTP 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          businessName: 'Farmacia Mal CUIT',
          cuit: '20abc12345678x6',
          taxCondition: TaxCondition.MONOTRIBUTO,
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          businessName: 'Farmacia Mal Checksum',
          cuit: '30-50001091-9',
          taxCondition: TaxCondition.MONOTRIBUTO,
        })
        .expect(400);
    });

    it('rejects duplicate CUIT with HTTP 409', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          businessName: 'Droguería A',
          cuit: '30-50001091-2',
          taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          businessName: 'Droguería B',
          cuit: '30.5000.1091.2',
          taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
        })
        .expect(409);

      expect(res.body.message).toContain('30-50001091-2');
    });
  });

  describe('3. Query, Search, Filters & Detail', () => {
    let sup1: Supplier;
    let sup2: Supplier;

    beforeEach(async () => {
      const repo = ds.getRepository(Supplier);
      sup1 = await repo.save(
        repo.create({
          businessName: 'Droguería del Sol S.A.',
          cuit: '30500010912',
          taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
          email: 'contacto@drogueriadelsol.com',
          isActive: true,
        }),
      );

      sup2 = await repo.save(
        repo.create({
          businessName: 'Laboratorios Córdoba S.R.L.',
          cuit: '30711425809',
          taxCondition: TaxCondition.MONOTRIBUTO,
          email: 'ventas@labcordoba.com',
          isActive: false,
        }),
      );
    });

    it('searches suppliers by business name (case-insensitive) and by CUIT', async () => {
      const searchByNameRes = await request(app.getHttpServer())
        .get('/api/v1/suppliers')
        .query({ search: 'droguería' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(searchByNameRes.body.data).toHaveLength(1);
      expect(searchByNameRes.body.data[0].id).toBe(sup1.id);

      const searchByCuitRes = await request(app.getHttpServer())
        .get('/api/v1/suppliers')
        .query({ search: '30-7114' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(searchByCuitRes.body.data).toHaveLength(1);
      expect(searchByCuitRes.body.data[0].id).toBe(sup2.id);
    });

    it('filters suppliers by active status', async () => {
      const activeRes = await request(app.getHttpServer())
        .get('/api/v1/suppliers')
        .query({ isActive: true })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(activeRes.body.data).toHaveLength(1);
      expect(activeRes.body.data[0].id).toBe(sup1.id);

      const inactiveRes = await request(app.getHttpServer())
        .get('/api/v1/suppliers')
        .query({ isActive: false })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(inactiveRes.body.data).toHaveLength(1);
      expect(inactiveRes.body.data[0].id).toBe(sup2.id);
    });

    it('gets supplier detail by ID and throws 404 on missing UUID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/suppliers/${sup1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(sup1.id);

      await request(app.getHttpServer())
        .get('/api/v1/suppliers/99999999-9999-9999-9999-999999999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('4. Update, Soft-Delete & Reactivation', () => {
    let supplier: Supplier;

    beforeEach(async () => {
      const repo = ds.getRepository(Supplier);
      supplier = await repo.save(
        repo.create({
          businessName: 'Proveedor Original S.A.',
          cuit: '30500010912',
          taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
          phone: '0351-1111111',
          isActive: true,
        }),
      );
    });

    it('updates supplier fields and records AuditAction.UPDATE', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/suppliers/${supplier.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          businessName: 'Proveedor Modificado S.A.',
          phone: '0351-2222222',
        })
        .expect(200);

      expect(res.body.businessName).toBe('Proveedor Modificado S.A.');
      expect(res.body.phone).toBe('0351-2222222');

      const auditRepo = ds.getRepository(AuditLog);
      const logs = await auditRepo.find({
        where: { entityId: supplier.id, action: AuditAction.UPDATE },
      });
      expect(logs).toHaveLength(1);
      expect(logs[0].previousValues).toMatchObject({
        businessName: 'Proveedor Original S.A.',
        phone: '0351-1111111',
      });
      expect(logs[0].newValues).toMatchObject({
        businessName: 'Proveedor Modificado S.A.',
        phone: '0351-2222222',
      });
    });

    it('rejects update payload with no effective changes with HTTP 400', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/suppliers/${supplier.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          businessName: '  Proveedor Original S.A.  ',
        })
        .expect(400);
    });

    it('soft-deletes supplier with DELETE and rejects repeated deactivation', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/suppliers/${supplier.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.isActive).toBe(false);

      // Verify audit log for DEACTIVATE
      const auditRepo = ds.getRepository(AuditLog);
      const logs = await auditRepo.find({
        where: { entityId: supplier.id, action: AuditAction.DEACTIVATE },
      });
      expect(logs).toHaveLength(1);

      // Repeated deactivation returns 400
      await request(app.getHttpServer())
        .delete(`/api/v1/suppliers/${supplier.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('reactivates supplier with PATCH and records AuditAction.ACTIVATE', async () => {
      // First deactivate
      await request(app.getHttpServer())
        .delete(`/api/v1/suppliers/${supplier.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Reactivate
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/suppliers/${supplier.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true })
        .expect(200);

      expect(res.body.isActive).toBe(true);

      const auditRepo = ds.getRepository(AuditLog);
      const logs = await auditRepo.find({
        where: { entityId: supplier.id, action: AuditAction.ACTIVATE },
      });
      expect(logs).toHaveLength(1);

      // Repeated reactivation returns 400
      await request(app.getHttpServer())
        .patch(`/api/v1/suppliers/${supplier.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true })
        .expect(400);
    });
  });

  describe('5. Concurrency & Race Conditions', () => {
    it('handles concurrent duplicate creation resulting in exactly one 201 and one 409', async () => {
      const payload = {
        businessName: 'Concurrent Droguería S.A.',
        cuit: '30-50001091-2',
        taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
      };

      const [res1, res2] = await Promise.all([
        request(app.getHttpServer())
          .post('/api/v1/suppliers')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(payload),
        request(app.getHttpServer())
          .post('/api/v1/suppliers')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(payload),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([201, 409]);

      const count = await ds.getRepository(Supplier).count({
        where: { cuit: '30500010912' },
      });
      expect(count).toBe(1);
    });
  });
});
