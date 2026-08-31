import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DataSource, Repository, EntityManager } from 'typeorm';
import {
  ProductStatus,
  StockMovementType,
  QuarantineStatus,
  QuarantineResolution,
  AuditAction,
} from '@erp/shared-types';
import { QuarantineService } from './quarantine.service';
import { QuarantineStock } from './entities/quarantine-stock.entity';
import { Product } from '../products/entities/product.entity';
import { StockService } from '../stock/stock.service';
import { AuditService } from '../audit/audit.service';
import { CreateQuarantineDto, ResolveQuarantineDto } from './dto';

describe('QuarantineService Unit Tests', () => {
  let service: QuarantineService;
  let productRepo: jest.Mocked<Repository<Product>>;
  let stockService: jest.Mocked<StockService>;
  let auditService: jest.Mocked<AuditService>;
  let mockEntityManager: Partial<EntityManager>;
  let dataSource: jest.Mocked<DataSource>;

  const mockProduct: Partial<Product> = {
    id: 'prod-uuid-1',
    internalCode: 'P0001',
    name: 'Amoxicilina 500mg',
    status: ProductStatus.ACTIVE,
    baseUnit: { id: 'u-1', name: 'Comprimido', symbol: 'cmp' } as any,
  };

  const mockQuarantineEntity: Partial<QuarantineStock> = {
    id: 'quar-uuid-1',
    productId: 'prod-uuid-1',
    product: mockProduct as Product,
    quantityBase: '10.00',
    reason: 'Cajas rotas',
    status: QuarantineStatus.EN_CUARENTENA,
    entryActorId: 'user-admin-1',
    entryActor: {
      id: 'user-admin-1',
      name: 'Admin',
      email: 'admin@erp.com',
    } as any,
    entryMovementId: 'mov-out-1',
    resolvedByActorId: null,
    resolvedByActor: null,
    resolutionNotes: null,
    resolutionMovementId: null,
    resolvedAt: null,
    createdAt: new Date('2026-08-24T10:00:00.000Z'),
    updatedAt: new Date('2026-08-24T10:00:00.000Z'),
  };

  beforeEach(async () => {
    mockEntityManager = {
      create: jest.fn().mockImplementation((entityClass, plain) => plain),
      save: jest.fn().mockImplementation(async (entityClass, entity) => ({
        id: entity.id || 'quar-uuid-1',
        ...entity,
      })),
      getRepository: jest.fn(),
    };

    const mockQueryBuilder = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(mockQuarantineEntity),
      getManyAndCount: jest.fn().mockResolvedValue([[mockQuarantineEntity], 1]),
    };

    const mockRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    dataSource = {
      transaction: jest
        .fn()
        .mockImplementation(async (cb) => cb(mockEntityManager)),
    } as any;

    stockService = {
      recordMovement: jest.fn(),
    } as any;

    auditService = {
      record: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuarantineService,
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: getRepositoryToken(QuarantineStock),
          useValue: { ...mockRepo },
        },
        {
          provide: getRepositoryToken(Product),
          useValue: { ...mockRepo },
        },
        {
          provide: StockService,
          useValue: stockService,
        },
        {
          provide: AuditService,
          useValue: auditService,
        },
      ],
    }).compile();

    service = module.get<QuarantineService>(QuarantineService);
    productRepo = module.get(getRepositoryToken(Product));
  });

  describe('createEntry', () => {
    const dto: CreateQuarantineDto = {
      productId: 'prod-uuid-1',
      quantityBase: 10,
      reason: 'Cajas rotas',
    };

    it('successfully creates quarantine entry and records AJUSTE_SALIDA ledger movement', async () => {
      productRepo.findOne.mockResolvedValueOnce(mockProduct as Product);
      stockService.recordMovement.mockResolvedValueOnce({
        id: 'mov-out-1',
        productId: 'prod-uuid-1',
        movementType: StockMovementType.AJUSTE_SALIDA,
        quantityBase: 10,
        previousStock: 50,
        subsequentStock: 40,
        reason: 'Ingreso a cuarentena: Cajas rotas',
        documentReference: null,
        userId: 'user-admin-1',
        createdAt: new Date(),
      });

      const result = await service.createEntry(dto, 'user-admin-1');

      expect(productRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'prod-uuid-1' },
        relations: ['baseUnit'],
      });
      expect(stockService.recordMovement).toHaveBeenCalledWith(
        {
          productId: 'prod-uuid-1',
          movementType: StockMovementType.AJUSTE_SALIDA,
          quantityBase: 10,
          reason: 'Ingreso a cuarentena: Cajas rotas',
          userId: 'user-admin-1',
        },
        mockEntityManager,
      );
      expect(auditService.record).toHaveBeenCalledWith(
        mockEntityManager,
        expect.objectContaining({
          actorId: 'user-admin-1',
          action: AuditAction.CREATE,
          entityName: 'QuarantineStock',
        }),
      );
      expect(result.id).toBe('quar-uuid-1');
      expect(result.status).toBe(QuarantineStatus.EN_CUARENTENA);
      expect(result.quantityBase).toBe(10);
    });

    it('throws NotFoundException when product does not exist', async () => {
      productRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.createEntry(dto, 'user-admin-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(stockService.recordMovement).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when product is inactive', async () => {
      productRepo.findOne.mockResolvedValueOnce({
        ...mockProduct,
        status: ProductStatus.INACTIVE,
      } as Product);

      await expect(service.createEntry(dto, 'user-admin-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(stockService.recordMovement).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns paginated list of quarantine records with filters applied', async () => {
      const result = await service.findAll({
        page: 1,
        limit: 10,
        status: QuarantineStatus.EN_CUARENTENA,
        search: 'Amoxi',
      });

      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.items[0].product.internalCode).toBe('P0001');
    });
  });

  describe('resolve', () => {
    const resolveDtoReentry: ResolveQuarantineDto = {
      resolution: QuarantineResolution.REINGRESO,
      resolutionNotes: 'Mercadería revisada en buen estado',
    };

    const resolveDtoMerma: ResolveQuarantineDto = {
      resolution: QuarantineResolution.MERMA,
      resolutionNotes: 'Mercadería destruida por vencimiento',
    };

    it('resolves as REINGRESO by recording AJUSTE_ENTRADA and updating status', async () => {
      const mockQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValueOnce({ ...mockQuarantineEntity }),
      };
      (mockEntityManager.getRepository as jest.Mock) = jest
        .fn()
        .mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(mockQb),
        });

      stockService.recordMovement.mockResolvedValueOnce({
        id: 'mov-in-1',
        productId: 'prod-uuid-1',
        movementType: StockMovementType.AJUSTE_ENTRADA,
        quantityBase: 10,
        previousStock: 40,
        subsequentStock: 50,
        reason:
          'Reingreso desde cuarentena: Mercadería revisada en buen estado',
        documentReference: null,
        userId: 'user-admin-1',
        createdAt: new Date(),
      });

      const result = await service.resolve(
        'quar-uuid-1',
        resolveDtoReentry,
        'user-admin-1',
      );

      expect(mockQb.setLock).toHaveBeenCalledWith('pessimistic_write');
      expect(stockService.recordMovement).toHaveBeenCalledWith(
        {
          productId: 'prod-uuid-1',
          movementType: StockMovementType.AJUSTE_ENTRADA,
          quantityBase: 10,
          reason:
            'Reingreso desde cuarentena: Mercadería revisada en buen estado',
          userId: 'user-admin-1',
        },
        mockEntityManager,
      );
      expect(auditService.record).toHaveBeenCalledWith(
        mockEntityManager,
        expect.objectContaining({
          actorId: 'user-admin-1',
          action: AuditAction.UPDATE,
          entityName: 'QuarantineStock',
        }),
      );
      expect(result).toBeDefined();
    });

    it('resolves as MERMA without creating new stock movements', async () => {
      const mockQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValueOnce({ ...mockQuarantineEntity }),
      };
      (mockEntityManager.getRepository as jest.Mock) = jest
        .fn()
        .mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(mockQb),
        });

      await service.resolve('quar-uuid-1', resolveDtoMerma, 'user-admin-1');

      expect(stockService.recordMovement).not.toHaveBeenCalled();
      expect(auditService.record).toHaveBeenCalledWith(
        mockEntityManager,
        expect.objectContaining({
          actorId: 'user-admin-1',
          action: AuditAction.UPDATE,
        }),
      );
    });

    it('throws ConflictException (409) if record is already resolved', async () => {
      const mockQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValueOnce({
          ...mockQuarantineEntity,
          status: QuarantineStatus.MERMA_CONFIRMADA,
        }),
      };
      (mockEntityManager.getRepository as jest.Mock) = jest
        .fn()
        .mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(mockQb),
        });

      await expect(
        service.resolve('quar-uuid-1', resolveDtoReentry, 'user-admin-1'),
      ).rejects.toThrow(ConflictException);

      expect(stockService.recordMovement).not.toHaveBeenCalled();
    });

    it('throws NotFoundException (404) if record does not exist', async () => {
      const mockQb = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValueOnce(null),
      };
      (mockEntityManager.getRepository as jest.Mock) = jest
        .fn()
        .mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(mockQb),
        });

      await expect(
        service.resolve('quar-uuid-999', resolveDtoReentry, 'user-admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('recordQuarantineFromReturn', () => {
    it('creates a QuarantineStock record with DEVOLUCION_CLIENTE origin and null entryMovementId without touching stock', async () => {
      const qRepo = {
        create: jest.fn((val) => ({ id: 'quar-ret-1', ...val })),
        save: jest.fn(async (val) => val),
      };
      const txManager = {
        queryRunner: { isTransactionActive: true },
        getRepository: jest.fn(() => qRepo),
      };

      const result = await service.recordQuarantineFromReturn(
        txManager as any,
        {
          productId: 'prod-uuid-1',
          quantityBase: '3.00',
          reason: 'Producto roto por cliente',
          actorId: 'user-admin-1',
          saleReturnItemId: 'sri-uuid-1',
        },
      );

      expect(result).toMatchObject({
        productId: 'prod-uuid-1',
        quantityBase: '3.00',
        originType: 'DEVOLUCION_CLIENTE',
        saleReturnItemId: 'sri-uuid-1',
        entryMovementId: null,
      });
      expect(stockService.recordMovement).not.toHaveBeenCalled();
      expect(auditService.record).toHaveBeenCalledWith(
        txManager,
        expect.objectContaining({
          action: AuditAction.CREATE,
          entityName: 'QuarantineStock',
        }),
      );
    });

    it('rejects if transaction is not active', async () => {
      const txManager = {
        queryRunner: { isTransactionActive: false },
      };

      await expect(
        service.recordQuarantineFromReturn(txManager as any, {
          productId: 'prod-uuid-1',
          quantityBase: '3.00',
          reason: 'Producto roto',
          actorId: 'user-admin-1',
          saleReturnItemId: 'sri-uuid-1',
        }),
      ).rejects.toThrow('requires an active transaction');
    });
  });
});
