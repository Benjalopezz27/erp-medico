import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  ProductStatus,
  StockMovementType,
  StockImportBatchResult,
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
  let mockDataSource: jest.Mocked<DataSource>;
  let mockTxManager: jest.Mocked<EntityManager>;
  let mockStockService: jest.Mocked<StockService>;
  let mockAuditService: jest.Mocked<AuditService>;
  let mockValidator: jest.Mocked<StockBulkLoadValidator>;
  let mockBatchRepo: jest.Mocked<Repository<StockImportBatch>>;
  let mockProductRepo: jest.Mocked<Repository<Product>>;

  const mockActor = {
    id: 'user-admin-uuid',
    email: 'admin@example.com',
    role: 'ADMINISTRADOR',
  };

  beforeEach(() => {
    mockTxManager = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<EntityManager>;

    mockDataSource = {
      transaction: jest.fn((cb: (manager: EntityManager) => Promise<any>) =>
        cb(mockTxManager),
      ),
    } as unknown as jest.Mocked<DataSource>;

    mockStockService = {
      recordMovement: jest.fn(),
    } as unknown as jest.Mocked<StockService>;

    mockAuditService = {
      record: jest.fn(),
    } as unknown as jest.Mocked<AuditService>;

    mockValidator = {
      validate: jest.fn(),
    } as unknown as jest.Mocked<StockBulkLoadValidator>;

    mockBatchRepo = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<StockImportBatch>>;

    mockProductRepo = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Product>>;

    service = new StockBulkLoadService(
      mockDataSource,
      mockStockService,
      mockAuditService,
      mockValidator,
      mockBatchRepo,
      mockProductRepo,
    );
  });

  describe('generateTemplate', () => {
    it('generates CSV template with headers only', async () => {
      const template = await service.generateTemplate('csv');
      expect(template.filename).toBe('plantilla_carga_stock.csv');
      expect(template.contentType).toBe('text/csv; charset=utf-8');
      expect(template.buffer.toString('utf8')).toBe(
        'internalCode,quantityBase\n',
      );
    });

    it('generates XLSX template with headers only', async () => {
      const template = await service.generateTemplate('xlsx');
      expect(template.filename).toBe('plantilla_carga_stock.xlsx');
      expect(template.contentType).toContain('spreadsheetml');
      expect(template.buffer.length).toBeGreaterThan(0);
    });
  });

  describe('previewBulkLoad', () => {
    it('parses and validates file returning complete preview diagnostics', async () => {
      const csvBuffer = Buffer.from(
        'internalCode,quantityBase\nP0001,100\n',
        'utf8',
      );
      const mockFile = {
        buffer: csvBuffer,
        originalname: 'carga.csv',
        mimetype: 'text/csv',
      } as Express.Multer.File;

      mockValidator.validate.mockResolvedValueOnce({
        valid: true,
        contentChecksum: 'canonical-hash-123456',
        summary: {
          totalRows: 1,
          validRows: 1,
          invalidRows: 0,
          totalQuantityBase: 100,
        },
        rows: [
          {
            rowNumber: 2,
            internalCode: 'P0001',
            quantityBase: 100,
            product: {
              id: 'p-1',
              internalCode: 'P0001',
              name: 'Paracetamol',
              currentBaseStock: 0,
              projectedStock: 100,
              baseUnit: { id: 'u1', name: 'Unidad', symbol: 'u' },
            },
            errors: [],
            isValid: true,
          },
        ],
      });

      const response = await service.previewBulkLoad(mockFile);

      expect(response.valid).toBe(true);
      expect(response.contentChecksum).toBe('canonical-hash-123456');
      expect(response.summary.totalRows).toBe(1);
    });
  });

  describe('confirmBulkLoad', () => {
    it('rejects confirmation when previewFileChecksum does not match binary fileChecksum', async () => {
      const csvBuffer = Buffer.from(
        'internalCode,quantityBase\nP0001,100\n',
        'utf8',
      );
      const mockFile = {
        buffer: csvBuffer,
        originalname: 'carga.csv',
        mimetype: 'text/csv',
      } as Express.Multer.File;

      await expect(
        service.confirmBulkLoad(
          mockFile,
          'mismatched-checksum-hex-00000',
          mockActor,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects confirmation when file validation fails', async () => {
      const csvBuffer = Buffer.from(
        'internalCode,quantityBase\nP0001,100\n',
        'utf8',
      );
      const mockFile = {
        buffer: csvBuffer,
        originalname: 'carga.csv',
        mimetype: 'text/csv',
      } as Express.Multer.File;

      const parsed = await StockBulkFileParser.parse(
        csvBuffer,
        'carga.csv',
        'text/csv',
      );

      mockValidator.validate.mockResolvedValueOnce({
        valid: false,
        contentChecksum: null,
        summary: {
          totalRows: 1,
          validRows: 0,
          invalidRows: 1,
          totalQuantityBase: 0,
        },
        rows: [],
      });

      await expect(
        service.confirmBulkLoad(mockFile, parsed.fileChecksum, mockActor),
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully confirms valid batch atomically and emits batch audit log', async () => {
      const csvBuffer = Buffer.from(
        'internalCode,quantityBase\nP0001,100\n',
        'utf8',
      );
      const mockFile = {
        buffer: csvBuffer,
        originalname: 'carga.csv',
        mimetype: 'text/csv',
      } as Express.Multer.File;

      const parsed = await StockBulkFileParser.parse(
        csvBuffer,
        'carga.csv',
        'text/csv',
      );

      mockValidator.validate.mockResolvedValueOnce({
        valid: true,
        contentChecksum: 'content-hash-abcdef',
        summary: {
          totalRows: 1,
          validRows: 1,
          invalidRows: 0,
          totalQuantityBase: 100,
        },
        rows: [
          {
            rowNumber: 2,
            internalCode: 'P0001',
            quantityBase: 100,
            product: {
              id: 'p-uuid-1',
              internalCode: 'P0001',
              name: 'Paracetamol',
              currentBaseStock: 0,
              projectedStock: 100,
              baseUnit: { id: 'u1', name: 'Unidad', symbol: 'u' },
            },
            errors: [],
            isValid: true,
          },
        ],
      });

      (mockTxManager.create as unknown as jest.Mock).mockReturnValueOnce({
        id: 'batch-uuid-1',
        contentChecksum: 'content-hash-abcdef',
        fileChecksum: parsed.fileChecksum,
        actorId: mockActor.id,
        rowCount: 1,
        movementCount: 1,
        totalQuantityBase: '100.00',
        result: StockImportBatchResult.COMPLETED,
        createdAt: new Date('2026-08-24T12:00:00.000Z'),
      } as StockImportBatch);

      (mockTxManager.save as unknown as jest.Mock).mockResolvedValueOnce({
        id: 'batch-uuid-1',
        contentChecksum: 'content-hash-abcdef',
        fileChecksum: parsed.fileChecksum,
        actorId: mockActor.id,
        rowCount: 1,
        movementCount: 1,
        totalQuantityBase: '100.00',
        result: StockImportBatchResult.COMPLETED,
        createdAt: new Date('2026-08-24T12:00:00.000Z'),
      } as StockImportBatch);

      (mockTxManager.findOne as unknown as jest.Mock).mockResolvedValueOnce({
        id: 'p-uuid-1',
        internalCode: 'P0001',
        status: ProductStatus.ACTIVE,
      } as Product);

      mockStockService.recordMovement.mockResolvedValueOnce({} as any);
      mockAuditService.record.mockResolvedValueOnce({} as any);

      const result = await service.confirmBulkLoad(
        mockFile,
        parsed.fileChecksum,
        mockActor,
      );

      expect(result.batchId).toBe('batch-uuid-1');
      expect(result.rowCount).toBe(1);
      expect(result.movementCount).toBe(1);
      expect(result.totalQuantityBase).toBe(100);

      expect(mockStockService.recordMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'p-uuid-1',
          movementType: StockMovementType.AJUSTE_ENTRADA,
          quantityBase: 100,
          documentReference: 'BULK_LOAD:batch-uuid-1',
        }),
        mockTxManager,
      );

      expect(mockAuditService.record).toHaveBeenCalledWith(
        mockTxManager,
        expect.objectContaining({
          entityName: 'StockBulkLoad',
          entityId: 'batch-uuid-1',
        }),
      );
    });

    it('translates duplicate content_checksum unique violation into 409 Conflict', async () => {
      const csvBuffer = Buffer.from(
        'internalCode,quantityBase\nP0001,100\n',
        'utf8',
      );
      const mockFile = {
        buffer: csvBuffer,
        originalname: 'carga.csv',
        mimetype: 'text/csv',
      } as Express.Multer.File;

      const parsed = await StockBulkFileParser.parse(
        csvBuffer,
        'carga.csv',
        'text/csv',
      );

      mockValidator.validate.mockResolvedValueOnce({
        valid: true,
        contentChecksum: 'content-hash-duplicate',
        summary: {
          totalRows: 1,
          validRows: 1,
          invalidRows: 0,
          totalQuantityBase: 100,
        },
        rows: [
          {
            rowNumber: 2,
            internalCode: 'P0001',
            quantityBase: 100,
            product: {
              id: 'p-uuid-1',
              internalCode: 'P0001',
              name: 'Paracetamol',
              currentBaseStock: 0,
              projectedStock: 100,
              baseUnit: { id: 'u1', name: 'Unidad', symbol: 'u' },
            },
            errors: [],
            isValid: true,
          },
        ],
      });

      mockDataSource.transaction.mockRejectedValueOnce({
        code: '23505',
        detail:
          'Key (content_checksum)=(content-hash-duplicate) already exists.',
      });

      await expect(
        service.confirmBulkLoad(mockFile, parsed.fileChecksum, mockActor),
      ).rejects.toThrow(ConflictException);
    });
  });
});
