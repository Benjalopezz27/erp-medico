import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ImporterErrorCode, IImporterPreviewResponse } from '@erp/shared-types';
import { ImporterConfirmationService } from './importer-confirmation.service';
import { ImporterPreviewService } from './importer-preview.service';
import { AuditService } from '../../audit/audit.service';
import { SupplierImportBatch } from '../entities/supplier-import-batch.entity';
import { SupplierImportTemplate } from '../entities/supplier-import-template.entity';
import { SupplierImportBatchItem } from '../entities/supplier-import-batch-item.entity';
import { SupplierProduct } from '../../suppliers/supplier-products/entities/supplier-product.entity';
import { ImporterConfirmMultipartDto } from '../dto/importer-confirm-multipart.dto';

describe('ImporterConfirmationService', () => {
  let service: ImporterConfirmationService;
  let dataSource: jest.Mocked<Partial<DataSource>>;
  let batchRepo: jest.Mocked<Partial<Repository<SupplierImportBatch>>>;
  let templateRepo: jest.Mocked<Partial<Repository<SupplierImportTemplate>>>;
  let previewService: jest.Mocked<Partial<ImporterPreviewService>>;
  let auditService: jest.Mocked<Partial<AuditService>>;

  const mockSupplierId = '550e8400-e29b-41d4-a716-446655440000';
  const mockActorId = '550e8400-e29b-41d4-a716-446655440099';
  const mockFileChecksum = 'a'.repeat(64);
  const mockHeaderFp = 'b'.repeat(64);
  const mockMappingChecksum = 'c'.repeat(64);
  const mockContentChecksum = 'd'.repeat(64);

  const mockMappingStr = JSON.stringify({
    supplierSku: 'cod prov',
    usualCostNet: 'costo',
    supplierDescription: 'descripcion',
  });

  const mockPreviewResponse: IImporterPreviewResponse = {
    supplier: {
      id: mockSupplierId,
      businessName: 'Proveedor Test',
      cuit: '30712345678',
    },
    fileChecksum: mockFileChecksum,
    headerFingerprint: mockHeaderFp,
    mappingChecksum: mockMappingChecksum,
    contentChecksum: mockContentChecksum,
    summary: {
      totalRows: 2,
      validRows: 2,
      unknownRows: 0,
      errorRows: 0,
      canContinue: true,
    },
    validRows: [
      {
        rowNumber: 2,
        rawSku: 'SKU-001',
        normalizedSku: 'SKU-001',
        usualCostNet: '1250.5000',
        rawQuantity: '10',
        quantityCanonical: '10.0000',
        rawPurchaseUnit: 'Caja',
        normalizedUnit: 'caja',
        supplierDescription: 'Nueva Descripcion 1',
        supplierProduct: {
          id: 'sp-1',
          conversionFactorToBase: '1.0000',
          isPrimarySupplier: true,
          purchaseUnit: { id: 'u-1', name: 'Caja', symbol: 'CJA' },
        },
        product: {
          id: 'p-1',
          internalCode: 'P001',
          name: 'Prod 1',
          baseUnit: { id: 'u-base', name: 'Unidad', symbol: 'UN' },
        },
      },
      {
        rowNumber: 3,
        rawSku: 'SKU-002',
        normalizedSku: 'SKU-002',
        usualCostNet: '500.0000',
        rawQuantity: null,
        quantityCanonical: null,
        rawPurchaseUnit: null,
        normalizedUnit: null,
        supplierDescription: null, // Unchanged description
        supplierProduct: {
          id: 'sp-2',
          conversionFactorToBase: '1.0000',
          isPrimarySupplier: false,
          purchaseUnit: { id: 'u-1', name: 'Caja', symbol: 'CJA' },
        },
        product: {
          id: 'p-2',
          internalCode: 'P002',
          name: 'Prod 2',
          baseUnit: { id: 'u-base', name: 'Unidad', symbol: 'UN' },
        },
      },
    ],
    unknownRows: [],
    errorRows: [],
  };

  const validDto: ImporterConfirmMultipartDto = {
    supplierId: mockSupplierId,
    mapping: mockMappingStr,
    expectedFileChecksum: mockFileChecksum,
    expectedMappingChecksum: mockMappingChecksum,
    expectedContentChecksum: mockContentChecksum,
  };

  beforeEach(async () => {
    batchRepo = {
      create: jest.fn().mockImplementation((dto) => ({
        id: 'batch-123',
        ...dto,
        createdAt: new Date('2026-08-26T14:00:00.000Z'),
      })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      findOne: jest.fn(),
    };

    templateRepo = {
      findOne: jest.fn(),
    };

    previewService = {
      generatePreview: jest.fn().mockResolvedValue(mockPreviewResponse),
    };

    auditService = {
      record: jest.fn().mockResolvedValue({} as any),
    };

    const mockSp1 = {
      id: 'sp-1',
      supplierId: mockSupplierId,
      productId: 'p-1',
      supplierExternalCode: 'SKU-001',
      supplierDescription: 'Vieja Desc 1',
      purchaseUnitId: 'u-1',
      conversionFactorToBase: '1.0000',
      usualCostNet: '1000.0000',
      isPrimarySupplier: true,
    } as SupplierProduct;

    const mockSp2 = {
      id: 'sp-2',
      supplierId: mockSupplierId,
      productId: 'p-2',
      supplierExternalCode: 'SKU-002',
      supplierDescription: 'Desc 2',
      purchaseUnitId: 'u-1',
      conversionFactorToBase: '1.0000',
      usualCostNet: '500.0000',
      isPrimarySupplier: false,
    } as SupplierProduct;

    const mockTxManager = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === SupplierProduct) {
          return {
            findOneOrFail: jest.fn().mockImplementation(({ where: { id } }) => {
              if (id === 'sp-1') return Promise.resolve({ ...mockSp1 });
              if (id === 'sp-2') return Promise.resolve({ ...mockSp2 });
              throw new Error('Not found');
            }),
            save: jest.fn().mockImplementation((sp) => Promise.resolve(sp)),
          };
        }
        if (entity === SupplierImportBatch) {
          return batchRepo;
        }
        if (entity === SupplierImportBatchItem) {
          return {
            create: jest
              .fn()
              .mockImplementation((dto) => ({ id: 'item-id', ...dto })),
            save: jest
              .fn()
              .mockImplementation((items) => Promise.resolve(items)),
          };
        }
        return {};
      }),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation(async (cb: any) => {
        return cb(mockTxManager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImporterConfirmationService,
        { provide: DataSource, useValue: dataSource },
        {
          provide: getRepositoryToken(SupplierImportBatch),
          useValue: batchRepo,
        },
        {
          provide: getRepositoryToken(SupplierImportTemplate),
          useValue: templateRepo,
        },
        { provide: ImporterPreviewService, useValue: previewService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<ImporterConfirmationService>(
      ImporterConfirmationService,
    );
  });

  it('should successfully confirm import with changed and unchanged rows', async () => {
    const result = await service.confirmImport(
      Buffer.from('test'),
      'test.csv',
      'text/csv',
      validDto,
      mockActorId,
    );

    expect(result.batchId).toBe('batch-123');
    expect(result.totalRows).toBe(2);
    expect(result.appliedRows).toBe(2);
    expect(result.changedRows).toBe(1); // sp-1 changed cost & description
    expect(result.unchangedRows).toBe(1); // sp-2 remained identical
    expect(auditService.record).toHaveBeenCalledTimes(2); // 1 for SP update, 1 for batch create
  });

  it('should throw 409 when pre-validation file checksum does not match', async () => {
    await expect(
      service.confirmImport(
        Buffer.from('test'),
        'test.csv',
        'text/csv',
        { ...validDto, expectedFileChecksum: 'f'.repeat(64) },
        mockActorId,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('should throw 409 when mapping checksum does not match', async () => {
    await expect(
      service.confirmImport(
        Buffer.from('test'),
        'test.csv',
        'text/csv',
        { ...validDto, expectedMappingChecksum: 'f'.repeat(64) },
        mockActorId,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('should throw 409 when content checksum does not match', async () => {
    await expect(
      service.confirmImport(
        Buffer.from('test'),
        'test.csv',
        'text/csv',
        { ...validDto, expectedContentChecksum: 'f'.repeat(64) },
        mockActorId,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('should throw 409 when preview summary canContinue is false', async () => {
    previewService.generatePreview = jest.fn().mockResolvedValue({
      ...mockPreviewResponse,
      summary: { ...mockPreviewResponse.summary, canContinue: false },
    });

    await expect(
      service.confirmImport(
        Buffer.from('test'),
        'test.csv',
        'text/csv',
        validDto,
        mockActorId,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('should validate templateId supplier and fingerprint', async () => {
    templateRepo.findOne = jest.fn().mockResolvedValue({
      id: 'tpl-1',
      supplierId: 'other-supplier-id',
      headerFingerprint: mockHeaderFp,
    } as any);

    await expect(
      service.confirmImport(
        Buffer.from('test'),
        'test.csv',
        'text/csv',
        { ...validDto, templateId: '550e8400-e29b-41d4-a716-446655440001' },
        mockActorId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should handle unique constraint collision (23505) and return 409 with existingBatchId', async () => {
    dataSource.transaction = jest.fn().mockRejectedValue({
      driverError: {
        constraint: 'UQ_supplier_import_batches_supplier_content_checksum',
        code: '23505',
      },
    });

    batchRepo.findOne = jest.fn().mockResolvedValue({
      id: 'existing-batch-456',
    } as any);

    try {
      await service.confirmImport(
        Buffer.from('test'),
        'test.csv',
        'text/csv',
        validDto,
        mockActorId,
      );
      fail('Should have thrown ConflictException');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ConflictException);
      const res = err.getResponse();
      expect(res.code).toBe(ImporterErrorCode.IMPORTER_BATCH_ALREADY_CONFIRMED);
      expect(res.existingBatchId).toBe('existing-batch-456');
    }
  });

  it('should retrieve confirmed batch details via getBatchById', async () => {
    batchRepo.findOne = jest.fn().mockResolvedValue({
      id: 'batch-123',
      supplier: {
        id: mockSupplierId,
        businessName: 'Proveedor Test',
        cuit: '30712345678',
      },
      fileName: 'test.csv',
      fileChecksum: mockFileChecksum,
      mappingChecksum: mockMappingChecksum,
      contentChecksum: mockContentChecksum,
      totalRows: 2,
      appliedRows: 2,
      changedRows: 1,
      unchangedRows: 1,
      createdAt: new Date('2026-08-26T14:00:00.000Z'),
      templateId: null,
      items: [
        {
          id: 'item-1',
          rowNumber: 2,
          supplierSkuSnapshot: 'SKU-001',
          productId: 'p-1',
          previousUsualCostNet: '1000.0000',
          newUsualCostNet: '1250.5000',
          costChanged: true,
          previousDescription: 'Vieja Desc 1',
          newDescription: 'Nueva Descripcion 1',
          descriptionChanged: true,
        },
      ],
    } as any);

    const result = await service.getBatchById('batch-123');
    expect(result.batch.batchId).toBe('batch-123');
    expect(result.items.length).toBe(1);
    expect(result.items[0].supplierSku).toBe('SKU-001');
  });

  it('should throw NotFoundException when batch is not found in getBatchById', async () => {
    batchRepo.findOne = jest.fn().mockResolvedValue(null);

    await expect(service.getBatchById('non-existent')).rejects.toThrow(
      NotFoundException,
    );
  });
});
