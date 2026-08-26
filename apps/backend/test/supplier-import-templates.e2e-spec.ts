import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import dataSource from '../src/database/data-source';
import { runInitialSeed } from '../src/database/seeds/initial.seed';
import { Supplier } from '../src/modules/suppliers/entities/supplier.entity';
import { AuditLog } from '../src/modules/audit/entities/audit-log.entity';
import {
  AuditAction,
  ImporterErrorCode,
  TaxCondition,
} from '@erp/shared-types';
import { computeHeaderFingerprint } from '../src/shared/parsers/secure-spreadsheet-parser';

describe('Supplier Import Templates (E2E)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let adminToken: string;
  let sellerToken: string;
  let activeSupplier1: Supplier;
  let activeSupplier2: Supplier;
  let inactiveSupplier: Supplier;

  const headers1 = ['codigo_prov', 'descripcion', 'precio_neto', 'unidad'];
  const fingerprint1 = computeHeaderFingerprint(headers1);

  const headers2 = ['sku', 'nombre_articulo', 'costo_base'];
  const fingerprint2 = computeHeaderFingerprint(headers2);

  beforeAll(async () => {
    process.env.JWT_SECRET =
      process.env.JWT_SECRET ||
      'test_ci_jwt_secret_key_minimum_32_characters_long!';
    process.env.JWT_EXPIRATION = process.env.JWT_EXPIRATION || '8h';
    ds = await dataSource.initialize();
    await ds.runMigrations();
    await ds.query('TRUNCATE TABLE supplier_import_templates CASCADE');
    await ds.query('TRUNCATE TABLE suppliers CASCADE');
    await runInitialSeed(ds, {
      adminEmail: 'templates-admin@erp.com',
      adminPassword: 'AdminPassword123!',
      vendedorEmail: 'templates-seller@erp.com',
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
        email: 'templates-admin@erp.com',
        password: 'AdminPassword123!',
      })
    ).body.accessToken;

    sellerToken = (
      await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'templates-seller@erp.com',
        password: 'SellerPassword123!',
      })
    ).body.accessToken;

    const supplierRepo = ds.getRepository(Supplier);
    activeSupplier1 = await supplierRepo.save(
      supplierRepo.create({
        businessName: 'Droguería Médica Alfa S.A.',
        cuit: '30711111111',
        taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
        isActive: true,
      }),
    );

    activeSupplier2 = await supplierRepo.save(
      supplierRepo.create({
        businessName: 'Droguería Beta S.R.L.',
        cuit: '30722222222',
        taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
        isActive: true,
      }),
    );

    inactiveSupplier = await supplierRepo.save(
      supplierRepo.create({
        businessName: 'Distribuidora Gamma Inactiva',
        cuit: '30733333333',
        taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
        isActive: false,
      }),
    );
  });

  afterAll(async () => {
    await app.close();
    await ds.destroy();
  });

  describe('RBAC Guards', () => {
    it('rejects unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/suppliers/${activeSupplier1.id}/import-templates`)
        .expect(401);
    });

    it('rejects seller requests with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/suppliers/${activeSupplier1.id}/import-templates`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(403);
    });
  });

  describe('Template Creation (POST)', () => {
    it('creates a valid template and records CREATE audit log', async () => {
      const payload = {
        name: '  Plantilla Alfa Oficial  ',
        headerFingerprint: fingerprint1,
        headers: headers1,
        mapping: {
          supplierSku: 'codigo_prov',
          usualCostNet: 'precio_neto',
          supplierDescription: 'descripcion',
          purchaseUnit: 'unidad',
          rawQuantity: null,
        },
      };

      const res = await request(app.getHttpServer())
        .post(`/api/v1/suppliers/${activeSupplier1.id}/import-templates`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.supplierId).toBe(activeSupplier1.id);
      expect(res.body.name).toBe('Plantilla Alfa Oficial');
      expect(res.body.headerFingerprint).toBe(fingerprint1);
      expect(res.body.mapping.supplierSku).toBe('codigo_prov');
      expect(res.body.mapping.usualCostNet).toBe('precio_neto');

      // Verify audit log
      const auditRepo = ds.getRepository(AuditLog);
      const audit = await auditRepo.findOne({
        where: {
          entityName: 'SupplierImportTemplate',
          entityId: res.body.id,
          action: AuditAction.CREATE,
        },
      });
      expect(audit).toBeDefined();
      expect(audit?.newValues?.name).toBe('Plantilla Alfa Oficial');
    });

    it('rejects creation for inactive supplier with 400 IMPORTER_SUPPLIER_INACTIVE', async () => {
      const payload = {
        name: 'Plantilla Gamma',
        headerFingerprint: fingerprint1,
        headers: headers1,
        mapping: {
          supplierSku: 'codigo_prov',
          usualCostNet: 'precio_neto',
        },
      };

      const res = await request(app.getHttpServer())
        .post(`/api/v1/suppliers/${inactiveSupplier.id}/import-templates`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(400);

      expect(res.body.code).toBe(ImporterErrorCode.IMPORTER_SUPPLIER_INACTIVE);
    });

    it('rejects mapping with duplicate column assignment with 400 IMPORTER_MAPPING_DUPLICATE_COLUMN', async () => {
      const payload = {
        name: 'Plantilla Invalida',
        headerFingerprint: fingerprint2,
        headers: headers2,
        mapping: {
          supplierSku: 'sku',
          usualCostNet: 'sku', // Duplicate
        },
      };

      const res = await request(app.getHttpServer())
        .post(`/api/v1/suppliers/${activeSupplier1.id}/import-templates`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(400);

      expect(res.body.code).toBe(
        ImporterErrorCode.IMPORTER_MAPPING_DUPLICATE_COLUMN,
      );
    });

    it('rejects mapping when a column does not exist in headers with 400 IMPORTER_MAPPING_HEADER_NOT_FOUND', async () => {
      const payload = {
        name: 'Plantilla Columna Fantasma',
        headerFingerprint: fingerprint2,
        headers: headers2,
        mapping: {
          supplierSku: 'sku',
          usualCostNet: 'columna_que_no_existe',
        },
      };

      const res = await request(app.getHttpServer())
        .post(`/api/v1/suppliers/${activeSupplier1.id}/import-templates`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(400);

      expect(res.body.code).toBe(
        ImporterErrorCode.IMPORTER_MAPPING_HEADER_NOT_FOUND,
      );
    });

    it('rejects duplicate template name for same supplier with 409 IMPORTER_TEMPLATE_NAME_DUPLICATE', async () => {
      const payload = {
        name: 'plantilla alfa oficial', // case insensitive collision
        headerFingerprint: fingerprint2,
        headers: headers2,
        mapping: {
          supplierSku: 'sku',
          usualCostNet: 'costo_base',
        },
      };

      const res = await request(app.getHttpServer())
        .post(`/api/v1/suppliers/${activeSupplier1.id}/import-templates`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(409);

      expect(res.body.code).toBe(
        ImporterErrorCode.IMPORTER_TEMPLATE_NAME_DUPLICATE,
      );
    });

    it('rejects duplicate fingerprint for same supplier with 409 IMPORTER_TEMPLATE_FINGERPRINT_DUPLICATE', async () => {
      const payload = {
        name: 'Otro Nombre Distinto',
        headerFingerprint: fingerprint1, // already used for supplier 1
        headers: headers1,
        mapping: {
          supplierSku: 'codigo_prov',
          usualCostNet: 'precio_neto',
        },
      };

      const res = await request(app.getHttpServer())
        .post(`/api/v1/suppliers/${activeSupplier1.id}/import-templates`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(409);

      expect(res.body.code).toBe(
        ImporterErrorCode.IMPORTER_TEMPLATE_FINGERPRINT_DUPLICATE,
      );
    });

    it('allows same template name and fingerprint for a DIFFERENT supplier (supplier-scoped)', async () => {
      const payload = {
        name: 'Plantilla Alfa Oficial',
        headerFingerprint: fingerprint1,
        headers: headers1,
        mapping: {
          supplierSku: 'codigo_prov',
          usualCostNet: 'precio_neto',
        },
      };

      const res = await request(app.getHttpServer())
        .post(`/api/v1/suppliers/${activeSupplier2.id}/import-templates`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.supplierId).toBe(activeSupplier2.id);
    });
  });

  describe('Template Querying & Listing (GET)', () => {
    it('lists templates for a supplier', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/suppliers/${activeSupplier1.id}/import-templates`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('filters templates by fingerprint', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/suppliers/${activeSupplier1.id}/import-templates?headerFingerprint=${fingerprint1}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].headerFingerprint).toBe(fingerprint1);
    });

    it('filters templates by search term', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/suppliers/${activeSupplier1.id}/import-templates?search=Alfa`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('Plantilla Alfa Oficial');
    });
  });

  describe('Template Updating (PATCH) & Deletion (DELETE)', () => {
    let createdTemplateId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/suppliers/${activeSupplier1.id}/import-templates`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Plantilla Para Modificar',
          headerFingerprint: fingerprint2,
          headers: headers2,
          mapping: {
            supplierSku: 'sku',
            usualCostNet: 'costo_base',
          },
        })
        .expect(201);

      createdTemplateId = res.body.id;
    });

    it('updates template name and records UPDATE audit log', async () => {
      const res = await request(app.getHttpServer())
        .patch(
          `/api/v1/suppliers/${activeSupplier1.id}/import-templates/${createdTemplateId}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Plantilla Modificada y Renombrada' })
        .expect(200);

      expect(res.body.name).toBe('Plantilla Modificada y Renombrada');

      const auditRepo = ds.getRepository(AuditLog);
      const audit = await auditRepo.findOne({
        where: {
          entityName: 'SupplierImportTemplate',
          entityId: createdTemplateId,
          action: AuditAction.UPDATE,
        },
        order: { createdAt: 'DESC' },
      });
      expect(audit).toBeDefined();
      expect(audit?.previousValues?.name).toBe('Plantilla Para Modificar');
      expect(audit?.newValues?.name).toBe('Plantilla Modificada y Renombrada');
    });

    it('deletes template and records DELETE audit log', async () => {
      await request(app.getHttpServer())
        .delete(
          `/api/v1/suppliers/${activeSupplier1.id}/import-templates/${createdTemplateId}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify template is gone
      await request(app.getHttpServer())
        .get(
          `/api/v1/suppliers/${activeSupplier1.id}/import-templates/${createdTemplateId}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      // Verify delete audit log exists
      const auditRepo = ds.getRepository(AuditLog);
      const audit = await auditRepo.findOne({
        where: {
          entityName: 'SupplierImportTemplate',
          entityId: createdTemplateId,
          action: AuditAction.DELETE,
        },
      });
      expect(audit).toBeDefined();
      expect(audit?.previousValues?.name).toBe(
        'Plantilla Modificada y Renombrada',
      );
    });
  });

  describe('Integration with POST /api/v1/importer/upload', () => {
    it('auto-detects template when uploaded file matches saved fingerprint', async () => {
      const csvBuffer = Buffer.from(
        'codigo_prov,descripcion,precio_neto,unidad\nMED-01,Paracetamol 500mg,450.00,Caja\n',
      );

      const res = await request(app.getHttpServer())
        .post('/api/v1/importer/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('supplierId', activeSupplier1.id)
        .attach('file', csvBuffer, 'lista_alfa.csv')
        .expect(200);

      expect(res.body.headerFingerprint).toBe(fingerprint1);
      expect(res.body.detectedTemplate).toBeDefined();
      expect(res.body.detectedTemplate.name).toBe('Plantilla Alfa Oficial');
      expect(res.body.detectedTemplate.mapping.supplierSku).toBe('codigo_prov');
      expect(res.body.detectedTemplate.mapping.usualCostNet).toBe(
        'precio_neto',
      );
    });

    it('returns detectedTemplate null when uploaded file has a different fingerprint', async () => {
      const csvBuffer = Buffer.from('col_a,col_b,col_c\n1,2,3\n');

      const res = await request(app.getHttpServer())
        .post('/api/v1/importer/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('supplierId', activeSupplier1.id)
        .attach('file', csvBuffer, 'desconocido.csv')
        .expect(200);

      expect(res.body.detectedTemplate).toBeNull();
    });
  });
});
