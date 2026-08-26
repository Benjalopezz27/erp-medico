import { UnsupportedMediaTypeException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ImporterErrorCode } from '@erp/shared-types';
import { SecureSpreadsheetParser } from './secure-spreadsheet-parser';

describe('SecureSpreadsheetParser', () => {
  it.each([
    ['comma', 'Código,Descripción,Costo\n001,"Gasa, estéril",1250\n'],
    [
      'semicolon',
      '\uFEFFCódigo;Descripción;Costo\n001;"Gasa, estéril";1250,50\n',
    ],
  ])(
    'parses %s CSV and produces deterministic fingerprints',
    async (_name, csv) => {
      const first = await SecureSpreadsheetParser.parse(
        Buffer.from(csv),
        'lista.csv',
        'text/csv',
      );
      const second = await SecureSpreadsheetParser.parse(
        Buffer.from(csv),
        'lista.csv',
        'text/csv',
      );

      expect(first.headers).toEqual(['Código', 'Descripción', 'Costo']);
      expect(first.normalizedHeaders).toEqual([
        'código',
        'descripción',
        'costo',
      ]);
      expect(first.rows[0].cells).toHaveLength(3);
      expect(first.fileChecksum).toBe(second.fileChecksum);
      expect(first.headerFingerprint).toBe(second.headerFingerprint);
    },
  );

  it('pads incomplete rows with explicit null values', async () => {
    const parsed = await SecureSpreadsheetParser.parse(
      Buffer.from('sku,description,cost\nABC,Producto\n'),
      'lista.csv',
      'text/csv',
    );
    expect(parsed.rows[0]).toEqual({
      rowNumber: 2,
      cells: ['ABC', 'Producto', null],
      hasFormula: false,
    });
  });

  it('rejects normalized duplicate headers', async () => {
    await expect(
      SecureSpreadsheetParser.parse(
        Buffer.from(' Precio ,precio\n1,2\n'),
        'lista.csv',
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ImporterErrorCode.IMPORTER_HEADER_DUPLICATE,
      }),
    });
  });

  it('rejects CSV formulas for importer policy and flags them for stock policy', async () => {
    const buffer = Buffer.from('sku,cost\n=CMD(),10\n');
    await expect(
      SecureSpreadsheetParser.parse(buffer, 'lista.csv', 'text/csv', {
        formulaPolicy: 'reject',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ImporterErrorCode.IMPORTER_FORMULA_IN_DATA,
      }),
    });

    const flagged = await SecureSpreadsheetParser.parse(
      buffer,
      'lista.csv',
      'text/csv',
      {
        formulaPolicy: 'flag',
      },
    );
    expect(flagged.rows[0].hasFormula).toBe(true);
  });

  it('ignores style-only sheets, rows and columns', async () => {
    const workbook = new ExcelJS.Workbook();
    const data = workbook.addWorksheet('Datos');
    data.addRow(['SKU', 'Costo']);
    data.addRow(['001', 25]);
    data.getRow(100).getCell(50).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFFFF' },
    };
    const styled = workbook.addWorksheet('Estilos');
    styled.getRow(20).getCell(20).font = { bold: true };

    const parsed = await SecureSpreadsheetParser.parse(
      Buffer.from(await workbook.xlsx.writeBuffer()),
      'lista.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(parsed.totalRows).toBe(1);
    expect(parsed.totalColumns).toBe(2);
  });

  it('rejects multiple content sheets and XLSX formulas', async () => {
    const multi = new ExcelJS.Workbook();
    multi.addWorksheet('A').addRow(['SKU']);
    multi.addWorksheet('B').addRow(['Costo']);
    await expect(
      SecureSpreadsheetParser.parse(
        Buffer.from(await multi.xlsx.writeBuffer()),
        'multi.xlsx',
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ImporterErrorCode.IMPORTER_MULTIPLE_SHEETS,
      }),
    });

    const formula = new ExcelJS.Workbook();
    const sheet = formula.addWorksheet('Datos');
    sheet.addRow(['SKU', 'Costo']);
    sheet.addRow(['001', { formula: 'SUM(1,2)', result: 3 }]);
    await expect(
      SecureSpreadsheetParser.parse(
        Buffer.from(await formula.xlsx.writeBuffer()),
        'formula.xlsx',
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ImporterErrorCode.IMPORTER_FORMULA_IN_DATA,
      }),
    });
  });

  it('enforces row and column limits', async () => {
    await expect(
      SecureSpreadsheetParser.parse(
        Buffer.from('a,b,c\n1,2,3\n'),
        'lista.csv',
        'text/csv',
        {
          maxColumns: 2,
        },
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ImporterErrorCode.IMPORTER_COLUMN_LIMIT_EXCEEDED,
      }),
    });
    await expect(
      SecureSpreadsheetParser.parse(
        Buffer.from('a\n1\n2\n'),
        'lista.csv',
        'text/csv',
        {
          maxDataRows: 1,
        },
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: ImporterErrorCode.IMPORTER_ROW_LIMIT_EXCEEDED,
      }),
    });
  });

  it('rejects extension and content mismatches', async () => {
    await expect(
      SecureSpreadsheetParser.parse(Buffer.from('a,b\n1,2\n'), 'lista.xlsx'),
    ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
  });
});
