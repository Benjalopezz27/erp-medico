import { PDFDocument } from 'pdf-lib';
import {
  AccountReceivableMovementType,
  AccountReceivableStatus,
  IAccountReceivable,
  ICustomerAccountSummary,
  ICustomerLedgerEntry,
} from '@erp/shared-types';
import {
  AccountStatementInput,
  AccountStatementPdfService,
  formatArs,
  statementFilenameDay,
} from './account-statement-pdf.service';

const summary: ICustomerAccountSummary = {
  customerId: 'c-1',
  customerName: 'Droguería Ñandú Łódź SA',
  customerDocument: '30712345678',
  totalBalance: '1234.50',
  pendingCount: 1,
  partialCount: 0,
  creditLimit: '1000.00',
  exceedsCreditLimit: true,
  aging: { days0to30: '1234.50', days31to60: '0.00', days61plus: '0.00' },
};

const invoice: IAccountReceivable = {
  id: 'ar-1',
  customerId: 'c-1',
  documentReference: 'V-00000001',
  originalAmount: '1234.50',
  currentBalance: '1234.50',
  status: AccountReceivableStatus.PENDIENTE,
  createdAt: new Date('2026-09-01T12:00:00Z'),
  updatedAt: new Date('2026-09-01T12:00:00Z'),
};

const entry = (i: number): ICustomerLedgerEntry => ({
  id: `m-${i}`,
  createdAt: new Date('2026-09-01T12:00:00Z'),
  movementType: AccountReceivableMovementType.FACTURA,
  documentReference: `V-${String(i).padStart(8, '0')}`,
  signedAmount: '10.00',
  runningBalance: `${i * 10}.00`,
});

describe('AccountStatementPdfService', () => {
  const service = new AccountStatementPdfService();
  const base: AccountStatementInput = {
    summary,
    pendingInvoices: [invoice],
    ledger: [entry(1)],
    issuedAt: new Date('2026-09-28T15:00:00Z'),
  };
  const pageCount = async (bytes: Uint8Array) =>
    (await PDFDocument.load(bytes)).getPageCount();
  const header = (bytes: Uint8Array) =>
    Buffer.from(bytes).subarray(0, 4).toString();

  it('renders a PDF, tolerating characters Helvetica cannot encode', async () => {
    const bytes = await service.render(base);
    expect(header(bytes)).toBe('%PDF');
    expect(await pageCount(bytes)).toBe(1);
  });

  it('renders a customer without invoices or movements', async () => {
    const bytes = await service.render({
      ...base,
      summary: { ...summary, totalBalance: '0.00', pendingCount: 0 },
      pendingInvoices: [],
      ledger: [],
    });
    expect(header(bytes)).toBe('%PDF');
    expect(await pageCount(bytes)).toBe(1);
  });

  it('continues a long ledger on more pages without dropping rows', async () => {
    const rows = 200;
    const bytes = await service.render({
      ...base,
      ledger: Array.from({ length: rows }, (_, i) => entry(i + 1)),
    });
    const pages = await pageCount(bytes);
    expect(pages).toBeGreaterThan(1);
    // Cada página cabe (841 - 2*40) / 14 ≈ 54 filas: 200 filas no entran en menos de 4.
    expect(pages).toBeGreaterThanOrEqual(4);
  });

  it('is byte-identical for the same input', async () => {
    const a = await service.render(base);
    const b = await service.render(base);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });

  describe('formatArs', () => {
    it.each([
      ['0.00', '$ 0,00'],
      ['1234.5', '$ 1.234,50'],
      ['1234567.89', '$ 1.234.567,89'],
      ['-121.00', '-$ 121,00'],
    ])('%s → %s', (input, expected) => {
      expect(formatArs(input)).toBe(expected);
    });
  });

  it('names the file with the Argentine date, not the UTC one', () => {
    // 00:30 UTC del 29/09 = 21:30 del 28/09 en Buenos Aires.
    expect(statementFilenameDay(new Date('2026-09-29T00:30:00Z'))).toBe(
      '20260928',
    );
    expect(statementFilenameDay(new Date('2026-09-29T12:00:00Z'))).toBe(
      '20260929',
    );
  });
});
