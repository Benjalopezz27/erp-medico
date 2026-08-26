import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import * as crypto from 'crypto';
import {
  ImporterErrorCode,
  ImporterRowErrorCode,
  IImporterPreviewResponse,
  IImporterPreviewSummary,
  IImporterValidRow,
  IImporterUnknownRow,
  IImporterErrorRow,
  IImporterRowError,
  ISupplierImportMapping,
  ProductStatus,
  IImporterCanonicalContentPayload,
  ImporterCanonicalRowTuple,
} from '@erp/shared-types';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { SupplierProduct } from '../../suppliers/supplier-products/entities/supplier-product.entity';
import {
  SecureSpreadsheetParser,
  normalizeHeader,
} from '../../../shared/parsers/secure-spreadsheet-parser';
import { ImporterRowValidatorService } from './importer-row-validator.service';
import { ImporterPreviewMultipartDto } from '../dto';
import { toImporterPreviewResponse } from '../mappers/importer-preview.mapper';

@Injectable()
export class ImporterPreviewService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(SupplierProduct)
    private readonly supplierProductRepo: Repository<SupplierProduct>,
    private readonly rowValidator: ImporterRowValidatorService,
  ) {}

  /**
   * Generates a stateless full-file preview with tri-state row classification and cryptographic checksums.
   * Can be executed within a transaction manager and optionally acquire pessimistic write locks.
   */
  async generatePreview(
    fileBuffer: Buffer,
    originalFilename: string,
    mimetype: string,
    dto: ImporterPreviewMultipartDto,
    manager?: EntityManager,
    acquireLocks: boolean = false,
  ): Promise<IImporterPreviewResponse> {
    const supplierRepo = manager
      ? manager.getRepository(Supplier)
      : this.supplierRepo;
    const supplierProductRepo = manager
      ? manager.getRepository(SupplierProduct)
      : this.supplierProductRepo;

    // 1. Verify Supplier existence and active status
    const supplier = await supplierRepo.findOne({
      where: { id: dto.supplierId },
    });
    if (!supplier) {
      throw new NotFoundException({
        code: ImporterErrorCode.IMPORTER_SUPPLIER_NOT_FOUND,
        message: `Proveedor con ID "${dto.supplierId}" no encontrado.`,
      });
    }
    if (!supplier.isActive) {
      throw new BadRequestException({
        code: ImporterErrorCode.IMPORTER_SUPPLIER_INACTIVE,
        message:
          'No es posible realizar importaciones para un proveedor inactivo.',
      });
    }

    // 2. Validate expected file checksum (409 Conflict on mismatch)
    const recalculatedFileChecksum = crypto
      .createHash('sha256')
      .update(fileBuffer)
      .digest('hex');

    if (
      recalculatedFileChecksum.toLowerCase() !==
      dto.expectedFileChecksum.trim().toLowerCase()
    ) {
      throw new ConflictException({
        code: ImporterErrorCode.IMPORTER_CHECKSUM_MISMATCH,
        message:
          'El archivo enviado no coincide con el archivo validado durante el paso de carga. Por favor, vuelva a subir el archivo.',
      });
    }

    // 3. Safe JSON parsing of mapping string
    let rawMapping: ISupplierImportMapping;
    try {
      rawMapping = JSON.parse(dto.mapping);
    } catch {
      throw new BadRequestException({
        code: ImporterErrorCode.IMPORTER_MAPPING_INVALID_JSON,
        message: 'El formato JSON del mapeo de columnas es inválido.',
      });
    }

    if (
      !rawMapping ||
      typeof rawMapping !== 'object' ||
      !rawMapping.supplierSku ||
      typeof rawMapping.supplierSku !== 'string' ||
      rawMapping.supplierSku.trim() === '' ||
      !rawMapping.usualCostNet ||
      typeof rawMapping.usualCostNet !== 'string' ||
      rawMapping.usualCostNet.trim() === ''
    ) {
      throw new BadRequestException({
        code: ImporterErrorCode.IMPORTER_MAPPING_MISSING_REQUIRED_FIELD,
        message:
          'El mapeo debe incluir obligatoriamente los campos "supplierSku" y "usualCostNet".',
      });
    }

    // 4. Re-parse the spreadsheet buffer statelessly (formulaPolicy: 'flag', cellErrorPolicy: 'flag')
    const parsedResult = await SecureSpreadsheetParser.parse(
      fileBuffer,
      originalFilename,
      mimetype,
      {
        formulaPolicy: 'flag',
        cellErrorPolicy: 'flag',
      },
    );

    // 5. Validate that all mapped columns exist in parsed headers
    const normalizedHeadersSet = new Set(parsedResult.normalizedHeaders);
    const normalizedMapping: ISupplierImportMapping = {
      supplierSku: normalizeHeader(rawMapping.supplierSku),
      usualCostNet: normalizeHeader(rawMapping.usualCostNet),
      supplierDescription: rawMapping.supplierDescription
        ? normalizeHeader(rawMapping.supplierDescription)
        : null,
      rawQuantity: rawMapping.rawQuantity
        ? normalizeHeader(rawMapping.rawQuantity)
        : null,
      purchaseUnit: rawMapping.purchaseUnit
        ? normalizeHeader(rawMapping.purchaseUnit)
        : null,
    };

    if (!normalizedHeadersSet.has(normalizedMapping.supplierSku)) {
      throw new BadRequestException({
        code: ImporterErrorCode.IMPORTER_MAPPING_HEADER_NOT_FOUND,
        message: `La columna mapeada para SKU de proveedor ("${rawMapping.supplierSku}") no existe en los encabezados del archivo.`,
      });
    }
    if (!normalizedHeadersSet.has(normalizedMapping.usualCostNet)) {
      throw new BadRequestException({
        code: ImporterErrorCode.IMPORTER_MAPPING_HEADER_NOT_FOUND,
        message: `La columna mapeada para Costo Neto ("${rawMapping.usualCostNet}") no existe en los encabezados del archivo.`,
      });
    }
    if (
      normalizedMapping.supplierDescription &&
      !normalizedHeadersSet.has(normalizedMapping.supplierDescription)
    ) {
      throw new BadRequestException({
        code: ImporterErrorCode.IMPORTER_MAPPING_HEADER_NOT_FOUND,
        message: `La columna mapeada para Descripción ("${rawMapping.supplierDescription}") no existe en los encabezados del archivo.`,
      });
    }
    if (
      normalizedMapping.rawQuantity &&
      !normalizedHeadersSet.has(normalizedMapping.rawQuantity)
    ) {
      throw new BadRequestException({
        code: ImporterErrorCode.IMPORTER_MAPPING_HEADER_NOT_FOUND,
        message: `La columna mapeada para Cantidad ("${rawMapping.rawQuantity}") no existe en los encabezados del archivo.`,
      });
    }
    if (
      normalizedMapping.purchaseUnit &&
      !normalizedHeadersSet.has(normalizedMapping.purchaseUnit)
    ) {
      throw new BadRequestException({
        code: ImporterErrorCode.IMPORTER_MAPPING_HEADER_NOT_FOUND,
        message: `La columna mapeada para Unidad ("${rawMapping.purchaseUnit}") no existe en los encabezados del archivo.`,
      });
    }

    // Compute mapping checksum over canonical normalized mapping object
    const mappingChecksum = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          supplierSku: normalizedMapping.supplierSku,
          usualCostNet: normalizedMapping.usualCostNet,
          supplierDescription: normalizedMapping.supplierDescription ?? null,
          rawQuantity: normalizedMapping.rawQuantity ?? null,
          purchaseUnit: normalizedMapping.purchaseUnit ?? null,
        }),
        'utf8',
      )
      .digest('hex');

    // Build index lookup map for columns
    const headerIndices = new Map<string, number>();
    parsedResult.normalizedHeaders.forEach((header, idx) => {
      headerIndices.set(header, idx);
    });

    const skuIdx = headerIndices.get(normalizedMapping.supplierSku)!;
    const costIdx = headerIndices.get(normalizedMapping.usualCostNet)!;
    const descIdx = normalizedMapping.supplierDescription
      ? headerIndices.get(normalizedMapping.supplierDescription)
      : undefined;
    const qtyIdx = normalizedMapping.rawQuantity
      ? headerIndices.get(normalizedMapping.rawQuantity)
      : undefined;
    const unitIdx = normalizedMapping.purchaseUnit
      ? headerIndices.get(normalizedMapping.purchaseUnit)
      : undefined;

    // 6. First pass: extract rows, normalize SKUs, detect duplicates across the file
    const skuOccurrences = new Map<string, number[]>(); // normalizedSku -> rowNumbers[]
    const intermediateRows: {
      rowNumber: number;
      rawSku: string | null;
      normalizedSku: string;
      rawCost: unknown;
      costParsed: { costCanonical: string | null; error?: IImporterRowError };
      rawDesc: string | null;
      rawQty: unknown;
      qtyParsed: {
        rawQuantity: string | null;
        quantityCanonical: string | null;
        error?: IImporterRowError;
      };
      rawUnit: unknown;
      hasFormula: boolean;
      hasCellError: boolean;
      cellErrors?: string[];
      syntaxErrors: IImporterRowError[];
    }[] = [];

    for (const row of parsedResult.rows) {
      const syntaxErrors: IImporterRowError[] = [];

      const rawSkuCell = row.cells[skuIdx];
      const rawSku =
        rawSkuCell === null || rawSkuCell === undefined
          ? null
          : String(rawSkuCell).trim();
      const normalizedSku = this.rowValidator.normalizeSupplierSku(rawSku);

      if (!normalizedSku) {
        syntaxErrors.push({
          rowNumber: row.rowNumber,
          field: 'supplierSku',
          code: ImporterRowErrorCode.ROW_SKU_EMPTY,
          message: 'El código de SKU del proveedor es obligatorio.',
          rawValue: rawSku,
        });
      } else if (normalizedSku.length > 100) {
        syntaxErrors.push({
          rowNumber: row.rowNumber,
          field: 'supplierSku',
          code: ImporterRowErrorCode.ROW_SKU_TOO_LONG,
          message: 'El SKU del proveedor supera el límite de 100 caracteres.',
          rawValue: rawSku,
        });
      } else {
        const existing = skuOccurrences.get(normalizedSku) || [];
        existing.push(row.rowNumber);
        skuOccurrences.set(normalizedSku, existing);
      }

      if (row.hasFormula) {
        syntaxErrors.push({
          rowNumber: row.rowNumber,
          field: 'row',
          code: ImporterRowErrorCode.ROW_FORMULA_NOT_ALLOWED,
          message: 'No se permiten fórmulas en las celdas del archivo.',
        });
      }

      if (row.hasCellError) {
        syntaxErrors.push({
          rowNumber: row.rowNumber,
          field: 'row',
          code: ImporterRowErrorCode.ROW_CELL_VALUE_INVALID,
          message: `La fila contiene celdas con errores de Excel (${(row.cellErrors || []).join(', ')}).`,
        });
      }

      const rawCost = row.cells[costIdx];
      const costParsed = this.rowValidator.parseCost(rawCost, row.rowNumber);
      if (costParsed.error) {
        syntaxErrors.push(costParsed.error);
      }

      const rawDescCell = descIdx !== undefined ? row.cells[descIdx] : null;
      const descValidation = this.rowValidator.validateDescription(
        rawDescCell,
        row.rowNumber,
        Boolean(normalizedMapping.supplierDescription),
      );
      if (descValidation.error) {
        syntaxErrors.push(descValidation.error);
      }
      const rawDesc = descValidation.rawDescription;

      const rawQty = qtyIdx !== undefined ? row.cells[qtyIdx] : null;
      const qtyParsed = this.rowValidator.parseQuantity(
        rawQty,
        row.rowNumber,
        Boolean(normalizedMapping.rawQuantity),
      );
      if (qtyParsed.error) {
        syntaxErrors.push(qtyParsed.error);
      }

      const rawUnit = unitIdx !== undefined ? row.cells[unitIdx] : null;

      intermediateRows.push({
        rowNumber: row.rowNumber,
        rawSku,
        normalizedSku,
        rawCost,
        costParsed,
        rawDesc,
        rawQty,
        qtyParsed,
        rawUnit,
        hasFormula: row.hasFormula,
        hasCellError: Boolean(row.hasCellError),
        cellErrors: row.cellErrors,
        syntaxErrors,
      });
    }

    // 7. Collect unique valid syntax SKUs for batch database lookup (excluding duplicates)
    const duplicateSkusSet = new Set<string>();
    for (const [sku, rowNumbers] of skuOccurrences.entries()) {
      if (rowNumbers.length > 1) {
        duplicateSkusSet.add(sku);
      }
    }

    const skusToQuerySet = new Set<string>();
    for (const row of intermediateRows) {
      if (
        row.normalizedSku &&
        !duplicateSkusSet.has(row.normalizedSku) &&
        row.syntaxErrors.length === 0
      ) {
        skusToQuerySet.add(row.normalizedSku);
      }
    }

    // 8. Safe batch query against SupplierProduct catalog (skips query if set is empty)
    const associationsMap = new Map<string, SupplierProduct>();
    if (skusToQuerySet.size > 0) {
      let qb = supplierProductRepo
        .createQueryBuilder('sp')
        .innerJoinAndSelect('sp.product', 'product')
        .innerJoinAndSelect('product.baseUnit', 'productBaseUnit')
        .innerJoinAndSelect('sp.purchaseUnit', 'purchaseUnit')
        .where('sp.supplierId = :supplierId', { supplierId: supplier.id })
        .andWhere('UPPER(TRIM(sp.supplierExternalCode)) IN (:...skus)', {
          skus: Array.from(skusToQuerySet),
        })
        .orderBy('sp.id', 'ASC');

      if (acquireLocks) {
        qb = qb.setLock('pessimistic_write');
      }

      const associations = await qb.getMany();

      for (const sp of associations) {
        associationsMap.set(
          this.rowValidator.normalizeSupplierSku(sp.supplierExternalCode),
          sp,
        );
      }
    }

    // 9. Second pass: Tri-state classification into valid, unknown, error
    const validRows: IImporterValidRow[] = [];
    const unknownRows: IImporterUnknownRow[] = [];
    const errorRows: IImporterErrorRow[] = [];
    const canonicalTuples: ImporterCanonicalRowTuple[] = [];

    for (const row of intermediateRows) {
      const rowErrors: IImporterRowError[] = [...row.syntaxErrors];

      // Mark duplicate SKU error on all occurrences
      if (row.normalizedSku && duplicateSkusSet.has(row.normalizedSku)) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'supplierSku',
          code: ImporterRowErrorCode.ROW_SKU_DUPLICATE,
          message: `El SKU "${row.normalizedSku}" está duplicado en el archivo (aparece en las filas: ${skuOccurrences.get(row.normalizedSku)?.join(', ')}).`,
          rawValue: row.rawSku,
        });
      }

      const association = row.normalizedSku
        ? associationsMap.get(row.normalizedSku)
        : undefined;

      // Validate purchase unit if mapped
      const unitValidation = this.rowValidator.validateUnit(
        row.rawUnit,
        row.rowNumber,
        Boolean(normalizedMapping.purchaseUnit),
        association?.purchaseUnit
          ? {
              name: association.purchaseUnit.name,
              symbol: association.purchaseUnit.symbol,
            }
          : null,
      );

      if (unitValidation.error) {
        rowErrors.push(unitValidation.error);
      }

      // Check product status if associated
      if (association && association.product.status !== ProductStatus.ACTIVE) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          field: 'supplierSku',
          code: ImporterRowErrorCode.ROW_ASSOCIATED_PRODUCT_INACTIVE,
          message: `El producto asociado "${association.product.internalCode} - ${association.product.name}" se encuentra inactivo.`,
          rawValue: row.rawSku,
        });
      }

      // Classify row
      let status: 'valid' | 'unknown' | 'error';
      let supplierProductId: string | null = null;
      let productId: string | null = null;
      let purchaseUnitId: string | null = null;
      let conversionFactor: string | null = null;

      if (rowErrors.length > 0) {
        status = 'error';
        errorRows.push({
          rowNumber: row.rowNumber,
          rawSku: row.rawSku,
          normalizedSku: row.normalizedSku || null,
          rawCost:
            row.rawCost !== null && row.rawCost !== undefined
              ? String(row.rawCost)
              : null,
          rawDescription: row.rawDesc,
          rawQuantity:
            row.rawQty !== null && row.rawQty !== undefined
              ? String(row.rawQty)
              : null,
          rawPurchaseUnit:
            row.rawUnit !== null && row.rawUnit !== undefined
              ? String(row.rawUnit)
              : null,
          association: association
            ? {
                id: association.id,
                supplierExternalCode: association.supplierExternalCode,
                purchaseUnit: {
                  id: association.purchaseUnit.id,
                  name: association.purchaseUnit.name,
                  symbol: association.purchaseUnit.symbol,
                },
                conversionFactorToBase: String(
                  association.conversionFactorToBase,
                ),
                product: {
                  id: association.product.id,
                  internalCode: association.product.internalCode,
                  name: association.product.name,
                  baseUnit: {
                    id: association.product.baseUnit.id,
                    name: association.product.baseUnit.name,
                    symbol: association.product.baseUnit.symbol,
                  },
                },
              }
            : null,
          errors: rowErrors,
        });
      } else if (association) {
        status = 'valid';
        supplierProductId = association.id;
        productId = association.product.id;
        purchaseUnitId = association.purchaseUnit.id;
        conversionFactor = String(association.conversionFactorToBase);

        validRows.push({
          rowNumber: row.rowNumber,
          rawSku: row.rawSku || '',
          normalizedSku: row.normalizedSku,
          supplierDescription: row.rawDesc,
          usualCostNet: row.costParsed.costCanonical!,
          rawQuantity: row.qtyParsed.rawQuantity,
          quantityCanonical: row.qtyParsed.quantityCanonical,
          rawPurchaseUnit: unitValidation.rawPurchaseUnit,
          normalizedUnit: unitValidation.normalizedUnit,
          supplierProduct: {
            id: association.id,
            isPrimarySupplier: association.isPrimarySupplier,
            purchaseUnit: {
              id: association.purchaseUnit.id,
              name: association.purchaseUnit.name,
              symbol: association.purchaseUnit.symbol,
            },
            conversionFactorToBase: String(association.conversionFactorToBase),
          },
          product: {
            id: association.product.id,
            internalCode: association.product.internalCode,
            name: association.product.name,
            baseUnit: {
              id: association.product.baseUnit.id,
              name: association.product.baseUnit.name,
              symbol: association.product.baseUnit.symbol,
            },
          },
        });
      } else {
        status = 'unknown';
        unknownRows.push({
          rowNumber: row.rowNumber,
          rawSku: row.rawSku || '',
          normalizedSku: row.normalizedSku,
          supplierDescription: row.rawDesc,
          usualCostNet: row.costParsed.costCanonical!,
          rawQuantity: row.qtyParsed.rawQuantity,
          quantityCanonical: row.qtyParsed.quantityCanonical,
          rawPurchaseUnit: unitValidation.rawPurchaseUnit,
          normalizedUnit: unitValidation.normalizedUnit,
        });
      }

      // Add canonical tuple for contentChecksum calculation
      canonicalTuples.push([
        row.rowNumber,
        status,
        row.normalizedSku || '',
        row.costParsed.costCanonical ?? null,
        row.qtyParsed.quantityCanonical ?? null,
        unitValidation.normalizedUnit ?? null,
        supplierProductId,
        productId,
        purchaseUnitId,
        conversionFactor,
        rowErrors.map((e) => e.code).sort(),
      ]);
    }

    // 10. Compute versioned canonical contentChecksum
    canonicalTuples.sort((a, b) => a[0] - b[0]); // Sort by rowNumber ASC

    const canonicalPayload: IImporterCanonicalContentPayload = {
      version: 1,
      supplierId: supplier.id,
      fileChecksum: recalculatedFileChecksum,
      headerFingerprint: parsedResult.headerFingerprint,
      mappingChecksum,
      rows: canonicalTuples,
    };

    const contentChecksum = crypto
      .createHash('sha256')
      .update(JSON.stringify(canonicalPayload), 'utf8')
      .digest('hex');

    const totalRows = parsedResult.rows.length;
    const summary: IImporterPreviewSummary = {
      totalRows,
      validRows: validRows.length,
      unknownRows: unknownRows.length,
      errorRows: errorRows.length,
      canContinue:
        validRows.length > 0 &&
        unknownRows.length === 0 &&
        errorRows.length === 0,
    };

    return toImporterPreviewResponse({
      supplier,
      fileChecksum: recalculatedFileChecksum,
      headerFingerprint: parsedResult.headerFingerprint,
      mappingChecksum,
      contentChecksum,
      summary,
      validRows,
      unknownRows,
      errorRows,
    });
  }
}
