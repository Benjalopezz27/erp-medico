import {
  BadRequestException,
  HttpException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import {
  ImporterErrorCode,
  ProductBulkFileErrorCode,
  IProductBulkLoadRawRow,
} from '@erp/shared-types';
import {
  SecureSpreadsheetParser,
  SECURE_SPREADSHEET_MAX_DATA_ROWS,
  SECURE_SPREADSHEET_MAX_FILE_SIZE,
  SECURE_SPREADSHEET_MAX_UNCOMPRESSED_XLSX_SIZE,
  SECURE_SPREADSHEET_MAX_ZIP_ENTRIES,
} from '../../../shared/parsers/secure-spreadsheet-parser';

export const PRODUCT_BULK_LOAD_MAX_FILE_SIZE = SECURE_SPREADSHEET_MAX_FILE_SIZE;
export const PRODUCT_BULK_LOAD_MAX_DATA_ROWS = SECURE_SPREADSHEET_MAX_DATA_ROWS;
export const PRODUCT_BULK_LOAD_MAX_UNCOMPRESSED_XLSX_SIZE =
  SECURE_SPREADSHEET_MAX_UNCOMPRESSED_XLSX_SIZE;
export const PRODUCT_BULK_LOAD_MAX_ZIP_ENTRIES =
  SECURE_SPREADSHEET_MAX_ZIP_ENTRIES;

export interface ParsedProductBulkFileResult {
  fileChecksum: string;
  rawRows: IProductBulkLoadRawRow[];
}

interface ProductHeaderMap {
  name: number;
  category: number;
  baseUnit: number;
  costNet: number;
  activePriceNet: number;
  description?: number;
  minStock?: number;
  initialStock?: number;
  markupPercentage?: number;
  taxTreatment?: number;
  ivaPercentage?: number;
  conversions?: number;
}

export class ProductBulkFileParser {
  static async parse(
    fileBuffer: Buffer,
    originalFilename?: string,
    mimetype?: string,
  ): Promise<ParsedProductBulkFileResult> {
    try {
      const parsed = await SecureSpreadsheetParser.parse(
        fileBuffer,
        originalFilename,
        mimetype,
        {
          maxColumns: 20,
          formulaPolicy: 'flag',
          targetSheetName: 'Productos',
        },
      );

      const headerMap = this.buildHeaderMap(
        parsed.normalizedHeaders,
        parsed.headers,
      );

      const rawRows = parsed.rows.map((row): IProductBulkLoadRawRow => {
        const getCellString = (index?: number): string | null => {
          if (index === undefined) return null;
          const val = row.cells[index];
          if (val === null || val === undefined) return null;
          const str = String(val).trim();
          return str === '' ? null : str;
        };

        const getCellNumberOrString = (
          index?: number,
        ): string | number | null => {
          if (index === undefined) return null;
          const val = row.cells[index];
          if (val === null || val === undefined) return null;
          if (typeof val === 'number') return val;
          if (typeof val === 'boolean') return String(val);
          let str = String(val).trim();
          if (str.startsWith('+')) str = str.slice(1).trim();
          return str === '' ? null : str;
        };

        const nameVal = getCellString(headerMap.name) ?? '';
        const catVal = getCellString(headerMap.category) ?? undefined;
        const unitVal = getCellString(headerMap.baseUnit) ?? undefined;
        const costVal = getCellNumberOrString(headerMap.costNet);
        const priceVal = getCellNumberOrString(headerMap.activePriceNet);
        const descVal = getCellString(headerMap.description);
        const minStockVal = getCellNumberOrString(headerMap.minStock);
        const initialStockVal = getCellNumberOrString(headerMap.initialStock);
        const markupVal = getCellNumberOrString(headerMap.markupPercentage);
        const taxVal = getCellString(headerMap.taxTreatment);
        const ivaVal = getCellNumberOrString(headerMap.ivaPercentage);
        const convVal = getCellString(headerMap.conversions);

        return {
          rowNumber: row.rowNumber,
          rawName: nameVal,
          rawCategory: catVal,
          rawBaseUnit: unitVal,
          rawCostNet: costVal,
          rawActivePriceNet: priceVal,
          rawDescription: descVal,
          rawMinStock: minStockVal,
          rawInitialStock: initialStockVal,
          rawMarkupPercentage: markupVal,
          rawTaxTreatment: taxVal,
          rawIvaPercentage: ivaVal,
          rawConversions: convVal,
          hasFormula: row.hasFormula,
        };
      });

      return { fileChecksum: parsed.fileChecksum, rawRows };
    } catch (error) {
      this.rethrowLegacyError(error);
    }
  }

  private static buildHeaderMap(
    normalized: string[],
    original: string[],
  ): ProductHeaderMap {
    const sanitize = (val: string) =>
      val
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

    const compactHeaders = normalized.map(sanitize);

    const aliases: Record<keyof ProductHeaderMap, string[]> = {
      name: ['name', 'nombre', 'productname', 'nombreproducto'],
      category: ['category', 'categoria'],
      baseUnit: ['baseunit', 'unidadbase', 'unidad'],
      costNet: ['costnet', 'costoneto', 'costo'],
      activePriceNet: [
        'activepricenet',
        'precioactivoneto',
        'precioneto',
        'precio',
        'precioactivo',
      ],
      description: ['description', 'descripcion'],
      minStock: ['minstock', 'stockminimo'],
      initialStock: ['initialstock', 'stockinicial'],
      markupPercentage: ['markuppercentage', 'markup', 'porcentajemarkup'],
      taxTreatment: ['taxtreatment', 'tratamientofiscal'],
      ivaPercentage: ['ivapercentage', 'alicuotaiva', 'iva'],
      conversions: ['conversions', 'conversiones'],
    };

    const headerIndices: Partial<ProductHeaderMap> = {};
    const recognizedIndices = new Set<number>();

    for (const [key, aliasList] of Object.entries(aliases) as [
      keyof ProductHeaderMap,
      string[],
    ][]) {
      for (const alias of aliasList) {
        const found = compactHeaders.indexOf(alias);
        if (found >= 0) {
          headerIndices[key] = found;
          recognizedIndices.add(found);
          break;
        }
      }
    }

    // Check unknown headers
    for (let index = 0; index < compactHeaders.length; index++) {
      if (!recognizedIndices.has(index)) {
        throw new BadRequestException({
          code: ProductBulkFileErrorCode.BULK_LOAD_UNKNOWN_HEADER,
          message: `El encabezado "${original[index]}" no es reconocido.`,
        });
      }
    }

    // Required headers
    const required: (keyof ProductHeaderMap)[] = [
      'name',
      'category',
      'baseUnit',
      'costNet',
      'activePriceNet',
    ];

    const missing = required.filter((key) => headerIndices[key] === undefined);

    if (missing.length > 0) {
      throw new BadRequestException({
        code: ProductBulkFileErrorCode.BULK_LOAD_MISSING_HEADERS,
        message: `El archivo debe contener los encabezados obligatorios: ${missing.join(', ')}.`,
      });
    }

    return headerIndices as ProductHeaderMap;
  }

  private static rethrowLegacyError(error: unknown): never {
    if (!(error instanceof HttpException)) throw error;
    const response = error.getResponse();
    const body =
      typeof response === 'object' && response !== null
        ? (response as Record<string, unknown>)
        : {};
    const code = body.code as ImporterErrorCode | undefined;
    const message =
      typeof body.message === 'string' ? body.message : error.message;

    if (error instanceof PayloadTooLargeException) {
      throw new PayloadTooLargeException({
        code: ProductBulkFileErrorCode.BULK_LOAD_FILE_TOO_LARGE,
        message,
      });
    }
    if (error instanceof UnsupportedMediaTypeException) {
      if (code === ImporterErrorCode.IMPORTER_FORMAT_NOT_SUPPORTED) {
        throw new UnsupportedMediaTypeException({
          code: ProductBulkFileErrorCode.BULK_LOAD_UNSUPPORTED_TYPE,
          message,
        });
      }

      throw new BadRequestException({
        code: ProductBulkFileErrorCode.BULK_LOAD_INVALID_FILE,
        message,
      });
    }

    const mappedCode: Partial<
      Record<ImporterErrorCode, ProductBulkFileErrorCode>
    > = {
      [ImporterErrorCode.IMPORTER_FILE_EMPTY]:
        ProductBulkFileErrorCode.BULK_LOAD_MISSING_FILE,
      [ImporterErrorCode.IMPORTER_ROW_LIMIT_EXCEEDED]:
        ProductBulkFileErrorCode.BULK_LOAD_ROW_LIMIT_EXCEEDED,
      [ImporterErrorCode.IMPORTER_HEADER_EMPTY]:
        ProductBulkFileErrorCode.BULK_LOAD_MISSING_HEADERS,
      [ImporterErrorCode.IMPORTER_HEADER_DUPLICATE]:
        ProductBulkFileErrorCode.BULK_LOAD_DUPLICATE_HEADER,
      [ImporterErrorCode.IMPORTER_MULTIPLE_SHEETS]:
        ProductBulkFileErrorCode.BULK_LOAD_MULTIPLE_SHEETS,
    };

    throw new BadRequestException({
      code:
        (code && mappedCode[code]) ||
        ProductBulkFileErrorCode.BULK_LOAD_INVALID_FILE,
      message,
    });
  }
}
