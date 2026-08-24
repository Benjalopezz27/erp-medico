import { Repository } from 'typeorm';
import { ProductStatus, StockBulkRowErrorCode } from '@erp/shared-types';
import { StockBulkLoadValidator } from './stock-bulk-load-validator';
import { Product } from '../../products/entities/product.entity';

describe('StockBulkLoadValidator', () => {
  let validator: StockBulkLoadValidator;
  let mockProductRepo: jest.Mocked<Repository<Product>>;

  beforeEach(() => {
    mockProductRepo = {
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<Product>>;

    validator = new StockBulkLoadValidator(mockProductRepo);
  });

  it('validates a correct batch of items, resolves catalog, and computes content checksum', async () => {
    mockProductRepo.find.mockResolvedValueOnce([
      {
        id: 'prod-uuid-1',
        internalCode: 'P0001',
        name: 'Paracetamol 500mg',
        status: ProductStatus.ACTIVE,
        stock: { currentBaseStock: '10.00' } as any,
        baseUnit: { id: 'u1', name: 'Unidad', symbol: 'u' } as any,
      } as Product,
      {
        id: 'prod-uuid-2',
        internalCode: 'P0002',
        name: 'Ibuprofeno 400mg',
        status: ProductStatus.ACTIVE,
        stock: { currentBaseStock: '0.00' } as any,
        baseUnit: { id: 'u2', name: 'Caja', symbol: 'cj' } as any,
      } as Product,
    ]);

    const rawRows = [
      {
        rowNumber: 2,
        rawInternalCode: 'p0001 ',
        rawQuantity: '100.50',
        hasFormula: false,
      },
      {
        rowNumber: 3,
        rawInternalCode: 'P0002',
        rawQuantity: 50,
        hasFormula: false,
      },
    ];

    const result = await validator.validate(rawRows);

    expect(result.valid).toBe(true);
    expect(result.contentChecksum).toBeDefined();
    expect(result.contentChecksum?.length).toBe(64);
    expect(result.summary).toEqual({
      totalRows: 2,
      validRows: 2,
      invalidRows: 0,
      totalQuantityBase: 150.5,
    });
    expect(result.rows[0].product?.projectedStock).toBe(110.5);
    expect(result.rows[1].product?.projectedStock).toBe(50);
  });

  it('computes identical contentChecksum regardless of row ordering in input file', async () => {
    const mockProducts = [
      {
        id: 'prod-uuid-1',
        internalCode: 'P0001',
        name: 'Paracetamol 500mg',
        status: ProductStatus.ACTIVE,
        stock: { currentBaseStock: '0.00' } as any,
        baseUnit: { id: 'u1', name: 'Unidad', symbol: 'u' } as any,
      } as Product,
      {
        id: 'prod-uuid-2',
        internalCode: 'P0002',
        name: 'Ibuprofeno 400mg',
        status: ProductStatus.ACTIVE,
        stock: { currentBaseStock: '0.00' } as any,
        baseUnit: { id: 'u2', name: 'Caja', symbol: 'cj' } as any,
      } as Product,
    ];

    mockProductRepo.find.mockResolvedValue(mockProducts);

    const order1 = [
      { rowNumber: 2, rawInternalCode: 'P0001', rawQuantity: '100.00' },
      { rowNumber: 3, rawInternalCode: 'P0002', rawQuantity: '50.00' },
    ];

    const order2 = [
      { rowNumber: 2, rawInternalCode: 'P0002', rawQuantity: '50.00' },
      { rowNumber: 3, rawInternalCode: 'P0001', rawQuantity: '100.00' },
    ];

    const result1 = await validator.validate(order1);
    const result2 = await validator.validate(order2);

    expect(result1.valid).toBe(true);
    expect(result2.valid).toBe(true);
    expect(result1.contentChecksum).toBe(result2.contentChecksum);
  });

  it('flags PRODUCT_NOT_FOUND when product does not exist in database and sets contentChecksum to null', async () => {
    mockProductRepo.find.mockResolvedValueOnce([]);

    const rawRows = [
      { rowNumber: 2, rawInternalCode: 'UNKNOWN-01', rawQuantity: '10' },
    ];

    const result = await validator.validate(rawRows);

    expect(result.valid).toBe(false);
    expect(result.contentChecksum).toBeNull();
    expect(result.summary.invalidRows).toBe(1);
    expect(result.rows[0].errors[0].code).toBe(
      StockBulkRowErrorCode.PRODUCT_NOT_FOUND,
    );
  });

  it('flags PRODUCT_INACTIVE when product is inactive in catalog', async () => {
    mockProductRepo.find.mockResolvedValueOnce([
      {
        id: 'prod-uuid-1',
        internalCode: 'P0001',
        name: 'Producto Inactivo',
        status: ProductStatus.INACTIVE,
        stock: { currentBaseStock: '0.00' } as any,
        baseUnit: { id: 'u1', name: 'Unidad', symbol: 'u' } as any,
      } as Product,
    ]);

    const rawRows = [
      { rowNumber: 2, rawInternalCode: 'P0001', rawQuantity: '10' },
    ];

    const result = await validator.validate(rawRows);

    expect(result.valid).toBe(false);
    expect(result.rows[0].errors[0].code).toBe(
      StockBulkRowErrorCode.PRODUCT_INACTIVE,
    );
  });

  it('flags DUPLICATE_INTERNAL_CODE when same code appears multiple times in file', async () => {
    mockProductRepo.find.mockResolvedValueOnce([
      {
        id: 'prod-uuid-1',
        internalCode: 'P0001',
        name: 'Paracetamol 500mg',
        status: ProductStatus.ACTIVE,
        stock: { currentBaseStock: '0.00' } as any,
        baseUnit: { id: 'u1', name: 'Unidad', symbol: 'u' } as any,
      } as Product,
    ]);

    const rawRows = [
      { rowNumber: 2, rawInternalCode: 'p0001', rawQuantity: '10' },
      { rowNumber: 3, rawInternalCode: 'P0001 ', rawQuantity: '20' },
    ];

    const result = await validator.validate(rawRows);

    expect(result.valid).toBe(false);
    expect(
      result.rows[0].errors.some(
        (e) => e.code === StockBulkRowErrorCode.DUPLICATE_INTERNAL_CODE,
      ),
    ).toBe(true);
    expect(
      result.rows[1].errors.some(
        (e) => e.code === StockBulkRowErrorCode.DUPLICATE_INTERNAL_CODE,
      ),
    ).toBe(true);
  });

  it('flags invalid, zero, and negative quantities appropriately', async () => {
    mockProductRepo.find.mockResolvedValueOnce([]);

    const rawRows = [
      { rowNumber: 2, rawInternalCode: 'P0001', rawQuantity: '0' },
      { rowNumber: 3, rawInternalCode: 'P0002', rawQuantity: '-5' },
      { rowNumber: 4, rawInternalCode: 'P0003', rawQuantity: '10.555' },
      { rowNumber: 5, rawInternalCode: 'P0004', rawQuantity: 'abc' },
    ];

    const result = await validator.validate(rawRows);

    expect(
      result.rows[0].errors.some(
        (e) => e.code === StockBulkRowErrorCode.ZERO_QUANTITY,
      ),
    ).toBe(true);
    expect(
      result.rows[1].errors.some(
        (e) => e.code === StockBulkRowErrorCode.NEGATIVE_QUANTITY,
      ),
    ).toBe(true);
    expect(
      result.rows[2].errors.some(
        (e) => e.code === StockBulkRowErrorCode.EXCESSIVE_DECIMAL_SCALE,
      ),
    ).toBe(true);
    expect(
      result.rows[3].errors.some(
        (e) => e.code === StockBulkRowErrorCode.INVALID_QUANTITY,
      ),
    ).toBe(true);
  });
});
