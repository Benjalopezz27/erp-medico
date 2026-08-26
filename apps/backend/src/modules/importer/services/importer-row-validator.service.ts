import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { ImporterRowErrorCode, IImporterRowError } from '@erp/shared-types';

export const MAX_COST_VALUE = new Decimal('99999999.9999');
export const MAX_QUANTITY_VALUE = new Decimal('999999999.9999');

@Injectable()
export class ImporterRowValidatorService {
  /**
   * Normalizes a supplier SKU for comparison and index lookup (NFKC, trim, uppercase).
   */
  normalizeSupplierSku(value: string | null | undefined): string {
    if (!value) return '';
    return value.normalize('NFKC').trim().toUpperCase();
  }

  /**
   * Normalizes a unit name or symbol (NFKC, trim, lowercase, collapsed spaces).
   */
  normalizeUnit(value: string | null | undefined): string {
    if (!value) return '';
    return value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * Evaluates and parses a raw cell value into a canonical cost string using exact grammar rules.
   */
  parseCost(
    rawValue: unknown,
    rowNumber: number,
  ): { costCanonical: string | null; error?: IImporterRowError } {
    if (
      rawValue === null ||
      rawValue === undefined ||
      (typeof rawValue === 'string' && rawValue.trim() === '')
    ) {
      return {
        costCanonical: null,
        error: {
          rowNumber,
          field: 'usualCostNet',
          code: ImporterRowErrorCode.ROW_COST_EMPTY,
          message: 'El costo neto es obligatorio.',
          rawValue: rawValue as any,
        },
      };
    }

    if (typeof rawValue === 'number') {
      if (!Number.isFinite(rawValue)) {
        return {
          costCanonical: null,
          error: {
            rowNumber,
            field: 'usualCostNet',
            code: ImporterRowErrorCode.ROW_COST_NOT_NUMERIC,
            message: 'El costo neto debe ser un valor numérico válido.',
            rawValue,
          },
        };
      }
      const d = new Decimal(rawValue);
      return this.validateCostDecimal(d, rowNumber, rawValue);
    }

    if (typeof rawValue !== 'string') {
      return {
        costCanonical: null,
        error: {
          rowNumber,
          field: 'usualCostNet',
          code: ImporterRowErrorCode.ROW_COST_NOT_NUMERIC,
          message: 'El costo neto debe ser un valor numérico válido.',
          rawValue: String(rawValue),
        },
      };
    }

    // String normalization and grammar validation: strip only allowed currency prefixes/suffixes
    let str = rawValue
      .normalize('NFKC')
      .trim()
      .replace(/^(?:\$|ARS|USD)\s*/i, '')
      .replace(/\s*(?:\$|ARS|USD)$/i, '')
      .trim();

    if (str === '') {
      return {
        costCanonical: null,
        error: {
          rowNumber,
          field: 'usualCostNet',
          code: ImporterRowErrorCode.ROW_COST_EMPTY,
          message: 'El costo neto es obligatorio.',
          rawValue,
        },
      };
    }

    // Check for illegal characters (anything other than digits, dot, comma, plus, minus)
    if (!/^[+-]?[\d.,]+$/.test(str)) {
      return {
        costCanonical: null,
        error: {
          rowNumber,
          field: 'usualCostNet',
          code: ImporterRowErrorCode.ROW_COST_NOT_NUMERIC,
          message: 'El costo neto contiene caracteres no numéricos inválidos.',
          rawValue,
        },
      };
    }

    // Detect ambiguous formats: 1.250 or 1,250 (1-3 digits followed by single dot/comma and exactly 3 digits)
    if (/^[+-]?\d{1,3}[\.,]\d{3}$/.test(str)) {
      return {
        costCanonical: null,
        error: {
          rowNumber,
          field: 'usualCostNet',
          code: ImporterRowErrorCode.ROW_COST_AMBIGUOUS_FORMAT,
          message:
            'El formato del costo es ambiguo (ej: 1.250 o 1,250). Utilice formato estándar con decimales explícitos (ej: 1250 o 1250.00).',
          rawValue,
        },
      };
    }

    // Grouping & Decimal resolution
    let normalizedNumStr: string;
    const hasDot = str.includes('.');
    const hasComma = str.includes(',');

    if (hasDot && hasComma) {
      const lastDot = str.lastIndexOf('.');
      const lastComma = str.lastIndexOf(',');

      if (lastComma > lastDot) {
        // Argentine format: 1.250,50 -> thousands dot, decimal comma
        const integerPart = str.slice(0, lastComma);
        const decimalPart = str.slice(lastComma + 1);

        // Verify thousands groupings: \d{1,3}(\.\d{3})+
        if (!/^[+-]?\d{1,3}(\.\d{3})+$/.test(integerPart)) {
          return {
            costCanonical: null,
            error: {
              rowNumber,
              field: 'usualCostNet',
              code: ImporterRowErrorCode.ROW_COST_NOT_NUMERIC,
              message:
                'El formato de separador de miles es inválido para el costo.',
              rawValue,
            },
          };
        }
        normalizedNumStr = `${integerPart.replace(/\./g, '')}.${decimalPart}`;
      } else {
        // US format: 1,250.50 -> thousands comma, decimal dot
        const integerPart = str.slice(0, lastDot);
        const decimalPart = str.slice(lastDot + 1);

        // Verify thousands groupings: \d{1,3}(,\d{3})+
        if (!/^[+-]?\d{1,3}(,\d{3})+$/.test(integerPart)) {
          return {
            costCanonical: null,
            error: {
              rowNumber,
              field: 'usualCostNet',
              code: ImporterRowErrorCode.ROW_COST_NOT_NUMERIC,
              message:
                'El formato de separador de miles es inválido para el costo.',
              rawValue,
            },
          };
        }
        normalizedNumStr = `${integerPart.replace(/,/g, '')}.${decimalPart}`;
      }
    } else if (hasComma) {
      // Multiple commas or single decimal comma
      const commaCount = (str.match(/,/g) || []).length;
      if (commaCount > 1) {
        return {
          costCanonical: null,
          error: {
            rowNumber,
            field: 'usualCostNet',
            code: ImporterRowErrorCode.ROW_COST_NOT_NUMERIC,
            message: 'El costo contiene múltiples comas no válidas.',
            rawValue,
          },
        };
      }
      normalizedNumStr = str.replace(',', '.');
    } else if (hasDot) {
      // Multiple dots or single decimal dot
      const dotCount = (str.match(/\./g) || []).length;
      if (dotCount > 1) {
        return {
          costCanonical: null,
          error: {
            rowNumber,
            field: 'usualCostNet',
            code: ImporterRowErrorCode.ROW_COST_NOT_NUMERIC,
            message: 'El costo contiene múltiples puntos no válidos.',
            rawValue,
          },
        };
      }
      normalizedNumStr = str;
    } else {
      // Pure integer
      normalizedNumStr = str;
    }

    try {
      const d = new Decimal(normalizedNumStr);
      return this.validateCostDecimal(d, rowNumber, rawValue);
    } catch {
      return {
        costCanonical: null,
        error: {
          rowNumber,
          field: 'usualCostNet',
          code: ImporterRowErrorCode.ROW_COST_NOT_NUMERIC,
          message: 'El costo neto debe ser un valor numérico válido.',
          rawValue,
        },
      };
    }
  }

  private validateCostDecimal(
    d: Decimal,
    rowNumber: number,
    rawValue: unknown,
  ): { costCanonical: string | null; error?: IImporterRowError } {
    if (!d.isFinite()) {
      return {
        costCanonical: null,
        error: {
          rowNumber,
          field: 'usualCostNet',
          code: ImporterRowErrorCode.ROW_COST_NOT_NUMERIC,
          message: 'El costo neto debe ser un número finito válido.',
          rawValue: rawValue as any,
        },
      };
    }

    if (d.isZero()) {
      return {
        costCanonical: null,
        error: {
          rowNumber,
          field: 'usualCostNet',
          code: ImporterRowErrorCode.ROW_COST_ZERO,
          message: 'El costo neto debe ser estrictamente mayor a cero.',
          rawValue: rawValue as any,
        },
      };
    }

    if (d.isNegative()) {
      return {
        costCanonical: null,
        error: {
          rowNumber,
          field: 'usualCostNet',
          code: ImporterRowErrorCode.ROW_COST_NEGATIVE,
          message: 'El costo neto no puede ser negativo.',
          rawValue: rawValue as any,
        },
      };
    }

    if (d.decimalPlaces() > 4) {
      return {
        costCanonical: null,
        error: {
          rowNumber,
          field: 'usualCostNet',
          code: ImporterRowErrorCode.ROW_COST_EXCEEDS_DECIMALS,
          message: 'El costo neto no puede tener más de 4 decimales.',
          rawValue: rawValue as any,
        },
      };
    }

    if (d.greaterThan(MAX_COST_VALUE)) {
      return {
        costCanonical: null,
        error: {
          rowNumber,
          field: 'usualCostNet',
          code: ImporterRowErrorCode.ROW_COST_EXCEEDS_MAX,
          message: `El costo neto supera el valor máximo permitido de ${MAX_COST_VALUE.toString()}.`,
          rawValue: rawValue as any,
        },
      };
    }

    return { costCanonical: d.toFixed(4) };
  }

  /**
   * Parses an informational quantity field.
   */
  parseQuantity(
    rawValue: unknown,
    rowNumber: number,
    isMapped: boolean,
  ): {
    rawQuantity: string | null;
    quantityCanonical: string | null;
    error?: IImporterRowError;
  } {
    if (!isMapped) {
      return { rawQuantity: null, quantityCanonical: null };
    }

    if (
      rawValue === null ||
      rawValue === undefined ||
      (typeof rawValue === 'string' && rawValue.trim() === '')
    ) {
      return { rawQuantity: null, quantityCanonical: null };
    }

    const rawStr = String(rawValue).trim();

    try {
      const normalizedStr =
        rawStr.includes(',') && !rawStr.includes('.')
          ? rawStr.replace(',', '.')
          : rawStr;
      const d = new Decimal(normalizedStr);

      if (!d.isFinite()) {
        return {
          rawQuantity: rawStr,
          quantityCanonical: null,
          error: {
            rowNumber,
            field: 'rawQuantity',
            code: ImporterRowErrorCode.ROW_QUANTITY_NOT_NUMERIC,
            message:
              'La cantidad informativa debe ser un valor numérico válido.',
            rawValue: rawStr,
          },
        };
      }

      if (d.lessThanOrEqualTo(0)) {
        return {
          rawQuantity: rawStr,
          quantityCanonical: null,
          error: {
            rowNumber,
            field: 'rawQuantity',
            code: ImporterRowErrorCode.ROW_QUANTITY_ZERO_OR_NEGATIVE,
            message:
              'La cantidad informativa debe ser estrictamente mayor a cero.',
            rawValue: rawStr,
          },
        };
      }

      if (d.decimalPlaces() > 4) {
        return {
          rawQuantity: rawStr,
          quantityCanonical: null,
          error: {
            rowNumber,
            field: 'rawQuantity',
            code: ImporterRowErrorCode.ROW_QUANTITY_EXCEEDS_DECIMALS,
            message:
              'La cantidad informativa no puede tener más de 4 decimales.',
            rawValue: rawStr,
          },
        };
      }

      if (d.greaterThan(MAX_QUANTITY_VALUE)) {
        return {
          rawQuantity: rawStr,
          quantityCanonical: null,
          error: {
            rowNumber,
            field: 'rawQuantity',
            code: ImporterRowErrorCode.ROW_QUANTITY_NOT_NUMERIC,
            message:
              'La cantidad informativa supera el valor máximo permitido.',
            rawValue: rawStr,
          },
        };
      }

      return {
        rawQuantity: rawStr,
        quantityCanonical: d.toFixed(4),
      };
    } catch {
      return {
        rawQuantity: rawStr,
        quantityCanonical: null,
        error: {
          rowNumber,
          field: 'rawQuantity',
          code: ImporterRowErrorCode.ROW_QUANTITY_NOT_NUMERIC,
          message: 'La cantidad informativa debe ser un valor numérico válido.',
          rawValue: rawStr,
        },
      };
    }
  }

  /**
   * Validates and compares the raw purchase unit text against the associated unit.
   */
  validateUnit(
    rawValue: unknown,
    rowNumber: number,
    isMapped: boolean,
    associatedUnit?: { name: string; symbol: string } | null,
  ): {
    rawPurchaseUnit: string | null;
    normalizedUnit: string | null;
    error?: IImporterRowError;
  } {
    if (!isMapped) {
      return { rawPurchaseUnit: null, normalizedUnit: null };
    }

    if (
      rawValue === null ||
      rawValue === undefined ||
      (typeof rawValue === 'string' && rawValue.trim() === '')
    ) {
      return {
        rawPurchaseUnit: null,
        normalizedUnit: null,
        error: {
          rowNumber,
          field: 'purchaseUnit',
          code: ImporterRowErrorCode.ROW_UNIT_EMPTY,
          message:
            'La columna de unidad de compra está mapeada pero la celda está vacía.',
          rawValue: null,
        },
      };
    }

    const rawPurchaseUnit = String(rawValue).trim();
    const normalizedUnit = this.normalizeUnit(rawPurchaseUnit);

    if (associatedUnit) {
      const normName = this.normalizeUnit(associatedUnit.name);
      const normSymbol = this.normalizeUnit(associatedUnit.symbol);

      if (normalizedUnit !== normName && normalizedUnit !== normSymbol) {
        return {
          rawPurchaseUnit,
          normalizedUnit,
          error: {
            rowNumber,
            field: 'purchaseUnit',
            code: ImporterRowErrorCode.ROW_UNIT_INCOMPATIBLE,
            message: `La unidad del archivo ("${rawPurchaseUnit}") no coincide con la unidad de compra registrada para este producto ("${associatedUnit.name}" / "${associatedUnit.symbol}").`,
            rawValue: rawPurchaseUnit,
          },
        };
      }
    }

    return { rawPurchaseUnit, normalizedUnit };
  }
}
