import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { StockMovementType } from '@erp/shared-types';
import { StockService } from './stock.service';
import { Stock } from './entities/stock.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';

describe('StockService', () => {
  let service: StockService;
  let stockRepo: any;
  let movementRepo: any;
  let productRepo: any;
  let userRepo: any;
  let dataSource: any;
  let mockManager: any;

  const mockProduct = {
    id: 'prod-1',
    internalCode: 'P0001',
    name: 'Amoxicilina 500mg',
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
        if (entityClass === Product && criteria.id === 'prod-1') {
          return mockProduct;
        }
        if (entityClass === User && criteria.id === 'user-admin') {
          return mockUser;
        }
        if (entityClass === Stock && criteria.productId === 'prod-1') {
          return { ...mockStock };
        }
        return null;
      }),
      create: jest.fn((entityClass: any, data: any) => ({
        id: 'gen-uuid',
        ...data,
      })),
      save: jest.fn(async (entityClass: any, data: any) => data),
    };

    dataSource = {
      manager: mockManager,
      transaction: jest.fn(async (callback: (mgr: any) => Promise<any>) =>
        callback(mockManager),
      ),
    };

    stockRepo = {
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    movementRepo = {
      create: jest.fn(),
      save: jest.fn(),
    };

    productRepo = {
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

  describe('recordMovement', () => {
    it('records an inward movement (ENTRADA_COMPRA) and increments balance', async () => {
      const result = await service.recordMovement({
        productId: 'prod-1',
        movementType: StockMovementType.ENTRADA_COMPRA,
        quantityBase: 50.25,
        reason: 'Recepción de orden de compra OC-101',
        documentReference: 'FAC-A-0001-1234',
        userId: 'user-admin',
      });

      expect(result.productId).toBe('prod-1');
      expect(result.movementType).toBe(StockMovementType.ENTRADA_COMPRA);
      expect(result.quantityBase).toBe(50.25);
      expect(result.previousStock).toBe(100.0);
      expect(result.subsequentStock).toBe(150.25);
      expect(result.reason).toBe('Recepción de orden de compra OC-101');
      expect(result.documentReference).toBe('FAC-A-0001-1234');
      expect(result.userId).toBe('user-admin');

      // Verify Stock update
      expect(mockManager.save).toHaveBeenCalledWith(
        Stock,
        expect.objectContaining({
          productId: 'prod-1',
          currentBaseStock: '150.25',
        }),
      );

      // Verify StockMovement creation
      expect(mockManager.save).toHaveBeenCalledWith(
        StockMovement,
        expect.objectContaining({
          productId: 'prod-1',
          movementType: StockMovementType.ENTRADA_COMPRA,
          quantityBase: '50.25',
          previousStock: '100.00',
          subsequentStock: '150.25',
        }),
      );
    });

    it('records an outward movement (SALIDA_VENTA) and decrements balance', async () => {
      const result = await service.recordMovement({
        productId: 'prod-1',
        movementType: StockMovementType.SALIDA_VENTA,
        quantityBase: 30.5,
        reason: 'Venta por mostrador',
        userId: 'user-admin',
      });

      expect(result.movementType).toBe(StockMovementType.SALIDA_VENTA);
      expect(result.quantityBase).toBe(30.5);
      expect(result.previousStock).toBe(100.0);
      expect(result.subsequentStock).toBe(69.5);
      expect(result.documentReference).toBeNull();

      expect(mockManager.save).toHaveBeenCalledWith(
        Stock,
        expect.objectContaining({
          currentBaseStock: '69.50',
        }),
      );
    });

    it('records MERMA as an outward movement', async () => {
      const result = await service.recordMovement({
        productId: 'prod-1',
        movementType: StockMovementType.MERMA,
        quantityBase: 5,
        reason: 'Vencimiento de lote',
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
        reason: 'Devolución de cliente por error de despacho',
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
        create: jest.fn((entityClass: any, data: any) => ({
          id: 'custom-uuid',
          ...data,
        })),
        save: jest.fn(async (entityClass: any, data: any) => data),
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
        if (entityClass === Product) return null; // Product doesn't exist
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

  describe('getStockByProductId & ensureStockExists', () => {
    it('returns existing stock formatted with 2 decimals', async () => {
      const stock = await service.getStockByProductId('prod-1');
      expect(stock.productId).toBe('prod-1');
      expect(stock.currentBaseStock).toBe(100.0);
    });

    it('initializes stock with 0.00 when not found for a valid product', async () => {
      mockManager.findOneBy.mockImplementation(
        async (entityClass: any, criteria: any) => {
          if (entityClass === Stock && criteria.productId === 'prod-new')
            return null;
          if (entityClass === Product && criteria.id === 'prod-new')
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
