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

export interface HeaderMap {
  internalCodeIndex: number;
  quantityBaseIndex: number;
  productNameIndex?: number;
  baseUnitIndex?: number;
  totalHeaderColumns: number;
}

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
   * Parses CSV buffer with BOM stripping, flexible header mapping, and strict row width enforcement.
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
    const headerMap = this.validateAndBuildHeaderMap(headerRow);

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

      // Ignore fully empty physical rows
      if (
        !row ||
        row.length === 0 ||
        row.every((cell) => !cell || cell.trim() === '')
      ) {
        continue;
      }

      // Enforce row cell count not exceeding declared header columns
      if (row.length > headerMap.totalHeaderColumns) {
        throw new BadRequestException({
          code: StockBulkFileErrorCode.BULK_LOAD_INVALID_FILE,
          message: `La fila ${rowNumber} contiene más celdas (${row.length}) que las columnas declaradas en los encabezados (${headerMap.totalHeaderColumns}).`,
        });
      }

      const rawInternalCode =
        row[headerMap.internalCodeIndex] !== undefined
          ? String(row[headerMap.internalCodeIndex]).trim()
          : '';

      const rawQtyStr =
        row[headerMap.quantityBaseIndex] !== undefined
          ? String(row[headerMap.quantityBaseIndex]).trim()
          : '';

      const rawProductName =
        headerMap.productNameIndex !== undefined &&
        row[headerMap.productNameIndex] !== undefined
          ? String(row[headerMap.productNameIndex]).trim()
          : undefined;

      const rawBaseUnit =
        headerMap.baseUnitIndex !== undefined &&
        row[headerMap.baseUnitIndex] !== undefined
          ? String(row[headerMap.baseUnitIndex]).trim()
          : undefined;

      // Check formula in CSV: values starting with '=' or '@' across all mapped cells
      const hasFormula =
        rawInternalCode.startsWith('=') ||
        rawInternalCode.startsWith('@') ||
        rawQtyStr.startsWith('=') ||
        rawQtyStr.startsWith('@') ||
        (rawProductName
          ? rawProductName.startsWith('=') || rawProductName.startsWith('@')
          : false) ||
        (rawBaseUnit
          ? rawBaseUnit.startsWith('=') || rawBaseUnit.startsWith('@')
          : false);

      // Preserve leading sign for negative/positive numbers without formula flag
      let cleanedQty: string | null = rawQtyStr;
      if (rawQtyStr.startsWith('+')) {
        cleanedQty = rawQtyStr.slice(1).trim();
      }
      if (cleanedQty === '') {
        cleanedQty = null;
      }

      rawRows.push({
        rowNumber,
        rawInternalCode,
        rawQuantity: cleanedQty,
        rawProductName,
        rawBaseUnit,
        hasFormula,
      });
    }

    return rawRows;
  }

  /**
   * Pre-inspects ZIP structure and parses XLSX with ExcelJS and flexible header mapping.
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

    // Extract headers preserving exact column indices
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    const maxCol = headerRow.actualCellCount > 0 ? headerRow.cellCount : 0;

    for (let c = 1; c <= maxCol; c++) {
      const cellVal = headerRow.getCell(c).value;
      headers.push(
        cellVal !== null && cellVal !== undefined ? String(cellVal) : '',
      );
    }

    const headerMap = this.validateAndBuildHeaderMap(headers);

    if (totalRows - 1 > BULK_LOAD_MAX_DATA_ROWS) {
      throw new BadRequestException({
        code: StockBulkFileErrorCode.BULK_LOAD_ROW_LIMIT_EXCEEDED,
        message: `El archivo supera el límite máximo de ${BULK_LOAD_MAX_DATA_ROWS} filas de datos.`,
      });
    }

    const rawRows: IStockBulkLoadRawRow[] = [];

    for (let r = 2; r <= totalRows; r++) {
      const row = worksheet.getRow(r);

      // Check if any non-empty cell exists beyond declared header columns
      const rowCellCount = row.cellCount;
      if (rowCellCount > headerMap.totalHeaderColumns) {
        for (
          let extraCol = headerMap.totalHeaderColumns + 1;
          extraCol <= rowCellCount;
          extraCol++
        ) {
          const extraCell = row.getCell(extraCol);
          if (
            extraCell.value !== null &&
            extraCell.value !== undefined &&
            String(extraCell.value).trim() !== ''
          ) {
            throw new BadRequestException({
              code: StockBulkFileErrorCode.BULK_LOAD_INVALID_FILE,
              message: `La fila ${r} contiene contenido en columnas adicionales no declaradas.`,
            });
          }
        }
      }

      const cellCode = row.getCell(headerMap.internalCodeIndex + 1);
      const cellQty = row.getCell(headerMap.quantityBaseIndex + 1);
      const cellName =
        headerMap.productNameIndex !== undefined
          ? row.getCell(headerMap.productNameIndex + 1)
          : null;
      const cellUnit =
        headerMap.baseUnitIndex !== undefined
          ? row.getCell(headerMap.baseUnitIndex + 1)
          : null;

      const isCodeEmpty =
        cellCode.value === null ||
        cellCode.value === undefined ||
        String(cellCode.value).trim() === '';
      const isQtyEmpty =
        cellQty.value === null ||
        cellQty.value === undefined ||
        String(cellQty.value).trim() === '';
      const isNameEmpty =
        !cellName ||
        cellName.value === null ||
        cellName.value === undefined ||
        String(cellName.value).trim() === '';
      const isUnitEmpty =
        !cellUnit ||
        cellUnit.value === null ||
        cellUnit.value === undefined ||
        String(cellUnit.value).trim() === '';

      // Skip fully empty row
      if (isCodeEmpty && isQtyEmpty && isNameEmpty && isUnitEmpty) {
        continue;
      }

      const hasFormula =
        cellCode.type === ExcelJS.ValueType.Formula ||
        Boolean(cellCode.formula) ||
        cellQty.type === ExcelJS.ValueType.Formula ||
        Boolean(cellQty.formula) ||
        (cellName
          ? cellName.type === ExcelJS.ValueType.Formula ||
            Boolean(cellName.formula)
          : false) ||
        (cellUnit
          ? cellUnit.type === ExcelJS.ValueType.Formula ||
            Boolean(cellUnit.formula)
          : false) ||
        String(cellCode.value ?? '').startsWith('=') ||
        String(cellQty.value ?? '').startsWith('=') ||
        String(cellName?.value ?? '').startsWith('=') ||
        String(cellUnit?.value ?? '').startsWith('=');

      let rawInternalCode = '';
      if (cellCode.value !== null && cellCode.value !== undefined) {
        rawInternalCode = String(cellCode.value).trim();
      }

      let rawQuantity: string | number | null = null;
      if (cellQty.value !== null && cellQty.value !== undefined) {
        if (typeof cellQty.value === 'number') {
          rawQuantity = cellQty.value;
        } else {
          const str = String(cellQty.value).trim();
          rawQuantity = str === '' ? null : str;
        }
      }

      const rawProductName =
        cellName && cellName.value !== null && cellName.value !== undefined
          ? String(cellName.value).trim()
          : undefined;

      const rawBaseUnit =
        cellUnit && cellUnit.value !== null && cellUnit.value !== undefined
          ? String(cellUnit.value).trim()
          : undefined;

      rawRows.push({
        rowNumber: r,
        rawInternalCode,
        rawQuantity,
        rawProductName,
        rawBaseUnit,
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
   * Validates header array index-by-index without shifting, rejecting empty, duplicate, or unknown headers.
   */
  private static validateAndBuildHeaderMap(
    headers: (string | null | undefined)[],
  ): HeaderMap {
    if (!headers || headers.length === 0) {
      throw new BadRequestException({
        code: StockBulkFileErrorCode.BULK_LOAD_MISSING_HEADERS,
        message: 'El archivo no contiene encabezados.',
      });
    }

    let internalCodeIndex = -1;
    let quantityBaseIndex = -1;
    let productNameIndex: number | undefined = undefined;
    let baseUnitIndex: number | undefined = undefined;

    const seenHeaders = new Set<string>();

    for (let i = 0; i < headers.length; i++) {
      const headerCell = headers[i];

      if (
        headerCell === null ||
        headerCell === undefined ||
        headerCell.trim() === ''
      ) {
        throw new BadRequestException({
          code: StockBulkFileErrorCode.BULK_LOAD_MISSING_HEADERS,
          message:
            'El archivo contiene columnas sin encabezado o encabezados vacíos.',
        });
      }

      const normalized = headerCell.trim().toLowerCase();

      if (seenHeaders.has(normalized)) {
        throw new BadRequestException({
          code: StockBulkFileErrorCode.BULK_LOAD_DUPLICATE_HEADER,
          message: `El encabezado "${headerCell}" aparece duplicado en el archivo.`,
        });
      }
      seenHeaders.add(normalized);

      if (normalized === 'internalcode') {
        internalCodeIndex = i;
      } else if (normalized === 'quantitybase') {
        quantityBaseIndex = i;
      } else if (normalized === 'productname') {
        productNameIndex = i;
      } else if (normalized === 'baseunit') {
        baseUnitIndex = i;
      } else {
        throw new BadRequestException({
          code: StockBulkFileErrorCode.BULK_LOAD_UNKNOWN_HEADER,
          message: `El encabezado "${headerCell}" no es reconocido. Encabezados permitidos: internalCode, quantityBase, productName, baseUnit.`,
        });
      }
    }

    if (internalCodeIndex === -1 || quantityBaseIndex === -1) {
      throw new BadRequestException({
        code: StockBulkFileErrorCode.BULK_LOAD_MISSING_HEADERS,
        message:
          'El archivo debe contener los encabezados obligatorios: internalCode, quantityBase.',
      });
    }

    return {
      internalCodeIndex,
      quantityBaseIndex,
      productNameIndex,
      baseUnitIndex,
      totalHeaderColumns: headers.length,
    };
  }
}
