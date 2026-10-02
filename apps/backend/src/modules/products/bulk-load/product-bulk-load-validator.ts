import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Decimal from 'decimal.js';
import * as crypto from 'crypto';
import {
  PRODUCT_IVA_RATES,
  ProductTaxTreatment,
  ProductBulkRowErrorCode,
  ProductBulkLoadRowStatus,
  IProductBulkLoadRawRow,
  IProductBulkLoadValidatedRow,
  IProductBulkLoadRowProduct,
  IProductBulkLoadRowError,
  IProductBulkLoadSummary,
  IProductBulkConversionDto,
} from '@erp/shared-types';
import { Product } from '../entities/product.entity';
import { Category } from '../../categories/entities/category.entity';
import { Unit } from '../../units/entities/unit.entity';
import { PricesService } from '../../prices/prices.service';

export const MAX_COST_NET = new Decimal('99999999.9999');
export const MAX_ACTIVE_PRICE = new Decimal('9999999999.99');
export const MAX_MIN_STOCK = new Decimal('9999999999.99');
export const MAX_INITIAL_STOCK = new Decimal('999999999999.99');
export const MAX_CONVERSION_FACTOR = new Decimal('999999.9999');

export interface ProductBulkValidationResult {
  valid: boolean;
  contentChecksum: string | null;
  summary: IProductBulkLoadSummary;
  rows: IProductBulkLoadValidatedRow[];
}

interface IntermediateRow {
  rowNumber: number;
  name: string;
  normalizedName: string;
  rawCategory?: string;
  rawBaseUnit?: string;
  costNet: number | null;
  activePriceNet: number | null;
  description: string | null;
  minStock: number;
  initialStock: number;
  markupPercentage: number | null;
  taxTreatment: ProductTaxTreatment;
  ivaPercentage: number | null;
  rawConversionsParsed: { unitName: string; factor: number }[];
  errors: IProductBulkLoadRowError[];
}

