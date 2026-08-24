import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import {
  StockBulkFileParser,
  BULK_LOAD_MAX_FILE_SIZE,
} from './stock-bulk-file-parser';

describe('StockBulkFileParser', () => {
  it('parses standard CSV with valid rows and computes file checksum', async () => {
    const csvContent = 'internalCode,quantityBase\nP0001,100.50\nP0002,25\n';
    const buffer = Buffer.from(csvContent, 'utf8');

    const result = await StockBulkFileParser.parse(
      buffer,
      'carga.csv',
      'text/csv',
    );

    expect(result.fileChecksum).toBeDefined();
    expect(result.fileChecksum.length).toBe(64);
    expect(result.rawRows).toHaveLength(2);
    expect(result.rawRows[0]).toEqual({
      rowNumber: 2,
      rawInternalCode: 'P0001',
      rawQuantity: '100.50',
      hasFormula: false,
    });
    expect(result.rawRows[1]).toEqual({
      rowNumber: 3,
      rawInternalCode: 'P0002',
      rawQuantity: '25',
      hasFormula: false,
    });
  });

  it('strips UTF-8 BOM from CSV without corrupting first header', async () => {
    const csvWithBom = '\uFEFFinternalCode,quantityBase\nP0001,50\n';
    const buffer = Buffer.from(csvWithBom, 'utf8');

    const result = await StockBulkFileParser.parse(
      buffer,
      'carga_bom.csv',
      'text/csv',
    );

    expect(result.rawRows).toHaveLength(1);
    expect(result.rawRows[0].rawInternalCode).toBe('P0001');
  });

  it('parses standard XLSX workbook with exact rows and types', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Inventario');
    sheet.addRow(['internalCode', 'quantityBase']);
    sheet.addRow(['P0001', 100.5]);
    sheet.addRow(['P0002', 25]);

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const result = await StockBulkFileParser.parse(
      buffer,
      'carga.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    expect(result.rawRows).toHaveLength(2);
    expect(result.rawRows[0].rawInternalCode).toBe('P0001');
    expect(result.rawRows[0].rawQuantity).toBe(100.5);
    expect(result.rawRows[1].rawInternalCode).toBe('P0002');
    expect(result.rawRows[1].rawQuantity).toBe(25);
  });

  it('detects formulas in Excel cells and flags hasFormula', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Inventario');
    sheet.addRow(['internalCode', 'quantityBase']);
    sheet.addRow(['P0001', { formula: 'SUM(10, 20)', result: 30 }]);

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const result = await StockBulkFileParser.parse(buffer, 'formulas.xlsx');

    expect(result.rawRows[0].hasFormula).toBe(true);
  });

  it('detects formula characters in CSV (=, @) and flags hasFormula', async () => {
    const csv = 'internalCode,quantityBase\nP0001,=10+20\n';
    const buffer = Buffer.from(csv, 'utf8');

    const result = await StockBulkFileParser.parse(
      buffer,
      'carga.csv',
      'text/csv',
    );
    expect(result.rawRows[0].hasFormula).toBe(true);
  });

  it('preserves negative quantity in CSV without flagging as formula', async () => {
    const csv = 'internalCode,quantityBase\nP0001,-15.50\n';
    const buffer = Buffer.from(csv, 'utf8');

    const result = await StockBulkFileParser.parse(
      buffer,
      'carga.csv',
      'text/csv',
    );
    expect(result.rawRows[0].rawQuantity).toBe('-15.50');
    expect(result.rawRows[0].hasFormula).toBe(false);
  });

  it('rejects file exceeding max size limit (2 MiB)', async () => {
    const hugeBuffer = Buffer.alloc(BULK_LOAD_MAX_FILE_SIZE + 10);

    await expect(
      StockBulkFileParser.parse(hugeBuffer, 'huge.csv', 'text/csv'),
    ).rejects.toThrow(PayloadTooLargeException);
  });

  it('rejects workbook with multiple non-empty sheets', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet1 = workbook.addWorksheet('Hoja1');
    sheet1.addRow(['internalCode', 'quantityBase']);
    sheet1.addRow(['P0001', 10]);

    const sheet2 = workbook.addWorksheet('Hoja2');
    sheet2.addRow(['internalCode', 'quantityBase']);
    sheet2.addRow(['P0002', 20]);

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    await expect(
      StockBulkFileParser.parse(buffer, 'multi.xlsx'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects CSV with unknown or extra headers', async () => {
    const csv = 'internalCode,quantityBase,extraColumn\nP0001,10,test\n';
    const buffer = Buffer.from(csv, 'utf8');

    await expect(
      StockBulkFileParser.parse(buffer, 'invalid_headers.csv', 'text/csv'),
    ).rejects.toThrow(BadRequestException);
  });
});
