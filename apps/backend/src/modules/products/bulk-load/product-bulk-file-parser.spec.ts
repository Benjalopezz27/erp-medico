import {
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import {
  ProductBulkFileParser,
  PRODUCT_BULK_LOAD_MAX_FILE_SIZE,
} from './product-bulk-file-parser';

describe('ProductBulkFileParser', () => {
  describe('1. Parsing & Header Flexibility', () => {
    it('parses standard product CSV with all columns', async () => {
      const csv =
        'name,category,baseUnit,costNet,activePriceNet,description,minStock,initialStock,markupPercentage,taxTreatment,ivaPercentage,conversions\n' +
        'Ibuprofeno 400mg,Medicamentos,Comprimido,100.50,150.00,Analgésico,10,50,30,GRAVADO,21,Caja:10\n';
      const buffer = Buffer.from(csv, 'utf8');

      const result = await ProductBulkFileParser.parse(buffer, 'productos.csv');

      expect(result.fileChecksum).toBeDefined();
      expect(result.rawRows).toHaveLength(1);
      expect(result.rawRows[0]).toEqual({
        rowNumber: 2,
        rawName: 'Ibuprofeno 400mg',
        rawCategory: 'Medicamentos',
        rawBaseUnit: 'Comprimido',
        rawCostNet: '100.50',
        rawActivePriceNet: '150.00',
        rawDescription: 'Analgésico',
        rawMinStock: '10',
        rawInitialStock: '50',
        rawMarkupPercentage: '30',
        rawTaxTreatment: 'GRAVADO',
        rawIvaPercentage: '21',
        rawConversions: 'Caja:10',
        hasFormula: false,
      });
    });

    it('parses CSV with minimal required columns and Spanish aliases', async () => {
      const csv =
        'Nombre,Categoría,Unidad Base,Costo Neto,Precio Activo Neto\n' +
        'Paracetamol 500mg,Medicamentos,Comprimido,50,75\n';
      const buffer = Buffer.from(csv, 'utf8');

      const result = await ProductBulkFileParser.parse(buffer, 'productos.csv');

      expect(result.rawRows).toHaveLength(1);
      expect(result.rawRows[0]).toMatchObject({
        rowNumber: 2,
        rawName: 'Paracetamol 500mg',
        rawCategory: 'Medicamentos',
        rawBaseUnit: 'Comprimido',
        rawCostNet: '50',
        rawActivePriceNet: '75',
        rawDescription: null,
        rawMinStock: null,
        rawInitialStock: null,
      });
    });

    it('parses multi-sheet XLSX targeting "Productos" sheet and ignoring "Referencia" sheet', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet1 = workbook.addWorksheet('Productos');
      sheet1.addRow([
        'name',
        'category',
        'baseUnit',
        'costNet',
        'activePriceNet',
      ]);
      sheet1.addRow(['Gasa Estéril', 'Descartables', 'Unidad', 10, 15]);

      const sheet2 = workbook.addWorksheet('Referencia');
      sheet2.addRow(['Categoría', 'Unidad']);
      sheet2.addRow(['Descartables', 'Unidad']);

      const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
      const result = await ProductBulkFileParser.parse(
        buffer,
        'productos.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );

      expect(result.rawRows).toHaveLength(1);
      expect(result.rawRows[0].rawName).toBe('Gasa Estéril');
      expect(result.rawRows[0].rawCostNet).toBe(10);
      expect(result.rawRows[0].rawActivePriceNet).toBe(15);
    });

    it('flags formula cells correctly', async () => {
      const csv =
        'name,category,baseUnit,costNet,activePriceNet\n' +
        '=SUM(A1),Medicamentos,Unidad,10,20\n';
      const buffer = Buffer.from(csv, 'utf8');

      const result = await ProductBulkFileParser.parse(buffer, 'formula.csv');
      expect(result.rawRows[0].hasFormula).toBe(true);
    });
  });

  describe('2. Validation & Error Handling', () => {
    it('throws BadRequestException on missing required headers', async () => {
      const csv = 'name,category\nIbuprofeno,Medicamentos\n';
      const buffer = Buffer.from(csv, 'utf8');

      await expect(
        ProductBulkFileParser.parse(buffer, 'invalido.csv'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException on unknown headers', async () => {
      const csv =
        'name,category,baseUnit,costNet,activePriceNet,columnaInventada\n' +
        'A,B,C,1,2,X\n';
      const buffer = Buffer.from(csv, 'utf8');

      await expect(
        ProductBulkFileParser.parse(buffer, 'desconocido.csv'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws PayloadTooLargeException if file exceeds limit', async () => {
      const largeBuffer = Buffer.alloc(PRODUCT_BULK_LOAD_MAX_FILE_SIZE + 100);
      await expect(
        ProductBulkFileParser.parse(largeBuffer, 'grande.csv'),
      ).rejects.toThrow(PayloadTooLargeException);
    });

    it('throws UnsupportedMediaTypeException on unsupported file extension', async () => {
      const buffer = Buffer.from('data');
      await expect(
        ProductBulkFileParser.parse(buffer, 'archivo.pdf'),
      ).rejects.toThrow(UnsupportedMediaTypeException);
    });
  });
});
