import {
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { parse as parseCsvSync } from 'csv-parse/sync';
import * as crypto from 'crypto';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import { ImporterErrorCode } from '@erp/shared-types';

export const SECURE_SPREADSHEET_MAX_FILE_SIZE = 2 * 1024 * 1024;
export const SECURE_SPREADSHEET_MAX_DATA_ROWS = 1000;
export const SECURE_SPREADSHEET_MAX_COLUMNS = 100;
export const SECURE_SPREADSHEET_MAX_UNCOMPRESSED_XLSX_SIZE = 25 * 1024 * 1024;
export const SECURE_SPREADSHEET_MAX_ZIP_ENTRIES = 50;

export type SpreadsheetFormulaPolicy = 'reject' | 'flag';
export type SpreadsheetCellErrorPolicy = 'reject' | 'flag';
export type ParsedCellValue = string | number | boolean | null;

export interface SecureParserOptions {
  maxFileSizeBytes?: number;
  maxDataRows?: number;
  maxColumns?: number;
  maxUncompressedXlsxBytes?: number;
  maxZipEntries?: number;
  formulaPolicy?: SpreadsheetFormulaPolicy;
  cellErrorPolicy?: SpreadsheetCellErrorPolicy;
}

export interface ParsedRawRow {
  rowNumber: number;
  cells: ParsedCellValue[];
  hasFormula: boolean;
  hasCellError?: boolean;
  cellErrors?: string[];
}

export interface SecureParsedResult {
  fileChecksum: string;
  detectedFormat: 'csv' | 'xlsx';
  sanitizedFileName: string;
  headers: string[];
  normalizedHeaders: string[];
  headerFingerprint: string;
  totalRows: number;
  totalColumns: number;
  rows: ParsedRawRow[];
}

interface ResolvedParserOptions {
  maxFileSizeBytes: number;
  maxDataRows: number;
  maxColumns: number;
  maxUncompressedXlsxBytes: number;
  maxZipEntries: number;
  formulaPolicy: SpreadsheetFormulaPolicy;
  cellErrorPolicy: SpreadsheetCellErrorPolicy;
}

interface ParsedSheetData {
  headers: string[];
  rows: ParsedRawRow[];
}

const XLSX_MIME_TYPES = new Set([
  '',
  'application/octet-stream',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const CSV_MIME_TYPES = new Set([
  '',
  'application/octet-stream',
  'application/vnd.ms-excel',
  'text/csv',
  'text/plain',
]);

export function normalizeHeader(raw: string): string {
  return raw.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function computeHeaderFingerprint(normalizedHeaders: string[]): string {
  return crypto
    .createHash('sha256')
    .update(
      Buffer.from(
        JSON.stringify(normalizedHeaders.map(normalizeHeader)),
        'utf8',
      ),
    )
    .digest('hex');
}

export function sanitizeFilename(original?: string): string {
  if (!original) return 'archivo';
  const basename = path.posix
    .basename(original.replace(/\\/g, '/'))
    .replace(/[\x00-\x1f\x7f]/g, '');
  return (basename || 'archivo').slice(0, 255);
}

export class SecureSpreadsheetParser {
  static async parse(
    fileBuffer: Buffer,
    originalFilename?: string,
    mimetype?: string,
    options: SecureParserOptions = {},
  ): Promise<SecureParsedResult> {
    const resolved = this.resolveOptions(options);
    this.validateBuffer(fileBuffer, resolved.maxFileSizeBytes);

    const sanitizedFileName = sanitizeFilename(originalFilename);
    const extension = path.extname(sanitizedFileName).toLowerCase();
    const clientMime = (mimetype ?? '').split(';')[0].trim().toLowerCase();
    const isZip = this.hasZipMagic(fileBuffer);
    const detectedFormat = this.detectFormat(extension, clientMime, isZip);
    const fileChecksum = this.sha256(fileBuffer);

    const parsed =
      detectedFormat === 'xlsx'
        ? await this.parseXlsx(fileBuffer, resolved)
        : this.parseCsv(fileBuffer, resolved);

    const { normalizedHeaders, headerFingerprint } = this.validateHeaders(
      parsed.headers,
      resolved.maxColumns,
    );

    if (parsed.rows.length > resolved.maxDataRows) {
      throw new BadRequestException({
        code: ImporterErrorCode.IMPORTER_ROW_LIMIT_EXCEEDED,
        message: `El archivo supera el límite máximo de ${resolved.maxDataRows} filas de datos.`,
      });
    }

    return {
      fileChecksum,
      detectedFormat,
      sanitizedFileName,
      headers: parsed.headers,
      normalizedHeaders,
      headerFingerprint,
      totalRows: parsed.rows.length,
      totalColumns: parsed.headers.length,
      rows: parsed.rows,
    };
  }

  private static resolveOptions(
    options: SecureParserOptions,
  ): ResolvedParserOptions {
    return {
      maxFileSizeBytes:
        options.maxFileSizeBytes ?? SECURE_SPREADSHEET_MAX_FILE_SIZE,
      maxDataRows: options.maxDataRows ?? SECURE_SPREADSHEET_MAX_DATA_ROWS,
      maxColumns: options.maxColumns ?? SECURE_SPREADSHEET_MAX_COLUMNS,
      maxUncompressedXlsxBytes:
        options.maxUncompressedXlsxBytes ??
        SECURE_SPREADSHEET_MAX_UNCOMPRESSED_XLSX_SIZE,
      maxZipEntries:
        options.maxZipEntries ?? SECURE_SPREADSHEET_MAX_ZIP_ENTRIES,
      formulaPolicy: options.formulaPolicy ?? 'reject',
      cellErrorPolicy: options.cellErrorPolicy ?? 'reject',
    };
  }

  private static validateBuffer(buffer: Buffer, maxSize: number): void {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException({
        code: ImporterErrorCode.IMPORTER_FILE_EMPTY,
        message: 'El archivo está vacío o no fue proporcionado.',
      });
    }
    if (buffer.length > maxSize) {
      throw new PayloadTooLargeException({
        code: ImporterErrorCode.IMPORTER_FILE_TOO_LARGE,
        message: 'El archivo supera el tamaño máximo permitido de 2 MiB.',
      });
    }
  }

  private static detectFormat(
    extension: string,
    clientMime: string,
    isZip: boolean,
  ): 'csv' | 'xlsx' {
    if (!['.csv', '.xlsx'].includes(extension)) {
      throw new UnsupportedMediaTypeException({
        code: ImporterErrorCode.IMPORTER_FORMAT_NOT_SUPPORTED,
        message: 'Formato no soportado. Solo se admiten archivos .csv y .xlsx.',
      });
    }

    if (extension === '.xlsx') {
      if (!isZip || !XLSX_MIME_TYPES.has(clientMime)) {
        throw new UnsupportedMediaTypeException({
          code: ImporterErrorCode.IMPORTER_MIME_MISMATCH,
          message:
            'El contenido del archivo no coincide con su extensión XLSX.',
        });
      }
      return 'xlsx';
    }

    if (isZip || !CSV_MIME_TYPES.has(clientMime)) {
      throw new UnsupportedMediaTypeException({
        code: ImporterErrorCode.IMPORTER_MIME_MISMATCH,
        message: 'El contenido del archivo no coincide con su extensión CSV.',
      });
    }
    return 'csv';
  }

  private static parseCsv(
    buffer: Buffer,
    options: ResolvedParserOptions,
  ): ParsedSheetData {
    let content: string;
    try {
      content = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch {
      throw new BadRequestException({
        code: ImporterErrorCode.IMPORTER_FILE_CORRUPT,
        message: 'El archivo CSV no utiliza una codificación UTF-8 válida.',
      });
    }
    if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
    if (content.includes('\0'))
      this.throwCorrupt('El archivo CSV contiene bytes nulos no permitidos.');

    const comma = this.parseCsvCandidate(content, ',');
    const semicolon = this.parseCsvCandidate(content, ';');
    const records = this.selectCsvCandidate(content, comma, semicolon);

    if (records.length === 0 || this.isEmptyRow(records[0])) {
      throw new BadRequestException({
        code: ImporterErrorCode.IMPORTER_HEADER_EMPTY,
        message: 'El archivo no contiene encabezados.',
      });
    }

    const headers = records[0].map((cell) => String(cell ?? '').trim());
    if (headers.length > options.maxColumns)
      this.throwColumnLimit(options.maxColumns);

    const rows: ParsedRawRow[] = [];
    for (let index = 1; index < records.length; index++) {
      const record = records[index] ?? [];
      if (this.isEmptyRow(record)) continue;
      const rowNumber = index + 1;

      if (
        record.length > headers.length &&
        record.slice(headers.length).some((cell) => cell.trim() !== '')
      ) {
        this.throwCorrupt(
          `La fila ${rowNumber} contiene datos fuera de los encabezados declarados.`,
        );
      }

      const cells: ParsedCellValue[] = [];
      let hasFormula = false;
      for (let column = 0; column < headers.length; column++) {
        const value =
          record[column] === undefined ? null : record[column].trim() || null;
        if (typeof value === 'string' && this.isCsvFormula(value)) {
          hasFormula = true;
          if (options.formulaPolicy === 'reject')
            this.throwFormula(false, rowNumber, column + 1);
        }
        cells.push(value);
      }
      rows.push({ rowNumber, cells, hasFormula });
    }

    this.rejectHeaderFormula(headers);
    return { headers, rows };
  }

  private static parseCsvCandidate(
    content: string,
    delimiter: ',' | ';',
  ): string[][] | null {
    try {
      return parseCsvSync(content, {
        delimiter,
        bom: false,
        relax_column_count: true,
        skip_empty_lines: false,
      }) as string[][];
    } catch {
      return null;
    }
  }

  private static selectCsvCandidate(
    content: string,
    comma: string[][] | null,
    semicolon: string[][] | null,
  ): string[][] {
    if (!comma && !semicolon)
      this.throwCorrupt(
        'El archivo CSV tiene una estructura inválida o corrupta.',
      );
    if (!comma) return semicolon!;
    if (!semicolon) return comma;

    const score = (records: string[][]): [number, number] => {
      const headerWidth = records[0]?.length ?? 0;
      const mismatches = records
        .slice(1)
        .filter(
          (row) => !this.isEmptyRow(row) && row.length !== headerWidth,
        ).length;
      return [headerWidth > 1 ? 1 : 0, -mismatches];
    };
    const commaScore = score(comma);
    const semicolonScore = score(semicolon);
    if (
      semicolonScore[0] > commaScore[0] ||
      (semicolonScore[0] === commaScore[0] && semicolonScore[1] > commaScore[1])
    ) {
      return semicolon;
    }
    if (commaScore[0] > semicolonScore[0] || commaScore[1] > semicolonScore[1])
      return comma;

    const headerLine = content.split(/\r?\n/, 1)[0] ?? '';
    return this.countUnquoted(headerLine, ';') >
      this.countUnquoted(headerLine, ',')
      ? semicolon
      : comma;
  }

  private static countUnquoted(value: string, delimiter: ',' | ';'): number {
    let quoted = false;
    let count = 0;
    for (let i = 0; i < value.length; i++) {
      if (value[i] === '"') {
        if (quoted && value[i + 1] === '"') i++;
        else quoted = !quoted;
      } else if (!quoted && value[i] === delimiter) count++;
    }
    return count;
  }

  private static async parseXlsx(
    buffer: Buffer,
    options: ResolvedParserOptions,
  ): Promise<ParsedSheetData> {
    this.inspectZip(buffer, options);
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    } catch {
      this.throwCorrupt(
        'El archivo XLSX tiene una estructura inválida o corrupta.',
      );
    }

    const sheetsWithContent = workbook.worksheets
      .map((worksheet) => ({
        worksheet,
        bounds: this.getWorksheetContentBounds(worksheet),
      }))
      .filter(({ bounds }) => bounds.lastContentRow > 0);

    if (sheetsWithContent.length === 0)
      this.throwCorrupt('El archivo XLSX no contiene hojas con datos.');
    if (sheetsWithContent.length > 1) {
      throw new BadRequestException({
        code: ImporterErrorCode.IMPORTER_MULTIPLE_SHEETS,
        message: 'El archivo Excel contiene más de una hoja con datos.',
      });
    }

    const { worksheet, bounds } = sheetsWithContent[0];
    const headerRow = worksheet.getRow(1);
    const totalColumns = this.findLastContentCellIndex(headerRow);
    if (totalColumns > options.maxColumns)
      this.throwColumnLimit(options.maxColumns);
    const headers: string[] = [];
    for (let column = 1; column <= totalColumns; column++) {
      const converted = this.convertXlsxCell(
        headerRow.getCell(column),
        1,
        column,
        options.formulaPolicy,
        options.cellErrorPolicy,
        true,
      );
      headers.push(
        converted.value === null ? '' : String(converted.value).trim(),
      );
    }

    const rows: ParsedRawRow[] = [];
    for (let rowNumber = 2; rowNumber <= bounds.lastContentRow; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const lastContentColumn = this.findLastContentCellIndex(row);
      if (lastContentColumn === 0) continue;
      if (lastContentColumn > totalColumns) {
        this.throwCorrupt(
          `La fila ${rowNumber} contiene datos fuera de los encabezados declarados.`,
        );
      }
      const cells: ParsedCellValue[] = [];
      let hasFormula = false;
      let hasCellError = false;
      const cellErrors: string[] = [];

      for (let column = 1; column <= totalColumns; column++) {
        const converted = this.convertXlsxCell(
          row.getCell(column),
          rowNumber,
          column,
          options.formulaPolicy,
          options.cellErrorPolicy,
          false,
        );
        cells.push(converted.value);
        hasFormula ||= converted.hasFormula;
        if (converted.hasCellError) {
          hasCellError = true;
          if (converted.cellError) cellErrors.push(converted.cellError);
        }
      }
      rows.push({
        rowNumber,
        cells,
        hasFormula,
        hasCellError,
        cellErrors: cellErrors.length > 0 ? cellErrors : undefined,
      });
    }

    this.rejectHeaderFormula(headers);
    return { headers, rows };
  }

  private static convertXlsxCell(
    cell: ExcelJS.Cell,
    row: number,
    column: number,
    formulaPolicy: SpreadsheetFormulaPolicy,
    cellErrorPolicy: SpreadsheetCellErrorPolicy,
    isHeader: boolean,
  ): {
    value: ParsedCellValue;
    hasFormula: boolean;
    hasCellError: boolean;
    cellError?: string;
  } {
    const raw = cell.value;
    const formula =
      cell.type === ExcelJS.ValueType.Formula ||
      Boolean(cell.formula) ||
      (typeof raw === 'object' && raw !== null && 'formula' in raw);
    if (formula) {
      if (formulaPolicy === 'reject') this.throwFormula(isHeader, row, column);
      const result =
        typeof raw === 'object' && raw !== null && 'result' in raw
          ? raw.result
          : null;
      const scalar = this.scalarToValue(result, row, column, cellErrorPolicy);
      return {
        value: scalar.value,
        hasFormula: true,
        hasCellError: scalar.hasCellError,
        cellError: scalar.cellError,
      };
    }
    const scalar = this.scalarToValue(raw, row, column, cellErrorPolicy);
    return {
      value: scalar.value,
      hasFormula: false,
      hasCellError: scalar.hasCellError,
      cellError: scalar.cellError,
    };
  }

  private static scalarToValue(
    value: ExcelJS.CellValue | unknown,
    row: number,
    column: number,
    cellErrorPolicy: SpreadsheetCellErrorPolicy,
  ): { value: ParsedCellValue; hasCellError: boolean; cellError?: string } {
    if (value === null || value === undefined)
      return { value: null, hasCellError: false };
    if (typeof value === 'string')
      return { value: value.trim() || null, hasCellError: false };
    if (typeof value === 'number') {
      if (!Number.isFinite(value))
        this.throwCorrupt(
          `La celda ${row}:${column} contiene un número inválido.`,
        );
      return { value, hasCellError: false };
    }
    if (typeof value === 'boolean') return { value, hasCellError: false };
    if (value instanceof Date)
      return { value: value.toISOString(), hasCellError: false };
    if (typeof value === 'object') {
      if ('error' in value) {
        if (cellErrorPolicy === 'reject') {
          throw new BadRequestException({
            code: ImporterErrorCode.IMPORTER_EXCEL_ERROR_CELL,
            message: `La celda en fila ${row}, columna ${column} contiene un error de Excel (${String((value as any).error)}).`,
          });
        }
        return {
          value: null,
          hasCellError: true,
          cellError: String((value as any).error),
        };
      }
      if ('richText' in value && Array.isArray((value as any).richText)) {
        const text = (value as any).richText
          .map((part: { text?: string }) => part.text ?? '')
          .join('')
          .trim();
        return { value: text || null, hasCellError: false };
      }
      if ('text' in value) {
        const text = String((value as any).text ?? '').trim();
        return { value: text || null, hasCellError: false };
      }
    }
    this.throwCorrupt(
      `La celda en fila ${row}, columna ${column} contiene un tipo no soportado.`,
    );
  }

  private static getWorksheetContentBounds(worksheet: ExcelJS.Worksheet): {
    lastContentRow: number;
  } {
    let lastContentRow = 0;
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (this.findLastContentCellIndex(row) > 0)
        lastContentRow = Math.max(lastContentRow, rowNumber);
    });
    return { lastContentRow };
  }

  private static findLastContentCellIndex(row: ExcelJS.Row): number {
    for (let column = row.cellCount; column >= 1; column--) {
      const value = row.getCell(column).value;
      if (
        value !== null &&
        value !== undefined &&
        (typeof value !== 'string' || value.trim() !== '')
      )
        return column;
    }
    return 0;
  }

  private static validateHeaders(
    headers: string[],
    maxColumns: number,
  ): { normalizedHeaders: string[]; headerFingerprint: string } {
    if (headers.length === 0) {
      throw new BadRequestException({
        code: ImporterErrorCode.IMPORTER_HEADER_EMPTY,
        message: 'El archivo no contiene encabezados.',
      });
    }
    if (headers.length > maxColumns) this.throwColumnLimit(maxColumns);
    const normalizedHeaders = headers.map(normalizeHeader);
    if (normalizedHeaders.some((header) => header === '')) {
      throw new BadRequestException({
        code: ImporterErrorCode.IMPORTER_HEADER_EMPTY,
        message: 'El archivo contiene encabezados vacíos.',
      });
    }
    const seen = new Set<string>();
    for (let index = 0; index < normalizedHeaders.length; index++) {
      if (seen.has(normalizedHeaders[index])) {
        throw new BadRequestException({
          code: ImporterErrorCode.IMPORTER_HEADER_DUPLICATE,
          message: `El encabezado "${headers[index]}" aparece duplicado.`,
        });
      }
      seen.add(normalizedHeaders[index]);
    }
    return {
      normalizedHeaders,
      headerFingerprint: computeHeaderFingerprint(normalizedHeaders),
    };
  }

  private static rejectHeaderFormula(headers: string[]): void {
    const index = headers.findIndex((header) => /^[=+@-]/.test(header.trim()));
    if (index >= 0) this.throwFormula(true, 1, index + 1);
  }

  private static isCsvFormula(value: string): boolean {
    const trimmed = value.trim();
    if (/^[=@]/.test(trimmed)) return true;
    if (!/^[+-]/.test(trimmed)) return false;
    return !/^[+-]\d+(?:[.,]\d+)?%?$/.test(trimmed);
  }

  private static isEmptyRow(row: string[]): boolean {
    return (
      !row ||
      row.length === 0 ||
      row.every((cell) => !cell || cell.trim() === '')
    );
  }

  private static inspectZip(
    buffer: Buffer,
    options: ResolvedParserOptions,
  ): void {
    const eocdSignature = 0x06054b50;
    const centralSignature = 0x02014b50;
    let eocdOffset = -1;
    for (
      let offset = Math.max(0, buffer.length - 65557);
      offset <= buffer.length - 22;
      offset++
    ) {
      if (buffer.readUInt32LE(offset) === eocdSignature) eocdOffset = offset;
    }
    if (eocdOffset < 0)
      this.throwZip('El archivo XLSX no contiene un directorio ZIP válido.');

    const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
    const centralSize = buffer.readUInt32LE(eocdOffset + 12);
    const centralOffset = buffer.readUInt32LE(eocdOffset + 16);
    if (
      totalEntries === 0 ||
      totalEntries > options.maxZipEntries ||
      centralOffset + centralSize > eocdOffset
    ) {
      this.throwZip(
        'El archivo XLSX contiene una cantidad o estructura de entradas no permitida.',
      );
    }

    let offset = centralOffset;
    let countedEntries = 0;
    let totalUncompressed = 0;
    while (countedEntries < totalEntries) {
      if (
        offset + 46 > eocdOffset ||
        buffer.readUInt32LE(offset) !== centralSignature
      )
        this.throwZip('El directorio ZIP del archivo es inconsistente.');
      const compressedSize = buffer.readUInt32LE(offset + 20);
      const uncompressedSize = buffer.readUInt32LE(offset + 24);
      const flags = buffer.readUInt16LE(offset + 8);
      const compressionMethod = buffer.readUInt16LE(offset + 10);
      const fileNameLength = buffer.readUInt16LE(offset + 28);
      const extraLength = buffer.readUInt16LE(offset + 30);
      const commentLength = buffer.readUInt16LE(offset + 32);
      const fileNameEnd = offset + 46 + fileNameLength;
      const localHeaderOffset = buffer.readUInt32LE(offset + 42);
      if (
        fileNameEnd > eocdOffset ||
        compressedSize === 0xffffffff ||
        uncompressedSize === 0xffffffff
      )
        this.throwZip('No se admite ZIP64 ni tamaños internos inválidos.');
      if ((flags & 0x1) !== 0 || ![0, 8].includes(compressionMethod)) {
        this.throwZip(
          'El archivo XLSX utiliza cifrado o compresión no permitidos.',
        );
      }
      if (
        localHeaderOffset + 30 > centralOffset ||
        buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50
      ) {
        this.throwZip(
          'El archivo XLSX contiene referencias ZIP inconsistentes.',
        );
      }
      const fileName = buffer
        .subarray(offset + 46, fileNameEnd)
        .toString('utf8')
        .replace(/\\/g, '/');
      const normalizedName = fileName.toLowerCase();
      if (
        fileName.includes('\0') ||
        fileName.startsWith('/') ||
        fileName.split('/').includes('..')
      )
        this.throwZip('El archivo XLSX contiene rutas internas no permitidas.');
      if (
        normalizedName === 'xl/vbaproject.bin' ||
        normalizedName === 'xl/vbadata.xml'
      ) {
        throw new BadRequestException({
          code: ImporterErrorCode.IMPORTER_MACROS_NOT_ALLOWED,
          message: 'Los archivos con macros no están permitidos.',
        });
      }
      totalUncompressed += uncompressedSize;
      if (
        uncompressedSize > options.maxUncompressedXlsxBytes ||
        totalUncompressed > options.maxUncompressedXlsxBytes
      )
        this.throwZip(
          'El archivo comprimido supera el límite de expansión permitido.',
        );
      countedEntries++;
      offset = fileNameEnd + extraLength + commentLength;
    }
    if (
      countedEntries !== totalEntries ||
      offset !== centralOffset + centralSize
    )
      this.throwZip('El directorio ZIP del archivo es inconsistente.');
  }

  private static hasZipMagic(buffer: Buffer): boolean {
    return buffer.length >= 4 && buffer.readUInt32LE(0) === 0x04034b50;
  }

  private static sha256(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private static throwFormula(
    header: boolean,
    row: number,
    column: number,
  ): never {
    throw new BadRequestException({
      code: header
        ? ImporterErrorCode.IMPORTER_FORMULA_IN_HEADER
        : ImporterErrorCode.IMPORTER_FORMULA_IN_DATA,
      message: header
        ? `El encabezado en la columna ${column} contiene una fórmula no permitida.`
        : `La celda en fila ${row}, columna ${column} contiene una fórmula no permitida.`,
    });
  }

  private static throwColumnLimit(maxColumns: number): never {
    throw new BadRequestException({
      code: ImporterErrorCode.IMPORTER_COLUMN_LIMIT_EXCEEDED,
      message: `El archivo supera el límite máximo de ${maxColumns} columnas.`,
    });
  }

  private static throwCorrupt(message: string): never {
    throw new BadRequestException({
      code: ImporterErrorCode.IMPORTER_FILE_CORRUPT,
      message,
    });
  }

  private static throwZip(message: string): never {
    throw new BadRequestException({
      code: ImporterErrorCode.IMPORTER_ZIP_SUSPICIOUS,
      message,
    });
  }
}
