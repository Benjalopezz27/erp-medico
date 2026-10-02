import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ProductBulkLoadRowStatus,
  ProductBulkRowErrorCode,
} from '@erp/shared-types';
import { ProductBulkLoadValidator } from './product-bulk-load-validator';
import { Product } from '../entities/product.entity';
import { Category } from '../../categories/entities/category.entity';
import { Unit } from '../../units/entities/unit.entity';
import { PricesService } from '../../prices/prices.service';

describe('ProductBulkLoadValidator', () => {
  let validator: ProductBulkLoadValidator;

  const mockCategories = [
    {
      id: 'cat-1',
      name: 'Medicamentos',
      description: 'Fármacos',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'cat-2',
      name: 'Descartables',
      description: 'Insumos',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ] as unknown as Category[];

  const mockUnits = [
    {
      id: 'unit-1',
      name: 'Comprimido',
      symbol: 'cmp',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'unit-2',
      name: 'Caja',
      symbol: 'cj',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'unit-3',
      name: 'Blister',
      symbol: 'bl',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ] as unknown as Unit[];

  const mockProductRepository = {
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawMany: jest
        .fn()
        .mockResolvedValue([{ upper_name: 'ASPIRINA 500MG' }]),
    })),
  };

  const mockCategoryRepository = {
    find: jest.fn().mockResolvedValue(mockCategories),
  };

  const mockUnitRepository = {
    find: jest.fn().mockResolvedValue(mockUnits),
  };

  const mockPricesService = {
    calculateSuggestedPrice: jest.fn((cost, markup) =>
      String(Number(cost) * (1 + (Number(markup) || 0) / 100)),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductBulkLoadValidator,
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoryRepository,
        },
        {
          provide: getRepositoryToken(Unit),
          useValue: mockUnitRepository,
        },
        {
          provide: PricesService,
          useValue: mockPricesService,
        },
      ],
    }).compile();

    validator = module.get<ProductBulkLoadValidator>(ProductBulkLoadValidator);
  });

  it('validates a completely valid row and resolves relations and prices', async () => {
    const result = await validator.validate([
      {
        rowNumber: 2,
        rawName: 'Ibuprofeno 600mg',
        rawCategory: 'Medicamentos',
        rawBaseUnit: 'Comprimido',
        rawCostNet: 100,
        rawActivePriceNet: 150,
        rawDescription: 'Antiinflamatorio',
        rawMinStock: 10,
        rawInitialStock: 50,
        rawMarkupPercentage: 30,
        rawTaxTreatment: 'GRAVADO',
        rawIvaPercentage: 21,
        rawConversions: 'Caja:10; Blister:5',
        hasFormula: false,
      },
    ]);

    expect(result.valid).toBe(true);
    expect(result.contentChecksum).toBeDefined();
    expect(result.summary.validRows).toBe(1);
    expect(result.summary.invalidRows).toBe(0);
    expect(result.summary.totalInitialStock).toBe(50);

    const row = result.rows[0];
    expect(row.status).toBe(ProductBulkLoadRowStatus.VALID);
    expect(row.product).toBeDefined();
    expect(row.product?.categoryId).toBe('cat-1');
    expect(row.product?.baseUnitId).toBe('unit-1');
    expect(row.product?.conversions).toHaveLength(2);
    expect(row.product?.conversions[0]).toEqual({
      presentationUnitId: 'unit-2',
      presentationUnitName: 'Caja',
      presentationUnitSymbol: 'cj',
      conversionFactor: 10,
    });
  });

  it('detects duplicate names within the file', async () => {
    const result = await validator.validate([
      {
        rowNumber: 2,
        rawName: 'Ibuprofeno 400mg',
        rawCategory: 'Medicamentos',
        rawBaseUnit: 'Comprimido',
        rawCostNet: 10,
        rawActivePriceNet: 15,
        hasFormula: false,
      },
      {
        rowNumber: 3,
        rawName: 'ibuprofeno 400mg ',
        rawCategory: 'Medicamentos',
        rawBaseUnit: 'Comprimido',
        rawCostNet: 10,
        rawActivePriceNet: 15,
        hasFormula: false,
      },
    ]);

    expect(result.valid).toBe(false);
    expect(result.rows[0].errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: ProductBulkRowErrorCode.DUPLICATE_PRODUCT_NAME_IN_FILE,
        }),
      ]),
    );
  });

  it('detects duplicate product name matching existing database catalog', async () => {
    const result = await validator.validate([
      {
        rowNumber: 2,
        rawName: 'Aspirina 500mg',
        rawCategory: 'Medicamentos',
        rawBaseUnit: 'Comprimido',
        rawCostNet: 10,
        rawActivePriceNet: 15,
        hasFormula: false,
      },
    ]);

    expect(result.valid).toBe(false);
    expect(result.rows[0].errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: ProductBulkRowErrorCode.PRODUCT_NAME_ALREADY_EXISTS,
        }),
      ]),
    );
  });

  it('detects non-existent category and unit', async () => {
    const result = await validator.validate([
      {
        rowNumber: 2,
        rawName: 'Producto Desconocido',
        rawCategory: 'CategoriaFalsa',
        rawBaseUnit: 'UnidadFalsa',
        rawCostNet: 10,
        rawActivePriceNet: 15,
        hasFormula: false,
      },
    ]);

    expect(result.valid).toBe(false);
    expect(result.rows[0].errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: ProductBulkRowErrorCode.CATEGORY_NOT_FOUND,
        }),
        expect.objectContaining({
          code: ProductBulkRowErrorCode.BASE_UNIT_NOT_FOUND,
        }),
      ]),
    );
  });

  it('validates invalid numbers, negative values and scale limits', async () => {
    const result = await validator.validate([
      {
        rowNumber: 2,
        rawName: 'Test Costo Negativo',
        rawCategory: 'Medicamentos',
        rawBaseUnit: 'Comprimido',
        rawCostNet: -5,
        rawActivePriceNet: 10.555, // 3 decimals, max 2
        rawInitialStock: -1,
        hasFormula: false,
      },
    ]);

    expect(result.valid).toBe(false);
    expect(result.rows[0].errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: ProductBulkRowErrorCode.INVALID_COST_NET,
        }),
        expect.objectContaining({
          code: ProductBulkRowErrorCode.INVALID_ACTIVE_PRICE_NET,
        }),
        expect.objectContaining({
          code: ProductBulkRowErrorCode.INVALID_INITIAL_STOCK,
        }),
      ]),
    );
  });

  it('detects conversion unit matching base unit and duplicate conversion units in same row', async () => {
    const result = await validator.validate([
      {
        rowNumber: 2,
        rawName: 'Test Conversiones',
        rawCategory: 'Medicamentos',
        rawBaseUnit: 'Comprimido',
        rawCostNet: 10,
        rawActivePriceNet: 20,
        rawConversions: 'Comprimido:1; Caja:10; Caja:20',
        hasFormula: false,
      },
    ]);

    expect(result.valid).toBe(false);
    expect(result.rows[0].errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: ProductBulkRowErrorCode.CONVERSION_UNIT_EQUALS_BASE,
        }),
        expect.objectContaining({
          code: ProductBulkRowErrorCode.DUPLICATE_CONVERSION_UNIT,
        }),
      ]),
    );
  });

  it('rejects IVA rate when product is EXENTO', async () => {
    const result = await validator.validate([
      {
        rowNumber: 2,
        rawName: 'Producto Exento con IVA',
        rawCategory: 'Medicamentos',
        rawBaseUnit: 'Comprimido',
        rawCostNet: 10,
        rawActivePriceNet: 20,
        rawTaxTreatment: 'EXENTO',
        rawIvaPercentage: 21,
        hasFormula: false,
      },
    ]);

    expect(result.valid).toBe(false);
    expect(result.rows[0].errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: ProductBulkRowErrorCode.IVA_NOT_ALLOWED,
        }),
      ]),
    );
  });
});
