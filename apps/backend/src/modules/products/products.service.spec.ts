import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserRole, ProductStatus, StockMovementType } from '@erp/shared-types';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { ProductUnitConversion } from './entities/product-unit-conversion.entity';
import { Category } from '../categories/entities/category.entity';
import { Unit } from '../units/entities/unit.entity';
import { UnitConversionEngine } from './services/unit-conversion-engine.service';
import { StockAdjustmentsService } from '../stock/stock-adjustments.service';
import { PricesService } from '../prices/prices.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepo: any;
  let conversionRepo: any;
  let categoryRepo: any;
  let unitRepo: any;
  let dataSource: any;
  let queryRunner: any;
  let stockAdjustmentsService: any;

  const mockActor = {
    id: 'user-admin',
    email: 'admin@erp.com',
    name: 'Admin User',
    role: UserRole.ADMINISTRADOR,
    isActive: true,
  };

  const mockCategory = {
    id: 'cat-1',
    name: 'Medicamentos',
  };

  const mockBaseUnit = {
    id: 'unit-base',
    name: 'Unidad',
    symbol: 'u',
  };

  const mockPresentationUnit = {
    id: 'unit-box',
    name: 'Caja',
    symbol: 'cj',
  };

  const mockProduct = {
    id: 'prod-1',
    internalCode: 'MED-001',
    name: 'Ibuprofeno 400mg',
    description: 'Analgésico',
    categoryId: 'cat-1',
    baseUnitId: 'unit-base',
    minStock: '100.00',
    costNet: '1500.5000',
    markupPercentage: '35.0000',
    suggestedPriceNet: '2025.68',
    activePriceNet: '2025.68',
    status: ProductStatus.ACTIVE,
    category: mockCategory,
    baseUnit: mockBaseUnit,
    conversions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        create: jest.fn((entityClass, data) => ({
          ...data,
          id: 'prod-created',
        })),
        save: jest.fn(async (entityClass, data) => data),
      },
    };

    dataSource = {
      createQueryRunner: jest.fn(() => queryRunner),
      transaction: jest.fn(async (callback) =>
        callback({
          query: jest.fn().mockResolvedValue(undefined),
          getRepository: (entity: unknown) => {
            if (entity === Product) return productRepo;
            if (entity === ProductUnitConversion) return conversionRepo;
            if (entity === Category) return categoryRepo;
            if (entity === Unit) return unitRepo;
            throw new Error('Unexpected repository');
          },
        }),
      ),
    };

    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(mockProduct),
      getOneOrFail: jest.fn().mockResolvedValue(mockProduct),
      getMany: jest.fn().mockResolvedValue([mockProduct]),
      getManyAndCount: jest.fn().mockResolvedValue([[mockProduct], 1]),
    };

    productRepo = {
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
      findOneBy: jest.fn().mockResolvedValue(mockProduct),
      exist: jest.fn().mockResolvedValue(true),
      save: jest.fn().mockImplementation((p) => Promise.resolve(p)),
      create: jest.fn((p) => p),
    };

    conversionRepo = {
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
      findOneBy: jest.fn().mockResolvedValue(null),
      save: jest
        .fn()
        .mockImplementation((c) => Promise.resolve({ ...c, id: 'conv-1' })),
      create: jest.fn((c) => c),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    categoryRepo = {
      findOneBy: jest.fn().mockResolvedValue(mockCategory),
    };

    unitRepo = {
      findOneBy: jest.fn().mockImplementation(({ id }) => {
        if (id === 'unit-base') return Promise.resolve(mockBaseUnit);
        if (id === 'unit-box') return Promise.resolve(mockPresentationUnit);
        return Promise.resolve(null);
      }),
    };

    stockAdjustmentsService = {
      createAdjustment: jest.fn().mockResolvedValue({
        id: 'movement-1',
        previousStock: 0,
        subsequentStock: 25,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        UnitConversionEngine,
        {
          provide: StockAdjustmentsService,
          useValue: stockAdjustmentsService,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: productRepo,
        },
        {
          provide: getRepositoryToken(ProductUnitConversion),
          useValue: conversionRepo,
        },
        {
          provide: getRepositoryToken(Category),
          useValue: categoryRepo,
        },
        {
          provide: getRepositoryToken(Unit),
          useValue: unitRepo,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: PricesService,
          useValue: {
            hydrateLegacyMarkup: jest.fn(async (product) => product),
            applyLegacyProductMarkup: jest.fn().mockResolvedValue(true),
            calculateSuggestedPrice: jest.fn((cost, percentage) =>
              (Number(cost) * (1 + Number(percentage) / 100)).toFixed(4),
            ),
          },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('findAll', () => {
    it('returns paginated products for administrator', async () => {
      const result = await service.findAll(
        { limit: 10, offset: 0 },
        UserRole.ADMINISTRADOR,
      );
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect((result.items[0] as any).costNet).toBe(1500.5);
    });

    it('returns redacted products for seller', async () => {
      const result = await service.findAll(
        { limit: 10, offset: 0 },
        UserRole.VENDEDOR,
      );
      expect(result.items).toHaveLength(1);
      expect((result.items[0] as any).costNet).toBeUndefined();
      expect((result.items[0] as any).markupPercentage).toBeUndefined();
    });

    it('maps the optional page helper to an offset when offset is omitted', async () => {
      await service.findAll({ limit: 10, page: 2 }, UserRole.ADMINISTRADOR);

      expect(productRepo.createQueryBuilder().skip).toHaveBeenCalledWith(10);
    });
  });

  describe('findById', () => {
    it('returns product details', async () => {
      const result = await service.findById('prod-1', UserRole.ADMINISTRADOR);
      expect(result.id).toBe('prod-1');
      expect(result.name).toBe('Ibuprofeno 400mg');
    });

    it('throws NotFoundException when product does not exist', async () => {
      productRepo.createQueryBuilder().getOne.mockResolvedValueOnce(null);
      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const validDto = {
      name: 'Paracetamol 500mg',
      description: 'Analgésico',
      categoryId: 'cat-1',
      baseUnitId: 'unit-base',
      minStock: 50,
      costNet: 800,
      markupPercentage: 30,
      activePriceNet: 1040,
      conversions: [
        {
          presentationUnitId: 'unit-box',
          conversionFactor: 100,
        },
      ],
    };

    it('creates product and nested conversions in a single transaction', async () => {
      const result = await service.create(validDto, mockActor);

      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.manager.create).toHaveBeenCalledWith(
        Product,
        expect.not.objectContaining({ internalCode: expect.anything() }),
      );
      expect(result).toBeDefined();
      expect(stockAdjustmentsService.createAdjustment).not.toHaveBeenCalled();
    });

    it('records optional initial stock inside the product transaction', async () => {
      await service.create({ ...validDto, initialStock: 25 }, mockActor);

      expect(stockAdjustmentsService.createAdjustment).toHaveBeenCalledWith(
        {
          productId: 'prod-created',
          movementType: StockMovementType.AJUSTE_ENTRADA,
          quantityBase: 25,
          reason: 'Stock inicial al crear el producto',
          documentReference: null,
        },
        mockActor,
        queryRunner.manager,
      );
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('rolls back product creation when the initial stock movement fails', async () => {
      stockAdjustmentsService.createAdjustment.mockRejectedValueOnce(
        new Error('Stock movement failed'),
      );

      await expect(
        service.create({ ...validDto, initialStock: 25 }, mockActor),
      ).rejects.toThrow('Stock movement failed');
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('returns a clear conflict when the automatic code range is exhausted', async () => {
      queryRunner.manager.save.mockRejectedValueOnce({ code: '2200H' });

      await expect(service.create(validDto, mockActor)).rejects.toThrow(
        new ConflictException(
          'Se alcanzó el límite de códigos automáticos disponibles (P9999).',
        ),
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('throws NotFoundException on invalid categoryId', async () => {
      categoryRepo.findOneBy.mockResolvedValueOnce(null);
      await expect(service.create(validDto, mockActor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException on invalid baseUnitId', async () => {
      unitRepo.findOneBy.mockResolvedValueOnce(null);
      await expect(service.create(validDto, mockActor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when presentation unit equals base unit', async () => {
      const invalidDto = {
        ...validDto,
        conversions: [
          {
            presentationUnitId: 'unit-base', // same as baseUnitId
            conversionFactor: 10,
          },
        ],
      };
      await expect(service.create(invalidDto, mockActor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException on duplicate conversion units in payload', async () => {
      const invalidDto = {
        ...validDto,
        conversions: [
          {
            presentationUnitId: 'unit-box',
            conversionFactor: 10,
          },
          {
            presentationUnitId: 'unit-box',
            conversionFactor: 20,
          },
        ],
      };
      await expect(service.create(invalidDto, mockActor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rolls back transaction if error occurs during save', async () => {
      productRepo.createQueryBuilder().getOne.mockResolvedValueOnce(null);
      queryRunner.manager.save.mockRejectedValueOnce(new Error('DB Error'));

      await expect(service.create(validDto, mockActor)).rejects.toThrow(
        'DB Error',
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates product and recalculates suggestedPriceNet on markup change', async () => {
      const result = await service.update('prod-1', {
        markupPercentage: 50,
      });

      expect(productRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('throws BadRequestException on no-op update without changes', async () => {
      await expect(
        service.update('prod-1', {
          name: 'Ibuprofeno 400mg',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when modifying baseUnitId with existing conversions', async () => {
      productRepo
        .createQueryBuilder()
        .getOne.mockResolvedValueOnce(mockProduct)
        .mockResolvedValueOnce({
          ...mockProduct,
          conversions: [{ id: 'c-1', presentationUnitId: 'unit-box' }],
        });

      await expect(
        service.update('prod-1', {
          baseUnitId: 'new-unit-id',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deactivate', () => {
    it('sets product status to INACTIVE', async () => {
      await service.deactivate('prod-1');
      expect(productRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ProductStatus.INACTIVE }),
      );
    });
  });

  describe('conversions sub-resource', () => {
    it('findConversions returns all conversions for a product', async () => {
      const result = await service.findConversions('prod-1');
      expect(result).toBeDefined();
    });

    it('addConversion creates new conversion rule', async () => {
      const result = await service.addConversion('prod-1', {
        presentationUnitId: 'unit-box',
        conversionFactor: 24,
      });
      expect(result.conversionFactor).toBe(24);
    });

    it('addConversion throws BadRequestException when presentation unit is base unit', async () => {
      await expect(
        service.addConversion('prod-1', {
          presentationUnitId: 'unit-base',
          conversionFactor: 10,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('updateConversion updates conversion factor', async () => {
      conversionRepo.createQueryBuilder().getOne.mockResolvedValueOnce({
        id: 'conv-1',
        productId: 'prod-1',
        presentationUnitId: 'unit-box',
        conversionFactor: '24.0000',
      });

      const result = await service.updateConversion('prod-1', 'conv-1', {
        conversionFactor: 30,
      });
      expect(result.conversionFactor).toBe(30);
    });

    it('deleteConversion removes conversion rule', async () => {
      conversionRepo.findOneBy.mockResolvedValueOnce({
        id: 'conv-1',
        productId: 'prod-1',
      });
      await service.deleteConversion('prod-1', 'conv-1');
      expect(conversionRepo.remove).toHaveBeenCalled();
    });
  });

  describe('findAll extended filters', () => {
    it('applies search and category filters when provided', async () => {
      const qb = productRepo.createQueryBuilder();
      await service.findAll({
        search: 'Ibuprofeno',
        category: 'cat-1',
        status: ProductStatus.ACTIVE,
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'product.status = :status',
        expect.objectContaining({ status: ProductStatus.ACTIVE }),
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'product.categoryId = :category',
        expect.objectContaining({ category: 'cat-1' }),
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(UPPER(product.internalCode) LIKE UPPER(:searchPattern) OR product.name ILIKE :searchPattern)',
        expect.objectContaining({ searchPattern: '%Ibuprofeno%' }),
      );
    });

    it('escapes % and _ wildcards in search query', async () => {
      const qb = productRepo.createQueryBuilder();
      await service.findAll({
        search: '100%_pure',
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(UPPER(product.internalCode) LIKE UPPER(:searchPattern) OR product.name ILIKE :searchPattern)',
        expect.objectContaining({ searchPattern: '%100\\%\\_pure%' }),
      );
    });
  });

  describe('searchTypeahead', () => {
    it('returns empty array when q is empty or shorter than 2 characters', async () => {
      expect(await service.searchTypeahead({ q: '' })).toEqual([]);
      expect(await service.searchTypeahead({ q: 'a' })).toEqual([]);
      expect(await service.searchTypeahead({ q: '   ' })).toEqual([]);
    });

    it('executes typeahead query with ranking and projects currentStock as 0 when no stock relation', async () => {
      const results = await service.searchTypeahead({ q: 'MED', limit: 5 });
      expect(results).toHaveLength(1);
      expect(results[0].internalCode).toBe('MED-001');
      expect(results[0].currentStock).toBe(0);
      expect(results[0].activePriceNet).toBe(2025.68);
      expect(results[0].baseUnit).toEqual({
        id: 'unit-base',
        name: 'Unidad',
        symbol: 'u',
      });
    });

    it('projects loaded stock balance from product.stock', async () => {
      const qb = productRepo.createQueryBuilder();
      qb.getMany.mockResolvedValueOnce([
        {
          ...mockProduct,
          stock: { currentBaseStock: '125.50' },
        },
      ]);

      const results = await service.searchTypeahead({ q: 'MED', limit: 5 });
      expect(results).toHaveLength(1);
      expect(results[0].currentStock).toBe(125.5);
    });
  });
});
