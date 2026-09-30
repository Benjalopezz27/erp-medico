import { Injectable } from '@nestjs/common';
import {
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFPage,
  StandardFonts,
  rgb,
} from 'pdf-lib';

/** Layout version — bump when the visual template changes to force
 * regeneration (see PdfGenerateProcessor's checksum/version check). */
export const PDF_TEMPLATE_VERSION = 'v2';

export interface FiscalPdfParty {
  razonSocial: string;
  documentLabel: string;
  taxConditionLabel: string;
  address?: string | null;
  /** Emisor only — nombre de fantasía shown centered in the header. */
  tradeName?: string | null;
  /** Emisor only — Ingresos Brutos number. */
  grossIncome?: string | null;
  /** Emisor only — Fecha de Inicio de Actividades, already formatted. */
  activityStartDate?: string | null;
}

export interface FiscalPdfLineItem {
  productCode: string;
  productName: string;
  quantity: number;
  unitPriceNet: number;
  ivaPercentage: number | null;
  subtotalGross: number;
}

export interface FiscalPdfInput {
  emisor: FiscalPdfParty;
  receptor: FiscalPdfParty;
  /** e.g. 'Factura B' — the trailing letter drives the A/B layout. */
  documentTypeLabel: string;
  /** AFIP CbteTipo (e.g. 6), printed under the letter box. */
  documentCode: number;
  /** Condición de venta, e.g. 'Transferencia Bancaria'. */
  saleCondition: string;
  pointOfSale: number;
  documentNumber: number;
  issuedAt: Date;
  items: FiscalPdfLineItem[];
  taxableNetAmount: number;
  exemptAmount: number;
  nonTaxedAmount: number;
  ivaAmount: number;
  totalAmount: number;
  cae: string;
  caeExpirationDate: string;
  qrPngBytes: Uint8Array;
}

const PAGE_SIZE: [number, number] = [595.28, 841.89]; // A4 pt
const M = 28;
const W = PAGE_SIZE[0] - 2 * M;
const MID = PAGE_SIZE[0] / 2;
const RIGHT = M + W - 4;
const ROW_H = 14;
const ROWS_PER_PAGE = 26;
const COPIES = ['ORIGINAL', 'DUPLICADO', 'TRIPLICADO'];
// Right edges of the numeric columns; Código starts at M+4, Producto at 92.
const COL = { qty: 330, price: 425, bonif: 460, bonifAmt: 515 };

interface Row {
  code: string;
  name: string;
  qty: number;
  unit: number;
  sub: number;
}

interface TextOpts {
  bold?: boolean;
  size?: number;
  align?: 'left' | 'center' | 'right';
  /** Truncate with no ellipsis beyond this width. */
  max?: number;
}

/** Drawing helper: y is measured from the TOP of the page, like the layout. */
class Canvas {
  constructor(
    readonly page: PDFPage,
    private readonly font: PDFFont,
    private readonly boldFont: PDFFont,
  ) {}

  private get h(): number {
    return this.page.getHeight();
  }

  width(text: string, bold = false, size = 9): number {
    return (bold ? this.boldFont : this.font).widthOfTextAtSize(text, size);
  }

  text(raw: string, x: number, y: number, o: TextOpts = {}): void {
    const font = o.bold ? this.boldFont : this.font;
    const size = o.size ?? 9;
    // Strip control chars; keeps accents/ñ, which pdf-lib's WinAnsi Helvetica
    // already supports.
    let text = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
    if (o.max !== undefined) {
      while (text.length > 0 && font.widthOfTextAtSize(text, size) > o.max) {
        text = text.slice(0, -1);
      }
    }
    const w = font.widthOfTextAtSize(text, size);
    const dx = o.align === 'right' ? -w : o.align === 'center' ? -w / 2 : 0;
    this.page.drawText(text, {
      x: x + dx,
      y: this.h - y,
      size,
      font,
      color: rgb(0, 0, 0),
    });
  }

