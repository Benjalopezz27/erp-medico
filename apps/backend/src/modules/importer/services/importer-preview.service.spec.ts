import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import {
  ImporterErrorCode,
  ImporterRowErrorCode,
  ProductStatus,
} from '@erp/shared-types';
import { ImporterPreviewService } from './importer-preview.service';
import { ImporterRowValidatorService } from './importer-row-validator.service';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { SupplierProduct } from '../../suppliers/supplier-products/entities/supplier-product.entity';
import { ImporterPreviewMultipartDto } from '../dto';

describe('ImporterPreviewService', () => {
  let service: ImporterPreviewService;
  let supplierRepo: jest.Mocked<Partial<Repository<Supplier>>>;
  let supplierProductRepo: jest.Mocked<Partial<Repository<SupplierProduct>>>;
  let qbMock: any;

  const mockSupplier: Supplier = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    businessName: 'Droguería Central',
    cuit: '30712345678',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Supplier;

  const mockProduct = {
    id: 'p-1',
    internalCode: 'P0001',
    name: 'Ibuprofeno 400',
    status: ProductStatus.ACTIVE,
    baseUnit: {
      id: 'u-base',
      name: 'Comprimido',
      symbol: 'COMP',
    },
  };

  const mockSupplierProduct = {
    id: 'sp-1',
    supplierId: mockSupplier.id,
    supplierExternalCode: 'MED-001',
    isPrimarySupplier: true,
    conversionFactorToBase: '100.0000',
    product: mockProduct,
    purchaseUnit: {
      id: 'u-caja',
      name: 'Caja',
      symbol: 'CJA',
    },
  } as unknown as SupplierProduct;

  const csvContent =
    'Cod Prov,Descripcion,Costo,Bulto,Unidad\nMED-001,Ibuprofeno,1250.50,10,Caja\nPAR-500,Paracetamol,890.00,50,Frasco\n';
  const csvBuffer = Buffer.from(csvContent, 'utf8');
  const validChecksum = crypto
    .createHash('sha256')
    .update(csvBuffer)
    .digest('hex');

  const validDto: ImporterPreviewMultipartDto = {
    supplierId: mockSupplier.id,
    expectedFileChecksum: validChecksum,
    mapping: JSON.stringify({
      supplierSku: 'cod prov',
      usualCostNet: 'costo',
      supplierDescription: 'descripcion',
      rawQuantity: 'bulto',
      purchaseUnit: 'unidad',
    }),
  };

  beforeEach(async () => {
    qbMock = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([mockSupplierProduct]),
    };

    supplierRepo = {
      findOne: jest.fn().mockResolvedValue(mockSupplier),
    };

    supplierProductRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qbMock),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImporterPreviewService,
        ImporterRowValidatorService,
        {
          provide: getRepositoryToken(Supplier),
          useValue: supplierRepo,
        },
        {
          provide: getRepositoryToken(SupplierProduct),
          useValue: supplierProductRepo,
        },
      ],
    }).compile();

    service = module.get<ImporterPreviewService>(ImporterPreviewService);
  });

  it('throws 404 when supplier is not found', async () => {
    supplierRepo.findOne!.mockResolvedValue(null);

    await expect(
      service.generatePreview(csvBuffer, 'lista.csv', 'text/csv', validDto),
    ).rejects.toThrow(
      expect.objectContaining({
        response: expect.objectContaining({
          code: ImporterErrorCode.IMPORTER_SUPPLIER_NOT_FOUND,
        }),
      }),
    );
  });

  it('throws 400 when supplier is inactive', async () => {
    supplierRepo.findOne!.mockResolvedValue({
      ...mockSupplier,
      isActive: false,
    } as Supplier);

    await expect(
      service.generatePreview(csvBuffer, 'lista.csv', 'text/csv', validDto),
    ).rejects.toThrow(
      expect.objectContaining({
        response: expect.objectContaining({
          code: ImporterErrorCode.IMPORTER_SUPPLIER_INACTIVE,
        }),
      }),
    );
  });

  it('throws 409 Conflict when file checksum mismatches expected checksum', async () => {
    const invalidDto = {
      ...validDto,
      expectedFileChecksum: '0'.repeat(64),
    };

    await expect(
      service.generatePreview(csvBuffer, 'lista.csv', 'text/csv', invalidDto),
    ).rejects.toThrow(
      expect.objectContaining({
        response: expect.objectContaining({
          code: ImporterErrorCode.IMPORTER_CHECKSUM_MISMATCH,
        }),
      }),
    );
  });

  it('throws 400 when mapping is invalid JSON', async () => {
    const badDto = {
      ...validDto,
      mapping: 'invalid-json{',
    };

    await expect(
      service.generatePreview(csvBuffer, 'lista.csv', 'text/csv', badDto),
    ).rejects.toThrow(
      expect.objectContaining({
        response: expect.objectContaining({
          code: ImporterErrorCode.IMPORTER_MAPPING_INVALID_JSON,
        }),
      }),
    );
  });

  it('classifies rows into valid and unknown with deterministic contentChecksum', async () => {
    const result = await service.generatePreview(
      csvBuffer,
      'lista.csv',
      'text/csv',
      validDto,
    );

    expect(result.summary.totalRows).toBe(2);
    expect(result.summary.validRows).toBe(1);
    expect(result.summary.unknownRows).toBe(1);
    expect(result.summary.errorRows).toBe(0);
    expect(result.summary.canContinue).toBe(false); // Unknown rows exist

    expect(result.validRows[0].normalizedSku).toBe('MED-001');
    expect(result.validRows[0].usualCostNet).toBe('1250.5000');
    expect(result.validRows[0].supplierProduct.purchaseUnit.name).toBe('Caja');

    expect(result.unknownRows[0].normalizedSku).toBe('PAR-500');
    expect(result.unknownRows[0].usualCostNet).toBe('890.0000');

    expect(result.contentChecksum).toHaveLength(64);
  });

  it('marks duplicate SKUs in file as error on all occurrences', async () => {
    const duplicateCsv =
      'Cod Prov,Descripcion,Costo\nMED-001,Item 1,100.00\nMED-001,Item 2,200.00\n';
    const dupBuffer = Buffer.from(duplicateCsv, 'utf8');
    const dupChecksum = crypto
      .createHash('sha256')
      .update(dupBuffer)
      .digest('hex');

    const dto = {
      ...validDto,
      expectedFileChecksum: dupChecksum,
      mapping: JSON.stringify({
        supplierSku: 'cod prov',
        usualCostNet: 'costo',
      }),
    };

    const result = await service.generatePreview(
      dupBuffer,
      'lista.csv',
      'text/csv',
      dto,
    );

    expect(result.summary.errorRows).toBe(2);
    expect(result.summary.validRows).toBe(0);
    expect(result.summary.unknownRows).toBe(0);
    expect(result.errorRows[0].errors[0].code).toBe(
      ImporterRowErrorCode.ROW_SKU_DUPLICATE,
    );
    expect(result.errorRows[1].errors[0].code).toBe(
      ImporterRowErrorCode.ROW_SKU_DUPLICATE,
    );
  });

  it('skips SQL query when 0 valid syntax SKUs exist', async () => {
    const badCsv = 'Cod Prov,Descripcion,Costo\n,Item 1,100.00\n';
    const badBuffer = Buffer.from(badCsv, 'utf8');
    const badChecksum = crypto
      .createHash('sha256')
      .update(badBuffer)
      .digest('hex');

    const dto = {
      ...validDto,
      expectedFileChecksum: badChecksum,
      mapping: JSON.stringify({
        supplierSku: 'cod prov',
        usualCostNet: 'costo',
      }),
    };

    const result = await service.generatePreview(
      badBuffer,
      'lista.csv',
      'text/csv',
      dto,
    );

    expect(result.summary.errorRows).toBe(1);
    expect(supplierProductRepo.createQueryBuilder).not.toHaveBeenCalled();
  });
});
