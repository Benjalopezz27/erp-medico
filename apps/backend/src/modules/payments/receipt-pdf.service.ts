import { Injectable } from '@nestjs/common';
import {
  PDFDocument,
  PDFFont,
  PDFPage,
  StandardFonts,
  degrees,
  rgb,
} from 'pdf-lib';
import {
  IReceiptDetail,
  PaymentMethod,
  PaymentStatus,
} from '@erp/shared-types';
import { formatArs } from '../receivables/account-statement-pdf.service';
import { amountToWords } from './amount-words';

export interface ReceiptPdfInput {
  receipt: IReceiptDetail;
  emisor: { razonSocial: string; cuit: string };
}

const PAGE_SIZE: [number, number] = [595.28, 841.89]; // A4 pt
const MARGIN = 40;
const ROW_HEIGHT = 15;
const TIME_ZONE = 'America/Argentina/Buenos_Aires';

const METHOD_LABELS: Partial<Record<PaymentMethod, string>> = {
  [PaymentMethod.EFECTIVO]: 'Efectivo',
  [PaymentMethod.TRANSFERENCIA]: 'Transferencia',
  [PaymentMethod.CHEQUE]: 'Cheque',
};

/** Texto del medio de pago: "Cheque (Banco Galicia, N° 123)" si hay cheque. */
export const paymentMethodLabel = (
  receipt: Pick<IReceiptDetail, 'paymentMethod' | 'check'>,
): string => {
  const base = METHOD_LABELS[receipt.paymentMethod] ?? receipt.paymentMethod;
  return receipt.check
    ? `${base} (Banco ${receipt.check.bankName}, N° ${receipt.check.checkNumber})`
    : base;
};

const formatDate = (value: Date | string): string =>
  new Intl.DateTimeFormat('es-AR', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));

// Helvetica estándar solo codifica WinAnsi; lo demás se reemplaza por "?".
const safe = (text: string): string => text.replace(/[^\x20-\x7E -ÿ]/g, '?');

/** Recibo X en PDF A4 (pdf-lib). Función pura de su entrada. */
@Injectable()
export class ReceiptPdfService {
  async render({ receipt, emisor }: ReceiptPdfInput): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    doc.setCreationDate(new Date(receipt.createdAt));
    doc.setModificationDate(new Date(receipt.createdAt));
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const right = PAGE_SIZE[0] - MARGIN;

    let page: PDFPage = doc.addPage(PAGE_SIZE);
    let y = PAGE_SIZE[1] - MARGIN;

    const text = (
      value: string,
      x: number,
      opts: { font?: PDFFont; size?: number; align?: 'right' } = {},
    ): void => {
      const f = opts.font ?? font;
      const size = opts.size ?? 10;
      const content = safe(value);
      const drawX =
        opts.align === 'right' ? x - f.widthOfTextAtSize(content, size) : x;
      page.drawText(content, { x: drawX, y, size, font: f });
    };
    const rule = (): void => {
      y -= 4;
      page.drawLine({
        start: { x: MARGIN, y },
        end: { x: right, y },
        thickness: 0.5,
        color: rgb(0.5, 0.5, 0.5),
      });
      y -= ROW_HEIGHT;
    };
    const tableHeader = (): void => {
      text('N° Factura', MARGIN, { font: bold });
      text('Fecha', 190, { font: bold });
      text('Monto orig.', 400, { font: bold, align: 'right' });
      text('Aplicado', right, { font: bold, align: 'right' });
      rule();
    };

    text(emisor.razonSocial, MARGIN, { font: bold, size: 13 });
    text('RECIBO X', right, { font: bold, size: 13, align: 'right' });
    if (receipt.paymentStatus === PaymentStatus.REVERTIDO) {
      page.drawText('REVERTIDO', {
        x: MARGIN + 140,
        y: PAGE_SIZE[1] / 2,
        size: 72,
        font: bold,
        color: rgb(0.85, 0.2, 0.2),
        rotate: degrees(30),
        opacity: 0.35,
      });
    }
    y -= ROW_HEIGHT;
    text(`CUIT: ${emisor.cuit}`, MARGIN);
    text(`N° ${receipt.receiptNumber}`, right, { font: bold, align: 'right' });
    y -= ROW_HEIGHT;
    text(`Fecha: ${formatDate(receipt.createdAt)}`, right, { align: 'right' });
    rule();

    text('RECIBIMOS DE:', MARGIN, { font: bold });
    text(receipt.customerName, 130);
    y -= ROW_HEIGHT;
    text(`CUIT/DNI: ${receipt.customerDocument}`, 130);
    rule();

    text('COMPROBANTES APLICADOS:', MARGIN, { font: bold });
    y -= ROW_HEIGHT;
    tableHeader();
    for (const row of receipt.applied) {
      if (y - ROW_HEIGHT < MARGIN + 150) {
        page = doc.addPage(PAGE_SIZE);
        y = PAGE_SIZE[1] - MARGIN;
        tableHeader();
      }
      text(row.documentReference, MARGIN);
      text(formatDate(row.invoiceDate), 190);
      text(formatArs(row.originalAmount), 400, { align: 'right' });
      text(formatArs(row.amountApplied), right, { align: 'right' });
      y -= ROW_HEIGHT;
    }
    rule();

    text('MEDIO DE PAGO:', MARGIN, { font: bold });
    text(paymentMethodLabel(receipt), 150);
    y -= ROW_HEIGHT;
    if (receipt.notes) {
      text(`Observaciones: ${receipt.notes}`, MARGIN);
      y -= ROW_HEIGHT;
    }
    y -= ROW_HEIGHT / 2;
    text('TOTAL COBRADO:', MARGIN, { font: bold, size: 12 });
    text(formatArs(receipt.totalAmount), right, {
      font: bold,
      size: 12,
      align: 'right',
    });
    y -= ROW_HEIGHT;
    const words = amountToWords(receipt.totalAmount);
    text(
      `Son pesos: ${words.charAt(0).toUpperCase()}${words.slice(1)}`,
      MARGIN,
    );

    y -= 60;
    page.drawLine({
      start: { x: right - 180, y },
      end: { x: right, y },
      thickness: 0.5,
    });
    y -= ROW_HEIGHT;
    text('Firma', right - 90 - font.widthOfTextAtSize('Firma', 10) / 2);

    return doc.save();
  }
}
