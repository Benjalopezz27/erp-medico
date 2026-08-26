import {
  BadRequestException,
  HttpException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import {
  ImporterErrorCode,
  StockBulkFileErrorCode,
  IStockBulkLoadRawRow,
} from '@erp/shared-types';
import {
  SecureSpreadsheetParser,
  SECURE_SPREADSHEET_MAX_DATA_ROWS,
  SECURE_SPREADSHEET_MAX_FILE_SIZE,
  SECURE_SPREADSHEET_MAX_UNCOMPRESSED_XLSX_SIZE,
  SECURE_SPREADSHEET_MAX_ZIP_ENTRIES,
} from '../../../shared/parsers/secure-spreadsheet-parser';

export const BULK_LOAD_MAX_FILE_SIZE = SECURE_SPREADSHEET_MAX_FILE_SIZE;
export const BULK_LOAD_MAX_DATA_ROWS = SECURE_SPREADSHEET_MAX_DATA_ROWS;
export const BULK_LOAD_MAX_UNCOMPRESSED_XLSX_SIZE =
  SECURE_SPREADSHEET_MAX_UNCOMPRESSED_XLSX_SIZE;
export const BULK_LOAD_MAX_ZIP_ENTRIES = SECURE_SPREADSHEET_MAX_ZIP_ENTRIES;

export interface ParsedBulkFileResult {
  fileChecksum: string;
  rawRows: IStockBulkLoadRawRow[];
}

interface StockHeaderMap {
  internalCode: number;
  quantityBase: number;
  productName?: number;
  baseUnit?: number;
}

/** Stock-specific adapter over the reusable secure spreadsheet parser. */
export class StockBulkFileParser {
  static async parse(
    fileBuffer: Buffer,
    originalFilename?: string,
    mimetype?: string,
  ): Promise<ParsedBulkFileResult> {
    try {
      const parsed = await SecureSpreadsheetParser.parse(
        fileBuffer,
        originalFilename,
        mimetype,
        { maxColumns: 4, formulaPolicy: 'flag' },
      );
      const headerMap = this.buildHeaderMap(
        parsed.normalizedHeaders,
        parsed.headers,
      );

      const rawRows = parsed.rows.map((row): IStockBulkLoadRawRow => {
        const codeValue = row.cells[headerMap.internalCode];
        const quantityValue = row.cells[headerMap.quantityBase];
        const nameValue =
          headerMap.productName === undefined
            ? undefined
            : row.cells[headerMap.productName];
        const unitValue =
          headerMap.baseUnit === undefined
            ? undefined
            : row.cells[headerMap.baseUnit];

        let rawQuantity: string | number | null =
          quantityValue === null
            ? null
            : typeof quantityValue === 'boolean'
              ? String(quantityValue)
              : quantityValue;
        if (typeof rawQuantity === 'string' && rawQuantity.startsWith('+')) {
          rawQuantity = rawQuantity.slice(1).trim() || null;
        }

        return {
          rowNumber: row.rowNumber,
          rawInternalCode: codeValue === null ? '' : String(codeValue).trim(),
          rawQuantity,
          rawProductName:
            nameValue === null || nameValue === undefined
              ? undefined
              : String(nameValue).trim(),
          rawBaseUnit:
            unitValue === null || unitValue === undefined
              ? undefined
              : String(unitValue).trim(),
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
  ): StockHeaderMap {
    const allowed = new Set([
      'internalcode',
      'quantitybase',
      'productname',
      'baseunit',
    ]);
    for (let index = 0; index < normalized.length; index++) {
      const compact = normalized[index].replace(/\s/g, '');
      if (!allowed.has(compact)) {
        throw new BadRequestException({
          code: StockBulkFileErrorCode.BULK_LOAD_UNKNOWN_HEADER,
          message: `El encabezado "${original[index]}" no es reconocido. Encabezados permitidos: internalCode, quantityBase, productName, baseUnit.`,
        });
      }
    }

    const compactHeaders = normalized.map((header) =>
      header.replace(/\s/g, ''),
    );
    const internalCode = compactHeaders.indexOf('internalcode');
    const quantityBase = compactHeaders.indexOf('quantitybase');
    if (internalCode < 0 || quantityBase < 0) {
      throw new BadRequestException({
        code: StockBulkFileErrorCode.BULK_LOAD_MISSING_HEADERS,
        message:
          'El archivo debe contener los encabezados obligatorios: internalCode, quantityBase.',
      });
    }

    const productName = compactHeaders.indexOf('productname');
    const baseUnit = compactHeaders.indexOf('baseunit');
    return {
      internalCode,
      quantityBase,
      productName: productName < 0 ? undefined : productName,
      baseUnit: baseUnit < 0 ? undefined : baseUnit,
    };
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
        code: StockBulkFileErrorCode.BULK_LOAD_FILE_TOO_LARGE,
        message,
      });
    }
    if (error instanceof UnsupportedMediaTypeException) {
      throw new UnsupportedMediaTypeException({
        code: StockBulkFileErrorCode.BULK_LOAD_UNSUPPORTED_TYPE,
        message,
      });
    }

    const mappedCode: Partial<
      Record<ImporterErrorCode, StockBulkFileErrorCode>
    > = {
      [ImporterErrorCode.IMPORTER_FILE_EMPTY]:
        StockBulkFileErrorCode.BULK_LOAD_MISSING_FILE,
      [ImporterErrorCode.IMPORTER_ROW_LIMIT_EXCEEDED]:
        StockBulkFileErrorCode.BULK_LOAD_ROW_LIMIT_EXCEEDED,
      [ImporterErrorCode.IMPORTER_HEADER_EMPTY]:
        StockBulkFileErrorCode.BULK_LOAD_MISSING_HEADERS,
      [ImporterErrorCode.IMPORTER_HEADER_DUPLICATE]:
        StockBulkFileErrorCode.BULK_LOAD_DUPLICATE_HEADER,
      [ImporterErrorCode.IMPORTER_MULTIPLE_SHEETS]:
        StockBulkFileErrorCode.BULK_LOAD_MULTIPLE_SHEETS,
    };
    throw new BadRequestException({
      code:
        (code && mappedCode[code]) ||
        StockBulkFileErrorCode.BULK_LOAD_INVALID_FILE,
      message,
    });
  }
}
