import { Test, TestingModule } from '@nestjs/testing';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { StockAdjustmentsService } from './stock-adjustments.service';
import {
  ProductStatus,
  StockMovementType,
  StockStatus,
  UserRole,
} from '@erp/shared-types';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

describe('StockController', () => {
  let controller: StockController;
  let stockService: StockService;
  let stockAdjustmentsService: StockAdjustmentsService;

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
      ],
    }).compile();

    controller = module.get<StockController>(StockController);
    stockService = module.get<StockService>(StockService);
    stockAdjustmentsService = module.get<StockAdjustmentsService>(
      StockAdjustmentsService,
    );
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
      const dto = {
        productId: '123e4567-e89b-12d3-a456-426614174000',
        movementType: StockMovementType.AJUSTE_ENTRADA as const,
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
