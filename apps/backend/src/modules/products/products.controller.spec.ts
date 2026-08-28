import { Test, TestingModule } from '@nestjs/testing';
import { UserRole, ProductStatus } from '@erp/shared-types';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { User } from '../users/entities/user.entity';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: ProductsService;

  const mockAdminUser = {
    id: 'u-admin',
    name: 'Admin User',
    role: UserRole.ADMINISTRADOR,
  } as User;

  const mockSellerUser = {
    id: 'u-seller',
    name: 'Seller User',
    role: UserRole.VENDEDOR,
  } as User;

  const mockProductResponse = {
    id: 'p-1',
    internalCode: 'MED-001',
    name: 'Ibuprofeno 400mg',
    description: null,
    categoryId: 'c-1',
    baseUnitId: 'u-1',
    minStock: 10,
    costNet: 100,
    markupPercentage: 30,
    suggestedPriceNet: 130,
    activePriceNet: 130,
    status: ProductStatus.ACTIVE,
    conversions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockConversionResponse = {
    id: 'conv-1',
    productId: 'p-1',
    presentationUnitId: 'u-box',
    conversionFactor: 24,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockProductsService = {
      findAll: jest.fn().mockResolvedValue({
        items: [mockProductResponse],
        total: 1,
        offset: 0,
        limit: 10,
      }),
      findById: jest.fn().mockResolvedValue(mockProductResponse),
      create: jest.fn().mockResolvedValue(mockProductResponse),
      update: jest.fn().mockResolvedValue(mockProductResponse),
      deactivate: jest.fn().mockResolvedValue(undefined),
      searchTypeahead: jest.fn().mockResolvedValue([
        {
          id: 'p-1',
          internalCode: 'P0001',
          name: 'Ibuprofeno 400mg',
          baseUnit: { id: 'u-1', name: 'Unidad', symbol: 'u' },
          currentStock: 0,
          activePriceNet: 130,
        },
      ]),
      findConversions: jest.fn().mockResolvedValue([mockConversionResponse]),
      addConversion: jest.fn().mockResolvedValue(mockConversionResponse),
      updateConversion: jest.fn().mockResolvedValue(mockConversionResponse),
      deleteConversion: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService);
  });

  describe('findAll', () => {
    it('calls service.findAll with query and user role', async () => {
      const query = { limit: 10, offset: 0 };
      const result = await controller.findAll(query, mockAdminUser);
      expect(service.findAll).toHaveBeenCalledWith(
        query,
        UserRole.ADMINISTRADOR,
      );
      expect(result.items).toHaveLength(1);
    });
  });

  describe('search', () => {
    it('calls service.searchTypeahead with query', async () => {
      const query = { q: 'P0001', limit: 10 };
      const result = await controller.search(query);
      expect(service.searchTypeahead).toHaveBeenCalledWith(query);
      expect(result).toHaveLength(1);
      expect(result[0].internalCode).toBe('P0001');
    });
  });

  describe('findById', () => {
    it('calls service.findById with id and user role', async () => {
      const result = await controller.findById('p-1', mockSellerUser);
      expect(service.findById).toHaveBeenCalledWith('p-1', UserRole.VENDEDOR);
      expect(result.id).toBe('p-1');
    });
  });

  describe('create', () => {
    it('calls service.create with dto and authenticated actor', async () => {
      const dto = {
        name: 'Ibuprofeno',
        categoryId: 'c-1',
        baseUnitId: 'u-1',
        costNet: 100,
        activePriceNet: 130,
      };
      const result = await controller.create(dto as any, mockAdminUser as any);
      expect(service.create).toHaveBeenCalledWith(dto, mockAdminUser);
      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    it('calls service.update with id, dto and authenticated actor', async () => {
      const dto = { name: 'Ibuprofeno Modificado' };
      const result = await controller.update('p-1', dto, mockAdminUser as any);
      expect(service.update).toHaveBeenCalledWith('p-1', dto, mockAdminUser);
      expect(result).toBeDefined();
    });
  });

  describe('deactivate', () => {
    it('calls service.deactivate with id', async () => {
      await controller.deactivate('p-1');
      expect(service.deactivate).toHaveBeenCalledWith('p-1');
    });
  });

  describe('conversions endpoints', () => {
    it('findConversions calls service.findConversions', async () => {
      const result = await controller.findConversions('p-1');
      expect(service.findConversions).toHaveBeenCalledWith('p-1');
      expect(result).toHaveLength(1);
    });

    it('addConversion calls service.addConversion', async () => {
      const dto = { presentationUnitId: 'u-box', conversionFactor: 24 };
      const result = await controller.addConversion('p-1', dto);
      expect(service.addConversion).toHaveBeenCalledWith('p-1', dto);
      expect(result).toBeDefined();
    });

    it('updateConversion calls service.updateConversion', async () => {
      const dto = { conversionFactor: 30 };
      const result = await controller.updateConversion('p-1', 'conv-1', dto);
      expect(service.updateConversion).toHaveBeenCalledWith(
        'p-1',
        'conv-1',
        dto,
      );
      expect(result).toBeDefined();
    });

    it('deleteConversion calls service.deleteConversion', async () => {
      await controller.deleteConversion('p-1', 'conv-1');
      expect(service.deleteConversion).toHaveBeenCalledWith('p-1', 'conv-1');
    });
  });
});
