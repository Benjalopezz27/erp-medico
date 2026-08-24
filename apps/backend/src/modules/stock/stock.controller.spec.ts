import { Test, TestingModule } from '@nestjs/testing';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import {
  ProductStatus,
  StockMovementType,
  StockStatus,
} from '@erp/shared-types';

describe('StockController', () => {
  let controller: StockController;
  let stockService: StockService;

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

  const mockPaginatedMovements = {
    product: {
      productId: '123e4567-e89b-12d3-a456-426614174000',
      internalCode: 'P0001',
      productName: 'Paracetamol 500mg',
      status: ProductStatus.ACTIVE,
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
    },
    items: [
      {
        id: '423e4567-e89b-12d3-a456-426614174000',
        movementType: StockMovementType.ENTRADA_COMPRA,
        quantityBase: 100,
        previousStock: 0,
        subsequentStock: 100,
        reason: 'Ingreso inicial',
        documentReference: 'REM-001',
        user: {
          id: '523e4567-e89b-12d3-a456-426614174000',
          name: 'Admin',
        },
        createdAt: new Date('2026-08-24T12:00:00.000Z'),
      },
    ],
    meta: {
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };

  const mockEvolution = {
    productId: '123e4567-e89b-12d3-a456-426614174000',
    minStock: 50,
    truncated: false,
    effectiveFrom: '2026-08-24T12:00:00.000Z',
    effectiveTo: '2026-08-24T12:00:00.000Z',
    points: [
      {
        timestamp: '2026-08-24T12:00:00.000Z',
        balance: 0,
        event: 'BASELINE' as const,
        quantity: 0,
      },
      {
        timestamp: '2026-08-24T12:00:00.000Z',
        balance: 100,
        event: StockMovementType.ENTRADA_COMPRA,
        quantity: 100,
      },
    ],
  };

  const mockStockService = {
    getStatus: jest
      .fn()
      .mockReturnValue({ module: 'stock', status: 'initialized' }),
    findAllStock: jest.fn().mockResolvedValue(mockPaginatedStock),
    findProductMovements: jest.fn().mockResolvedValue(mockPaginatedMovements),
    findStockEvolution: jest.fn().mockResolvedValue(mockEvolution),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StockController],
      providers: [
        {
          provide: StockService,
          useValue: mockStockService,
        },
      ],
    }).compile();

    controller = module.get<StockController>(StockController);
    stockService = module.get<StockService>(StockService);
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

  describe('findProductMovements', () => {
    it('delegates movements query to stockService.findProductMovements', async () => {
      const productId = '123e4567-e89b-12d3-a456-426614174000';
      const query = {
        page: 1,
        limit: 10,
        movementType: StockMovementType.ENTRADA_COMPRA,
      };
      const res = await controller.findProductMovements(productId, query);
      expect(stockService.findProductMovements).toHaveBeenCalledWith(
        productId,
        query,
      );
      expect(res).toEqual(mockPaginatedMovements);
    });
  });

  describe('findStockEvolution', () => {
    it('delegates evolution query to stockService.findStockEvolution', async () => {
      const productId = '123e4567-e89b-12d3-a456-426614174000';
      const query = { limit: 50 };
      const res = await controller.findStockEvolution(productId, query);
      expect(stockService.findStockEvolution).toHaveBeenCalledWith(
        productId,
        query,
      );
      expect(res).toEqual(mockEvolution);
    });
  });
});
