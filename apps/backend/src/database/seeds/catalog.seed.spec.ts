import { DataSource, QueryRunner, Repository } from 'typeorm';
import { Category } from '../../modules/categories/entities/category.entity';
import { Unit } from '../../modules/units/entities/unit.entity';
import { Product } from '../../modules/products/entities/product.entity';
import { ProductUnitConversion } from '../../modules/products/entities/product-unit-conversion.entity';
import { Supplier } from '../../modules/suppliers/entities/supplier.entity';
import { SupplierProduct } from '../../modules/suppliers/supplier-products/entities/supplier-product.entity';
import { runCatalogSeed } from './catalog.seed';

describe('catalog.seed', () => {
  let dataSource: jest.Mocked<DataSource>;
  let queryRunner: jest.Mocked<QueryRunner>;
  let categoryRepository: jest.Mocked<Repository<Category>>;
  let unitRepository: jest.Mocked<Repository<Unit>>;
  let productRepository: jest.Mocked<Repository<Product>>;
  let conversionRepository: jest.Mocked<Repository<ProductUnitConversion>>;
  let supplierRepository: jest.Mocked<Repository<Supplier>>;
  let supplierProductRepository: jest.Mocked<Repository<SupplierProduct>>;
  const logger = { log: jest.fn(), error: jest.fn() };

  beforeEach(() => {
    let categoryId = 0;
    let unitId = 0;
    let productId = 0;
    let conversionId = 0;
    let supplierId = 0;
    let spId = 0;

    categoryRepository = {
      findOne: jest.fn(),
      create: jest.fn((value) => value as Category),
      save: jest.fn(
        async (value) =>
          ({ ...value, id: `category-${++categoryId}` }) as Category,
      ),
    } as unknown as jest.Mocked<Repository<Category>>;

    unitRepository = {
      findOne: jest.fn(),
      create: jest.fn((value) => value as Unit),
      save: jest.fn(
        async (value) => ({ ...value, id: `unit-${++unitId}` }) as Unit,
      ),
    } as unknown as jest.Mocked<Repository<Unit>>;

    productRepository = {
      findOne: jest.fn(),
      create: jest.fn((value) => value as Product),
      save: jest.fn(
        async (value) =>
          ({ ...value, id: `product-${++productId}` }) as Product,
      ),
    } as unknown as jest.Mocked<Repository<Product>>;

    conversionRepository = {
      findOne: jest.fn(),
      create: jest.fn((value) => value as ProductUnitConversion),
      save: jest.fn(
        async (value) =>
          ({
            ...value,
            id: `conversion-${++conversionId}`,
          }) as ProductUnitConversion,
      ),
    } as unknown as jest.Mocked<Repository<ProductUnitConversion>>;

    supplierRepository = {
      findOne: jest.fn(),
      create: jest.fn((value) => value as Supplier),
      save: jest.fn(
        async (value) =>
          ({ ...value, id: `supplier-${++supplierId}` }) as Supplier,
      ),
    } as unknown as jest.Mocked<Repository<Supplier>>;

    supplierProductRepository = {
      findOne: jest.fn(),
      create: jest.fn((value) => value as SupplierProduct),
      save: jest.fn(
        async (value) =>
          ({ ...value, id: `supplier-product-${++spId}` }) as SupplierProduct,
      ),
    } as unknown as jest.Mocked<Repository<SupplierProduct>>;

    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        getRepository: jest.fn((entity) => {
          if (entity === Category) return categoryRepository;
          if (entity === Unit) return unitRepository;
          if (entity === Product) return productRepository;
          if (entity === ProductUnitConversion) return conversionRepository;
          if (entity === Supplier) return supplierRepository;
          return supplierProductRepository;
        }),
      },
    } as unknown as jest.Mocked<QueryRunner>;

    dataSource = {
      createQueryRunner: jest.fn(() => queryRunner),
    } as unknown as jest.Mocked<DataSource>;
    jest.clearAllMocks();
  });

  it('creates the demonstration catalog and all conversion rules', async () => {
    const result = await runCatalogSeed(dataSource, { logger });

    expect(result).toEqual({
      categories: { created: 5, skipped: 0 },
      units: { created: 10, skipped: 0 },
      products: { created: 14, skipped: 0 },
      conversions: { created: 15, skipped: 0 },
      suppliers: { created: 1, skipped: 0 },
      supplierProducts: { created: 12, skipped: 0 },
    });
    expect(productRepository.save).toHaveBeenCalledTimes(14);
    expect(conversionRepository.save).toHaveBeenCalledTimes(15);
    expect(supplierRepository.save).toHaveBeenCalledTimes(1);
    expect(supplierProductRepository.save).toHaveBeenCalledTimes(12);
    expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
  });

  it('skips records that already exist, making repeated execution safe', async () => {
    categoryRepository.findOne.mockResolvedValue({
      id: 'category-existing',
    } as Category);
    unitRepository.findOne.mockResolvedValue({ id: 'unit-existing' } as Unit);
    productRepository.findOne.mockResolvedValue({
      id: 'product-existing',
    } as Product);
    conversionRepository.findOne.mockResolvedValue({
      id: 'conversion-existing',
    } as ProductUnitConversion);
    supplierRepository.findOne.mockResolvedValue({
      id: 'supplier-existing',
    } as Supplier);
    supplierProductRepository.findOne.mockResolvedValue({
      id: 'sp-existing',
    } as SupplierProduct);

    const result = await runCatalogSeed(dataSource, { logger });

    expect(result).toEqual({
      categories: { created: 0, skipped: 5 },
      units: { created: 0, skipped: 10 },
      products: { created: 0, skipped: 14 },
      conversions: { created: 0, skipped: 15 },
      suppliers: { created: 0, skipped: 1 },
      supplierProducts: { created: 0, skipped: 12 },
    });
    expect(categoryRepository.save).not.toHaveBeenCalled();
    expect(unitRepository.save).not.toHaveBeenCalled();
    expect(productRepository.save).not.toHaveBeenCalled();
    expect(conversionRepository.save).not.toHaveBeenCalled();
    expect(supplierRepository.save).not.toHaveBeenCalled();
    expect(supplierProductRepository.save).not.toHaveBeenCalled();
  });

  it('rolls back the full catalog when any insert fails', async () => {
    categoryRepository.findOne.mockRejectedValueOnce(
      new Error('database failure'),
    );

    await expect(runCatalogSeed(dataSource, { logger })).rejects.toThrow(
      'database failure',
    );

    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
  });
});
