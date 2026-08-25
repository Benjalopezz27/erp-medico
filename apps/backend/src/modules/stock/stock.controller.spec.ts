import { Test, TestingModule } from '@nestjs/testing';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { StockAdjustmentsService } from './stock-adjustments.service';
import { StockBulkLoadService } from './bulk-load/stock-bulk-load.service';
import {
  ProductStatus,
  StockMovementType,
  StockStatus,
  UserRole,
} from '@erp/shared-types';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';

describe('StockController', () => {
  let controller: StockController;
  let stockService: StockService;
  let stockAdjustmentsService: StockAdjustmentsService;
  let stockBulkLoadService: StockBulkLoadService;

  const mockActor: AuthenticatedUser = {
    id: '523e4567-e89b-12d3-a456-426614174000',
    email: 'admin@erp.com',
    name: 'Admin User',
    role: UserRole.ADMINISTRADOR,
    isActive: true,
  };

  const mockStockOverviewItem = {
    productId: '123e4567-e89b-12d3-a456-426614174000',
    internalCode: 'P0001',
    productName: 'Paracetamol 500mg',
    category: {
      id: '223e4567-e89b-12d3-a456-426614174000',
      name: 'Farmacia',
    },
    baseUnit: {
      id: '323e4567-e89b-12d3-a456-426614174000',
      name: 'Unidad',
      symbol: 'u',
    },
    currentBaseStock: 100,
    minStock: 50,
    stockStatus: StockStatus.NORMAL,
    status: ProductStatus.ACTIVE,
  };

  const mockPaginatedStock = {
    items: [mockStockOverviewItem],
    meta: {
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };

  const mockAdjustmentResponse = {
    id: '423e4567-e89b-12d3-a456-426614174000',
    productId: '123e4567-e89b-12d3-a456-426614174000',
    movementType: StockMovementType.AJUSTE_ENTRADA,
    quantityBase: 10,
    previousStock: 100,
    subsequentStock: 110,
    reason: 'Ajuste manual',
    documentReference: 'DOC-1',
    userId: '523e4567-e89b-12d3-a456-426614174000',
    createdAt: new Date('2026-08-24T12:00:00.000Z'),
  };

  const mockStockService = {
    getStatus: jest
      .fn()
      .mockReturnValue({ module: 'stock', status: 'initialized' }),
    findAllStock: jest.fn().mockResolvedValue(mockPaginatedStock),
    findStockAlerts: jest.fn().mockResolvedValue(mockPaginatedStock),
    findProductMovements: jest.fn(),
    findStockEvolution: jest.fn(),
  };

  const mockStockAdjustmentsService = {
    createAdjustment: jest.fn().mockResolvedValue(mockAdjustmentResponse),
  };

  const mockStockBulkLoadService = {
    generateTemplate: jest.fn().mockResolvedValue({
      buffer: Buffer.from('internalCode,quantityBase\n'),
      contentType: 'text/csv; charset=utf-8',
      filename: 'plantilla_carga_stock.csv',
    }),
    previewBulkLoad: jest.fn().mockResolvedValue({
      fileChecksum: 'file-hash',
      contentChecksum: 'content-hash',
      valid: true,
      summary: {
        totalRows: 1,
        validRows: 1,
        invalidRows: 0,
        totalQuantityBase: 10,
      },
      rows: [],
    }),
    confirmBulkLoad: jest.fn().mockResolvedValue({
      batchId: 'batch-1',
      fileChecksum: 'file-hash',
      contentChecksum: 'content-hash',
      rowCount: 1,
      movementCount: 1,
      totalQuantityBase: 10,
      confirmedAt: '2026-08-24T12:00:00.000Z',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StockController],
      providers: [
        {
          provide: StockService,
          useValue: mockStockService,
        },
        {
          provide: StockAdjustmentsService,
          useValue: mockStockAdjustmentsService,
        },
        {
          provide: StockBulkLoadService,
          useValue: mockStockBulkLoadService,
        },
      ],
    }).compile();

    controller = module.get<StockController>(StockController);
    stockService = module.get<StockService>(StockService);
    stockAdjustmentsService = module.get<StockAdjustmentsService>(
      StockAdjustmentsService,
    );
    stockBulkLoadService =
      module.get<StockBulkLoadService>(StockBulkLoadService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStatus', () => {
    it('returns stock module status', () => {
      expect(controller.getStatus()).toEqual({
        module: 'stock',
        status: 'initialized',
      });
    });
  });

  describe('downloadBulkLoadTemplate', () => {
    it('delegates to bulkLoadService.generateTemplate and sets response headers', async () => {
      const mockRes = {
        set: jest.fn(),
      } as any;

      const res = await controller.downloadBulkLoadTemplate(
        { format: 'csv' },
        mockRes,
      );

      expect(stockBulkLoadService.generateTemplate).toHaveBeenCalledWith('csv');
      expect(mockRes.set).toHaveBeenCalledWith({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition':
          'attachment; filename="plantilla_carga_stock.csv"',
      });
      expect(res).toBeDefined();
    });
  });

  describe('previewBulkLoad', () => {
    it('delegates to bulkLoadService.previewBulkLoad with uploaded file', async () => {
      const mockFile = { buffer: Buffer.from('test') } as Express.Multer.File;
      const res = await controller.previewBulkLoad(mockFile);

      expect(stockBulkLoadService.previewBulkLoad).toHaveBeenCalledWith(
        mockFile,
      );
      expect(res.valid).toBe(true);
    });
  });

  describe('confirmBulkLoad', () => {
    it('delegates to bulkLoadService.confirmBulkLoad with file, checksum, and actor', async () => {
      const mockFile = { buffer: Buffer.from('test') } as Express.Multer.File;
      const dto = {
        previewFileChecksum:
          'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      };

      const res = await controller.confirmBulkLoad(mockFile, dto, mockActor);

      expect(stockBulkLoadService.confirmBulkLoad).toHaveBeenCalledWith(
        mockFile,
        dto.previewFileChecksum,
        mockActor,
      );
      expect(res.batchId).toBe('batch-1');
    });
  });

  describe('findAllStock', () => {
    it('delegates query to stockService.findAllStock', async () => {
      const query = { page: 1, limit: 10, search: 'Paracetamol' };
      const res = await controller.findAllStock(query);
      expect(stockService.findAllStock).toHaveBeenCalledWith(query);
      expect(res).toEqual(mockPaginatedStock);
    });
  });

  describe('findStockAlerts', () => {
    it('delegates query to stockService.findStockAlerts', async () => {
      const query = { page: 1, limit: 10, search: 'Paracetamol' };
      const res = await controller.findStockAlerts(query);
      expect(stockService.findStockAlerts).toHaveBeenCalledWith(query);
      expect(res).toEqual(mockPaginatedStock);
    });
  });

  describe('createAdjustment', () => {
    it('delegates to stockAdjustmentsService.createAdjustment with actor', async () => {
      const dto: CreateStockAdjustmentDto = {
        productId: '123e4567-e89b-12d3-a456-426614174000',
        movementType: StockMovementType.AJUSTE_ENTRADA,
        quantityBase: 10,
        reason: 'Ajuste manual',
        documentReference: 'DOC-1',
      };
      const res = await controller.createAdjustment(dto, mockActor);
      expect(stockAdjustmentsService.createAdjustment).toHaveBeenCalledWith(
        dto,
        mockActor,
      );
      expect(res).toEqual(mockAdjustmentResponse);
    });
  });
});