  /** Word-wrapped text, at most `maxLines` lines of 11pt each. */
  wrapped(text: string, x: number, y: number, maxW: number, maxLines: number) {
    const lines: string[] = [];
    let cur = '';
    for (const word of text.split(/\s+/).filter(Boolean)) {
      const next = cur ? `${cur} ${word}` : word;
      if (cur && this.width(next) > maxW) {
        lines.push(cur);
        cur = word;
      } else {
        cur = next;
      }
    }
    if (cur) lines.push(cur);
    lines
      .slice(0, maxLines)
      .forEach((l, i) => this.text(l, x, y + i * 11, { max: maxW }));
  }

  box(x: number, y: number, w: number, h: number, fill?: number): void {
    this.page.drawRectangle({
      x,
      y: this.h - y - h,
      width: w,
      height: h,
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.8,
      color: fill === undefined ? undefined : rgb(fill, fill, fill),
    });
  }

  line(x1: number, y1: number, x2: number, y2: number): void {
    this.page.drawLine({
      start: { x: x1, y: this.h - y1 },
      end: { x: x2, y: this.h - y2 },
      thickness: 0.8,
      color: rgb(0, 0, 0),
    });
  }
}

/**
 * Renders the fiscal comprobante as a PDF via pdf-lib (no browser engine),
 * laid out like ARCA's own "Comprobantes en línea" PDF: the full page set is
 * emitted once per copy (ORIGINAL / DUPLICADO / TRIPLICADO). Pure function of
 * its input — the caller is responsible for sourcing that input exclusively
 * from persisted fiscal snapshots, never current prices/master data.
 */
@Injectable()
export class FiscalPdfTemplateService {
  async render(input: FiscalPdfInput): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    // pdf-lib defaults Creation/ModDate to Date.now(); pin both to issuedAt so
    // rendering the same input twice yields a byte-identical (and therefore
    // checksum-stable) PDF, which the idempotent pdf-generate job relies on.
    doc.setCreationDate(input.issuedAt);
    doc.setModificationDate(input.issuedAt);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const qr = await doc.embedPng(input.qrPngBytes);

