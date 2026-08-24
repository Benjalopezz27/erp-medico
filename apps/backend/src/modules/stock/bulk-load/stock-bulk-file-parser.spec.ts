import {
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import {
  StockBulkFileParser,
  BULK_LOAD_MAX_FILE_SIZE,
} from './stock-bulk-file-parser';

describe('StockBulkFileParser', () => {
  describe('1. 4-Column Header & Order Flexibility', () => {
    it('parses standard 4-column CSV with informative columns', async () => {
      const csv =
        'internalCode,productName,baseUnit,quantityBase\nP0001,Ibuprofeno 400mg,Comprimido (cmp),100.50\nP0002,Amoxicilina 500mg,Cápsula (cap),\n';
      const buffer = Buffer.from(csv, 'utf8');

      const result = await StockBulkFileParser.parse(buffer, 'carga.csv');

      expect(result.fileChecksum).toBeDefined();
      expect(result.rawRows).toHaveLength(2);
      expect(result.rawRows[0]).toEqual({
        rowNumber: 2,
        rawInternalCode: 'P0001',
        rawProductName: 'Ibuprofeno 400mg',
        rawBaseUnit: 'Comprimido (cmp)',
        rawQuantity: '100.50',
        hasFormula: false,
      });
      expect(result.rawRows[1]).toEqual({
        rowNumber: 3,
        rawInternalCode: 'P0002',
        rawProductName: 'Amoxicilina 500mg',
        rawBaseUnit: 'Cápsula (cap)',
        rawQuantity: null,
        hasFormula: false,
      });
    });

    it('parses 4-column CSV with rearranged column order', async () => {
      const csv =
        'quantityBase,baseUnit,internalCode,productName\n50,Unidad (un),P0003,Gasa estéril\n';
      const buffer = Buffer.from(csv, 'utf8');

      const result = await StockBulkFileParser.parse(buffer, 'carga.csv');

      expect(result.rawRows).toHaveLength(1);
      expect(result.rawRows[0]).toEqual({
        rowNumber: 2,
        rawInternalCode: 'P0003',
        rawProductName: 'Gasa estéril',
        rawBaseUnit: 'Unidad (un)',
        rawQuantity: '50',
        hasFormula: false,
      });
    });

    it('parses standard 4-column XLSX with empty quantities and informative columns', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Inventario');
      sheet.addRow(['internalCode', 'productName', 'baseUnit', 'quantityBase']);
      sheet.addRow(['P0001', 'Ibuprofeno', 'Comprimido (cmp)', 10]);
      sheet.addRow(['P0002', 'Amoxicilina', 'Cápsula (cap)', null]);

      const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
      const result = await StockBulkFileParser.parse(buffer, 'carga.xlsx');

      expect(result.rawRows).toHaveLength(2);
      expect(result.rawRows[0].rawInternalCode).toBe('P0001');
      expect(result.rawRows[0].rawQuantity).toBe(10);
      expect(result.rawRows[0].rawProductName).toBe('Ibuprofeno');
      expect(result.rawRows[1].rawInternalCode).toBe('P0002');
      expect(result.rawRows[1].rawQuantity).toBeNull();
    });
  });

  describe('2. Legacy 2-Column Compatibility', () => {
    it('parses legacy 2-column CSV seamlessly', async () => {
      const csv = 'internalCode,quantityBase\nP0001,100\n';
      const buffer = Buffer.from(csv, 'utf8');

      const result = await StockBulkFileParser.parse(buffer, 'legacy.csv');

      expect(result.rawRows).toHaveLength(1);
      expect(result.rawRows[0]).toEqual({
        rowNumber: 2,
        rawInternalCode: 'P0001',
        rawProductName: undefined,
        rawBaseUnit: undefined,
        rawQuantity: '100',
        hasFormula: false,
      });
    });

    it('parses legacy 2-column XLSX seamlessly', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Inventario');
      sheet.addRow(['internalCode', 'quantityBase']);
      sheet.addRow(['P0001', 25.5]);

      const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
      const result = await StockBulkFileParser.parse(buffer, 'legacy.xlsx');

      expect(result.rawRows).toHaveLength(1);
      expect(result.rawRows[0].rawInternalCode).toBe('P0001');
      expect(result.rawRows[0].rawQuantity).toBe(25.5);
    });
  });

  describe('3. Header & Row Width Validation Invariants', () => {
    it('rejects CSV with empty header cell between columns', async () => {
      const csv = 'internalCode,,quantityBase\nP0001,test,10\n';
      const buffer = Buffer.from(csv, 'utf8');

      await expect(
        StockBulkFileParser.parse(buffer, 'bad.csv'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects CSV with duplicate header name', async () => {
      const csv = 'internalCode,quantityBase,quantityBase\nP0001,10,20\n';
      const buffer = Buffer.from(csv, 'utf8');

      await expect(
        StockBulkFileParser.parse(buffer, 'dup.csv'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects CSV with unknown column header', async () => {
      const csv = 'internalCode,quantityBase,unknownHeader\nP0001,10,foo\n';
      const buffer = Buffer.from(csv, 'utf8');

      await expect(
        StockBulkFileParser.parse(buffer, 'unk.csv'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects CSV with missing mandatory header', async () => {
      const csv = 'internalCode,productName\nP0001,Paracetamol\n';
      const buffer = Buffer.from(csv, 'utf8');

      await expect(
        StockBulkFileParser.parse(buffer, 'miss.csv'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects CSV data row with more cells than declared headers', async () => {
      const csv =
        'internalCode,quantityBase\nP0001,10,extraValue1,extraValue2\n';
      const buffer = Buffer.from(csv, 'utf8');

      await expect(
        StockBulkFileParser.parse(buffer, 'overflow.csv'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects XLSX data row with content beyond declared header columns', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Inventario');
      sheet.addRow(['internalCode', 'quantityBase']);
      const row2 = sheet.addRow(['P0001', 10]);
      row2.getCell(3).value = 'Extra Content';

      const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
      await expect(
        StockBulkFileParser.parse(buffer, 'overflow.xlsx'),
      ).rejects.toThrow(BadRequestException);
    });

    it('correctly handles trailing empty quantity cell in CSV', async () => {
      const csv =
        'internalCode,productName,baseUnit,quantityBase\nP0001,Ibu,un,\n';
      const buffer = Buffer.from(csv, 'utf8');

      const result = await StockBulkFileParser.parse(buffer, 'trailing.csv');
      expect(result.rawRows).toHaveLength(1);
      expect(result.rawRows[0].rawQuantity).toBeNull();
    });
  });

  describe('4. Security Bounds & Malicious Content', () => {
    it('detects formula injection in CSV cells starting with = or @', async () => {
      const csv = 'internalCode,quantityBase\n=cmd|calc,10\n';
      const buffer = Buffer.from(csv, 'utf8');

      const result = await StockBulkFileParser.parse(buffer, 'formula.csv');
      expect(result.rawRows[0].hasFormula).toBe(true);
    });

    it('detects formula in XLSX cells', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Inventario');
      sheet.addRow(['internalCode', 'quantityBase']);
      sheet.addRow(['P0001', { formula: 'SUM(1, 2)', result: 3 }]);

      const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
      const result = await StockBulkFileParser.parse(buffer, 'formula.xlsx');
      expect(result.rawRows[0].hasFormula).toBe(true);
    });

    it('rejects files exceeding 2 MiB', async () => {
      const hugeBuffer = Buffer.alloc(BULK_LOAD_MAX_FILE_SIZE + 10);
      await expect(
        StockBulkFileParser.parse(hugeBuffer, 'huge.csv'),
      ).rejects.toThrow(PayloadTooLargeException);
    });

    it('rejects unsupported file extensions or mime types', async () => {
      const buffer = Buffer.from('some text');
      await expect(
        StockBulkFileParser.parse(buffer, 'document.pdf', 'application/pdf'),
      ).rejects.toThrow(UnsupportedMediaTypeException);
    });
  });
});