@Injectable()
export class ProductBulkLoadValidator {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    private readonly pricesService: PricesService,
  ) {}

  async validate(
    rawRows: IProductBulkLoadRawRow[],
  ): Promise<ProductBulkValidationResult> {
    const intermediateRows: IntermediateRow[] = [];
    const seenNamesInFile = new Map<string, number[]>(); // normalizedName -> rowNumbers

    // 1. First Pass: Syntax, data types, ranges and internal duplicate detection
    for (const raw of rawRows) {
      const errors: IProductBulkLoadRowError[] = [];
      const trimmedName = (raw.rawName || '').trim();
      const normalizedName = trimmedName.toUpperCase();

      if (raw.hasFormula) {
        errors.push({
          code: ProductBulkRowErrorCode.FORMULA_NOT_ALLOWED,
          message: 'No se permiten fórmulas en el archivo.',
        });
      }

      // Name validation
      if (!trimmedName) {
        errors.push({
          code: ProductBulkRowErrorCode.EMPTY_PRODUCT_NAME,
          field: 'name',
          message: 'El nombre del producto es obligatorio.',
        });
      } else if (trimmedName.length > 150) {
        errors.push({
          code: ProductBulkRowErrorCode.PRODUCT_NAME_TOO_LONG,
          field: 'name',
          message:
            'El nombre del producto no puede exceder los 150 caracteres.',
        });
      } else {
        const rows = seenNamesInFile.get(normalizedName) || [];
        rows.push(raw.rowNumber);
        seenNamesInFile.set(normalizedName, rows);
      }

      // Description
      let description: string | null = null;
      if (raw.rawDescription !== null && raw.rawDescription !== undefined) {
        const trimmedDesc = String(raw.rawDescription).trim();
        if (trimmedDesc.length > 500) {
          errors.push({
            code: ProductBulkRowErrorCode.PRODUCT_NAME_TOO_LONG,
            field: 'description',
            message: 'La descripción no puede exceder los 500 caracteres.',
          });
        } else if (trimmedDesc !== '') {
          description = trimmedDesc;
        }
      }

      // Category presence
      const rawCategory = raw.rawCategory?.trim();
      if (!rawCategory) {
        errors.push({
          code: ProductBulkRowErrorCode.CATEGORY_EMPTY,
          field: 'category',
          message: 'La categoría del producto es obligatoria.',
        });
      }

      // Base Unit presence
      const rawBaseUnit = raw.rawBaseUnit?.trim();
      if (!rawBaseUnit) {
        errors.push({
          code: ProductBulkRowErrorCode.BASE_UNIT_EMPTY,
          field: 'baseUnit',
          message: 'La unidad base del producto es obligatoria.',
        });
      }

      // Cost Net
      let parsedCostNet: number | null = null;
      if (
        raw.rawCostNet === null ||
        raw.rawCostNet === undefined ||
        String(raw.rawCostNet).trim() === ''
      ) {
        errors.push({
          code: ProductBulkRowErrorCode.INVALID_COST_NET,
          field: 'costNet',
          message: 'El costo neto es obligatorio.',
        });
      } else {
        try {
          const dec = new Decimal(
            String(raw.rawCostNet).trim().replace(',', '.'),
          );
          if (!dec.isFinite() || dec.isNegative() || isNaN(dec.toNumber())) {
            errors.push({
              code: ProductBulkRowErrorCode.INVALID_COST_NET,
              field: 'costNet',
              message:
                'El costo neto debe ser un valor numérico mayor o igual a 0.',
            });
          } else if (dec.greaterThan(MAX_COST_NET)) {
            errors.push({
              code: ProductBulkRowErrorCode.INVALID_COST_NET,
              field: 'costNet',
              message: `El costo neto no puede exceder ${MAX_COST_NET.toFixed(4)}.`,
            });
          } else if (dec.decimalPlaces() > 4) {
            errors.push({
              code: ProductBulkRowErrorCode.INVALID_COST_NET,
              field: 'costNet',
              message: 'El costo neto no puede tener más de 4 decimales.',
            });
          } else {
            parsedCostNet = dec.toNumber();
          }
        } catch {
          errors.push({
            code: ProductBulkRowErrorCode.INVALID_COST_NET,
            field: 'costNet',
            message: 'El costo neto debe ser un valor numérico válido.',
          });
        }
      }

      // Active Price Net
      let parsedPriceNet: number | null = null;
      if (
        raw.rawActivePriceNet === null ||
        raw.rawActivePriceNet === undefined ||
        String(raw.rawActivePriceNet).trim() === ''
      ) {
        errors.push({
          code: ProductBulkRowErrorCode.INVALID_ACTIVE_PRICE_NET,
          field: 'activePriceNet',
          message: 'El precio de venta es obligatorio.',
        });
      } else {
        try {
          const dec = new Decimal(
            String(raw.rawActivePriceNet).trim().replace(',', '.'),
          );
          if (!dec.isFinite() || dec.isNegative() || isNaN(dec.toNumber())) {
            errors.push({
              code: ProductBulkRowErrorCode.INVALID_ACTIVE_PRICE_NET,
              field: 'activePriceNet',
              message:
                'El precio de venta debe ser un valor numérico mayor o igual a 0.',
            });
          } else if (dec.greaterThan(MAX_ACTIVE_PRICE)) {
            errors.push({
              code: ProductBulkRowErrorCode.INVALID_ACTIVE_PRICE_NET,
              field: 'activePriceNet',
              message: `El precio de venta no puede exceder ${MAX_ACTIVE_PRICE.toFixed(2)}.`,
            });
          } else if (dec.decimalPlaces() > 2) {
            errors.push({
              code: ProductBulkRowErrorCode.INVALID_ACTIVE_PRICE_NET,
              field: 'activePriceNet',
              message: 'El precio de venta no puede tener más de 2 decimales.',
            });
          } else {
            parsedPriceNet = dec.toNumber();
          }
        } catch {
          errors.push({
            code: ProductBulkRowErrorCode.INVALID_ACTIVE_PRICE_NET,
            field: 'activePriceNet',
            message: 'El precio de venta debe ser un valor numérico válido.',
          });
        }
      }

      // Min Stock
      let parsedMinStock = 0;
      if (
        raw.rawMinStock !== null &&
        raw.rawMinStock !== undefined &&
        String(raw.rawMinStock).trim() !== ''
      ) {
        try {
          const dec = new Decimal(
            String(raw.rawMinStock).trim().replace(',', '.'),
          );
          if (!dec.isFinite() || dec.isNegative() || isNaN(dec.toNumber())) {
            errors.push({
              code: ProductBulkRowErrorCode.INVALID_MIN_STOCK,
              field: 'minStock',
              message: 'El stock mínimo no puede ser negativo.',
            });
          } else if (dec.greaterThan(MAX_MIN_STOCK)) {
            errors.push({
              code: ProductBulkRowErrorCode.INVALID_MIN_STOCK,
              field: 'minStock',
              message: `El stock mínimo no puede exceder ${MAX_MIN_STOCK.toFixed(2)}.`,
            });
          } else if (dec.decimalPlaces() > 2) {
            errors.push({
              code: ProductBulkRowErrorCode.INVALID_MIN_STOCK,
              field: 'minStock',
              message: 'El stock mínimo no puede tener más de 2 decimales.',
            });
          } else {
            parsedMinStock = dec.toNumber();
          }
        } catch {
          errors.push({
            code: ProductBulkRowErrorCode.INVALID_MIN_STOCK,
            field: 'minStock',
            message: 'El stock mínimo debe ser un número válido.',
          });
        }
      }

      // Initial Stock
      let parsedInitialStock = 0;
      if (
        raw.rawInitialStock !== null &&
        raw.rawInitialStock !== undefined &&
        String(raw.rawInitialStock).trim() !== ''
      ) {
        try {
          const dec = new Decimal(
            String(raw.rawInitialStock).trim().replace(',', '.'),
          );
          if (!dec.isFinite() || dec.isNegative() || isNaN(dec.toNumber())) {
            errors.push({
              code: ProductBulkRowErrorCode.INVALID_INITIAL_STOCK,
              field: 'initialStock',
              message: 'El stock inicial no puede ser negativo.',
            });
          } else if (dec.greaterThan(MAX_INITIAL_STOCK)) {
            errors.push({
              code: ProductBulkRowErrorCode.INVALID_INITIAL_STOCK,
              field: 'initialStock',
              message: `El stock inicial no puede exceder ${MAX_INITIAL_STOCK.toFixed(2)}.`,
            });
          } else if (dec.decimalPlaces() > 2) {
            errors.push({
              code: ProductBulkRowErrorCode.INVALID_INITIAL_STOCK,
              field: 'initialStock',
              message: 'El stock inicial no puede tener más de 2 decimales.',
            });
          } else {
            parsedInitialStock = dec.toNumber();
          }
        } catch {
          errors.push({
            code: ProductBulkRowErrorCode.INVALID_INITIAL_STOCK,
            field: 'initialStock',
            message: 'El stock inicial debe ser un número válido.',
          });
        }
      }

      // Markup Percentage
      let parsedMarkup: number | null = null;
      if (
        raw.rawMarkupPercentage !== null &&
        raw.rawMarkupPercentage !== undefined &&
        String(raw.rawMarkupPercentage).trim() !== ''
      ) {
        try {
          const dec = new Decimal(
            String(raw.rawMarkupPercentage).trim().replace(',', '.'),
          );
          if (!dec.isFinite() || dec.isNegative() || isNaN(dec.toNumber())) {
            errors.push({
              code: ProductBulkRowErrorCode.INVALID_MARKUP_PERCENTAGE,
              field: 'markupPercentage',
              message: 'El porcentaje de markup no puede ser negativo.',
            });
          } else if (dec.greaterThan(1000)) {
            errors.push({
              code: ProductBulkRowErrorCode.INVALID_MARKUP_PERCENTAGE,
              field: 'markupPercentage',
              message: 'El porcentaje de markup no puede exceder 1000%.',
            });
          } else if (dec.decimalPlaces() > 4) {
            errors.push({
              code: ProductBulkRowErrorCode.INVALID_MARKUP_PERCENTAGE,
              field: 'markupPercentage',
              message:
                'El porcentaje de markup no puede tener más de 4 decimales.',
            });
          } else {
            parsedMarkup = dec.toNumber();
          }
        } catch {
          errors.push({
            code: ProductBulkRowErrorCode.INVALID_MARKUP_PERCENTAGE,
            field: 'markupPercentage',
            message: 'El porcentaje de markup debe ser un número válido.',
          });
        }
      }

      // Tax Treatment & IVA
      let taxTreatment = ProductTaxTreatment.GRAVADO;
      if (raw.rawTaxTreatment) {
        const upperTax = raw.rawTaxTreatment.trim().toUpperCase();
        if (upperTax === 'GRAVADO' || upperTax === 'IVA_GRAVADO') {
          taxTreatment = ProductTaxTreatment.GRAVADO;
        } else if (upperTax === 'EXENTO') {
          taxTreatment = ProductTaxTreatment.EXENTO;
        } else if (upperTax === 'NO_GRAVADO' || upperTax === 'NOGRAVADO') {
          taxTreatment = ProductTaxTreatment.NO_GRAVADO;
        } else {
          errors.push({
            code: ProductBulkRowErrorCode.INVALID_TAX_TREATMENT,
            field: 'taxTreatment',
            message:
              'El tratamiento fiscal debe ser GRAVADO, EXENTO o NO_GRAVADO.',
          });
        }
      }

      let parsedIva: number | null = null;
      if (taxTreatment === ProductTaxTreatment.GRAVADO) {
        parsedIva = 21; // Default
        if (
          raw.rawIvaPercentage !== null &&
          raw.rawIvaPercentage !== undefined &&
          String(raw.rawIvaPercentage).trim() !== ''
        ) {
          const numIva = Number(
            String(raw.rawIvaPercentage).trim().replace(',', '.'),
          );
          if (
            isNaN(numIva) ||
            !(PRODUCT_IVA_RATES as readonly number[]).includes(numIva)
          ) {
            errors.push({
              code: ProductBulkRowErrorCode.INVALID_IVA_PERCENTAGE,
              field: 'ivaPercentage',
              message: 'La alícuota de IVA debe ser 0, 2.5, 5, 10.5, 21 o 27.',
            });
          } else {
            parsedIva = numIva;
          }
        }
      } else {
        if (
          raw.rawIvaPercentage !== null &&
          raw.rawIvaPercentage !== undefined &&
          String(raw.rawIvaPercentage).trim() !== ''
        ) {
          errors.push({
            code: ProductBulkRowErrorCode.IVA_NOT_ALLOWED,
            field: 'ivaPercentage',
            message:
              'Los productos exentos o no gravados no admiten una alícuota de IVA.',
          });
        }
      }

      // Conversions parsing (e.g. "Caja:10; Blister:5" or "Caja:10, Blister:5")
      const rawConversionsParsed: { unitName: string; factor: number }[] = [];
      if (raw.rawConversions) {
        const tokens = raw.rawConversions
          .split(/[;,]/)
          .map((t) => t.trim())
          .filter((t) => t.length > 0);

        const seenUnitsInRow = new Set<string>();

        for (const token of tokens) {
          const parts = token.split(':').map((p) => p.trim());
          if (parts.length !== 2 || !parts[0] || !parts[1]) {
            errors.push({
              code: ProductBulkRowErrorCode.INVALID_CONVERSIONS_SYNTAX,
              field: 'conversions',
              message: `Formato de conversión inválido "${token}". Utiliza "Presentacion:Factor" (ej. Caja:10).`,
            });
            continue;
          }

          const unitName = parts[0];
          const normUnit = unitName.toLowerCase();
          if (seenUnitsInRow.has(normUnit)) {
            errors.push({
              code: ProductBulkRowErrorCode.DUPLICATE_CONVERSION_UNIT,
              field: 'conversions',
              message: `La unidad de presentación "${unitName}" está duplicada en las conversiones de la fila.`,
            });
            continue;
          }
          seenUnitsInRow.add(normUnit);

          try {
            const factorDec = new Decimal(parts[1].replace(',', '.'));
            if (
              !factorDec.isFinite() ||
              factorDec.lessThanOrEqualTo(0) ||
              isNaN(factorDec.toNumber())
            ) {
              errors.push({
                code: ProductBulkRowErrorCode.INVALID_CONVERSION_FACTOR,
                field: 'conversions',
                message: `El factor de conversión para "${unitName}" debe ser un número positivo mayor a 0.`,
              });
            } else if (factorDec.greaterThan(MAX_CONVERSION_FACTOR)) {
              errors.push({
                code: ProductBulkRowErrorCode.INVALID_CONVERSION_FACTOR,
                field: 'conversions',
                message: `El factor de conversión para "${unitName}" no puede exceder ${MAX_CONVERSION_FACTOR.toFixed(4)}.`,
              });
            } else if (factorDec.decimalPlaces() > 4) {
              errors.push({
                code: ProductBulkRowErrorCode.INVALID_CONVERSION_FACTOR,
                field: 'conversions',
                message: `El factor de conversión para "${unitName}" no puede tener más de 4 decimales.`,
              });
            } else {
              rawConversionsParsed.push({
                unitName,
                factor: factorDec.toNumber(),
              });
            }
          } catch {
            errors.push({
              code: ProductBulkRowErrorCode.INVALID_CONVERSION_FACTOR,
              field: 'conversions',
              message: `El factor de conversión para "${unitName}" debe ser un número válido.`,
            });
          }
        }
      }

      intermediateRows.push({
        rowNumber: raw.rowNumber,
        name: trimmedName,
        normalizedName,
        rawCategory,
        rawBaseUnit,
        costNet: parsedCostNet,
        activePriceNet: parsedPriceNet,
        description,
        minStock: parsedMinStock,
        initialStock: parsedInitialStock,
        markupPercentage: parsedMarkup,
        taxTreatment,
        ivaPercentage: parsedIva,
        rawConversionsParsed,
        errors,
      });
    }

    // Flag file duplicate product names
    for (const row of intermediateRows) {
      if (row.normalizedName) {
        const occurrences = seenNamesInFile.get(row.normalizedName);
        if (occurrences && occurrences.length > 1) {
          row.errors.push({
            code: ProductBulkRowErrorCode.DUPLICATE_PRODUCT_NAME_IN_FILE,
            field: 'name',
            message: `El nombre "${row.name}" aparece duplicado en el archivo (filas ${occurrences.join(', ')}).`,
          });
        }
      }
    }

    // 2. Second Pass: Batch queries to DB for Categories, Units, and Existing Catalog Products
    const [allCategories, allUnits] = await Promise.all([
      this.categoryRepository.find(),
      this.unitRepository.find(),
    ]);

    // Categories lookup map (by normalized name)
    const categoryMap = new Map<string, Category>();
    for (const cat of allCategories) {
      categoryMap.set(cat.name.trim().toLowerCase(), cat);
    }

    // Units lookup map (by normalized name AND symbol)
    const unitMap = new Map<string, Unit>();
    for (const u of allUnits) {
      unitMap.set(u.name.trim().toLowerCase(), u);
      if (u.symbol) {
        unitMap.set(u.symbol.trim().toLowerCase(), u);
      }
    }

    // Check for catalog duplicates in DB
    const validNamesToQuery = Array.from(
      new Set(
        intermediateRows.filter((r) => r.normalizedName).map((r) => r.name),
      ),
    );

    const existingCatalogNames = new Set<string>();
    if (validNamesToQuery.length > 0) {
      const existing = await this.productRepository
        .createQueryBuilder('p')
        .select(['UPPER(TRIM(p.name)) as upper_name'])
        .where('UPPER(TRIM(p.name)) IN (:...names)', {
          names: validNamesToQuery.map((n) => n.toUpperCase()),
        })
        .getRawMany();

      for (const row of existing) {
        if (row.upper_name) {
          existingCatalogNames.add(row.upper_name);
        }
      }
    }

    // 3. Third Pass: Entity resolution, suggestions, and final row assembly
    const validatedRows: IProductBulkLoadValidatedRow[] = [];
    let totalInitialStockDecimal = new Decimal(0);

    for (const row of intermediateRows) {
      // Check existing in catalog
      if (row.normalizedName && existingCatalogNames.has(row.normalizedName)) {
        row.errors.push({
          code: ProductBulkRowErrorCode.PRODUCT_NAME_ALREADY_EXISTS,
          field: 'name',
          message: `Ya existe un producto en el catálogo con el nombre "${row.name}".`,
        });
      }

      // Resolve Category
      let resolvedCategory: Category | null = null;
      if (row.rawCategory) {
        resolvedCategory =
          categoryMap.get(row.rawCategory.toLowerCase()) ?? null;
        if (!resolvedCategory) {
          row.errors.push({
            code: ProductBulkRowErrorCode.CATEGORY_NOT_FOUND,
            field: 'category',
            message: `La categoría "${row.rawCategory}" no existe en el sistema.`,
          });
        }
      }

      // Resolve Base Unit
      let resolvedBaseUnit: Unit | null = null;
      if (row.rawBaseUnit) {
        resolvedBaseUnit = unitMap.get(row.rawBaseUnit.toLowerCase()) ?? null;
        if (!resolvedBaseUnit) {
          row.errors.push({
            code: ProductBulkRowErrorCode.BASE_UNIT_NOT_FOUND,
            field: 'baseUnit',
            message: `La unidad base "${row.rawBaseUnit}" no existe en el sistema.`,
          });
        }
      }

      // Resolve Conversions
      const resolvedConversions: IProductBulkConversionDto[] = [];
      for (const conv of row.rawConversionsParsed) {
        const presUnit = unitMap.get(conv.unitName.toLowerCase());
        if (!presUnit) {
          row.errors.push({
            code: ProductBulkRowErrorCode.CONVERSION_UNIT_NOT_FOUND,
            field: 'conversions',
            message: `La unidad de presentación "${conv.unitName}" no existe en el sistema.`,
          });
          continue;
        }

        if (resolvedBaseUnit && presUnit.id === resolvedBaseUnit.id) {
          row.errors.push({
            code: ProductBulkRowErrorCode.CONVERSION_UNIT_EQUALS_BASE,
            field: 'conversions',
            message: `La unidad de presentación "${conv.unitName}" no puede ser igual a la unidad base.`,
          });
          continue;
        }

        resolvedConversions.push({
          presentationUnitId: presUnit.id,
          presentationUnitName: presUnit.name,
          presentationUnitSymbol: presUnit.symbol,
          conversionFactor: conv.factor,
        });
      }

      const isValid = row.errors.length === 0;
      let resolvedProduct: IProductBulkLoadRowProduct | null = null;

      if (
        isValid &&
        resolvedCategory &&
        resolvedBaseUnit &&
        row.costNet !== null &&
        row.activePriceNet !== null
      ) {
        totalInitialStockDecimal = totalInitialStockDecimal.plus(
          row.initialStock,
        );

        const suggestedPriceNet = Number(
          this.pricesService.calculateSuggestedPrice(
            row.costNet,
            row.markupPercentage ?? 0,
          ),
        );

        resolvedProduct = {
          name: row.name,
          description: row.description,
          categoryName: resolvedCategory.name,
          categoryId: resolvedCategory.id,
          baseUnitName: resolvedBaseUnit.name,
          baseUnitSymbol: resolvedBaseUnit.symbol,
          baseUnitId: resolvedBaseUnit.id,
          costNet: row.costNet,
          activePriceNet: row.activePriceNet,
          minStock: row.minStock,
          initialStock: row.initialStock,
          markupPercentage: row.markupPercentage,
          suggestedPriceNet,
          taxTreatment: row.taxTreatment,
          ivaPercentage: row.ivaPercentage,
          conversions: resolvedConversions,
        };
      }

      validatedRows.push({
        rowNumber: row.rowNumber,
        name: row.name,
        status: isValid
          ? ProductBulkLoadRowStatus.VALID
          : ProductBulkLoadRowStatus.INVALID,
        product: resolvedProduct,
        errors: row.errors,
      });
    }

    const totalRows = validatedRows.length;
    const validRows = validatedRows.filter(
      (r) => r.status === ProductBulkLoadRowStatus.VALID,
    ).length;
    const invalidRows = validatedRows.filter(
      (r) => r.status === ProductBulkLoadRowStatus.INVALID,
    ).length;

    const valid = totalRows > 0 && invalidRows === 0;

    // 4. Compute canonical content checksum across valid rows sorted by name ASC
    let contentChecksum: string | null = null;
    if (valid) {
      const canonicalEntries = validatedRows.map((r) => {
        const p = r.product!;
        const convStr = p.conversions
          .slice()
          .sort((a, b) =>
            a.presentationUnitId.localeCompare(b.presentationUnitId),
          )
          .map(
            (c) =>
              `${c.presentationUnitId}:${new Decimal(c.conversionFactor).toFixed(4)}`,
          )
          .join('|');

        return [
          p.name,
          p.categoryId,
          p.baseUnitId,
          new Decimal(p.costNet).toFixed(4),
          new Decimal(p.activePriceNet).toFixed(2),
          new Decimal(p.minStock).toFixed(2),
          new Decimal(p.initialStock).toFixed(2),
          p.markupPercentage !== null
            ? new Decimal(p.markupPercentage).toFixed(4)
            : '',
          p.taxTreatment,
          p.ivaPercentage !== null
            ? new Decimal(p.ivaPercentage).toFixed(2)
            : '',
          p.description || '',
          convStr,
        ].join('\t');
      });

      canonicalEntries.sort((a, b) => a.localeCompare(b));
      const canonicalString = canonicalEntries.join('\n') + '\n';

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
        totalInitialStock: totalInitialStockDecimal.toNumber(),
      },
      rows: validatedRows,
    };
  }
}
