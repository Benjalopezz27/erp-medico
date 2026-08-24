import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  ProductStatus,
  StockMovementType,
  StockBulkLoadRowStatus,
} from '@erp/shared-types';
import { StockBulkLoadService } from './stock-bulk-load.service';
import { StockService } from '../stock.service';
import { AuditService } from '../../audit/audit.service';
import { StockBulkLoadValidator } from './stock-bulk-load-validator';
import { StockImportBatch } from '../entities/stock-import-batch.entity';
import { Product } from '../../products/entities/product.entity';
import { StockBulkFileParser } from './stock-bulk-file-parser';

describe('StockBulkLoadService', () => {
  let service: StockBulkLoadService;
  let mockDataSource: Partial<DataSource>;
  let mockStockService: Partial<StockService>;
  let mockAuditService: Partial<AuditService>;
  let mockValidator: Partial<StockBulkLoadValidator>;
  let mockBatchRepo: Partial<Repository<StockImportBatch>>;
  let mockProductRepo: Partial<Repository<Product>>;
  let mockManager: Partial<EntityManager>;

  const activeProducts = [
    {
      id: 'prod-uuid-1',
      internalCode: 'P0001',
      name: 'Amoxicilina 500mg, comprimidos "Forte"',
      status: ProductStatus.ACTIVE,
      baseUnit: { id: 'u1', name: 'Comprimido', symbol: 'cmp' },
    },
    {
      id: 'prod-uuid-2',
      internalCode: 'P0002',
      name: 'Ibuprofeno 600mg',
      status: ProductStatus.ACTIVE,
      baseUnit: { id: 'u1', name: 'Comprimido', symbol: 'cmp' },
    },
  ] as Product[];

  beforeEach(() => {
    mockManager = {
      create: jest.fn().mockImplementation((entityClass, data) => ({
        id: 'new-batch-uuid',
        createdAt: new Date('2026-08-24T12:00:00.000Z'),
        ...data,
      })),
      save: jest.fn().mockImplementation((entityClass, data) => data),
      findOne: jest.fn().mockResolvedValue(activeProducts[0]),
    };

    mockDataSource = {
      transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(mockManager as EntityManager);
      }),
    };

    mockStockService = {
      recordMovement: jest.fn().mockResolvedValue({ id: 'mov-uuid' } as any),
    };

    mockAuditService = {
      record: jest.fn().mockResolvedValue({ id: 'audit-uuid' } as any),
    };

    mockValidator = {
      validate: jest.fn(),
    };

    mockBatchRepo = {
      findOneBy: jest.fn(),
    };

    mockProductRepo = {
      find: jest.fn().mockResolvedValue(activeProducts),
    };

    service = new StockBulkLoadService(
      mockDataSource as DataSource,
      mockStockService as StockService,
      mockAuditService as AuditService,
      mockValidator as StockBulkLoadValidator,
      mockBatchRepo as Repository<StockImportBatch>,
      mockProductRepo as Repository<Product>,
    );
  });

  describe('1. Template Generation', () => {
    it('generates pre-populated CSV template with RFC-4180 escaping and active products', async () => {
      const result = await service.generateTemplate('csv');

      expect(result.contentType).toBe('text/csv; charset=utf-8');
      expect(result.filename).toBe('plantilla_carga_stock.csv');

      const text = result.buffer.toString('utf8');
      expect(text).toContain('internalCode,productName,baseUnit,quantityBase');
      expect(text).toContain('P0001');
      expect(text).toContain('"Amoxicilina 500mg, comprimidos ""Forte"""');
      expect(text).toContain('Comprimido (cmp)');
    });

    it('generates pre-populated XLSX template with active products', async () => {
      const result = await service.generateTemplate('xlsx');

      expect(result.contentType).toContain('spreadsheetml');
      expect(result.filename).toBe('plantilla_carga_stock.xlsx');
      expect(result.buffer.length).toBeGreaterThan(0);
    });

    it('throws UnprocessableEntityException when active catalog exceeds 1000 items', async () => {
      const hugeCatalog = Array.from({ length: 1001 }, (_, i) => ({
        id: `prod-${i}`,
        internalCode: `P${String(i).padStart(4, '0')}`,
        name: `Product ${i}`,
        status: ProductStatus.ACTIVE,
        baseUnit: { id: 'u1', name: 'Unidad', symbol: 'u' },
      })) as Product[];

      mockProductRepo.find = jest.fn().mockResolvedValue(hugeCatalog);

      await expect(service.generateTemplate('xlsx')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });

  describe('2. Confirmation Orchestration & Invariants', () => {
    it('throws BadRequestException(BULK_LOAD_NO_INCLUDED_ROWS) when direct confirm has 0 included rows', async () => {
      const mockFile = {
        buffer: Buffer.from('internalCode,quantityBase\nP0001,\n'),
        originalname: 'all-skipped.csv',
        mimetype: 'text/csv',
      } as Express.Multer.File;

      jest.spyOn(StockBulkFileParser, 'parse').mockResolvedValueOnce({
        fileChecksum: 'file-sum-1',
        rawRows: [
          { rowNumber: 2, rawInternalCode: 'P0001', rawQuantity: null },
        ],
      });

      mockValidator.validate = jest.fn().mockResolvedValueOnce({
        valid: false,
        contentChecksum: null,
        summary: {
          totalRows: 1,
          includedRows: 0,
          skippedRows: 1,
          validRows: 0,
          invalidRows: 0,
          totalQuantityBase: 0,
        },
        rows: [
          {
            rowNumber: 2,
            internalCode: 'P0001',
            quantityBase: null,
            status: StockBulkLoadRowStatus.SKIPPED,
            product: null,
            errors: [],
          },
        ],
      });

      await expect(
        service.confirmBulkLoad(mockFile, 'file-sum-1', {
          id: 'user-1',
          email: 'admin@erp.com',
          role: 'ADMINISTRADOR',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException(BULK_LOAD_VALIDATION_FAILED) when direct confirm has invalid included rows', async () => {
      const mockFile = {
        buffer: Buffer.from('internalCode,quantityBase\nP0001,0\n'),
        originalname: 'invalid.csv',
        mimetype: 'text/csv',
      } as Express.Multer.File;

      jest.spyOn(StockBulkFileParser, 'parse').mockResolvedValueOnce({
        fileChecksum: 'file-sum-1',
        rawRows: [{ rowNumber: 2, rawInternalCode: 'P0001', rawQuantity: '0' }],
      });

      mockValidator.validate = jest.fn().mockResolvedValueOnce({
        valid: false,
        contentChecksum: null,
        summary: {
          totalRows: 1,
          includedRows: 1,
          skippedRows: 0,
          validRows: 0,
          invalidRows: 1,
          totalQuantityBase: 0,
        },
        rows: [
          {
            rowNumber: 2,
            internalCode: 'P0001',
            quantityBase: null,
            status: StockBulkLoadRowStatus.INCLUDED_INVALID,
            product: null,
            errors: [{ code: 'ZERO_QUANTITY', message: 'Error' }],
          },
        ],
      });

      await expect(
        service.confirmBulkLoad(mockFile, 'file-sum-1', {
          id: 'user-1',
          email: 'admin@erp.com',
          role: 'ADMINISTRADOR',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('atomically confirms valid batch, records movements only for INCLUDED_VALID rows, and audits metrics', async () => {
      const mockFile = {
        buffer: Buffer.from('internalCode,quantityBase\nP0001,50\nP0002,\n'),
        originalname: 'carga.csv',
        mimetype: 'text/csv',
      } as Express.Multer.File;

      jest.spyOn(StockBulkFileParser, 'parse').mockResolvedValueOnce({
        fileChecksum: 'file-sum-1',
        rawRows: [
          { rowNumber: 2, rawInternalCode: 'P0001', rawQuantity: '50' },
          { rowNumber: 3, rawInternalCode: 'P0002', rawQuantity: null },
        ],
      });

      mockValidator.validate = jest.fn().mockResolvedValueOnce({
        valid: true,
        contentChecksum: 'content-checksum-1',
        summary: {
          totalRows: 2,
          includedRows: 1,
          skippedRows: 1,
          validRows: 1,
          invalidRows: 0,
          totalQuantityBase: 50,
        },
        rows: [
          {
            rowNumber: 2,
            internalCode: 'P0001',
            quantityBase: 50,
            status: StockBulkLoadRowStatus.INCLUDED_VALID,
            product: {
              id: 'prod-uuid-1',
              internalCode: 'P0001',
              name: 'Amoxicilina',
              currentBaseStock: 10,
              projectedStock: 60,
              baseUnit: { id: 'u1', name: 'Unidad', symbol: 'u' },
            },
            errors: [],
          },
          {
            rowNumber: 3,
            internalCode: 'P0002',
            quantityBase: null,
            status: StockBulkLoadRowStatus.SKIPPED,
            product: {
              id: 'prod-uuid-2',
              internalCode: 'P0002',
              name: 'Ibuprofeno',
              currentBaseStock: 0,
              projectedStock: 0,
              baseUnit: { id: 'u1', name: 'Unidad', symbol: 'u' },
            },
            errors: [],
          },
        ],
      });

      const res = await service.confirmBulkLoad(mockFile, 'file-sum-1', {
        id: 'user-1',
        email: 'admin@erp.com',
        role: 'ADMINISTRADOR',
      });

      expect(res.batchId).toBe('new-batch-uuid');
      expect(res.rowCount).toBe(1);
      expect(res.movementCount).toBe(1);
      expect(res.totalQuantityBase).toBe(50);

      // Exactly 1 movement created (for prod-uuid-1 only)
      expect(mockStockService.recordMovement).toHaveBeenCalledTimes(1);
      expect(mockStockService.recordMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'prod-uuid-1',
          quantityBase: 50,
          movementType: StockMovementType.AJUSTE_ENTRADA,
        }),
        mockManager,
      );

      // Audit record contains included and skipped rows metrics
      expect(mockAuditService.record).toHaveBeenCalledWith(
        mockManager,
        expect.objectContaining({
          newValues: expect.objectContaining({
            totalRows: 2,
            includedRows: 1,
            skippedRows: 1,
            rowCount: 1,
            movementCount: 1,
          }),
        }),
      );
    });
  });
});
