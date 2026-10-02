import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import {
  AuditAction,
  ProductBulkLoadRowStatus,
  ProductImportBatchResult,
  ProductTaxTreatment,
  UserRole,
} from '@erp/shared-types';
import { ProductBulkLoadService } from './product-bulk-load.service';
import { ProductsService } from '../products.service';
import { AuditService } from '../../audit/audit.service';
import { ProductBulkLoadValidator } from './product-bulk-load-validator';
import { ProductImportBatch } from '../entities/product-import-batch.entity';
import { Category } from '../../categories/entities/category.entity';
import { Unit } from '../../units/entities/unit.entity';
import { ProductBulkFileParser } from './product-bulk-file-parser';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

describe('ProductBulkLoadService', () => {
  let service: ProductBulkLoadService;
  let mockDataSource: Partial<DataSource>;
  let mockProductsService: Partial<ProductsService>;
  let mockAuditService: Partial<AuditService>;
  let mockValidator: Partial<ProductBulkLoadValidator>;
  let mockBatchRepo: Partial<Repository<ProductImportBatch>>;
  let mockCategoryRepo: Partial<Repository<Category>>;
  let mockUnitRepo: Partial<Repository<Unit>>;
  let mockManager: Partial<EntityManager>;

  const mockCategories = [
    { id: 'cat-1', name: 'Medicamentos', description: 'Fármacos y medicinas' },
    { id: 'cat-2', name: 'Descartables', description: 'Material descartable' },
  ] as Category[];

  const mockUnits = [
    { id: 'unit-1', name: 'Unidad', symbol: 'u' },
    { id: 'unit-2', name: 'Caja', symbol: 'caja' },
  ] as Unit[];

  const actor: AuthenticatedUser = {
    id: 'user-1',
    name: 'Admin',
    email: 'admin@erp.com',
    role: UserRole.ADMINISTRADOR,
    isActive: true,
  };

  beforeEach(() => {
    mockManager = {
      create: jest.fn().mockImplementation((entityClass, data) => ({
        id: 'new-product-batch-uuid',
        createdAt: new Date('2026-10-02T12:00:00.000Z'),
        ...data,
      })),
      save: jest.fn().mockImplementation((entityClass, data) => data),
    };

    mockDataSource = {
      transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(mockManager as EntityManager);
      }),
    };

    mockProductsService = {
      createProductCore: jest
        .fn()
        .mockResolvedValue({ id: 'prod-uuid-1' } as any),
    };

    mockAuditService = {
      record: jest.fn().mockResolvedValue({ id: 'audit-uuid' } as any),
    };

    mockValidator = {
      validate: jest.fn(),
    };

    mockBatchRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    mockCategoryRepo = {
      find: jest.fn().mockResolvedValue(mockCategories),
    };

    mockUnitRepo = {
      find: jest.fn().mockResolvedValue(mockUnits),
    };

    service = new ProductBulkLoadService(
      mockDataSource as DataSource,
      mockProductsService as ProductsService,
      mockAuditService as AuditService,
      mockValidator as ProductBulkLoadValidator,
      mockBatchRepo as Repository<ProductImportBatch>,
      mockCategoryRepo as Repository<Category>,
      mockUnitRepo as Repository<Unit>,
    );
  });

  describe('1. Template Generation', () => {
    it('generates CSV template with all 12 columns', async () => {
      const result = await service.generateTemplate('csv');

      expect(result.contentType).toBe('text/csv; charset=utf-8');
      expect(result.filename).toBe('plantilla_productos.csv');

      const text = result.buffer.toString('utf8');
      expect(text).toContain(
        'name,category,baseUnit,costNet,activePriceNet,description,minStock,initialStock,markupPercentage,taxTreatment,ivaPercentage,conversions',
      );
    });

    it('generates XLSX template with Productos and Referencia sheets', async () => {
      const result = await service.generateTemplate('xlsx');

      expect(result.contentType).toContain('spreadsheetml');
      expect(result.filename).toBe('plantilla_productos.xlsx');
      expect(result.buffer.length).toBeGreaterThan(0);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(result.buffer as any);

      const productSheet = workbook.getWorksheet('Productos');
      expect(productSheet).toBeDefined();
      expect(productSheet!.getRow(1).getCell(1).value).toBe('name');
      expect(productSheet!.getRow(1).getCell(2).value).toBe('category');
      expect(productSheet!.getRow(1).getCell(3).value).toBe('baseUnit');

      const refSheet = workbook.getWorksheet('Referencia');
      expect(refSheet).toBeDefined();
      expect(refSheet!.getRow(1).getCell(1).value).toBe('Categoría');
      expect(refSheet!.getRow(2).getCell(1).value).toBe('Medicamentos');
      expect(refSheet!.getRow(2).getCell(4).value).toBe('Unidad');
    });
  });

  describe('2. Preview Bulk Load', () => {
    it('throws BadRequestException when file is missing', async () => {
      await expect(service.previewBulkLoad(null as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('parses and validates successfully for preview', async () => {
      const mockFile = {
        buffer: Buffer.from(
          'name,category,baseUnit,costNet,activePriceNet\nProd 1,Medicamentos,Unidad,100,150\n',
        ),
        originalname: 'productos.csv',
        mimetype: 'text/csv',
      } as Express.Multer.File;

      jest.spyOn(ProductBulkFileParser, 'parse').mockResolvedValueOnce({
        fileChecksum: 'file-checksum-1',
        rawRows: [
          {
            rowNumber: 2,
            rawName: 'Prod 1',
            rawCategory: 'Medicamentos',
            rawBaseUnit: 'Unidad',
            rawCostNet: '100',
            rawActivePriceNet: '150',
          } as any,
        ],
      });

      mockValidator.validate = jest.fn().mockResolvedValueOnce({
        valid: true,
        contentChecksum: 'content-checksum-1',
        summary: {
          totalRows: 1,
          validRows: 1,
          invalidRows: 0,
          totalInitialStock: 0,
        },
        rows: [
          {
            rowNumber: 2,
            status: ProductBulkLoadRowStatus.VALID,
            errors: [],
          },
        ],
      });

      const res = await service.previewBulkLoad(mockFile);

      expect(res.fileChecksum).toBe('file-checksum-1');
      expect(res.contentChecksum).toBe('content-checksum-1');
      expect(res.valid).toBe(true);
      expect(res.summary.totalRows).toBe(1);
    });
  });

  describe('3. Confirmation Orchestration & Invariants', () => {
    it('throws BadRequestException when file is missing', async () => {
      await expect(
        service.confirmBulkLoad(null as any, 'checksum', actor),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException(BULK_LOAD_PREVIEW_MISMATCH) when file checksum does not match preview', async () => {
      const mockFile = {
        buffer: Buffer.from('name,category,baseUnit,costNet,activePriceNet\n'),
        originalname: 'productos.csv',
        mimetype: 'text/csv',
      } as Express.Multer.File;

      jest.spyOn(ProductBulkFileParser, 'parse').mockResolvedValueOnce({
        fileChecksum: 'new-file-checksum',
        rawRows: [],
      });

      await expect(
        service.confirmBulkLoad(mockFile, 'expected-preview-checksum', actor),
      ).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException(BULK_LOAD_NO_VALID_ROWS) when totalRows is 0', async () => {
      const mockFile = {
        buffer: Buffer.from('name,category,baseUnit,costNet,activePriceNet\n'),
        originalname: 'productos.csv',
        mimetype: 'text/csv',
      } as Express.Multer.File;

      jest.spyOn(ProductBulkFileParser, 'parse').mockResolvedValueOnce({
        fileChecksum: 'file-sum',
        rawRows: [],
      });

      mockValidator.validate = jest.fn().mockResolvedValueOnce({
        valid: false,
        contentChecksum: null,
        summary: {
          totalRows: 0,
          validRows: 0,
          invalidRows: 0,
          totalInitialStock: 0,
        },
        rows: [],
      });

      await expect(
        service.confirmBulkLoad(mockFile, 'file-sum', actor),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException(BULK_LOAD_VALIDATION_FAILED) when there are invalid rows', async () => {
      const mockFile = {
        buffer: Buffer.from(
          'name,category,baseUnit,costNet,activePriceNet\nBad,Medicamentos,Unidad,invalid,150\n',
        ),
        originalname: 'productos.csv',
        mimetype: 'text/csv',
      } as Express.Multer.File;

      jest.spyOn(ProductBulkFileParser, 'parse').mockResolvedValueOnce({
        fileChecksum: 'file-sum',
        rawRows: [{ rowNumber: 2 } as any],
      });

      mockValidator.validate = jest.fn().mockResolvedValueOnce({
        valid: false,
        contentChecksum: null,
        summary: {
          totalRows: 1,
          validRows: 0,
          invalidRows: 1,
          totalInitialStock: 0,
        },
        rows: [
          {
            rowNumber: 2,
            status: ProductBulkLoadRowStatus.INVALID,
            errors: [
              { field: 'costNet', code: 'INVALID', message: 'Invalido' },
            ],
          },
        ],
      });

      await expect(
        service.confirmBulkLoad(mockFile, 'file-sum', actor),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException(BULK_LOAD_ALREADY_CONFIRMED) when batch with contentChecksum already exists', async () => {
      const mockFile = {
        buffer: Buffer.from(
          'name,category,baseUnit,costNet,activePriceNet\nProd 1,Medicamentos,Unidad,100,150\n',
        ),
        originalname: 'productos.csv',
        mimetype: 'text/csv',
      } as Express.Multer.File;

      jest.spyOn(ProductBulkFileParser, 'parse').mockResolvedValueOnce({
        fileChecksum: 'file-sum',
        rawRows: [{ rowNumber: 2 } as any],
      });

      mockValidator.validate = jest.fn().mockResolvedValueOnce({
        valid: true,
        contentChecksum: 'duplicate-content-checksum',
        summary: {
          totalRows: 1,
          validRows: 1,
          invalidRows: 0,
          totalInitialStock: 0,
        },
        rows: [
          {
            rowNumber: 2,
            status: ProductBulkLoadRowStatus.VALID,
            product: {
              name: 'Prod 1',
              categoryId: 'cat-1',
              baseUnitId: 'unit-1',
              costNet: 100,
              activePriceNet: 150,
              minStock: 0,
              initialStock: 0,
              taxTreatment: ProductTaxTreatment.GRAVADO,
              conversions: [],
            },
            errors: [],
          },
        ],
      });

      mockBatchRepo.findOne = jest
        .fn()
        .mockResolvedValueOnce({ id: 'existing-batch-id' } as any);

      await expect(
        service.confirmBulkLoad(mockFile, 'file-sum', actor),
      ).rejects.toThrow(ConflictException);
    });

    it('atomically confirms valid batch, creates products via createProductCore, and audits metrics', async () => {
      const mockFile = {
        buffer: Buffer.from(
          'name,category,baseUnit,costNet,activePriceNet,initialStock\nProd B,Medicamentos,Unidad,100,150,10\nProd A,Medicamentos,Unidad,50,75,0\n',
        ),
        originalname: 'productos.csv',
        mimetype: 'text/csv',
      } as Express.Multer.File;

      jest.spyOn(ProductBulkFileParser, 'parse').mockResolvedValueOnce({
        fileChecksum: 'file-sum-1',
        rawRows: [{ rowNumber: 2 } as any, { rowNumber: 3 } as any],
      });

      mockValidator.validate = jest.fn().mockResolvedValueOnce({
        valid: true,
        contentChecksum: 'content-sum-1',
        summary: {
          totalRows: 2,
          validRows: 2,
          invalidRows: 0,
          totalInitialStock: 10,
        },
        rows: [
          {
            rowNumber: 2,
            status: ProductBulkLoadRowStatus.VALID,
            product: {
              name: 'Prod B',
              description: 'Producto B',
              categoryId: 'cat-1',
              baseUnitId: 'unit-1',
              costNet: 100,
              activePriceNet: 150,
              markupPercentage: 50,
              minStock: 5,
              initialStock: 10,
              taxTreatment: ProductTaxTreatment.GRAVADO,
              ivaPercentage: 21,
              conversions: [
                {
                  presentationUnitId: 'unit-2',
                  presentationUnitSymbol: 'caja',
                  conversionFactor: 10,
                },
              ],
            },
            errors: [],
          },
          {
            rowNumber: 3,
            status: ProductBulkLoadRowStatus.VALID,
            product: {
              name: 'Prod A',
              description: null,
              categoryId: 'cat-1',
              baseUnitId: 'unit-1',
              costNet: 50,
              activePriceNet: 75,
              markupPercentage: 50,
              minStock: 0,
              initialStock: 0,
              taxTreatment: ProductTaxTreatment.GRAVADO,
              ivaPercentage: 21,
              conversions: [],
            },
            errors: [],
          },
        ],
      });

      const res = await service.confirmBulkLoad(mockFile, 'file-sum-1', actor);

      expect(res.batchId).toBe('new-product-batch-uuid');
      expect(res.rowCount).toBe(2);
      expect(res.movementCount).toBe(1); // Only Prod B has initialStock > 0
      expect(res.totalQuantityBase).toBe(10);

      // Verify batch created in transaction
      expect(mockManager.create).toHaveBeenCalledWith(
        ProductImportBatch,
        expect.objectContaining({
          contentChecksum: 'content-sum-1',
          fileChecksum: 'file-sum-1',
          rowCount: 2,
          movementCount: 1,
          totalQuantityBase: '10.00',
          result: ProductImportBatchResult.COMPLETED,
        }),
      );

      // Verify deterministic sorting: Prod A called before Prod B
      expect(mockProductsService.createProductCore).toHaveBeenCalledTimes(2);
      expect(
        (mockProductsService.createProductCore as jest.Mock).mock.calls[0][0]
          .name,
      ).toBe('Prod A');
      expect(
        (mockProductsService.createProductCore as jest.Mock).mock.calls[1][0]
          .name,
      ).toBe('Prod B');

      // Verify documentReference passed to createProductCore
      expect(
        (mockProductsService.createProductCore as jest.Mock).mock.calls[0][0]
          .documentReference,
      ).toBe('BULK_LOAD:new-product-batch-uuid');

      // Verify audit call
      expect(mockAuditService.record).toHaveBeenCalledWith(
        mockManager,
        expect.objectContaining({
          actorId: actor.id,
          action: AuditAction.CREATE,
          entityName: 'ProductBulkLoad',
          entityId: 'new-product-batch-uuid',
          newValues: expect.objectContaining({
            batchId: 'new-product-batch-uuid',
            rowCount: 2,
            movementCount: 1,
            totalQuantityBase: '10.00',
            result: ProductImportBatchResult.COMPLETED,
          }),
        }),
      );
    });

    it('catches unique constraint violation 23505 and maps to ConflictException', async () => {
      const mockFile = {
        buffer: Buffer.from(
          'name,category,baseUnit,costNet,activePriceNet\nProd 1,Medicamentos,Unidad,100,150\n',
        ),
        originalname: 'productos.csv',
        mimetype: 'text/csv',
      } as Express.Multer.File;

      jest.spyOn(ProductBulkFileParser, 'parse').mockResolvedValueOnce({
        fileChecksum: 'file-sum',
        rawRows: [{ rowNumber: 2 } as any],
      });

      mockValidator.validate = jest.fn().mockResolvedValueOnce({
        valid: true,
        contentChecksum: 'racing-content-sum',
        summary: {
          totalRows: 1,
          validRows: 1,
          invalidRows: 0,
          totalInitialStock: 0,
        },
        rows: [
          {
            rowNumber: 2,
            status: ProductBulkLoadRowStatus.VALID,
            product: {
              name: 'Prod 1',
              categoryId: 'cat-1',
              baseUnitId: 'unit-1',
              costNet: 100,
              activePriceNet: 150,
              minStock: 0,
              initialStock: 0,
              taxTreatment: ProductTaxTreatment.GRAVADO,
              conversions: [],
            },
            errors: [],
          },
        ],
      });

      mockDataSource.transaction = jest.fn().mockRejectedValueOnce({
        code: '23505',
        constraint: 'product_import_batches_content_checksum_key',
        detail: 'Key (content_checksum)=(racing-content-sum) already exists.',
      });

      await expect(
        service.confirmBulkLoad(mockFile, 'file-sum', actor),
      ).rejects.toThrow(ConflictException);
    });
  });
});
