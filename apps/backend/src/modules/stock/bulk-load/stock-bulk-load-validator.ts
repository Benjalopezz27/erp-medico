import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import Decimal from 'decimal.js';
import * as crypto from 'crypto';
import {
  ProductStatus,
  StockBulkRowErrorCode,
  IStockBulkLoadRawRow,
  IStockBulkLoadValidatedRow,
  IStockBulkLoadSummary,
} from '@erp/shared-types';
import { Product } from '../../products/entities/product.entity';
import { parseStockDecimal } from '../utils/stock-math.utils';

export const MAX_CELL_QUANTITY = new Decimal('999999999.99'); // 10^9 - 0.01 (enables 1000 rows to fit in numeric(14,2))
export const MAX_CUMULATIVE_STOCK = new Decimal('999999999999.99'); // PostgreSQL numeric(14,2) ceiling

export interface ValidationResult {
  valid: boolean;
  contentChecksum: string | null;
  summary: IStockBulkLoadSummary;
  rows: IStockBulkLoadValidatedRow[];
}

@Injectable()
export class StockBulkLoadValidator {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  /**
   * Validates raw parsed rows against catalog invariants and business constraints.
   */
  async validate(rawRows: IStockBulkLoadRawRow[]): Promise<ValidationResult> {
    const validatedRows: IStockBulkLoadValidatedRow[] = [];
    const seenCodes = new Set<string>();
    const duplicateCodes = new Set<string>();
    const validCodesToQuery = new Set<string>();

    // 1. First Pass: Code format, syntax, duplicates, and quantity syntax
    for (const raw of rawRows) {
      const errors: { code: StockBulkRowErrorCode; message: string }[] = [];
      const normalizedCode = (raw.rawInternalCode || '').trim().toUpperCase();

      if (!normalizedCode) {
        errors.push({
          code: StockBulkRowErrorCode.EMPTY_INTERNAL_CODE,
          message: 'El código de producto no puede estar vacío.',
        });
      } else if (normalizedCode.length > 50) {
        errors.push({
          code: StockBulkRowErrorCode.INTERNAL_CODE_TOO_LONG,
          message:
            'El código de producto supera la longitud máxima permitida de 50 caracteres.',
        });
      } else {
        if (seenCodes.has(normalizedCode)) {
          duplicateCodes.add(normalizedCode);
        } else {
          seenCodes.add(normalizedCode);
        }
        validCodesToQuery.add(normalizedCode);
      }

      if (raw.hasFormula) {
        errors.push({
          code: StockBulkRowErrorCode.FORMULA_NOT_ALLOWED,
          message: 'No se permiten fórmulas en el archivo.',
        });
      }

      let parsedQuantity: Decimal | null = null;
      let quantityBaseNumber: number | null = null;

      if (
        raw.rawQuantity === null ||
        raw.rawQuantity === undefined ||
        String(raw.rawQuantity).trim() === ''
      ) {
        errors.push({
          code: StockBulkRowErrorCode.EMPTY_QUANTITY,
          message: 'La cantidad a ingresar no puede estar vacía.',
        });
      } else {
        const rawStr = String(raw.rawQuantity).trim().replace(',', '.');
        try {
          parsedQuantity = new Decimal(rawStr);

          if (!parsedQuantity.isFinite() || isNaN(parsedQuantity.toNumber())) {
            errors.push({
              code: StockBulkRowErrorCode.INVALID_QUANTITY,
              message: 'La cantidad debe ser un valor numérico válido.',
            });
            parsedQuantity = null;
          } else if (parsedQuantity.isZero()) {
            errors.push({
              code: StockBulkRowErrorCode.ZERO_QUANTITY,
              message: 'La cantidad no puede ser cero.',
            });
          } else if (parsedQuantity.isNegative()) {
            errors.push({
              code: StockBulkRowErrorCode.NEGATIVE_QUANTITY,
              message: 'La cantidad debe ser un valor positivo.',
            });
          } else if (parsedQuantity.decimalPlaces() > 2) {
            errors.push({
              code: StockBulkRowErrorCode.EXCESSIVE_DECIMAL_SCALE,
              message: 'La cantidad no puede tener más de 2 decimales.',
            });
          } else if (parsedQuantity.greaterThan(MAX_CELL_QUANTITY)) {
            errors.push({
              code: StockBulkRowErrorCode.QUANTITY_OUT_OF_RANGE,
              message: `La cantidad supera el límite individual permitido de ${MAX_CELL_QUANTITY.toFixed(2)}.`,
            });
          } else {
            quantityBaseNumber = parseStockDecimal(
              parsedQuantity.toString(),
              2,
            );
          }
        } catch {
          errors.push({
            code: StockBulkRowErrorCode.INVALID_QUANTITY,
            message: 'La cantidad debe ser un valor numérico válido.',
          });
        }
      }

      validatedRows.push({
        rowNumber: raw.rowNumber,
        internalCode: normalizedCode,
        quantityBase: quantityBaseNumber,
        product: null,
        errors,
        isValid: errors.length === 0,
      });
    }

    // Flag duplicate codes in file
    for (const row of validatedRows) {
      if (row.internalCode && duplicateCodes.has(row.internalCode)) {
        row.errors.push({
          code: StockBulkRowErrorCode.DUPLICATE_INTERNAL_CODE,
          message: `El código "${row.internalCode}" aparece duplicado en el archivo.`,
        });
        row.isValid = false;
      }
    }

    // 2. Second Pass: Batch database query for product catalog resolution
    const productsMap = new Map<string, Product>();
    if (validCodesToQuery.size > 0) {
      const codeList = Array.from(validCodesToQuery);
      const foundProducts = await this.productRepository.find({
        where: { internalCode: In(codeList) },
        relations: ['stock', 'baseUnit'],
      });

      for (const prod of foundProducts) {
        productsMap.set(prod.internalCode.toUpperCase(), prod);
      }
    }

    let totalQuantityDecimal = new Decimal(0);

    // 3. Third Pass: Attach resolved products & verify status/overflow
    for (const row of validatedRows) {
      if (row.internalCode) {
        const product = productsMap.get(row.internalCode);

        if (!product) {
          row.errors.push({
            code: StockBulkRowErrorCode.PRODUCT_NOT_FOUND,
            message: `El producto con código "${row.internalCode}" no existe en el catálogo.`,
          });
          row.isValid = false;
        } else {
          if (product.status !== ProductStatus.ACTIVE) {
            row.errors.push({
              code: StockBulkRowErrorCode.PRODUCT_INACTIVE,
              message: `El producto "${product.name}" (${row.internalCode}) está inactivo en el catálogo.`,
            });
            row.isValid = false;
          }

          const currentBaseStock = product.stock
            ? parseStockDecimal(product.stock.currentBaseStock, 2)
            : 0;
          const currentStockDec = new Decimal(currentBaseStock);
          const additionDec =
            row.quantityBase !== null
              ? new Decimal(row.quantityBase)
              : new Decimal(0);
          const projectedStockDec = currentStockDec.plus(additionDec);

          if (projectedStockDec.greaterThan(MAX_CUMULATIVE_STOCK)) {
            row.errors.push({
              code: StockBulkRowErrorCode.STOCK_OVERFLOW,
              message: `El saldo resultante proyectado superaría el límite máximo permitido de ${MAX_CUMULATIVE_STOCK.toFixed(2)}.`,
            });
            row.isValid = false;
          }

          row.product = {
            id: product.id,
            internalCode: product.internalCode,
            name: product.name,
            currentBaseStock,
            projectedStock: parseStockDecimal(projectedStockDec.toString(), 2),
            baseUnit: {
              id: product.baseUnit?.id || product.baseUnitId,
              name: product.baseUnit?.name || '',
              symbol: product.baseUnit?.symbol || '',
            },
          };
        }
      }

      if (row.isValid && row.quantityBase !== null) {
        totalQuantityDecimal = totalQuantityDecimal.plus(row.quantityBase);
      }
    }

    const totalRows = validatedRows.length;
    const validRows = validatedRows.filter((r) => r.isValid).length;
    const invalidRows = totalRows - validRows;
    const valid = invalidRows === 0 && totalRows > 0;

    // 4. Compute canonical content checksum ONLY when valid is true
    let contentChecksum: string | null = null;
    if (valid) {
      const canonicalEntries = validatedRows.map((r) => ({
        code: r.internalCode,
        qty: new Decimal(r.quantityBase!).toFixed(2),
      }));

      // Sort alphabetically by code ASC
      canonicalEntries.sort((a, b) => a.code.localeCompare(b.code));

      const canonicalString =
        canonicalEntries.map((e) => `${e.code}\t${e.qty}`).join('\n') + '\n';

      contentChecksum = crypto
        .createHash('sha256')
        .update(canonicalString, 'utf8')
        .digest('hex');
    }

    return {
      valid,
      contentChecksum,
      summary: {
        totalRows,
        validRows,
        invalidRows,
        totalQuantityBase: parseStockDecimal(
          totalQuantityDecimal.toString(),
          2,
        ),
      },
      rows: validatedRows,
    };
  }
}
