import { Injectable } from '@nestjs/common';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import {
  AccountReceivableMovementType,
  IAccountReceivable,
  ICustomerAccountSummary,
  ICustomerLedgerEntry,
} from '@erp/shared-types';

export interface AccountStatementInput {
  summary: ICustomerAccountSummary;
  pendingInvoices: IAccountReceivable[];
  ledger: ICustomerLedgerEntry[];
  issuedAt: Date;
}

const PAGE_SIZE: [number, number] = [595.28, 841.89]; // A4 pt
const MARGIN = 40;
const ROW_HEIGHT = 14;
const TIME_ZONE = 'America/Argentina/Buenos_Aires';

const MOVEMENT_LABELS: Record<AccountReceivableMovementType, string> = {
  [AccountReceivableMovementType.FACTURA]: 'Factura',
  [AccountReceivableMovementType.PAGO]: 'Pago',
  [AccountReceivableMovementType.NOTA_CREDITO]: 'Nota de crédito',
  [AccountReceivableMovementType.REVERSION_CHEQUE]: 'Rechazo de cheque',
};

/** "1234.5" → "$ 1.234,50". Opera sobre el string decimal, sin pasar por float. */
export function formatArs(amount: string): string {
  const negative = amount.startsWith('-');
  const [int, dec = ''] = amount.replace('-', '').split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '-' : ''}$ ${grouped},${dec.padEnd(2, '0').slice(0, 2)}`;
}

/** YYYYMMDD en fecha local argentina (no UTC), para el nombre del archivo. */
export function statementFilenameDay(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE })
    .format(date)
    .replace(/-/g, '');
}

function formatDate(value: Date | string): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

// Helvetica estándar solo codifica WinAnsi; un carácter fuera de rango haría
// fallar drawText, así que se reemplaza por "?".
function safe(text: string): string {
  return text.replace(/[^\x20-\x7E -ÿ]/g, '?');
}

interface Column {
  header: string;
  x: number;
  align?: 'right';
}

/**
 * Resumen de Cuenta en PDF (pdf-lib). Función pura de su entrada: no toca la
 * base ni el reloj, así el mismo estado de cuenta rinde el mismo documento.
 */
@Injectable()
export class AccountStatementPdfService {
  async render(input: AccountStatementInput): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    doc.setCreationDate(input.issuedAt);
    doc.setModificationDate(input.issuedAt);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const { summary } = input;

    let page: PDFPage = doc.addPage(PAGE_SIZE);
    let y = PAGE_SIZE[1] - MARGIN;
    const right = PAGE_SIZE[0] - MARGIN;

    const ensureSpace = (needed: number, redraw?: () => void): void => {
      if (y - needed < MARGIN) {
        page = doc.addPage(PAGE_SIZE);
        y = PAGE_SIZE[1] - MARGIN;
        redraw?.();
      }
    };
    const text = (
      value: string,
      x: number,
      opts: { font?: PDFFont; size?: number; align?: 'right' } = {},
    ): void => {
      const f = opts.font ?? font;
      const size = opts.size ?? 9;
      const content = safe(value);
      const drawX =
        opts.align === 'right' ? x - f.widthOfTextAtSize(content, size) : x;
      page.drawText(content, { x: drawX, y, size, font: f });
    };
    const line = (
      value: string,
      opts: { font?: PDFFont; size?: number } = {},
    ) => {
      ensureSpace(ROW_HEIGHT);
      text(value, MARGIN, opts);
      y -= ROW_HEIGHT;
    };
    const drawHeader = (columns: Column[]): void => {
      for (const c of columns) {
        text(c.header, c.x, { font: bold, align: c.align });
      }
      y -= 4;
      page.drawLine({
        start: { x: MARGIN, y },
        end: { x: right, y },
        thickness: 0.5,
        color: rgb(0.5, 0.5, 0.5),
      });
      y -= ROW_HEIGHT - 4;
    };
    const table = (columns: Column[], rows: string[][]): void => {
      ensureSpace(ROW_HEIGHT * 2);
      drawHeader(columns);
      for (const row of rows) {
        ensureSpace(ROW_HEIGHT, () => drawHeader(columns));
        row.forEach((cell, i) =>
          text(cell, columns[i].x, { align: columns[i].align }),
        );
        y -= ROW_HEIGHT;
      }
    };

    line('RESUMEN DE CUENTA', { font: bold, size: 16 });
    y -= 4;
    line(`Cliente: ${summary.customerName}`, { font: bold, size: 11 });
    line(`Documento: ${summary.customerDocument}`);
    line(`Emitido: ${formatDate(input.issuedAt)}`);
    y -= ROW_HEIGHT / 2;

    line(`Saldo total: ${formatArs(summary.totalBalance)}`, {
      font: bold,
      size: 12,
    });
    if (Number(summary.creditLimit) > 0) {
      line(
        `Límite de crédito: ${formatArs(summary.creditLimit)}` +
          (summary.exceedsCreditLimit ? '  (EXCEDIDO)' : ''),
      );
    }
    line(
      `Antigüedad: 0-30 días ${formatArs(summary.aging.days0to30)}  |  ` +
        `31-60 días ${formatArs(summary.aging.days31to60)}  |  ` +
        `+60 días ${formatArs(summary.aging.days61plus)}`,
    );
    y -= ROW_HEIGHT;

    line('Facturas pendientes', { font: bold, size: 11 });
    if (input.pendingInvoices.length === 0) {
      line('Sin facturas pendientes.');
    } else {
      table(
        [
          { header: 'Documento', x: MARGIN },
          { header: 'Fecha', x: 190 },
          { header: 'Estado', x: 260 },
          { header: 'Original', x: 420, align: 'right' },
          { header: 'Saldo', x: right, align: 'right' },
        ],
        input.pendingInvoices.map((ar) => [
          ar.documentReference,
          formatDate(ar.createdAt),
          ar.status,
          formatArs(ar.originalAmount),
          formatArs(ar.currentBalance),
        ]),
      );
    }
    y -= ROW_HEIGHT;

    line('Movimientos', { font: bold, size: 11 });
    if (input.ledger.length === 0) {
      line('Sin movimientos.');
    } else {
      table(
        [
          { header: 'Fecha', x: MARGIN },
          { header: 'Tipo', x: 110 },
          { header: 'Documento', x: 220 },
          { header: 'Importe', x: 440, align: 'right' },
          { header: 'Saldo', x: right, align: 'right' },
        ],
        input.ledger.map((e) => [
          formatDate(e.createdAt),
          MOVEMENT_LABELS[e.movementType] ?? e.movementType,
          e.documentReference,
          formatArs(e.signedAmount),
          formatArs(e.runningBalance),
        ]),
      );
    }

    return doc.save();
  }
}
