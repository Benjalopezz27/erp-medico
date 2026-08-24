import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
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
import { InsufficientStockException } from './exceptions';

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
  let mockStockQueryBuilder: any;

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
    mockStockQueryBuilder = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () => ({ ...mockStock })),
    };

    mockManager = {
      query: jest.fn(async () => []),
      createQueryBuilder: jest.fn((entityClass: any) => {
        if (entityClass === Stock || entityClass === 'Stock') {
          return mockStockQueryBuilder;
        }
        return mockProductQueryBuilder;
      }),
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
      getOne: jest.fn().mockResolvedValue({
        subsequentStock: '100.00',
        createdAt: new Date('2026-08-20T10:00:00.000Z'),
      }),
    };

    stockRepo = {
      findOneBy: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(() => mockStockQueryBuilder),
    };

    movementRepo = {
      createQueryBuilder: jest.fn(() => mockMovementQueryBuilder),
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
        {
          provide: getRepositoryToken(StockMovement),
          useValue: movementRepo,
        },
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<StockService>(StockService);
  });

  describe('deriveStockStatus Math & Boundary', () => {
    it('returns CRITICAL when stock is 0 or negative', () => {
      expect(deriveStockStatus(0, 50)).toBe(StockStatus.CRITICAL);
      expect(deriveStockStatus(-5, 50)).toBe(StockStatus.CRITICAL);
      expect(deriveStockStatus('0.00', 50)).toBe(StockStatus.CRITICAL);
    });

    it('returns LOW when stock is greater than 0 and less than or equal to minStock', () => {
      expect(deriveStockStatus(0.01, 50)).toBe(StockStatus.LOW);
      expect(deriveStockStatus(50, 50)).toBe(StockStatus.LOW);
      expect(deriveStockStatus('50.00', '50.00')).toBe(StockStatus.LOW);
    });

    it('returns NORMAL when stock is strictly greater than minStock', () => {
      expect(deriveStockStatus(50.01, 50)).toBe(StockStatus.NORMAL);
      expect(deriveStockStatus(100, 50)).toBe(StockStatus.NORMAL);
    });
  });

  describe('recordMovement', () => {
    it('rejects non-positive quantity with BadRequestException', async () => {
      await expect(
        service.recordMovement({
          productId: 'prod-1',
          movementType: StockMovementType.ENTRADA_COMPRA,
          quantityBase: 0,
          reason: 'Test zero',
          userId: 'user-admin',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.recordMovement({
          productId: 'prod-1',
          movementType: StockMovementType.ENTRADA_COMPRA,
          quantityBase: -10,
          reason: 'Test negative',
          userId: 'user-admin',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects quantities with more than 2 decimal places', async () => {
      await expect(
        service.recordMovement({
          productId: 'prod-1',
          movementType: StockMovementType.ENTRADA_COMPRA,
          quantityBase: 10.555,
          reason: 'Test decimals',
          userId: 'user-admin',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects empty reason with BadRequestException', async () => {
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
      mockManager.findOneBy.mockImplementation(
        async (entityClass: any, criteria: any) => {
          if (entityClass === User && criteria?.id === 'unknown-user') {
            return null;
          }
          return mockProduct;
        },
      );

      await expect(
        service.recordMovement({
          productId: 'prod-1',
          movementType: StockMovementType.ENTRADA_COMPRA,
          quantityBase: 10,
          reason: 'Test valid',
          userId: 'unknown-user',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws InternalServerErrorException if external manager does not have an active transaction', async () => {
      const inactiveManager = {
        queryRunner: { isTransactionActive: false },
      } as any;

      await expect(
        service.recordMovement(
          {
            productId: 'prod-1',
            movementType: StockMovementType.ENTRADA_COMPRA,
            quantityBase: 10,
            reason: 'Test active tx',
            userId: 'user-admin',
          },
          inactiveManager,
        ),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('successfully acquires pessimistic lock and processes ENTRADA_COMPRA', async () => {
      mockStockQueryBuilder.getOne.mockResolvedValueOnce({
        id: 'stock-1',
        productId: 'prod-1',
        currentBaseStock: '100.00',
      });

      const res = await service.recordMovement({
        productId: 'prod-1',
        movementType: StockMovementType.ENTRADA_COMPRA,
        quantityBase: 25.5,
        reason: 'Ingreso por compra OC-100',
        documentReference: 'DOC-123',
        userId: 'user-admin',
      });

      expect(mockStockQueryBuilder.setLock).toHaveBeenCalledWith(
        'pessimistic_write',
      );
      expect(res.productId).toBe('prod-1');
      expect(res.previousStock).toBe(100);
      expect(res.subsequentStock).toBe(125.5);
      expect(res.quantityBase).toBe(25.5);
      expect(res.movementType).toBe(StockMovementType.ENTRADA_COMPRA);
      expect(mockManager.save).toHaveBeenCalledWith(
        Stock,
        expect.objectContaining({
          currentBaseStock: '125.50',
        }),
      );
    });

    it('successfully acquires pessimistic lock and processes SALIDA_VENTA when stock is sufficient', async () => {
      mockStockQueryBuilder.getOne.mockResolvedValueOnce({
        id: 'stock-1',
        productId: 'prod-1',
        currentBaseStock: '100.00',
      });

      const res = await service.recordMovement({
        productId: 'prod-1',
        movementType: StockMovementType.SALIDA_VENTA,
        quantityBase: 30,
        reason: 'Venta mostrador',
        userId: 'user-admin',
      });

      expect(res.previousStock).toBe(100);
      expect(res.subsequentStock).toBe(70);
      expect(res.quantityBase).toBe(30);
      expect(mockManager.save).toHaveBeenCalledWith(
        Stock,
        expect.objectContaining({
          currentBaseStock: '70.00',
        }),
      );
    });

    it('allows exact zero balance reduction on SALIDA_VENTA', async () => {
      mockStockQueryBuilder.getOne.mockResolvedValueOnce({
        id: 'stock-1',
        productId: 'prod-1',
        currentBaseStock: '10.00',
      });

      const res = await service.recordMovement({
        productId: 'prod-1',
        movementType: StockMovementType.SALIDA_VENTA,
        quantityBase: 10,
        reason: 'Venta total',
        userId: 'user-admin',
      });

      expect(res.previousStock).toBe(10);
      expect(res.subsequentStock).toBe(0);
    });

    it('throws InsufficientStockException (HTTP 422) when outward movement exceeds available stock', async () => {
      mockStockQueryBuilder.getOne.mockResolvedValueOnce({
        id: 'stock-1',
        productId: 'prod-1',
        currentBaseStock: '5.00',
      });

      try {
        await service.recordMovement({
          productId: 'prod-1',
          movementType: StockMovementType.SALIDA_VENTA,
          quantityBase: 10,
          reason: 'Venta excesiva',
          userId: 'user-admin',
        });
        fail('Should have thrown InsufficientStockException');
      } catch (err: any) {
        expect(err).toBeInstanceOf(InsufficientStockException);
        expect(err.getStatus()).toBe(422);
        expect(err.getResponse()).toEqual({
          statusCode: 422,
          error: 'Unprocessable Entity',
          code: 'INSUFFICIENT_STOCK',
          message: 'Stock insuficiente para completar la operación.',
          details: {
            productId: 'prod-1',
            available: 5,
            requested: 10,
          },
        });
      }

      expect(mockManager.save).not.toHaveBeenCalled();
    });

    it('throws InsufficientStockException on MERMA and AJUSTE_SALIDA when stock is insufficient', async () => {
      mockStockQueryBuilder.getOne.mockResolvedValueOnce({
        id: 'stock-1',
        productId: 'prod-1',
        currentBaseStock: '2.00',
      });

      await expect(
        service.recordMovement({
          productId: 'prod-1',
          movementType: StockMovementType.MERMA,
          quantityBase: 3,
          reason: 'Vencimiento',
          userId: 'user-admin',
        }),
      ).rejects.toThrow(InsufficientStockException);

      mockStockQueryBuilder.getOne.mockResolvedValueOnce({
        id: 'stock-1',
        productId: 'prod-1',
        currentBaseStock: '2.00',
      });

      await expect(
        service.recordMovement({
          productId: 'prod-1',
          movementType: StockMovementType.AJUSTE_SALIDA,
          quantityBase: 5,
          reason: 'Ajuste inventario',
          userId: 'user-admin',
        }),
      ).rejects.toThrow(InsufficientStockException);
    });

    it('cold-path lockStockForUpdate initializes stock with ON CONFLICT DO NOTHING when record is missing', async () => {
      mockStockQueryBuilder.getOne
        .mockResolvedValueOnce(null) // First query in hot path misses
        .mockResolvedValueOnce({ ...mockStock, currentBaseStock: '0.00' }); // Re-query after insert succeeds

      const res = await service.recordMovement({
        productId: 'prod-1',
        movementType: StockMovementType.ENTRADA_COMPRA,
        quantityBase: 50,
        reason: 'Ingreso inicial producto nuevo',
        userId: 'user-admin',
      });

      expect(mockManager.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT ("product_id") DO NOTHING'),
        ['prod-1'],
      );
      expect(res.previousStock).toBe(0);
      expect(res.subsequentStock).toBe(50);
    });
  });

  describe('findAllStock', () => {
    it('executes SELECT projection without financial fields', async () => {
      const res = await service.findAllStock({ page: 1, limit: 10 });
      expect(res.items).toHaveLength(1);
      expect(res.items[0].productId).toBe('prod-1');
      expect(res.items[0].currentBaseStock).toBe(100);
      expect(res.items[0].minStock).toBe(50);
      expect(res.items[0].stockStatus).toBe(StockStatus.NORMAL);
      expect((res.items[0] as any).costNet).toBeUndefined();
      expect((res.items[0] as any).markupPercentage).toBeUndefined();
      expect((res.items[0] as any).suggestedPriceNet).toBeUndefined();
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

    it('initializes stock with 0.00 when not found for a valid product using ON CONFLICT DO NOTHING', async () => {
      mockManager.findOneBy
        .mockResolvedValueOnce(null) // First findOneBy misses
        .mockResolvedValueOnce({ id: 'prod-new' }) // Product exists
        .mockResolvedValueOnce({
          // findOneBy after insert returns created
          id: 'stock-new',
          productId: 'prod-new',
          currentBaseStock: '0.00',
        });

      const stock = await service.getStockByProductId('prod-new');
      expect(stock.currentBaseStock).toBe(0);
      expect(mockManager.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT ("product_id") DO NOTHING'),
        ['prod-new'],
      );
    });
  });
});
