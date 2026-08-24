import {
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { parse as parseCsvSync } from 'csv-parse/sync';
import * as ExcelJS from 'exceljs';
import * as crypto from 'crypto';
import {
  StockBulkFileErrorCode,
  IStockBulkLoadRawRow,
} from '@erp/shared-types';

export interface ParsedBulkFileResult {
  fileChecksum: string;
  rawRows: IStockBulkLoadRawRow[];
}

export const BULK_LOAD_MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MiB
export const BULK_LOAD_MAX_DATA_ROWS = 1000;
export const BULK_LOAD_MAX_UNCOMPRESSED_XLSX_SIZE = 25 * 1024 * 1024; // 25 MiB
export const BULK_LOAD_MAX_ZIP_ENTRIES = 50;

export class StockBulkFileParser {
  /**
   * Parses CSV or XLSX buffer into normalized raw row items with strict security bounds.
   */
  static async parse(
    fileBuffer: Buffer,
    originalFilename?: string,
    mimetype?: string,
  ): Promise<ParsedBulkFileResult> {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new BadRequestException({
        code: StockBulkFileErrorCode.BULK_LOAD_MISSING_FILE,
        message: 'El archivo está vacío o no fue proporcionado.',
      });
    }

    if (fileBuffer.length > BULK_LOAD_MAX_FILE_SIZE) {
      throw new PayloadTooLargeException({
        code: StockBulkFileErrorCode.BULK_LOAD_FILE_TOO_LARGE,
        message: 'El archivo supera el tamaño máximo permitido de 2 MiB.',
      });
    }

    const fileChecksum = crypto
      .createHash('sha256')
      .update(fileBuffer)
      .digest('hex');

    const extension = (originalFilename || '').split('.').pop()?.toLowerCase();

    const isZip =
      fileBuffer.length >= 4 &&
      fileBuffer[0] === 0x50 &&
      fileBuffer[1] === 0x4b &&
      fileBuffer[2] === 0x03 &&
      fileBuffer[3] === 0x04;

    if (extension === 'xlsx' || isZip) {
      const rawRows = await this.parseXlsx(fileBuffer);
      return { fileChecksum, rawRows };
    }

    if (
      extension === 'csv' ||
      mimetype === 'text/csv' ||
      mimetype === 'text/plain' ||
      mimetype === 'application/vnd.ms-excel' ||
      mimetype === 'application/octet-stream'
    ) {
      const rawRows = this.parseCsv(fileBuffer);
      return { fileChecksum, rawRows };
    }

    throw new UnsupportedMediaTypeException({
      code: StockBulkFileErrorCode.BULK_LOAD_UNSUPPORTED_TYPE,
      message:
        'Formato de archivo no soportado. Sólo se admiten archivos .csv y .xlsx.',
    });
  }

  /**
   * Parses CSV buffer with BOM stripping and header validation.
   */
  private static parseCsv(fileBuffer: Buffer): IStockBulkLoadRawRow[] {
    let content = fileBuffer.toString('utf8');

    // Strip UTF-8 BOM if present
    if (content.charCodeAt(0) === 0xfeff) {
      content = content.slice(1);
    }

    let records: string[][];
    try {
      records = parseCsvSync(content, {
        relax_column_count: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch {
      throw new BadRequestException({
        code: StockBulkFileErrorCode.BULK_LOAD_INVALID_FILE,
        message: 'El archivo CSV tiene una estructura inválida o corrupta.',
      });
    }

    if (!records || records.length === 0) {
      throw new BadRequestException({
        code: StockBulkFileErrorCode.BULK_LOAD_INVALID_FILE,
        message: 'El archivo CSV está vacío.',
      });
    }

    const headerRow = records[0];
    this.validateHeaders(headerRow);

    const dataRows = records.slice(1);

    if (dataRows.length > BULK_LOAD_MAX_DATA_ROWS) {
      throw new BadRequestException({
        code: StockBulkFileErrorCode.BULK_LOAD_ROW_LIMIT_EXCEEDED,
        message: `El archivo supera el límite máximo de ${BULK_LOAD_MAX_DATA_ROWS} filas de datos.`,
      });
    }

    const rawRows: IStockBulkLoadRawRow[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2; // 1-indexed including header row

      // Ignore fully empty rows
      if (
        !row ||
        row.length === 0 ||
        row.every((cell) => !cell || cell.trim() === '')
      ) {
        continue;
      }

      const rawInternalCode = row[0] !== undefined ? String(row[0]).trim() : '';
      const rawQtyStr = row[1] !== undefined ? String(row[1]).trim() : '';

      // Check formula in CSV: values starting with '=' or '@'
      const hasFormula =
        rawInternalCode.startsWith('=') ||
        rawInternalCode.startsWith('@') ||
        rawQtyStr.startsWith('=') ||
        rawQtyStr.startsWith('@');

      // Preserve leading sign for negative/positive numbers without formula flag
      let cleanedQty: string | null = rawQtyStr;
      if (rawQtyStr.startsWith('+')) {
        cleanedQty = rawQtyStr.slice(1).trim();
      }

      rawRows.push({
        rowNumber,
        rawInternalCode,
        rawQuantity: cleanedQty,
        hasFormula,
      });
    }

    return rawRows;
  }

  /**
   * Pre-inspects ZIP structure and parses XLSX with ExcelJS.
   */
  private static async parseXlsx(
    fileBuffer: Buffer,
  ): Promise<IStockBulkLoadRawRow[]> {
    this.inspectZipBuffer(fileBuffer);

    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(fileBuffer as unknown as ExcelJS.Buffer);
    } catch {
      throw new BadRequestException({
        code: StockBulkFileErrorCode.BULK_LOAD_INVALID_FILE,
        message: 'El archivo XLSX tiene una estructura inválida o corrupta.',
      });
    }

    // Filter worksheets with actual row content
    const worksheetsWithData = workbook.worksheets.filter(
      (ws) => ws.actualRowCount > 0,
    );

    if (worksheetsWithData.length === 0) {
      throw new BadRequestException({
        code: StockBulkFileErrorCode.BULK_LOAD_INVALID_FILE,
        message: 'El archivo Excel no contiene hojas con datos.',
      });
    }

    if (worksheetsWithData.length > 1) {
      throw new BadRequestException({
        code: StockBulkFileErrorCode.BULK_LOAD_MULTIPLE_SHEETS,
        message:
          'El archivo Excel contiene más de una hoja con datos. Debe contener exactamente una hoja.',
      });
    }

    const worksheet = worksheetsWithData[0];
    const totalRows = worksheet.rowCount;

    if (totalRows < 1) {
      throw new BadRequestException({
        code: StockBulkFileErrorCode.BULK_LOAD_INVALID_FILE,
        message: 'El archivo Excel está vacío.',
      });
    }

    // Validate headers in Row 1
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: true }, (cell) => {
      headers.push(cell.value ? String(cell.value).trim() : '');
    });

    this.validateHeaders(headers);

    if (totalRows - 1 > BULK_LOAD_MAX_DATA_ROWS) {
      throw new BadRequestException({
        code: StockBulkFileErrorCode.BULK_LOAD_ROW_LIMIT_EXCEEDED,
        message: `El archivo supera el límite máximo de ${BULK_LOAD_MAX_DATA_ROWS} filas de datos.`,
      });
    }

    const rawRows: IStockBulkLoadRawRow[] = [];

    for (let r = 2; r <= totalRows; r++) {
      const row = worksheet.getRow(r);
      const cellCode = row.getCell(1);
      const cellQty = row.getCell(2);

      const isCodeEmpty =
        cellCode.value === null ||
        cellCode.value === undefined ||
        String(cellCode.value).trim() === '';
      const isQtyEmpty =
        cellQty.value === null ||
        cellQty.value === undefined ||
        String(cellQty.value).trim() === '';

      // Skip fully empty row
      if (isCodeEmpty && isQtyEmpty) {
        continue;
      }

      const hasFormula =
        cellCode.type === ExcelJS.ValueType.Formula ||
        Boolean(cellCode.formula) ||
        cellQty.type === ExcelJS.ValueType.Formula ||
        Boolean(cellQty.formula) ||
        String(cellCode.value ?? '').startsWith('=') ||
        String(cellQty.value ?? '').startsWith('=');

      let rawInternalCode = '';
      if (cellCode.value !== null && cellCode.value !== undefined) {
        rawInternalCode = String(cellCode.value).trim();
      }

      let rawQuantity: string | number | null = null;
      if (cellQty.value !== null && cellQty.value !== undefined) {
        if (typeof cellQty.value === 'number') {
          rawQuantity = cellQty.value;
        } else {
          rawQuantity = String(cellQty.value).trim();
        }
      }

      rawRows.push({
        rowNumber: r,
        rawInternalCode,
        rawQuantity,
        hasFormula,
      });
    }

    return rawRows;
  }

  /**
   * Inspects ZIP local file headers for zip-bomb defense (uncompressed size and entry limits).
   */
  private static inspectZipBuffer(buffer: Buffer): void {
    let offset = 0;
    let entryCount = 0;
    let totalUncompressedSize = 0;

    // Scan Local File Headers (Magic: 0x04034b50)
    while (offset < buffer.length - 30) {
      const signature = buffer.readUInt32LE(offset);
      if (signature !== 0x04034b50) {
        break;
      }

      entryCount++;
      if (entryCount > BULK_LOAD_MAX_ZIP_ENTRIES) {
        throw new BadRequestException({
          code: StockBulkFileErrorCode.BULK_LOAD_INVALID_FILE,
          message:
            'El archivo XLSX contiene demasiadas entradas internas o es inválido.',
        });
      }

      const uncompressedSize = buffer.readUInt32LE(offset + 22);
      totalUncompressedSize += uncompressedSize;

      if (totalUncompressedSize > BULK_LOAD_MAX_UNCOMPRESSED_XLSX_SIZE) {
        throw new BadRequestException({
          code: StockBulkFileErrorCode.BULK_LOAD_INVALID_FILE,
          message:
            'El archivo comprimido supera el límite de expansión permitido (25 MiB).',
        });
      }

      const fileNameLength = buffer.readUInt16LE(offset + 26);
      const extraFieldLength = buffer.readUInt16LE(offset + 28);
      const compressedSize = buffer.readUInt32LE(offset + 18);

      offset += 30 + fileNameLength + extraFieldLength + compressedSize;
    }
  }

  /**
   * Validates exact headers set: ['internalCode', 'quantityBase']
   */
  private static validateHeaders(headers: string[]): void {
    const cleaned = headers.map((h) => h.trim().toLowerCase()).filter(Boolean);

    if (cleaned.length < 2) {
      throw new BadRequestException({
        code: StockBulkFileErrorCode.BULK_LOAD_MISSING_HEADERS,
        message:
          'El archivo debe contener los encabezados obligatorios: internalCode, quantityBase.',
      });
    }

    if (cleaned[0] !== 'internalcode' || cleaned[1] !== 'quantitybase') {
      throw new BadRequestException({
        code: StockBulkFileErrorCode.BULK_LOAD_UNKNOWN_HEADER,
        message:
          'Los encabezados no son válidos. Se esperan exactamente: internalCode, quantityBase.',
      });
    }

    if (cleaned.length > 2) {
      throw new BadRequestException({
        code: StockBulkFileErrorCode.BULK_LOAD_UNKNOWN_HEADER,
        message:
          'El archivo contiene columnas adicionales no reconocidas. Sólo se permiten internalCode y quantityBase.',
      });
    }
  }
}
