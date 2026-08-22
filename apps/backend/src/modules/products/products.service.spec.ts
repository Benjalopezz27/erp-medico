import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserRole, ProductStatus } from '@erp/shared-types';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { ProductUnitConversion } from './entities/product-unit-conversion.entity';
import { Category } from '../categories/entities/category.entity';
import { Unit } from '../units/entities/unit.entity';
import { UnitConversionEngine } from './services/unit-conversion-engine.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepo: any;
  let conversionRepo: any;
  let categoryRepo: any;
  let unitRepo: any;
  let dataSource: any;
  let queryRunner: any;

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
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        UnitConversionEngine,
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
      internalCode: 'MED-002',
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
      productRepo.createQueryBuilder().getOne.mockResolvedValueOnce(null); // uniqueness check
      const result = await service.create(validDto);

      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('throws ConflictException on duplicate internalCode', async () => {
      productRepo
        .createQueryBuilder()
        .getOne.mockResolvedValueOnce(mockProduct);
      await expect(service.create(validDto)).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException on invalid categoryId', async () => {
      productRepo.createQueryBuilder().getOne.mockResolvedValueOnce(null);
      categoryRepo.findOneBy.mockResolvedValueOnce(null);
      await expect(service.create(validDto)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException on invalid baseUnitId', async () => {
      productRepo.createQueryBuilder().getOne.mockResolvedValueOnce(null);
      unitRepo.findOneBy.mockResolvedValueOnce(null);
      await expect(service.create(validDto)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when presentation unit equals base unit', async () => {
      productRepo.createQueryBuilder().getOne.mockResolvedValueOnce(null);
      const invalidDto = {
        ...validDto,
        conversions: [
          {
            presentationUnitId: 'unit-base', // same as baseUnitId
            conversionFactor: 10,
          },
        ],
      };
      await expect(service.create(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException on duplicate conversion units in payload', async () => {
      productRepo.createQueryBuilder().getOne.mockResolvedValueOnce(null);
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
      await expect(service.create(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rolls back transaction if error occurs during save', async () => {
      productRepo.createQueryBuilder().getOne.mockResolvedValueOnce(null);
      queryRunner.manager.save.mockRejectedValueOnce(new Error('DB Error'));

      await expect(service.create(validDto)).rejects.toThrow('DB Error');
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
});
