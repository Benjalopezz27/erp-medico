import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { ReportCellValue, ReportColumn, ReportRow } from './report.types';

const PAGE_SIZE: [number, number] = [841.89, 595.28]; // A4 horizontal, pt
const MARGIN = 30;
const ROW_HEIGHT = 16;
const FONT_SIZE = 8;
const MONEY_FORMAT = '#,##0.00';

const isRight = (col: ReportColumn): boolean =>
  col.type === 'money' || col.type === 'number';

// Helvetica estándar solo codifica WinAnsi; lo demás se reemplaza por "?".
const safe = (text: string): string => text.replace(/[^\x20-\x7E -ÿ]/g, '?');

const cellText = (value: ReportCellValue): string =>
  value === null ? '' : safe(String(value));

/** Excel/PDF genérico para reportes. Los montos llegan como string decimal y no se operan. */
@Injectable()
export class ExportService {
  async toExcel(
    title: string,
    columns: ReportColumn[],
    rows: ReportRow[],
  ): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    // Excel limita el nombre de hoja a 31 caracteres y prohíbe : \ / ? * [ ]
    const sheet = wb.addWorksheet(
      title.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31),
    );
    sheet.columns = columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width ?? Math.max(12, c.header.length + 2),
      style: c.type === 'money' ? { numFmt: MONEY_FORMAT } : {},
    }));
    sheet.getRow(1).font = { bold: true };
    for (const row of rows) {
      sheet.addRow(
        Object.fromEntries(
          columns.map((c) => [
            c.key,
            c.type === 'money' && row[c.key] !== null
              ? Number(row[c.key])
              : row[c.key],
          ]),
        ),
      );
    }
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  async toPdf(
    title: string,
    columns: ReportColumn[],
    rows: ReportRow[],
  ): Promise<Buffer> {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const tableWidth = PAGE_SIZE[0] - MARGIN * 2;
    const totalWeight = columns.reduce((s, c) => s + (c.width ?? 14), 0);
    const widths = columns.map(
      (c) => ((c.width ?? 14) / totalWeight) * tableWidth,
    );

    const drawRow = (
      page: PDFPage,
      y: number,
      cells: string[],
      f: PDFFont,
    ): void => {
      let x = MARGIN;
      cells.forEach((text, i) => {
        const shown = fit(text, f, widths[i] - 6);
        const w = f.widthOfTextAtSize(shown, FONT_SIZE);
        page.drawText(shown, {
          x: isRight(columns[i]) ? x + widths[i] - 3 - w : x + 3,
          y,
          size: FONT_SIZE,
          font: f,
        });
        x += widths[i];
      });
    };

    const newPage = (): { page: PDFPage; y: number } => {
      const page = doc.addPage(PAGE_SIZE);
      page.drawText(safe(title), {
        x: MARGIN,
        y: PAGE_SIZE[1] - MARGIN,
        size: 14,
        font: bold,
      });
      let y = PAGE_SIZE[1] - MARGIN - 28;
      drawRow(
        page,
        y,
        columns.map((c) => safe(c.header)),
        bold,
      );
      page.drawLine({
        start: { x: MARGIN, y: y - 4 },
        end: { x: MARGIN + tableWidth, y: y - 4 },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      });
      y -= ROW_HEIGHT;
      return { page, y };
    };

    let { page, y } = newPage();
    for (const row of rows) {
      if (y < MARGIN) ({ page, y } = newPage());
      drawRow(
        page,
        y,
        columns.map((c) => cellText(row[c.key])),
        font,
      );
      y -= ROW_HEIGHT;
    }
    if (rows.length === 0)
      page.drawText('Sin resultados', { x: MARGIN, y, size: FONT_SIZE, font });

    return Buffer.from(await doc.save());
  }
}

// ponytail: trunca con "…" por carácter (O(n²)); ok para celdas cortas.
function fit(text: string, font: PDFFont, max: number): string {
  if (font.widthOfTextAtSize(text, FONT_SIZE) <= max) return text;
  let s = text;
  while (s.length > 1 && font.widthOfTextAtSize(`${s}...`, FONT_SIZE) > max) {
    s = s.slice(0, -1);
  }
  return `${s}...`;
}