    const letter = input.documentTypeLabel.trim().slice(-1);
    const isB = letter === 'B';
    const rows: Row[] = input.items.map((item) => ({
      code: item.productCode,
      name: item.productName,
      qty: item.quantity,
      // B shows IVA-inclusive amounts (consumer style), A shows net.
      unit: isB ? item.subtotalGross / (item.quantity || 1) : item.unitPriceNet,
      sub: isB ? item.subtotalGross : item.unitPriceNet * item.quantity,
    }));
    const pages = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));

    for (const copy of COPIES) {
      for (let n = 0; n < pages; n++) {
        const c = new Canvas(doc.addPage(PAGE_SIZE), font, bold);
        this.drawHeader(c, input, copy, letter);
        this.drawRows(
          c,
          rows.slice(n * ROWS_PER_PAGE, (n + 1) * ROWS_PER_PAGE),
        );
        if (n === pages - 1) this.drawTotals(c, input, isB);
        this.drawFooter(c, input, qr, n + 1, pages);
      }
    }
    return doc.save();
  }

  private drawHeader(
    c: Canvas,
    i: FiscalPdfInput,
    copy: string,
    letter: string,
  ): void {
    const e = i.emisor;
    const r = i.receptor;

    c.box(M, 28, W, 24);
    c.text(copy, MID, 45, { bold: true, size: 13, align: 'center' });

    // Emisor / letter / comprobante
    c.box(M, 52, W, 113);
    c.line(MID, 92, MID, 165);
    c.box(MID - 25, 52, 50, 40, 1);
    c.text(letter, MID, 77, { bold: true, size: 26, align: 'center' });
    c.text(`COD. ${String(i.documentCode).padStart(3, '0')}`, MID, 88, {
      bold: true,
      size: 6,
      align: 'center',
    });

    c.text(e.tradeName ?? e.razonSocial, (M + MID - 25) / 2, 80, {
      bold: true,
      size: 10,
      align: 'center',
      max: MID - 25 - M - 10,
    });
    this.field(c, 'Razón Social: ', e.razonSocial, M + 6, 117, MID - 12);
    c.text('Domicilio Comercial: ', M + 6, 133, { bold: true });
    const dx = M + 6 + c.width('Domicilio Comercial: ', true);
    c.wrapped(e.address ?? '', dx, 133, MID - 8 - dx, 2);
    this.field(
      c,
      'Condición frente al IVA: ',
      e.taxConditionLabel,
      M + 6,
      158,
      MID - 12,
      true,
    );

    const x = MID + 40;
    c.text(this.title(i.documentTypeLabel), x, 78, { bold: true, size: 22 });
    c.text(
      `Punto de Venta: ${pad(i.pointOfSale, 5)}   Comp. Nro: ${pad(i.documentNumber, 8)}`,
      x,
      102,
      { bold: true },
    );
    c.text(`Fecha de Emisión: ${this.formatDate(i.issuedAt)}`, x, 117, {
      bold: true,
    });
    c.text(this.labeled(e.documentLabel), x, 135, { bold: true });
    if (e.grossIncome) {
      c.text(`Ingresos Brutos: ${e.grossIncome}`, x, 147, { bold: true });
    }
    if (e.activityStartDate) {
      c.text(`Fecha de Inicio de Actividades: ${e.activityStartDate}`, x, 159, {
        bold: true,
      });
    }

    // Receptor
    c.box(M, 170, W, 66);
    c.text(this.labeled(r.documentLabel), M + 6, 184, { bold: true, size: 8 });
    this.field(
      c,
      'Apellido y Nombre / Razón Social: ',
      r.razonSocial,
      MID - 90,
      184,
      M + W - 6,
      false,
      8,
    );
    this.field(
      c,
      'Condición frente al IVA: ',
      r.taxConditionLabel,
      M + 6,
      206,
      MID - 92,
      false,
      8,
    );
    this.field(
      c,
      'Domicilio: ',
      r.address ?? '',
      MID - 90,
      206,
      M + W - 6,
      false,
      8,
    );
    this.field(
      c,
      'Condición de venta: ',
      i.saleCondition,
      M + 6,
      226,
      MID - 12,
      false,
      8,
    );
  }

  /** Bold label followed by a regular value, value truncated to fit `maxW`. */
  private field(
    c: Canvas,
    label: string,
    value: string,
    x: number,
    y: number,
    maxW: number,
    boldValue = false,
    size = 9,
  ): void {
    c.text(label, x, y, { bold: true, size });
    const lw = c.width(label, true, size);
    c.text(value, x + lw, y, { bold: boldValue, size, max: maxW - x - lw });
  }

  private drawRows(c: Canvas, rows: Row[]): void {
    c.box(M, 242, W, 18, 0.9);
    const h: TextOpts = { bold: true, size: 7 };
    c.text('Código', M + 4, 254, h);
    c.text('Producto / Servicio', 92, 254, h);
    c.text('Cantidad', COL.qty, 254, { ...h, align: 'right' });
    c.text('U. Medida', COL.qty + 6, 254, h);
    c.text('Precio Unit.', COL.price, 254, { ...h, align: 'right' });
    c.text('% Bonif', COL.bonif, 254, { ...h, align: 'right' });
    c.text('Imp. Bonif.', COL.bonifAmt, 254, { ...h, align: 'right' });
    c.text('Subtotal', RIGHT, 254, { ...h, align: 'right' });

    rows.forEach((row, idx) => {
      const y = 274 + idx * ROW_H;
      const o: TextOpts = { size: 8 };
      c.text(row.code, M + 4, y, { ...o, max: 58 });
      c.text(row.name, 92, y, { ...o, max: COL.qty - 92 - 44 });
      c.text(money(row.qty), COL.qty, y, { ...o, align: 'right' });
      c.text('unidades', COL.qty + 6, y, o);
      c.text(money(row.unit), COL.price, y, { ...o, align: 'right' });
      // Discounts are not modelled in sales; prices are already net of them.
      c.text('0,00', COL.bonif, y, { ...o, align: 'right' });
      c.text('0,00', COL.bonifAmt, y, { ...o, align: 'right' });
      c.text(money(row.sub), RIGHT, y, { ...o, align: 'right' });
    });
  }

  private drawTotals(c: Canvas, i: FiscalPdfInput, isB: boolean): void {
    c.box(M, 640, W, 80);
    const lines: [string, number][] = isB
      ? [
          ['Subtotal: $', i.totalAmount],
          ['Importe Otros Tributos: $', 0],
          ['Importe Total: $', i.totalAmount],
        ]
      : [
          ['Importe Neto Gravado: $', i.taxableNetAmount],
          ['Importe No Gravado: $', i.nonTaxedAmount],
          ['Importe Exento: $', i.exemptAmount],
          ['Importe IVA: $', i.ivaAmount],
          ['Importe Total: $', i.totalAmount],
        ];
    const step = isB ? 20 : 14;
    lines.forEach(([label, amount], idx) => {
      const y = (isB ? 664 : 654) + idx * step;
      c.text(label, RIGHT - 70, y, { bold: true, align: 'right' });
      c.text(money(amount), RIGHT, y, { bold: true, align: 'right' });
    });

    if (isB) {
      c.box(M, 720, W, 38);
      c.text(
        'Régimen de Transparencia Fiscal al Consumidor (Ley 27.743)',
        M + 4,
        733,
        { bold: true, size: 8 },
      );
      c.text('IVA Contenido: $', M + 130, 749, { bold: true, size: 8 });
      c.text(money(i.ivaAmount), M + 220, 749, { bold: true, size: 8 });
    }
  }

  private drawFooter(
    c: Canvas,
    i: FiscalPdfInput,
    qr: PDFImage,
    pageNo: number,
    pages: number,
  ): void {
    const size = 62;
    c.page.drawImage(qr, {
      x: M,
      y: c.page.getHeight() - 766 - size,
      width: size,
      height: size,
    });
    c.text('ARCA', M + 75, 788, { bold: true, size: 20 });
    c.text('AGENCIA DE RECAUDACIÓN Y CONTROL ADUANERO', M + 75, 796, {
      size: 4,
    });
    c.text('Comprobante Autorizado', M + 75, 812, { bold: true, size: 8 });
    c.text(
      'Esta Agencia no se responsabiliza por los datos ingresados en el detalle de la operación',
      M + 75,
      821,
      { bold: true, size: 5 },
    );
    c.text(`Pág. ${pageNo}/${pages}`, MID - 20, 784, { bold: true });
    c.text(`CAE N°: ${i.cae}`, RIGHT, 782, { bold: true, align: 'right' });
    c.text(
      `Fecha de Vto. de CAE: ${this.formatCae(i.caeExpirationDate)}`,
      RIGHT,
      796,
      { bold: true, align: 'right' },
    );
  }

  /** 'Factura B' → 'FACTURA' */
  private title(label: string): string {
    return label.trim().slice(0, -2).toUpperCase();
  }

  /** 'CUIT 2705…' → 'CUIT: 2705…' */
  private labeled(label: string): string {
    return label.replace(/^(CUIT|DNI) /, '$1: ');
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  /** ARCA returns YYYYMMDD (or ISO YYYY-MM-DD); print dd/mm/yyyy. */
  private formatCae(value: string): string {
    const m = /^(\d{4})-?(\d{2})-?(\d{2})$/.exec(value);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : value;
  }
}

const pad = (n: number, len: number): string => String(n).padStart(len, '0');

/** ARCA prints amounts with a decimal comma and no thousands separator. */
const money = (n: number): string => n.toFixed(2).replace('.', ',');
