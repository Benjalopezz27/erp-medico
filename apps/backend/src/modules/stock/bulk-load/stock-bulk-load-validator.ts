import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import Decimal from 'decimal.js';
import * as crypto from 'crypto';
import {
  ProductStatus,
  StockBulkRowErrorCode,
  StockBulkLoadRowStatus,
  IStockBulkLoadRawRow,
  IStockBulkLoadValidatedRow,
  IStockBulkLoadSummary,
} from '@erp/shared-types';
import { Product } from '../../products/entities/product.entity';
import { parseStockDecimal } from '../utils/stock-math.utils';

export const MAX_CELL_QUANTITY = new Decimal('999999999.99'); // 10^9 - 0.01
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
   * Validates raw parsed rows against catalog invariants and business constraints with skipped row support.
   */
  async validate(rawRows: IStockBulkLoadRawRow[]): Promise<ValidationResult> {
    const intermediateRows: {
      rowNumber: number;
      internalCode: string;
      quantityBase: number | null;
      isSkipped: boolean;
      errors: { code: StockBulkRowErrorCode; message: string }[];
    }[] = [];

    const seenIncludedCodes = new Set<string>();
    const duplicateIncludedCodes = new Set<string>();
    const allNormalizedCodesToQuery = new Set<string>();

    // 1. First Pass: Code format, syntax, classification into SKIPPED vs INCLUDED
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
        allNormalizedCodesToQuery.add(normalizedCode);
      }

      if (raw.hasFormula) {
        errors.push({
          code: StockBulkRowErrorCode.FORMULA_NOT_ALLOWED,
          message: 'No se permiten fórmulas en el archivo.',
        });
      }

      const isBlankQuantity =
        raw.rawQuantity === null ||
        raw.rawQuantity === undefined ||
        String(raw.rawQuantity).trim() === '';

      let isSkipped = false;
      let parsedQuantity: Decimal | null = null;
      let quantityBaseNumber: number | null = null;

      if (isBlankQuantity) {
        if (!raw.hasFormula) {
          isSkipped = true;
        }
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

      // Track duplicate codes strictly among INCLUDED rows
      if (!isSkipped && normalizedCode) {
        if (seenIncludedCodes.has(normalizedCode)) {
          duplicateIncludedCodes.add(normalizedCode);
        } else {
          seenIncludedCodes.add(normalizedCode);
        }
      }

      intermediateRows.push({
        rowNumber: raw.rowNumber,
        internalCode: normalizedCode,
        quantityBase: quantityBaseNumber,
        isSkipped,
        errors,
      });
    }

    // Flag duplicate codes in file (only for included rows)
    for (const row of intermediateRows) {
      if (
        !row.isSkipped &&
        row.internalCode &&
        duplicateIncludedCodes.has(row.internalCode)
      ) {
        row.errors.push({
          code: StockBulkRowErrorCode.DUPLICATE_INTERNAL_CODE,
          message: `El código "${row.internalCode}" aparece duplicado en filas con cantidad a cargar.`,
        });
      }
    }

    // 2. Second Pass: Single unified database query for all normalized codes present in file
    const productsMap = new Map<string, Product>();
    if (allNormalizedCodesToQuery.size > 0) {
      const codeList = Array.from(allNormalizedCodesToQuery);
      const foundProducts = await this.productRepository.find({
        where: { internalCode: In(codeList) },
        relations: ['stock', 'baseUnit'],
      });

      for (const prod of foundProducts) {
        productsMap.set(prod.internalCode.toUpperCase(), prod);
      }
    }

    let totalQuantityDecimal = new Decimal(0);
    const validatedRows: IStockBulkLoadValidatedRow[] = [];

    // 3. Third Pass: Attach resolved products & verify status/overflow for included rows
    for (const row of intermediateRows) {
      const product = row.internalCode
        ? productsMap.get(row.internalCode)
        : null;
      let resolvedProductDto = null;

      if (product) {
        const currentBaseStock = product.stock
          ? parseStockDecimal(product.stock.currentBaseStock, 2)
          : 0;
        const currentStockDec = new Decimal(currentBaseStock);
        const additionDec =
          row.quantityBase !== null
            ? new Decimal(row.quantityBase)
            : new Decimal(0);
        const projectedStockDec = currentStockDec.plus(additionDec);

        resolvedProductDto = {
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

        // For INCLUDED rows: verify active status & overflow
        if (!row.isSkipped) {
          if (product.status !== ProductStatus.ACTIVE) {
            row.errors.push({
              code: StockBulkRowErrorCode.PRODUCT_INACTIVE,
              message: `El producto "${product.name}" (${row.internalCode}) está inactivo en el catálogo.`,
            });
          }

          if (projectedStockDec.greaterThan(MAX_CUMULATIVE_STOCK)) {
            row.errors.push({
              code: StockBulkRowErrorCode.STOCK_OVERFLOW,
              message: `El saldo resultante proyectado superaría el límite máximo permitido de ${MAX_CUMULATIVE_STOCK.toFixed(2)}.`,
            });
          }
        }
      } else if (!row.isSkipped && row.internalCode) {
        // Product not found for an included row
        row.errors.push({
          code: StockBulkRowErrorCode.PRODUCT_NOT_FOUND,
          message: `El producto con código "${row.internalCode}" no existe en el catálogo.`,
        });
      }

      let status: StockBulkLoadRowStatus;
      if (row.isSkipped) {
        status = StockBulkLoadRowStatus.SKIPPED;
      } else if (row.errors.length > 0) {
        status = StockBulkLoadRowStatus.INCLUDED_INVALID;
      } else {
        status = StockBulkLoadRowStatus.INCLUDED_VALID;
        if (row.quantityBase !== null) {
          totalQuantityDecimal = totalQuantityDecimal.plus(row.quantityBase);
        }
      }

      validatedRows.push({
        rowNumber: row.rowNumber,
        internalCode: row.internalCode,
        quantityBase: row.quantityBase,
        status,
        product: resolvedProductDto,
        errors: row.errors,
      });
    }

    const totalRows = validatedRows.length;
    const includedRows = validatedRows.filter(
      (r) => r.status !== StockBulkLoadRowStatus.SKIPPED,
    ).length;
    const skippedRows = validatedRows.filter(
      (r) => r.status === StockBulkLoadRowStatus.SKIPPED,
    ).length;
    const validRows = validatedRows.filter(
      (r) => r.status === StockBulkLoadRowStatus.INCLUDED_VALID,
    ).length;
    const invalidRows = validatedRows.filter(
      (r) => r.status === StockBulkLoadRowStatus.INCLUDED_INVALID,
    ).length;

    const valid = includedRows > 0 && invalidRows === 0;

    // 4. Compute canonical content checksum strictly across INCLUDED_VALID rows
    let contentChecksum: string | null = null;
    if (valid) {
      const canonicalEntries = validatedRows
        .filter((r) => r.status === StockBulkLoadRowStatus.INCLUDED_VALID)
        .map((r) => ({
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
        includedRows,
        skippedRows,
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
