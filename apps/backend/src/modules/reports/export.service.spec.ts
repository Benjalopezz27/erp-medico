import * as ExcelJS from 'exceljs';
import { PDFDocument } from 'pdf-lib';
import { ExportService } from './export.service';
import { ReportColumn, ReportRow } from './report.types';

const columns: ReportColumn[] = [
  { key: 'name', header: 'Nombre' },
  { key: 'total', header: 'Total', type: 'money' },
  { key: 'qty', header: 'Cantidad', type: 'number' },
];
const rows: ReportRow[] = [
  { name: 'Guantes', total: '1500.50', qty: 3 },
  { name: 'Jeringa', total: '20', qty: 10 },
];

const readSheet = async (buffer: Buffer) => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  return wb.worksheets[0];
};

describe('ExportService', () => {
  const service = new ExportService();

  describe('toExcel', () => {
    it('writes header and rows in column order', async () => {
      const sheet = await readSheet(
        await service.toExcel('Ventas', columns, rows),
      );
      expect(sheet.name).toBe('Ventas');
      expect(sheet.rowCount).toBe(3);
      expect(sheet.getRow(1).values).toEqual([
        undefined,
        'Nombre',
        'Total',
        'Cantidad',
      ]);
      expect(sheet.getRow(2).values).toEqual([undefined, 'Guantes', 1500.5, 3]);
    });

    it('formats money cells with 2 decimals', async () => {
      const sheet = await readSheet(
        await service.toExcel('Ventas', columns, rows),
      );
      expect(sheet.getCell('B3').numFmt).toBe('#,##0.00');
    });

    it('exports only the header when there are no rows', async () => {
      const sheet = await readSheet(
        await service.toExcel('Ventas', columns, []),
      );
      expect(sheet.rowCount).toBe(1);
    });
  });

  describe('toPdf', () => {
    const pageCount = async (buffer: Buffer) =>
      (await PDFDocument.load(buffer)).getPageCount();

    it('returns a valid PDF', async () => {
      const pdf = await service.toPdf('Ventas', columns, rows);
      expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    });

    it('paginates when rows exceed one page', async () => {
      const many = Array.from({ length: 80 }, (_, i) => ({
        name: `Item ${i}`,
        total: '10.00',
        qty: i,
      }));
      expect(
        await pageCount(await service.toPdf('Ventas', columns, many)),
      ).toBeGreaterThan(1);
    });

    it('does not throw on non WinAnsi text', async () => {
      await expect(
        service.toPdf('Ventas', columns, [
          { name: '日本語 ✓', total: '1', qty: 1 },
        ]),
      ).resolves.toBeInstanceOf(Buffer);
    });
  });
});
