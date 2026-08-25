import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  SupplierProductsService,
  escapeLikePattern,
} from './supplier-products.service';
import { SupplierProduct } from './entities/supplier-product.entity';
import { Supplier } from '../entities/supplier.entity';
import { Product } from '../../products/entities/product.entity';
import { Unit } from '../../units/entities/unit.entity';
import { AuditService } from '../../audit/audit.service';
import { AuditAction, ProductStatus, TaxCondition } from '@erp/shared-types';
import { CreateSupplierProductDto } from './dto/create-supplier-product.dto';
import { UpdateSupplierProductDto } from './dto/update-supplier-product.dto';

describe('SupplierProductsService', () => {
  let service: SupplierProductsService;
  let supplierProductRepo: Partial<
    Record<keyof Repository<SupplierProduct>, jest.Mock>
  >;
  let supplierRepo: Partial<Record<keyof Repository<Supplier>, jest.Mock>>;
  let productRepo: Partial<Record<keyof Repository<Product>, jest.Mock>>;
  let unitRepo: Partial<Record<keyof Repository<Unit>, jest.Mock>>;
  let auditService: { record: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  const mockActorId = '11111111-1111-1111-1111-111111111111';
  const mockSupplierId = '22222222-2222-2222-2222-222222222222';
  const mockProductId = '33333333-3333-3333-3333-333333333333';
  const mockBaseUnitId = '44444444-4444-4444-4444-444444444444';
  const mockPackUnitId = '55555555-5555-5555-5555-555555555555';
  const mockAssociationId = '66666666-6666-6666-6666-666666666666';

  const mockActiveSupplier = {
    id: mockSupplierId,
    businessName: 'Proveedor Activo SA',
    cuit: '20123456789',
    taxCondition: TaxCondition.RESPONSABLE_INSCRIPTO,
    email: 'contacto@proveedor.com',
    phone: null,
    whatsapp: null,
    address: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Supplier;

  const mockInactiveSupplier = {
    ...mockActiveSupplier,
    isActive: false,
  } as unknown as Supplier;

  const mockBaseUnit = {
    id: mockBaseUnitId,
    name: 'Unidad',
    symbol: 'u',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Unit;

  const mockPackUnit = {
    id: mockPackUnitId,
    name: 'Caja',
    symbol: 'cj',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Unit;

  const mockActiveProduct = {
    id: mockProductId,
    internalCode: 'P0001',
    name: 'Amoxicilina 500mg',
    description: null,
    categoryId: '77777777-7777-7777-7777-777777777777',
    baseUnitId: mockBaseUnitId,
    minStock: 10,
    costNet: 100,
    markupPercentage: 30,
    suggestedPriceNet: 130,
    activePriceNet: 130,
    status: ProductStatus.ACTIVE,
    baseUnit: mockBaseUnit,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Product;

  const mockInactiveProduct = {
    ...mockActiveProduct,
    status: ProductStatus.INACTIVE,
  } as unknown as Product;

  const mockSupplierProduct = {
    id: mockAssociationId,
    supplierId: mockSupplierId,
    productId: mockProductId,
    supplierExternalCode: 'SKU-AMOX-500',
    supplierDescription: 'Amoxi 500 caja x 10',
    purchaseUnitId: mockPackUnitId,
    conversionFactorToBase: '10.0000',
    usualCostNet: '95.5000',
    isPrimarySupplier: false,
    product: mockActiveProduct,
    purchaseUnit: mockPackUnit,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as SupplierProduct;

  beforeEach(async () => {
    supplierProductRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest
        .fn()
        .mockImplementation((dto) => ({ ...dto, id: mockAssociationId })),
      save: jest
        .fn()
        .mockImplementation((entity) =>
          Promise.resolve({ ...entity, id: entity.id ?? mockAssociationId }),
        ),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    supplierRepo = {
      findOne: jest.fn().mockResolvedValue(mockActiveSupplier),
    };

    productRepo = {
      findOne: jest.fn().mockResolvedValue(mockActiveProduct),
      createQueryBuilder: jest.fn(),
    };

    unitRepo = {
      findOne: jest.fn().mockResolvedValue(mockPackUnit),
    };

    auditService = {
      record: jest.fn().mockResolvedValue({ id: 'audit-id' }),
    };

    dataSource = {
      transaction: jest
        .fn()
        .mockImplementation((cb: (manager: EntityManager) => any) => {
          const mockManager = {
            getRepository: (target: any) => {
              if (target === SupplierProduct) return supplierProductRepo;
              if (target === Supplier) return supplierRepo;
              if (target === Product) return productRepo;
              if (target === Unit) return unitRepo;
              return {};
            },
          } as unknown as EntityManager;
          return cb(mockManager);
        }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierProductsService,
        {
          provide: getRepositoryToken(SupplierProduct),
          useValue: supplierProductRepo,
        },
        { provide: getRepositoryToken(Supplier), useValue: supplierRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(Unit), useValue: unitRepo },
        { provide: AuditService, useValue: auditService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<SupplierProductsService>(SupplierProductsService);
  });

  describe('Wildcard Escaping helper', () => {
    it('escapes %, _, and \\ in search terms', () => {
      expect(escapeLikePattern('100%')).toBe('100\\%');
      expect(escapeLikePattern('Item_A')).toBe('Item\\_A');
      expect(escapeLikePattern('C:\\dir')).toBe('C:\\\\dir');
    });
  });

  describe('create', () => {
    it('creates mapping with base unit when factor is 1', async () => {
      const mockProductQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockActiveProduct),
      };
      productRepo.createQueryBuilder = jest.fn().mockReturnValue(mockProductQb);
      unitRepo.findOne = jest.fn().mockResolvedValue(mockBaseUnit);

      const mockFindOneQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          ...mockSupplierProduct,
          purchaseUnitId: mockBaseUnitId,
          conversionFactorToBase: '1.0000',
          purchaseUnit: mockBaseUnit,
        }),
      };
      supplierProductRepo.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockFindOneQb);

      const dto: CreateSupplierProductDto = {
        productId: mockProductId,
        supplierExternalCode: '  SKU-001  ',
        purchaseUnitId: mockBaseUnitId,
        conversionFactorToBase: 1,
        usualCostNet: 50.25,
        isPrimarySupplier: false,
      };

      const result = await service.create(mockSupplierId, dto, mockActorId);

      expect(mockProductQb.setLock).toHaveBeenCalledWith('pessimistic_write');
      expect(auditService.record).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: AuditAction.CREATE,
          entityName: 'SupplierProduct',
          previousValues: null,
          newValues: expect.objectContaining({
            conversionFactorToBase: '1.0000',
            usualCostNet: '50.2500',
          }),
        }),
      );
      expect(result.supplierExternalCode).toBe('SKU-AMOX-500');
    });

    it('rejects when purchase unit is base unit but factor is not 1', async () => {
      const mockProductQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockActiveProduct),
      };
      productRepo.createQueryBuilder = jest.fn().mockReturnValue(mockProductQb);
      unitRepo.findOne = jest.fn().mockResolvedValue(mockBaseUnit);

      const dto: CreateSupplierProductDto = {
        productId: mockProductId,
        supplierExternalCode: 'SKU-001',
        purchaseUnitId: mockBaseUnitId,
        conversionFactorToBase: 5,
      };

      await expect(
        service.create(mockSupplierId, dto, mockActorId),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects creation on inactive supplier', async () => {
      supplierRepo.findOne = jest.fn().mockResolvedValue(mockInactiveSupplier);

      const dto: CreateSupplierProductDto = {
        productId: mockProductId,
        supplierExternalCode: 'SKU-001',
        purchaseUnitId: mockPackUnitId,
        conversionFactorToBase: 10,
      };

      await expect(
        service.create(mockSupplierId, dto, mockActorId),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects creation on inactive product', async () => {
      const mockProductQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockInactiveProduct),
      };
      productRepo.createQueryBuilder = jest.fn().mockReturnValue(mockProductQb);

      const dto: CreateSupplierProductDto = {
        productId: mockProductId,
        supplierExternalCode: 'SKU-001',
        purchaseUnitId: mockPackUnitId,
        conversionFactorToBase: 10,
      };

      await expect(
        service.create(mockSupplierId, dto, mockActorId),
      ).rejects.toThrow(BadRequestException);
    });

    it('demotes previous primary supplier when setting isPrimarySupplier = true', async () => {
      const mockProductQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockActiveProduct),
      };
      productRepo.createQueryBuilder = jest.fn().mockReturnValue(mockProductQb);

      const existingPrimary = {
        ...mockSupplierProduct,
        id: 'old-primary-id',
        isPrimarySupplier: true,
      } as unknown as SupplierProduct;
      supplierProductRepo.findOne = jest
        .fn()
        .mockResolvedValue(existingPrimary);

      const mockFindOneQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          ...mockSupplierProduct,
          isPrimarySupplier: true,
        }),
      };
      supplierProductRepo.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockFindOneQb);

      const dto: CreateSupplierProductDto = {
        productId: mockProductId,
        supplierExternalCode: 'SKU-NEW-PRIMARY',
        purchaseUnitId: mockPackUnitId,
        conversionFactorToBase: 10,
        isPrimarySupplier: true,
      };

      await service.create(mockSupplierId, dto, mockActorId);

      // Verify demoted record save
      expect(supplierProductRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'old-primary-id',
          isPrimarySupplier: false,
        }),
      );

      // Verify demotion audit log was recorded
      expect(auditService.record).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: AuditAction.UPDATE,
          entityId: 'old-primary-id',
          previousValues: expect.objectContaining({ isPrimarySupplier: true }),
          newValues: expect.objectContaining({ isPrimarySupplier: false }),
        }),
      );
    });

    it('maps PostgreSQL 23505 duplicate SKU to ConflictException', async () => {
      const mockProductQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockActiveProduct),
      };
      productRepo.createQueryBuilder = jest.fn().mockReturnValue(mockProductQb);

      supplierProductRepo.save = jest.fn().mockRejectedValue({
        code: '23505',
        constraint: 'uq_supplier_products_supplier_sku_upper',
      });

      const dto: CreateSupplierProductDto = {
        productId: mockProductId,
        supplierExternalCode: 'SKU-DUP',
        purchaseUnitId: mockPackUnitId,
        conversionFactorToBase: 10,
      };

      await expect(
        service.create(mockSupplierId, dto, mockActorId),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('rejects update with no effective changes', async () => {
      supplierProductRepo.findOne = jest.fn().mockResolvedValue({
        ...mockSupplierProduct,
        conversionFactorToBase: '10.0000',
        usualCostNet: '95.5000',
      });

      const mockProductQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockActiveProduct),
      };
      productRepo.createQueryBuilder = jest.fn().mockReturnValue(mockProductQb);

      const dto: UpdateSupplierProductDto = {
        supplierExternalCode: 'SKU-AMOX-500',
        conversionFactorToBase: 10,
        usualCostNet: 95.5,
      };

      await expect(
        service.update(mockSupplierId, mockAssociationId, dto, mockActorId),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects update when supplier is inactive', async () => {
      supplierRepo.findOne = jest.fn().mockResolvedValue(mockInactiveSupplier);

      const dto: UpdateSupplierProductDto = {
        supplierDescription: 'Nueva descripción',
      };

      await expect(
        service.update(mockSupplierId, mockAssociationId, dto, mockActorId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('physically deletes mapping and records AuditAction.DELETE', async () => {
      supplierProductRepo.findOne = jest
        .fn()
        .mockResolvedValue(mockSupplierProduct);
      supplierProductRepo.delete = jest.fn().mockResolvedValue({ affected: 1 });

      await service.delete(mockSupplierId, mockAssociationId, mockActorId);

      expect(auditService.record).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: AuditAction.DELETE,
          entityName: 'SupplierProduct',
          entityId: mockAssociationId,
          previousValues: expect.objectContaining({
            supplierExternalCode: 'SKU-AMOX-500',
            conversionFactorToBase: '10.0000',
            usualCostNet: '95.5000',
          }),
          newValues: null,
        }),
      );
      expect(supplierProductRepo.delete).toHaveBeenCalledWith({
        id: mockAssociationId,
      });
    });

    it('converts 23503 foreign key violation into ConflictException', async () => {
      supplierProductRepo.findOne = jest
        .fn()
        .mockResolvedValue(mockSupplierProduct);
      supplierProductRepo.delete = jest.fn().mockRejectedValue({
        code: '23503',
      });

      await expect(
        service.delete(mockSupplierId, mockAssociationId, mockActorId),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Invariance Guarantees', () => {
    it('verifies that Product costs, prices, and status are never mutated', async () => {
      const initialCost = mockActiveProduct.costNet;
      const initialPrice = mockActiveProduct.activePriceNet;
      const initialStatus = mockActiveProduct.status;

      const mockProductQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockActiveProduct),
      };
      productRepo.createQueryBuilder = jest.fn().mockReturnValue(mockProductQb);

      const mockFindOneQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockSupplierProduct),
      };
      supplierProductRepo.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockFindOneQb);

      const dto: CreateSupplierProductDto = {
        productId: mockProductId,
        supplierExternalCode: 'SKU-INVARIANT',
        purchaseUnitId: mockPackUnitId,
        conversionFactorToBase: 10,
        usualCostNet: 200,
        isPrimarySupplier: true,
      };

      await service.create(mockSupplierId, dto, mockActorId);

      expect(mockActiveProduct.costNet).toBe(initialCost);
      expect(mockActiveProduct.activePriceNet).toBe(initialPrice);
      expect(mockActiveProduct.status).toBe(initialStatus);
      expect(productRepo.save).toBeUndefined(); // Product repo is never saved by this service
    });
  });
});
