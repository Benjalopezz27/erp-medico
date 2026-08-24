import { Repository } from 'typeorm';
import {
  ProductStatus,
  StockBulkRowErrorCode,
  StockBulkLoadRowStatus,
  IStockBulkLoadRawRow,
} from '@erp/shared-types';
import { StockBulkLoadValidator } from './stock-bulk-load-validator';
import { Product } from '../../products/entities/product.entity';

describe('StockBulkLoadValidator', () => {
  let validator: StockBulkLoadValidator;
  let mockProductRepo: Partial<Repository<Product>>;

  const activeProduct1: Partial<Product> = {
    id: 'prod-uuid-1',
    internalCode: 'P0001',
    name: 'Amoxicilina 500mg',
    status: ProductStatus.ACTIVE,
    stock: {
      id: 's1',
      productId: 'prod-uuid-1',
      currentBaseStock: '50.00',
    } as any,
    baseUnit: { id: 'u1', name: 'Comprimido', symbol: 'cmp' } as any,
    baseUnitId: 'u1',
  };

  const activeProduct2: Partial<Product> = {
    id: 'prod-uuid-2',
    internalCode: 'P0002',
    name: 'Ibuprofeno 600mg',
    status: ProductStatus.ACTIVE,
    stock: {
      id: 's2',
      productId: 'prod-uuid-2',
      currentBaseStock: '10.00',
    } as any,
    baseUnit: { id: 'u1', name: 'Comprimido', symbol: 'cmp' } as any,
    baseUnitId: 'u1',
  };

  const inactiveProduct: Partial<Product> = {
    id: 'prod-uuid-3',
    internalCode: 'P0003',
    name: 'Producto Inactivo',
    status: ProductStatus.INACTIVE,
    stock: {
      id: 's3',
      productId: 'prod-uuid-3',
      currentBaseStock: '0.00',
    } as any,
    baseUnit: { id: 'u1', name: 'Comprimido', symbol: 'cmp' } as any,
    baseUnitId: 'u1',
  };

  beforeEach(() => {
    mockProductRepo = {
      find: jest.fn().mockImplementation(async (options: any) => {
        const codes: string[] = options?.where?.internalCode?._value || [];
        const all = [
          activeProduct1,
          activeProduct2,
          inactiveProduct,
        ] as Product[];
        return all.filter((p) => codes.includes(p.internalCode));
      }),
    };

    validator = new StockBulkLoadValidator(
      mockProductRepo as Repository<Product>,
    );
  });

  describe('1. Skipped vs Included Row Semantics', () => {
    it('marks rows with blank quantities as SKIPPED and rows with quantities as INCLUDED_VALID', async () => {
      const rawRows: IStockBulkLoadRawRow[] = [
        {
          rowNumber: 2,
          rawInternalCode: 'P0001',
          rawQuantity: '100',
          rawProductName: 'Amoxicilina',
          rawBaseUnit: 'cmp',
        },
        {
          rowNumber: 3,
          rawInternalCode: 'P0002',
          rawQuantity: null, // blank
          rawProductName: 'Ibuprofeno',
          rawBaseUnit: 'cmp',
        },
      ];

      const result = await validator.validate(rawRows);

      expect(result.valid).toBe(true);
      expect(result.contentChecksum).toBeDefined();
      expect(result.summary).toEqual({
        totalRows: 2,
        includedRows: 1,
        skippedRows: 1,
        validRows: 1,
        invalidRows: 0,
        totalQuantityBase: 100,
      });
      expect(result.rows[0].status).toBe(StockBulkLoadRowStatus.INCLUDED_VALID);
      expect(result.rows[0].quantityBase).toBe(100);
      expect(result.rows[1].status).toBe(StockBulkLoadRowStatus.SKIPPED);
      expect(result.rows[1].quantityBase).toBeNull();
      expect(result.rows[1].product).toBeDefined(); // Authoritative product attached
    });

    it('returns valid: false, contentChecksum: null when all rows are SKIPPED', async () => {
      const rawRows: IStockBulkLoadRawRow[] = [
        { rowNumber: 2, rawInternalCode: 'P0001', rawQuantity: null },
        { rowNumber: 3, rawInternalCode: 'P0002', rawQuantity: '' },
      ];

      const result = await validator.validate(rawRows);

      expect(result.valid).toBe(false);
      expect(result.contentChecksum).toBeNull();
      expect(result.summary.includedRows).toBe(0);
      expect(result.summary.skippedRows).toBe(2);
      expect(result.summary.invalidRows).toBe(0);
    });

    it('does not flag duplicate code error if one occurrence is SKIPPED and one is INCLUDED', async () => {
      const rawRows: IStockBulkLoadRawRow[] = [
        { rowNumber: 2, rawInternalCode: 'P0001', rawQuantity: '10' },
        { rowNumber: 3, rawInternalCode: 'P0001', rawQuantity: null }, // Skipped
      ];

      const result = await validator.validate(rawRows);

      expect(result.valid).toBe(true);
      expect(result.rows[0].status).toBe(StockBulkLoadRowStatus.INCLUDED_VALID);
      expect(result.rows[1].status).toBe(StockBulkLoadRowStatus.SKIPPED);
    });

    it('flags duplicate code error when two rows have the same code and non-empty quantities', async () => {
      const rawRows: IStockBulkLoadRawRow[] = [
        { rowNumber: 2, rawInternalCode: 'P0001', rawQuantity: '10' },
        { rowNumber: 3, rawInternalCode: 'P0001', rawQuantity: '20' },
      ];

      const result = await validator.validate(rawRows);

      expect(result.valid).toBe(false);
      expect(result.rows[0].status).toBe(
        StockBulkLoadRowStatus.INCLUDED_INVALID,
      );
      expect(result.rows[1].status).toBe(
        StockBulkLoadRowStatus.INCLUDED_INVALID,
      );
      expect(result.rows[0].errors[0].code).toBe(
        StockBulkRowErrorCode.DUPLICATE_INTERNAL_CODE,
      );
    });
  });

  describe('2. Checksum Invariance & Canonical Hashing', () => {
    it('produces identical contentChecksum regardless of informative column values', async () => {
      const file1: IStockBulkLoadRawRow[] = [
        {
          rowNumber: 2,
          rawInternalCode: 'P0001',
          rawProductName: 'Amoxicilina 500mg',
          rawBaseUnit: 'Comprimido (cmp)',
          rawQuantity: '50.00',
        },
      ];

      const file2: IStockBulkLoadRawRow[] = [
        {
          rowNumber: 2,
          rawInternalCode: 'P0001',
          rawProductName: 'Modified Informative Name',
          rawBaseUnit: 'Different Unit String',
          rawQuantity: '50.00',
        },
      ];

      const res1 = await validator.validate(file1);
      const res2 = await validator.validate(file2);

      expect(res1.contentChecksum).toBeDefined();
      expect(res1.contentChecksum).toBe(res2.contentChecksum);
    });

    it('computes contentChecksum strictly across INCLUDED_VALID rows', async () => {
      const withSkipped: IStockBulkLoadRawRow[] = [
        { rowNumber: 2, rawInternalCode: 'P0001', rawQuantity: '50.00' },
        { rowNumber: 3, rawInternalCode: 'P0002', rawQuantity: null },
      ];

      const withoutSkipped: IStockBulkLoadRawRow[] = [
        { rowNumber: 2, rawInternalCode: 'P0001', rawQuantity: '50.00' },
      ];

      const res1 = await validator.validate(withSkipped);
      const res2 = await validator.validate(withoutSkipped);

      expect(res1.contentChecksum).toBe(res2.contentChecksum);
    });
  });

  describe('3. Domain Validation Invariants for Included Rows', () => {
    it('flags PRODUCT_INACTIVE when an included row targets an inactive product', async () => {
      const rawRows: IStockBulkLoadRawRow[] = [
        { rowNumber: 2, rawInternalCode: 'P0003', rawQuantity: '10' },
      ];

      const result = await validator.validate(rawRows);

      expect(result.valid).toBe(false);
      expect(result.rows[0].status).toBe(
        StockBulkLoadRowStatus.INCLUDED_INVALID,
      );
      expect(result.rows[0].errors[0].code).toBe(
        StockBulkRowErrorCode.PRODUCT_INACTIVE,
      );
    });

    it('flags ZERO_QUANTITY, NEGATIVE_QUANTITY, and EXCESSIVE_DECIMAL_SCALE', async () => {
      const rawRows: IStockBulkLoadRawRow[] = [
        { rowNumber: 2, rawInternalCode: 'P0001', rawQuantity: '0' },
        { rowNumber: 3, rawInternalCode: 'P0002', rawQuantity: '-5' },
        { rowNumber: 4, rawInternalCode: 'P0001', rawQuantity: '10.555' },
      ];

      const result = await validator.validate(rawRows);

      expect(result.valid).toBe(false);
      expect(result.rows[0].errors[0].code).toBe(
        StockBulkRowErrorCode.ZERO_QUANTITY,
      );
      expect(result.rows[1].errors[0].code).toBe(
        StockBulkRowErrorCode.NEGATIVE_QUANTITY,
      );
      expect(result.rows[2].errors[0].code).toBe(
        StockBulkRowErrorCode.EXCESSIVE_DECIMAL_SCALE,
      );
    });
  });
});
