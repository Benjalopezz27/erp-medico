import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  AuditAction,
  ImporterErrorCode,
  TaxCondition,
} from '@erp/shared-types';
import { SupplierImportTemplatesService } from './supplier-import-templates.service';
import { SupplierImportTemplate } from '../entities/supplier-import-template.entity';
import { SuppliersService } from '../../suppliers/suppliers.service';
import { AuditService } from '../../audit/audit.service';
import { computeHeaderFingerprint } from '../../../shared/parsers/secure-spreadsheet-parser';

describe('SupplierImportTemplatesService', () => {
  let service: SupplierImportTemplatesService;
  let templateRepo: jest.Mocked<Repository<SupplierImportTemplate>>;
  let suppliersService: jest.Mocked<SuppliersService>;
  let auditService: jest.Mocked<AuditService>;
  let dataSource: jest.Mocked<DataSource>;

  const mockSupplierId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
  const mockTemplateId = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
  const mockHeaders = ['cod_articulo', 'descripcion', 'precio', 'unidad'];
  const mockFingerprint = computeHeaderFingerprint(mockHeaders);

  const mockActiveSupplier = {
    id: mockSupplierId,
    businessName: 'Droguería 3M',
    cuit: '30712345678',
    taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTemplateEntity: SupplierImportTemplate = {
    id: mockTemplateId,
    supplierId: mockSupplierId,
    supplier: mockActiveSupplier as any,
    name: 'Lista Oficial 3M',
    headerFingerprint: mockFingerprint,
    headersSnapshot: mockHeaders,
    mapping: {
      supplierSku: 'cod_articulo',
      usualCostNet: 'precio',
      supplierDescription: 'descripcion',
      purchaseUnit: 'unidad',
      rawQuantity: null,
    },
    createdAt: new Date('2026-08-26T12:00:00.000Z'),
    updatedAt: new Date('2026-08-26T12:00:00.000Z'),
  };

  beforeEach(async () => {
    const mockRepo = {
      create: jest
        .fn()
        .mockImplementation((dto) => ({ ...dto, id: mockTemplateId })),
      save: jest
        .fn()
        .mockImplementation((entity) => Promise.resolve({ ...entity })),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockSuppliers = {
      findOne: jest.fn().mockResolvedValue(mockActiveSupplier),
    };

    const mockAudit = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const mockManager = {
      getRepository: jest.fn().mockReturnValue(mockRepo),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const mockDS = {
      transaction: jest.fn().mockImplementation((cb) => cb(mockManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierImportTemplatesService,
        {
          provide: getRepositoryToken(SupplierImportTemplate),
          useValue: mockRepo,
        },
        {
          provide: SuppliersService,
          useValue: mockSuppliers,
        },
        {
          provide: AuditService,
          useValue: mockAudit,
        },
        {
          provide: DataSource,
          useValue: mockDS,
        },
      ],
    }).compile();

    service = module.get<SupplierImportTemplatesService>(
      SupplierImportTemplatesService,
    );
    templateRepo = module.get(getRepositoryToken(SupplierImportTemplate));
    suppliersService = module.get(SuppliersService);
    auditService = module.get(AuditService);
    dataSource = module.get(DataSource);
  });

  describe('validateMapping', () => {
    it('passes for a valid mapping with mandatory and optional fields', () => {
      expect(() =>
        service.validateMapping(
          {
            supplierSku: 'COD_ARTICULO',
            usualCostNet: 'PRECIO',
            supplierDescription: 'DESCRIPCION',
            purchaseUnit: 'UNIDAD',
          },
          mockHeaders,
          mockFingerprint,
        ),
      ).not.toThrow();
    });

    it('throws IMPORTER_MAPPING_MISSING_REQUIRED_FIELD when supplierSku is missing', () => {
      expect(() =>
        service.validateMapping(
          { supplierSku: '', usualCostNet: 'precio' },
          mockHeaders,
        ),
      ).toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            code: ImporterErrorCode.IMPORTER_MAPPING_MISSING_REQUIRED_FIELD,
          }),
        }),
      );
    });

    it('throws IMPORTER_MAPPING_MISSING_REQUIRED_FIELD when usualCostNet is missing', () => {
      expect(() =>
        service.validateMapping(
          { supplierSku: 'cod_articulo', usualCostNet: '   ' },
          mockHeaders,
        ),
      ).toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            code: ImporterErrorCode.IMPORTER_MAPPING_MISSING_REQUIRED_FIELD,
          }),
        }),
      );
    });

    it('throws IMPORTER_MAPPING_HEADER_NOT_FOUND when mapped column does not exist in headers', () => {
      expect(() =>
        service.validateMapping(
          { supplierSku: 'inexistente', usualCostNet: 'precio' },
          mockHeaders,
        ),
      ).toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            code: ImporterErrorCode.IMPORTER_MAPPING_HEADER_NOT_FOUND,
          }),
        }),
      );
    });

    it('throws IMPORTER_MAPPING_DUPLICATE_COLUMN when same column is mapped twice', () => {
      expect(() =>
        service.validateMapping(
          {
            supplierSku: 'cod_articulo',
            usualCostNet: 'cod_articulo', // Duplicate assignment
          },
          mockHeaders,
        ),
      ).toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            code: ImporterErrorCode.IMPORTER_MAPPING_DUPLICATE_COLUMN,
          }),
        }),
      );
    });

    it('throws IMPORTER_FINGERPRINT_MISMATCH when expected fingerprint differs', () => {
      expect(() =>
        service.validateMapping(
          { supplierSku: 'cod_articulo', usualCostNet: 'precio' },
          mockHeaders,
          '0000000000000000000000000000000000000000000000000000000000000000',
        ),
      ).toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            code: ImporterErrorCode.IMPORTER_FINGERPRINT_MISMATCH,
          }),
        }),
      );
    });
  });

  describe('create', () => {
    it('creates a new template with normalized mapping and records audit log', async () => {
      const result = await service.create(
        mockSupplierId,
        {
          name: '  Lista Oficial 3M  ',
          headerFingerprint: mockFingerprint,
          headers: mockHeaders,
          mapping: {
            supplierSku: 'COD_ARTICULO',
            usualCostNet: 'PRECIO',
            supplierDescription: 'DESCRIPCION',
          },
        },
        'user-uuid-123',
      );

      expect(result.name).toBe('Lista Oficial 3M');
      expect(result.mapping.supplierSku).toBe('cod_articulo');
      expect(result.mapping.usualCostNet).toBe('precio');
      expect(auditService.record).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: AuditAction.CREATE,
          entityName: 'SupplierImportTemplate',
        }),
      );
    });

    it('throws IMPORTER_SUPPLIER_INACTIVE when supplier is inactive', async () => {
      suppliersService.findOne.mockResolvedValueOnce({
        ...mockActiveSupplier,
        isActive: false,
      });

      await expect(
        service.create(
          mockSupplierId,
          {
            name: 'Lista',
            headerFingerprint: mockFingerprint,
            headers: mockHeaders,
            mapping: { supplierSku: 'cod_articulo', usualCostNet: 'precio' },
          },
          'user-uuid-123',
        ),
      ).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            code: ImporterErrorCode.IMPORTER_SUPPLIER_INACTIVE,
          }),
        }),
      );
    });

    it('translates name unique violation (23505) to IMPORTER_TEMPLATE_NAME_DUPLICATE', async () => {
      dataSource.transaction.mockRejectedValueOnce({
        code: '23505',
        driverError: {
          constraint: 'uq_supplier_import_templates_supplier_name_upper',
        },
      });

      await expect(
        service.create(
          mockSupplierId,
          {
            name: 'Lista Duplicada',
            headerFingerprint: mockFingerprint,
            headers: mockHeaders,
            mapping: { supplierSku: 'cod_articulo', usualCostNet: 'precio' },
          },
          'user-uuid-123',
        ),
      ).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            code: ImporterErrorCode.IMPORTER_TEMPLATE_NAME_DUPLICATE,
          }),
        }),
      );
    });

    it('translates fingerprint unique violation (23505) to IMPORTER_TEMPLATE_FINGERPRINT_DUPLICATE', async () => {
      dataSource.transaction.mockRejectedValueOnce({
        code: '23505',
        driverError: {
          constraint: 'uq_supplier_import_templates_supplier_fingerprint',
        },
      });

      await expect(
        service.create(
          mockSupplierId,
          {
            name: 'Otra Lista',
            headerFingerprint: mockFingerprint,
            headers: mockHeaders,
            mapping: { supplierSku: 'cod_articulo', usualCostNet: 'precio' },
          },
          'user-uuid-123',
        ),
      ).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            code: ImporterErrorCode.IMPORTER_TEMPLATE_FINGERPRINT_DUPLICATE,
          }),
        }),
      );
    });
  });

  describe('findAllBySupplier', () => {
    it('returns templates list for supplier', async () => {
      const qb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockTemplateEntity]),
      };
      templateRepo.createQueryBuilder.mockReturnValue(qb);

      const list = await service.findAllBySupplier(mockSupplierId);
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(mockTemplateId);
      expect(list[0].name).toBe('Lista Oficial 3M');
    });
  });

  describe('findOne', () => {
    it('returns template when found', async () => {
      templateRepo.findOne.mockResolvedValueOnce(mockTemplateEntity);
      const res = await service.findOne(mockSupplierId, mockTemplateId);
      expect(res.id).toBe(mockTemplateId);
    });

    it('throws IMPORTER_TEMPLATE_NOT_FOUND when not found', async () => {
      templateRepo.findOne.mockResolvedValueOnce(null);
      await expect(
        service.findOne(mockSupplierId, 'nonexistent'),
      ).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            code: ImporterErrorCode.IMPORTER_TEMPLATE_NOT_FOUND,
          }),
        }),
      );
    });
  });

  describe('findByFingerprint', () => {
    it('returns matching entity or null', async () => {
      templateRepo.findOne.mockResolvedValueOnce(mockTemplateEntity);
      const res = await service.findByFingerprint(
        mockSupplierId,
        mockFingerprint,
      );
      expect(res?.id).toBe(mockTemplateId);
    });
  });

  describe('update', () => {
    it('updates template and records audit log', async () => {
      templateRepo.findOne.mockResolvedValueOnce({ ...mockTemplateEntity });

      const res = await service.update(
        mockSupplierId,
        mockTemplateId,
        { name: 'Nombre Nuevo' },
        'user-uuid-123',
      );

      expect(res.name).toBe('Nombre Nuevo');
      expect(auditService.record).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: AuditAction.UPDATE,
          entityName: 'SupplierImportTemplate',
        }),
      );
    });

    it('throws IMPORTER_INVALID_MAPPING when update payload is empty', async () => {
      templateRepo.findOne.mockResolvedValueOnce({ ...mockTemplateEntity });

      await expect(
        service.update(mockSupplierId, mockTemplateId, {}, 'user-uuid-123'),
      ).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            code: ImporterErrorCode.IMPORTER_INVALID_MAPPING,
          }),
        }),
      );
    });
  });

  describe('delete', () => {
    it('records audit log with previous snapshot and removes template', async () => {
      templateRepo.findOne.mockResolvedValueOnce({ ...mockTemplateEntity });

      await service.delete(mockSupplierId, mockTemplateId, 'user-uuid-123');

      expect(auditService.record).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: AuditAction.DELETE,
          entityName: 'SupplierImportTemplate',
          entityId: mockTemplateId,
        }),
      );
    });

    it('throws IMPORTER_TEMPLATE_NOT_FOUND when template to delete does not exist', async () => {
      templateRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.delete(mockSupplierId, 'nonexistent', 'user-uuid-123'),
      ).rejects.toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            code: ImporterErrorCode.IMPORTER_TEMPLATE_NOT_FOUND,
          }),
        }),
      );
    });
  });
});
