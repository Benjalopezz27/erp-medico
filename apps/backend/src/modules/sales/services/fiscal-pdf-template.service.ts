import { Injectable } from '@nestjs/common';
import { PDFDocument, PDFImage, PDFPage, StandardFonts, rgb } from 'pdf-lib';

/** Layout version — bump when the visual template changes to force
 * regeneration (see PdfGenerateProcessor's checksum/version check). */
export const PDF_TEMPLATE_VERSION = 'v1';

export interface FiscalPdfParty {
  razonSocial: string;
  documentLabel: string;
  taxConditionLabel: string;
  address?: string | null;
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
  documentTypeLabel: string;
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
const MARGIN = 40;
const LINE_HEIGHT = 16;

/**
 * Renders the fiscal comprobante as a PDF via pdf-lib (no browser engine).
 * Pure function of its input — the caller is responsible for sourcing that
 * input exclusively from persisted fiscal snapshots, never current
 * prices/master data.
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
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    const qrImage = await doc.embedPng(input.qrPngBytes);

    let page = doc.addPage(PAGE_SIZE);
    let cursorY = PAGE_SIZE[1] - MARGIN;

    const writeLine = (
      text: string,
      opts: { bold?: boolean; size?: number } = {},
    ): void => {
      if (cursorY < MARGIN + LINE_HEIGHT) {
        page = doc.addPage(PAGE_SIZE);
        cursorY = PAGE_SIZE[1] - MARGIN;
      }
      page.drawText(text, {
        x: MARGIN,
        y: cursorY,
        size: opts.size ?? 10,
        font: opts.bold ? boldFont : font,
        color: rgb(0, 0, 0),
      });
      cursorY -= LINE_HEIGHT;
    };

    writeLine(input.documentTypeLabel, { bold: true, size: 14 });
    writeLine(
      `Punto de Venta ${String(input.pointOfSale).padStart(5, '0')} - Comprobante N° ${String(input.documentNumber).padStart(8, '0')}`,
    );
    writeLine(`Fecha de emisión: ${this.formatDate(input.issuedAt)}`);
    cursorY -= LINE_HEIGHT / 2;

    writeLine('Emisor', { bold: true });
    writeLine(this.sanitizeText(input.emisor.razonSocial));
    writeLine(this.sanitizeText(input.emisor.documentLabel));
    writeLine(this.sanitizeText(input.emisor.taxConditionLabel));
    cursorY -= LINE_HEIGHT / 2;

    writeLine('Receptor', { bold: true });
    writeLine(this.sanitizeText(input.receptor.razonSocial));
    writeLine(this.sanitizeText(input.receptor.documentLabel));
    writeLine(this.sanitizeText(input.receptor.taxConditionLabel));
    cursorY -= LINE_HEIGHT / 2;

    writeLine('Detalle', { bold: true });
    for (const item of input.items) {
      writeLine(
        this.sanitizeText(
          `${item.quantity} x ${item.productCode} ${item.productName} - $${item.unitPriceNet.toFixed(2)} (IVA ${item.ivaPercentage ?? 0}%) = $${item.subtotalGross.toFixed(2)}`,
        ),
        { size: 9 },
      );
    }
    cursorY -= LINE_HEIGHT / 2;

    writeLine(`Neto gravado: $${input.taxableNetAmount.toFixed(2)}`);
    writeLine(`Exento: $${input.exemptAmount.toFixed(2)}`);
    writeLine(`No gravado: $${input.nonTaxedAmount.toFixed(2)}`);
    writeLine(`IVA: $${input.ivaAmount.toFixed(2)}`);
    writeLine(`Total: $${input.totalAmount.toFixed(2)}`, { bold: true });
    cursorY -= LINE_HEIGHT / 2;

    writeLine(`CAE: ${input.cae}`, { bold: true });
    writeLine(`Vencimiento CAE: ${input.caeExpirationDate}`);

    this.drawQr(page, qrImage);

    const bytes = await doc.save();
    return bytes;
  }

  private drawQr(page: PDFPage, qrImage: PDFImage): void {
    const qrSize = 120;
    page.drawImage(qrImage, {
      x: PAGE_SIZE[0] - MARGIN - qrSize,
      y: MARGIN,
      width: qrSize,
      height: qrSize,
    });
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  /** Strips control characters; keeps accents/ñ, which pdf-lib's WinAnsi
   * Helvetica encoding already supports. */
  private sanitizeText(value: string): string {
    return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  }
}
