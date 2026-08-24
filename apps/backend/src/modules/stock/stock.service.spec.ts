import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  ProductStatus,
  StockMovementType,
  StockStatus,
} from '@erp/shared-types';
import { StockService } from './stock.service';
import { Stock } from './entities/stock.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { deriveStockStatus } from './utils/stock-math.utils';

describe('StockService', () => {
  let service: StockService;
  let stockRepo: any;
  let movementRepo: any;
  let productRepo: any;
  let userRepo: any;
  let dataSource: any;
  let mockManager: any;
  let mockProductQueryBuilder: any;
  let mockMovementQueryBuilder: any;

  const mockProduct = {
    id: 'prod-1',
    internalCode: 'P0001',
    name: 'Amoxicilina 500mg',
    status: ProductStatus.ACTIVE,
    minStock: '50.00',
    categoryId: 'cat-1',
    baseUnitId: 'unit-1',
    category: { id: 'cat-1', name: 'Antibióticos' },
    baseUnit: { id: 'unit-1', name: 'Caja', symbol: 'cj' },
    stock: {
      id: 'stock-1',
      productId: 'prod-1',
      currentBaseStock: '100.00',
    },
  };

  const mockUser = {
    id: 'user-admin',
    name: 'Admin User',
    email: 'admin@erp.com',
  };

  const mockStock = {
    id: 'stock-1',
    productId: 'prod-1',
    currentBaseStock: '100.00',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockManager = {
      findOneBy: jest.fn(async (entityClass: any, criteria: any) => {
        if (entityClass === Product && criteria?.id === 'prod-1') {
          return mockProduct;
        }
        if (entityClass === User && criteria?.id === 'user-admin') {
          return mockUser;
        }
        if (entityClass === Stock && criteria?.productId === 'prod-1') {
          return { ...mockStock };
        }
        return null;
      }),
      create: jest.fn((_entityClass: any, data: any) => ({
        id: 'gen-uuid',
        ...data,
      })),
      save: jest.fn(async (_entityClass: any, data: any) => data),
    };

    dataSource = {
      manager: mockManager,
      transaction: jest.fn(async (callback: (mgr: any) => Promise<any>) =>
        callback(mockManager),
      ),
    };

    mockProductQueryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([mockProduct]),
      getManyAndCount: jest.fn().mockResolvedValue([[mockProduct], 1]),
      getOne: jest.fn().mockResolvedValue(mockProduct),
    };

    mockMovementQueryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 'mov-1',
          productId: 'prod-1',
          movementType: StockMovementType.ENTRADA_COMPRA,
          quantityBase: '50.00',
          previousStock: '50.00',
          subsequentStock: '100.00',
          reason: 'Compra inicial',
          documentReference: 'REM-100',
          createdAt: new Date('2026-08-20T10:00:00.000Z'),
          user: { id: 'user-admin', name: 'Admin User' },
        },
      ]),
      getManyAndCount: jest.fn().mockResolvedValue([
        [
          {
            id: 'mov-1',
            productId: 'prod-1',
            movementType: StockMovementType.ENTRADA_COMPRA,
            quantityBase: '50.00',
            previousStock: '50.00',
            subsequentStock: '100.00',
            reason: 'Compra inicial',
            documentReference: 'REM-100',
            createdAt: new Date('2026-08-20T10:00:00.000Z'),
            user: { id: 'user-admin', name: 'Admin User' },
          },
        ],
        1,
      ]),
      getOne: jest.fn().mockResolvedValue(null),
    };

    stockRepo = {
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    movementRepo = {
      createQueryBuilder: jest.fn(() => mockMovementQueryBuilder),
      create: jest.fn(),
      save: jest.fn(),
    };

    productRepo = {
      createQueryBuilder: jest.fn(() => mockProductQueryBuilder),
      findOneBy: jest.fn(),
    };

    userRepo = {
      findOneBy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockService,
        { provide: getRepositoryToken(Stock), useValue: stockRepo },
        { provide: getRepositoryToken(StockMovement), useValue: movementRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<StockService>(StockService);
  });

  describe('getStatus', () => {
    it('returns initialized module status', () => {
      expect(service.getStatus()).toEqual({
        module: 'stock',
        status: 'initialized',
      });
    });
  });

  describe('deriveStockStatus helper', () => {
    it('returns CRITICAL when balance is 0 or negative', () => {
      expect(deriveStockStatus(0, 50)).toBe(StockStatus.CRITICAL);
      expect(deriveStockStatus(-5, 50)).toBe(StockStatus.CRITICAL);
      expect(deriveStockStatus('0.00', '50.00')).toBe(StockStatus.CRITICAL);
    });

    it('returns LOW when balance is > 0 and <= minStock', () => {
      expect(deriveStockStatus(50, 50)).toBe(StockStatus.LOW);
      expect(deriveStockStatus(25, 50)).toBe(StockStatus.LOW);
      expect(deriveStockStatus('0.01', '50.00')).toBe(StockStatus.LOW);
    });

    it('returns NORMAL when balance is > minStock', () => {
      expect(deriveStockStatus(50.01, 50)).toBe(StockStatus.NORMAL);
      expect(deriveStockStatus(100, 50)).toBe(StockStatus.NORMAL);
      expect(deriveStockStatus('150.00', '50.00')).toBe(StockStatus.NORMAL);
    });
  });

  describe('recordMovement', () => {
    it('records an inward movement (ENTRADA_COMPRA) and increments balance', async () => {
      const result = await service.recordMovement({
        productId: 'prod-1',
        movementType: StockMovementType.ENTRADA_COMPRA,
        quantityBase: 25.5,
        reason: 'Compra proveedor',
        documentReference: 'FAC-0001',
        userId: 'user-admin',
      });

      expect(result.productId).toBe('prod-1');
      expect(result.movementType).toBe(StockMovementType.ENTRADA_COMPRA);
      expect(result.quantityBase).toBe(25.5);
      expect(result.previousStock).toBe(100.0);
      expect(result.subsequentStock).toBe(125.5);
      expect(mockManager.save).toHaveBeenCalled();
    });

    it('records an outward movement (SALIDA_VENTA) and decrements balance', async () => {
      const result = await service.recordMovement({
        productId: 'prod-1',
        movementType: StockMovementType.SALIDA_VENTA,
        quantityBase: 20,
        reason: 'Venta mostrador',
        userId: 'user-admin',
      });

      expect(result.previousStock).toBe(100.0);
      expect(result.subsequentStock).toBe(80.0);
    });

    it('records MERMA as an outward movement', async () => {
      const result = await service.recordMovement({
        productId: 'prod-1',
        movementType: StockMovementType.MERMA,
        quantityBase: 5,
        reason: 'Frasco roto',
        userId: 'user-admin',
      });

      expect(result.previousStock).toBe(100.0);
      expect(result.subsequentStock).toBe(95.0);
    });

    it('records DEVOLUCION_CLIENTE as an inward movement', async () => {
      const result = await service.recordMovement({
        productId: 'prod-1',
        movementType: StockMovementType.DEVOLUCION_CLIENTE,
        quantityBase: 10,
        reason: 'Devolución mercadería en buen estado',
        userId: 'user-admin',
      });

      expect(result.previousStock).toBe(100.0);
      expect(result.subsequentStock).toBe(110.0);
    });

    it('uses caller-provided EntityManager without triggering dataSource.transaction', async () => {
      const customManager = {
        findOneBy: jest.fn(async (entityClass: any) => {
          if (entityClass === Product) return mockProduct;
          if (entityClass === User) return mockUser;
          if (entityClass === Stock) return { ...mockStock };
          return null;
        }),
        create: jest.fn((_entityClass: any, data: any) => ({
          id: 'custom-uuid',
          ...data,
        })),
        save: jest.fn(async (_entityClass: any, data: any) => data),
      };

      const result = await service.recordMovement(
        {
          productId: 'prod-1',
          movementType: StockMovementType.AJUSTE_ENTRADA,
          quantityBase: 15,
          reason: 'Ajuste de inventario físico',
          userId: 'user-admin',
        },
        customManager as any,
      );

      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(customManager.save).toHaveBeenCalled();
      expect(result.subsequentStock).toBe(115.0);
    });

    it('rejects non-positive quantity (<= 0)', async () => {
      await expect(
        service.recordMovement({
          productId: 'prod-1',
          movementType: StockMovementType.ENTRADA_COMPRA,
          quantityBase: 0,
          reason: 'Inválido',
          userId: 'user-admin',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.recordMovement({
          productId: 'prod-1',
          movementType: StockMovementType.ENTRADA_COMPRA,
          quantityBase: -10,
          reason: 'Inválido',
          userId: 'user-admin',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects quantity with more than 2 decimal places', async () => {
      await expect(
        service.recordMovement({
          productId: 'prod-1',
          movementType: StockMovementType.ENTRADA_COMPRA,
          quantityBase: 10.123,
          reason: 'Exceso de escala',
          userId: 'user-admin',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects empty or whitespace-only reason', async () => {
      await expect(
        service.recordMovement({
          productId: 'prod-1',
          movementType: StockMovementType.ENTRADA_COMPRA,
          quantityBase: 10,
          reason: '   ',
          userId: 'user-admin',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockManager.findOneBy.mockImplementation(async (entityClass: any) => {
        if (entityClass === User) return null;
        if (entityClass === Product) return mockProduct;
        if (entityClass === Stock) return mockStock;
        return null;
      });

      await expect(
        service.recordMovement({
          productId: 'prod-1',
          movementType: StockMovementType.ENTRADA_COMPRA,
          quantityBase: 10,
          reason: 'Usuario inexistente',
          userId: 'non-existent-user',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when product does not exist during stock initialization', async () => {
      mockManager.findOneBy.mockImplementation(async (entityClass: any) => {
        if (entityClass === User) return mockUser;
        if (entityClass === Stock) return null;
        if (entityClass === Product) return null;
        return null;
      });

      await expect(
        service.recordMovement({
          productId: 'non-existent-prod',
          movementType: StockMovementType.ENTRADA_COMPRA,
          quantityBase: 10,
          reason: 'Producto inexistente',
          userId: 'user-admin',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllStock', () => {
    it('returns paginated stock overview with derived health status', async () => {
      const res = await service.findAllStock({ page: 1, limit: 10 });
      expect(res.items).toHaveLength(1);
      expect(res.items[0].productId).toBe('prod-1');
      expect(res.items[0].internalCode).toBe('P0001');
      expect(res.items[0].currentBaseStock).toBe(100);
      expect(res.items[0].minStock).toBe(50);
      expect(res.items[0].stockStatus).toBe(StockStatus.NORMAL);
      expect(res.meta.total).toBe(1);
      expect(res.meta.page).toBe(1);
      expect(res.meta.limit).toBe(10);
      expect(res.meta.totalPages).toBe(1);

      // Verify explicit select was called
      expect(mockProductQueryBuilder.select).toHaveBeenCalled();
    });

    it('applies search, category, and status filters', async () => {
      await service.findAllStock({
        search: 'Amox%500',
        categoryId: 'cat-1',
        stockStatus: StockStatus.LOW,
      });

      expect(mockProductQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(UPPER(product.internalCode) LIKE UPPER(:searchLike) OR product.name ILIKE :searchLike)',
        expect.objectContaining({ searchLike: '%Amox\\%500%' }),
      );
      expect(mockProductQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.categoryId = :categoryId',
        { categoryId: 'cat-1' },
      );
      expect(mockProductQueryBuilder.andWhere).toHaveBeenCalledWith(
        'COALESCE(stock.current_base_stock, 0) > 0 AND COALESCE(stock.current_base_stock, 0) <= product.min_stock',
      );
    });

    it('defaults currentBaseStock to 0 when stock relation is null', async () => {
      mockProductQueryBuilder.getManyAndCount.mockResolvedValueOnce([
        [{ ...mockProduct, stock: null }],
        1,
      ]);

      const res = await service.findAllStock({ page: 1, limit: 10 });
      expect(res.items[0].currentBaseStock).toBe(0);
      expect(res.items[0].stockStatus).toBe(StockStatus.CRITICAL);
    });
  });

  describe('findProductMovements', () => {
    it('throws NotFoundException when product does not exist', async () => {
      mockProductQueryBuilder.getOne.mockResolvedValueOnce(null);
      await expect(
        service.findProductMovements('non-existent', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when from > to', async () => {
      await expect(
        service.findProductMovements('prod-1', {
          from: '2026-08-31T00:00:00.000Z',
          to: '2026-08-01T00:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns paginated movements with product header summary', async () => {
      const res = await service.findProductMovements('prod-1', {
        page: 1,
        limit: 10,
        movementType: StockMovementType.ENTRADA_COMPRA,
        from: '2026-08-01T00:00:00.000Z',
        to: '2026-08-31T23:59:59.999Z',
      });

      expect(res.product.productId).toBe('prod-1');
      expect(res.product.currentBaseStock).toBe(100);
      expect(res.product.stockStatus).toBe(StockStatus.NORMAL);
      expect(res.items).toHaveLength(1);
      expect(res.items[0].quantityBase).toBe(50);
      expect(res.items[0].user.name).toBe('Admin User');
      expect(res.meta.total).toBe(1);
    });
  });

  describe('findStockEvolution', () => {
    it('throws NotFoundException when product does not exist', async () => {
      mockProductQueryBuilder.getOne.mockResolvedValueOnce(null);
      await expect(
        service.findStockEvolution('non-existent', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when from > to', async () => {
      await expect(
        service.findStockEvolution('prod-1', {
          from: '2026-08-31T00:00:00.000Z',
          to: '2026-08-01T00:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('processes descending movements, prepends baseline, and reverses to chronological ascending', async () => {
      mockMovementQueryBuilder.getMany.mockResolvedValueOnce([
        {
          id: 'mov-2',
          movementType: StockMovementType.SALIDA_VENTA,
          quantityBase: '20.00',
          previousStock: '100.00',
          subsequentStock: '80.00',
          createdAt: new Date('2026-08-22T15:00:00.000Z'),
        },
        {
          id: 'mov-1',
          movementType: StockMovementType.ENTRADA_COMPRA,
          quantityBase: '50.00',
          previousStock: '50.00',
          subsequentStock: '100.00',
          createdAt: new Date('2026-08-20T10:00:00.000Z'),
        },
      ]);

      const res = await service.findStockEvolution('prod-1', { limit: 10 });
      expect(res.productId).toBe('prod-1');
      expect(res.minStock).toBe(50);
      expect(res.truncated).toBe(false);
      expect(res.points).toHaveLength(3);

      // Baseline point
      expect(res.points[0].event).toBe('BASELINE');
      expect(res.points[0].balance).toBe(50);
      expect(res.points[0].timestamp).toBe('2026-08-20T10:00:00.000Z');

      // First movement (chronologically earlier)
      expect(res.points[1].event).toBe(StockMovementType.ENTRADA_COMPRA);
      expect(res.points[1].balance).toBe(100);

      // Second movement (chronologically later)
      expect(res.points[2].event).toBe(StockMovementType.SALIDA_VENTA);
      expect(res.points[2].balance).toBe(80);
    });

    it('handles 0 movements in window and resolves point-in-time balance from prior history', async () => {
      mockMovementQueryBuilder.getMany.mockResolvedValueOnce([]);
      mockMovementQueryBuilder.getOne.mockResolvedValueOnce({
        subsequentStock: '75.00',
        createdAt: new Date('2026-07-30T10:00:00.000Z'),
      });

      const res = await service.findStockEvolution('prod-1', {
        to: '2026-08-05T00:00:00.000Z',
      });

      expect(res.points).toHaveLength(0);
      expect(res.truncated).toBe(false);
    });
  });

  describe('getStockByProductId & ensureStockExists', () => {
    it('returns existing stock formatted with 2 decimals', async () => {
      const stock = await service.getStockByProductId('prod-1');
      expect(stock.productId).toBe('prod-1');
      expect(stock.currentBaseStock).toBe(100.0);
    });

    it('initializes stock with 0.00 when not found for a valid product', async () => {
      mockManager.findOneBy.mockImplementation(
        async (entityClass: any, criteria: any) => {
          if (entityClass === Stock && criteria?.productId === 'prod-new')
            return null;
          if (entityClass === Product && criteria?.id === 'prod-new')
            return { id: 'prod-new' };
          return null;
        },
      );

      const stock = await service.getStockByProductId('prod-new');
      expect(stock.currentBaseStock).toBe(0);
      expect(mockManager.save).toHaveBeenCalledWith(
        Stock,
        expect.objectContaining({
          productId: 'prod-new',
          currentBaseStock: '0.00',
        }),
      );
    });
  });
});
